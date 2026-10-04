import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import * as XLSX from 'xlsx';
import { ensureDatabaseSchema, pool, db } from './src/db/index.ts';
import {
  seedInitialPropertiesIfEmpty,
  getProperties,
  getPropertyByPropertyId,
  createProperty,
  updateProperty,
  deleteProperty,
  restoreProperty,
  bulkDeleteProperties,
  bulkRestoreProperties,
  bulkUpdateStatus,
  importBatch,
  recordImportHistory,
  getImportHistory,
  getImportHistoryById,
  getAuditLogs,
  getPropertyStats,
  createDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
  PropertyQueryParams,
  PHUKET_ZONE_MAPPING,
  generateImportHistoryCsv,
} from './src/server/db-service.ts';
import { scanPropertyDataQuality } from './src/server/data-quality-service.ts';
import {
  executeImportDryRun,
  executeSafeLiveImport,
  matchImagesToProperties,
  analyzeColumnMapping,
  CANONICAL_FIELDS,
  validateFileSecurity,
  parseSpreadsheetBuffer,
  escapeFormulaInjection,
} from './src/server/import-engine.ts';
import {
  hasPermission,
  canUserEditProperty,
  canUserArchiveProperty,
  canUserRestoreProperty,
  checkGranularPermission,
  ROLE_PERMISSIONS,
} from './src/lib/permissions.ts';
import { User, UserRole } from './src/types.ts';
import {
  userService,
  normalizeRole,
  roleHasPermission,
} from './src/server/user-service.ts';
import {
  contractService,
  ContractQueryParams,
} from './src/server/contract-service.ts';
import { paymentService } from './src/server/payment-service.ts';
import { viewingService } from './src/server/viewing-service.ts';
import { clientService } from './src/server/client-service.ts';
import {
  systemSettingsService,
  PERMISSION_CATALOG,
} from './src/server/system-settings-service.ts';
import {
  reportingService,
  ReportType,
} from './src/server/reporting-service.ts';
import { maintenanceService } from './src/server/maintenance-service.ts';
import { GENERATED_CONTRACTS_DIR } from './src/server/docx-generator.ts';
import { authService, DEFAULT_INITIAL_PASSWORD } from './src/server/auth-service.ts';
import { saveAvatarFile, ensureUploadsDir } from './src/server/avatar-upload.ts';
import { usersTable, auditLogsTable } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

function getUserFromReq(req: Request): User {
  if ((req as any).authenticatedUser) {
    const u = (req as any).authenticatedUser;
    const role: UserRole = (u.role === 'Admin' ? 'Administrator' : u.role) as UserRole;
    return {
      id: u.id,
      name: u.name,
      role,
      email: u.email,
      branch: u.branch || 'Phuket Head Office',
      phone: u.phone || '',
      avatar: u.avatar || '',
      title: u.title || role,
    };
  }

  const roleHeader = req.headers['x-user-role'] as UserRole | undefined;
  const nameHeader = req.headers['x-user-name'] as string | undefined;
  const idHeader = req.headers['x-user-id'] as string | undefined;

  const bodyUser = req.body?.currentUser || req.body?.user;
  const queryRole = req.query?.userRole as UserRole | undefined;
  const queryName = req.query?.userName as string | undefined;
  const queryId = req.query?.userId as string | undefined;

  const role: UserRole = roleHeader || bodyUser?.role || queryRole || 'Administrator';
  const name = nameHeader || bodyUser?.name || queryName || 'Admin';
  const id = idHeader || bodyUser?.id || queryId || 'usr-1';

  return {
    id,
    name,
    role,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@peakrealestate.co.th`,
    branch: 'Phuket Head Office',
    phone: '081-234-5678',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    title: role,
  };
}

function maskOwnerContactIfNeeded(property: any, user: User): any {
  if (!property) return property;
  if (hasPermission(user, 'canViewOwnerContact')) {
    return property;
  }
  return {
    ...property,
    ownerPhone: property.ownerPhone ? '081-***-****' : '',
    ownerEmail: property.ownerEmail ? '***@***' : '',
    landlordPhone3: property.landlordPhone3 ? '081-***-****' : '',
    virtualPhone1: property.virtualPhone1 ? '081-***-****' : '',
    virtualPhone2: property.virtualPhone2 ? '081-***-****' : '',
    landlordIdNumber: property.landlordIdNumber ? '*-****-*****-**-*' : '',
    landlordNotes: 'Protected (Confidential)',
  };
}

async function startServer() {
  const app = express();
  
  // Dev server must always run on port 3000 per environment constraints (Nginx occupies 8080)
  let PORT = 3000;
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const parsed = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(parsed) && parsed > 0 && parsed !== 8080) PORT = parsed;
  } else if (process.argv[2] && !isNaN(parseInt(process.argv[2], 10))) {
    const parsed = parseInt(process.argv[2], 10);
    if (parsed !== 8080) PORT = parsed;
  }

  const HOST = '0.0.0.0';

  // JSON and URL-encoded body parser with high payload limit for bulk imports
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static uploads directory for avatars and media
  ensureUploadsDir();
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Session Authentication Middleware
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token =
        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '') ||
        (req.headers['x-session-token'] as string) ||
        (req.headers['x-auth-token'] as string) ||
        '';

      if (token) {
        const user = await authService.getSessionUser(token);
        if (user) {
          (req as any).authenticatedUser = user;
          (req as any).user = user;
          (req as any).sessionToken = token;
        }
      }
    } catch (e) {
      // Continue to next middleware
    }
    next();
  });

  // Cleanup demo/mock/seed/sample data from PostgreSQL tables while preserving real user records
  async function cleanupProductionDemoData(forceAll = false): Promise<Record<string, number>> {
    if (process.env.NODE_ENV === 'test') {
      return {};
    }
    const result: Record<string, number> = {};
    const cleanupQueries: Record<string, string> = {
      maintenance_costs: "DELETE FROM maintenance_costs WHERE id IN ('cst-1', 'cst-2', 'cst-3')",
      maintenance_requests: "DELETE FROM maintenance_requests WHERE id IN ('mnt-1', 'mnt-2', 'mnt-3', 'mnt-4') OR ticket_id IN ('MNT-2026-0001', 'MNT-2026-0002', 'MNT-2026-0003', 'MNT-2026-0004')",
      preventive_maintenance: "DELETE FROM preventive_maintenance WHERE id IN ('pm-1', 'pm-2', 'pm-3')",
      maintenance_vendors: "DELETE FROM maintenance_vendors WHERE id IN ('vnd-1', 'vnd-2', 'vnd-3', 'vnd-4') OR vendor_code IN ('VND-001', 'VND-002', 'VND-003', 'VND-004')",
      payment_schedules: "DELETE FROM payment_schedules WHERE contract_id IN ('RENT-2026-0923', 'cnt-rent-sample-001', 'ctr-rent-2026-0923')",
      contracts: "DELETE FROM contracts WHERE id IN ('cnt-rent-sample-001', 'ctr-rent-2026-0923') OR contract_id IN ('RENT-2026-0923')",
      viewings: "DELETE FROM viewings WHERE id IN ('vw-1', 'vw-2', 'vw-3', 'view-1', 'view-2', 'view-3') OR viewing_code IN ('VW-2026-0101', 'VW-2026-0102', 'VW-2026-0103')",
      client_follow_ups: "DELETE FROM client_follow_ups WHERE id IN ('flw-1', 'flw-2', 'flw-3') OR client_id IN ('cust-1', 'cust-2', 'cust-3', 'cust-4', 'cli-1', 'cli-2', 'cli-3', 'cli-4')",
      clients: "DELETE FROM clients WHERE id IN ('cust-1', 'cust-2', 'cust-3', 'cust-4', 'cli-1', 'cli-2', 'cli-3', 'cli-4') OR client_code IN ('CLI-2026-0001', 'CLI-2026-0002', 'CLI-2026-0003', 'CLI-2026-0004')",
      properties: "DELETE FROM properties WHERE id IN ('prop-1', 'prop-2', 'prop-3', 'prop-4', 'prop-5', 'prop-6', 'prop-7', 'prop-8') OR property_id IN ('VL-1001', 'CD-2002', 'CD-2003', 'VL-1004', 'VL-1005', 'CD-2006', 'VL-1007', 'TH-3008')",
    };

    for (const [table, sqlQuery] of Object.entries(cleanupQueries)) {
      try {
        const queryToRun = forceAll ? `DELETE FROM ${table}` : sqlQuery;
        const deleteRes = await pool.query(queryToRun);
        result[table] = deleteRes.rowCount || 0;
      } catch (err: any) {
        result[table] = 0;
      }
    }
    return result;
  }

  // Initialize PostgreSQL schema and ensure production clean state
  try {
    await ensureDatabaseSchema();
    await authService.ensureDefaultUsersHavePassword();
    const cleanupResult = await cleanupProductionDemoData();
    console.log('Production clean state ready. Cleaned demo records:', cleanupResult);
  } catch (err) {
    console.error('Error during database initialization/cleanup:', err);
  }

  // -------------------------------------------------------------
  // API Routes
  // -------------------------------------------------------------

  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // -------------------------------------------------------------
  // B32 — Authentication, Session & Profile API
  // -------------------------------------------------------------

  // POST /api/auth/login - Email or Username + Password
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { identifier, username, email, password } = req.body;
      const loginId = identifier || username || email;
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await authService.login(loginId, password, { ip: clientIp, userAgent });
      res.json({
        success: true,
        message: 'Login successful',
        user: result.user,
        token: result.token,
      });
    } catch (err: any) {
      res.status(401).json({ success: false, error: err.message || 'Authentication failed' });
    }
  });

  // POST /api/auth/logout - Invalidate Session
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token =
        (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '') ||
        (req.headers['x-session-token'] as string) ||
        req.body?.token;

      if (token) {
        await authService.destroySession(token);
      }
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/auth/me - Current Authenticated User & Permissions
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      const user = (req as any).authenticatedUser || await (async () => {
        const token = (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : '') ||
          (req.headers['x-session-token'] as string);
        return token ? authService.getSessionUser(token) : null;
      })();

      if (!user) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Session expired or not logged in' });
      }

      const permissions = await systemSettingsService.getEffectiveUserPermissions(user.id);
      res.json({
        success: true,
        user: {
          ...user,
          permissions,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/auth/profile - Update Current User Profile
  app.put('/api/auth/profile', async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).authenticatedUser || getUserFromReq(req);
      if (!currentUser || currentUser.id === 'unauthenticated') {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const updated = await authService.updateProfile(currentUser.id, req.body, {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      });

      res.json({ success: true, user: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /api/auth/change-password - Change Current User Password
  app.post('/api/auth/change-password', async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).authenticatedUser || getUserFromReq(req);
      if (!currentUser || currentUser.id === 'unauthenticated') {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(currentUser.id, currentPassword, newPassword, {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      });

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Helper function to extract and save avatar buffer
  function processAvatarUpload(userId: string, body: any, headers: any): { relativeUrl: string; filePath: string } {
    let buffer: Buffer;
    let mimeType = 'image/jpeg';

    if (body?.dataUrl && typeof body.dataUrl === 'string') {
      const match = body.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error('Invalid image base64 data URL');
      mimeType = match[1];
      buffer = Buffer.from(match[2], 'base64');
    } else if (body?.avatarBase64 && typeof body.avatarBase64 === 'string') {
      buffer = Buffer.from(body.avatarBase64, 'base64');
      mimeType = body.mimeType || 'image/jpeg';
    } else {
      throw new Error('Please select an image file to upload (JPG, PNG, or WEBP)');
    }

    return saveAvatarFile(userId, buffer, mimeType, body?.fileName);
  }

  // POST /api/auth/profile/avatar - Upload Avatar for Current User
  app.post('/api/auth/profile/avatar', async (req: Request, res: Response) => {
    try {
      const currentUser = (req as any).authenticatedUser || getUserFromReq(req);
      if (!currentUser || currentUser.id === 'unauthenticated') {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const saved = processAvatarUpload(currentUser.id, req.body, req.headers);

      await db
        .update(usersTable)
        .set({ avatar: saved.relativeUrl, updatedAt: new Date() })
        .where(eq(usersTable.id, currentUser.id));

      await db.insert(auditLogsTable).values({
        propertyId: `user:${currentUser.id}`,
        action: 'Update Avatar',
        userName: currentUser.name,
        userId: currentUser.id,
        newValue: saved.relativeUrl,
        createdAt: new Date(),
      });

      res.json({ success: true, avatarUrl: saved.relativeUrl });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /api/users/:id/avatar - Upload Avatar for User (Admin or Self)
  app.post('/api/users/:id/avatar', async (req: Request, res: Response) => {
    try {
      const operator = (req as any).authenticatedUser || getUserFromReq(req);
      const targetUserId = req.params.id;
      const isAdmin = operator.role === 'Admin' || operator.role === 'Administrator';

      if (!isAdmin && operator.id !== targetUserId) {
        return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions to change avatar' });
      }

      const saved = processAvatarUpload(targetUserId, req.body, req.headers);

      await db
        .update(usersTable)
        .set({ avatar: saved.relativeUrl, updatedAt: new Date() })
        .where(eq(usersTable.id, targetUserId));

      await db.insert(auditLogsTable).values({
        propertyId: `user:${targetUserId}`,
        action: 'Update Avatar',
        userName: operator.name,
        userId: operator.id,
        newValue: saved.relativeUrl,
        createdAt: new Date(),
      });

      res.json({ success: true, avatarUrl: saved.relativeUrl });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /api/users/:id/reset-password - Admin Reset Password
  app.post('/api/users/:id/reset-password', async (req: Request, res: Response) => {
    try {
      const operator = (req as any).authenticatedUser || getUserFromReq(req);
      const opRole = normalizeRole(operator.role);

      if (opRole !== 'Admin') {
        return res.status(403).json({ success: false, error: 'Forbidden: Only administrators can reset user passwords' });
      }

      const { newPassword } = req.body;
      await authService.resetPassword(req.params.id, newPassword || DEFAULT_INITIAL_PASSWORD, {
        id: operator.id,
        name: operator.name,
        role: opRole,
      });

      res.json({ success: true, message: 'Password reset successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // POST /api/admin/cleanup-demo-data
  app.post('/api/admin/cleanup-demo-data', async (req: Request, res: Response) => {
    try {
      const deleted = await cleanupProductionDemoData();
      res.json({ success: true, message: 'Production demo data successfully cleaned', deleted });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/admin/database-stats
  app.get('/api/admin/database-stats', async (req: Request, res: Response) => {
    try {
      const tables = [
        'properties',
        'clients',
        'client_follow_ups',
        'contracts',
        'payment_schedules',
        'viewings',
        'maintenance_requests',
        'maintenance_vendors',
        'maintenance_costs',
        'preventive_maintenance',
        'users',
        'roles',
        'system_settings',
        'audit_logs',
        'import_history',
        'database_backups',
      ];
      const stats: Record<string, number> = {};
      for (const t of tables) {
        try {
          const resQuery = await pool.query(`SELECT COUNT(*) as count FROM ${t}`);
          stats[t] = Number(resQuery.rows[0]?.count || 0);
        } catch {
          stats[t] = 0;
        }
      }
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/properties - Paginated, filtered, searched list
  app.get('/api/properties', async (req: Request, res: Response) => {
    try {
      const queryParams: PropertyQueryParams = {
        page: req.query.page ? Number(req.query.page) : 1,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : 15,
        search: req.query.search ? String(req.query.search) : undefined,
        category: req.query.category ? String(req.query.category) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        propertyLabel: req.query.propertyLabel ? String(req.query.propertyLabel) : undefined,
        agentName: req.query.agentName ? String(req.query.agentName) : undefined,
        agencyType: req.query.agencyType ? String(req.query.agencyType) : undefined,
        zone: req.query.zone ? String(req.query.zone) : undefined,
        area: req.query.area ? String(req.query.area) : undefined,
        district: req.query.district ? String(req.query.district) : undefined,
        bedroom: req.query.bedroom ? Number(req.query.bedroom) : undefined,
        bathroom: req.query.bathroom ? Number(req.query.bathroom) : undefined,
        rentPriceMin: req.query.rentPriceMin ? Number(req.query.rentPriceMin) : undefined,
        rentPriceMax: req.query.rentPriceMax ? Number(req.query.rentPriceMax) : undefined,
        salePriceMin: req.query.salePriceMin ? Number(req.query.salePriceMin) : undefined,
        salePriceMax: req.query.salePriceMax ? Number(req.query.salePriceMax) : undefined,
        furniture: req.query.furniture ? String(req.query.furniture) : undefined,
        publishStatus: req.query.publishStatus ? String(req.query.publishStatus) : undefined,
        approvalStatus: req.query.approvalStatus ? String(req.query.approvalStatus) : undefined,
        qualityFilter: req.query.qualityFilter ? String(req.query.qualityFilter) : undefined,
        sortBy: req.query.sortBy ? String(req.query.sortBy) : 'createdAt',
        sortOrder: req.query.sortOrder === 'asc' ? 'asc' : 'desc',
      };

      if (req.query.hasPool !== undefined && req.query.hasPool !== 'All') {
        queryParams.hasPool = req.query.hasPool === 'true';
      }
      if (req.query.petFriendly !== undefined && req.query.petFriendly !== 'All') {
        queryParams.petFriendly = req.query.petFriendly === 'true';
      }
      if (req.query.isBlackList !== undefined && req.query.isBlackList !== 'All') {
        queryParams.isBlackList = req.query.isBlackList === 'true';
      }
      if (req.query.isArchived !== undefined && req.query.isArchived !== 'All') {
        queryParams.isArchived = req.query.isArchived === 'true';
      }
      if (req.query.importId) {
        queryParams.importId = String(req.query.importId);
      }
      if (req.query.propertyIds) {
        const pids = String(req.query.propertyIds).split(',').map((s) => s.trim()).filter(Boolean);
        if (pids.length > 0) {
          queryParams.propertyIds = pids;
        }
      }

      const currentUser = getUserFromReq(req);
      const result = await getProperties(queryParams);
      const maskedItems = result.data.map((p) => maskOwnerContactIfNeeded(p, currentUser));
      res.json({ ...result, data: maskedItems });
    } catch (error: any) {
      console.error('API /api/properties error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch properties' });
    }
  });

  // GET /api/properties/stats - Get global KPI metrics (Must be declared before :propertyId)
  app.get('/api/properties/stats', async (req: Request, res: Response) => {
    try {
      const stats = await getPropertyStats();
      res.json(stats);
    } catch (error: any) {
      console.error('API /api/properties/stats error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch property stats' });
    }
  });

  // POST /api/properties/bulk-delete - Bulk delete (Archive)
  app.post('/api/properties/bulk-delete', async (req: Request, res: Response) => {
    try {
      const currentUser = getUserFromReq(req);
      if (!canUserArchiveProperty(currentUser)) {
        return res.status(403).json({ error: 'Permission denied: Only Admins and Managers can archive properties' });
      }
      const { propertyIds } = req.body;
      if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
        return res.status(400).json({ error: 'No property IDs provided' });
      }
      const count = await bulkDeleteProperties(propertyIds, currentUser);
      res.json({ success: true, deletedCount: count });
    } catch (error: any) {
      console.error('API bulk-delete error:', error);
      res.status(500).json({ error: error.message || 'Failed to bulk delete' });
    }
  });

  // POST /api/properties/bulk-restore - Bulk restore archived properties
  app.post('/api/properties/bulk-restore', async (req: Request, res: Response) => {
    try {
      const currentUser = getUserFromReq(req);
      if (!canUserRestoreProperty(currentUser)) {
        return res.status(403).json({ error: 'Permission denied: Only Admins can restore archived properties' });
      }
      const { propertyIds } = req.body;
      if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
        return res.status(400).json({ error: 'No property IDs provided' });
      }
      const count = await bulkRestoreProperties(propertyIds, currentUser);
      res.json({ success: true, restoredCount: count });
    } catch (error: any) {
      console.error('API bulk-restore error:', error);
      res.status(500).json({ error: error.message || 'Failed to bulk restore' });
    }
  });

  // POST /api/properties/bulk-status - Bulk update status
  app.post('/api/properties/bulk-status', async (req: Request, res: Response) => {
    try {
      const currentUser = getUserFromReq(req);
      if (!hasPermission(currentUser, 'canEditProperty')) {
        return res.status(403).json({ error: 'Permission denied: Not authorized to update property status' });
      }
      const { propertyIds, status } = req.body;
      if (!Array.isArray(propertyIds) || propertyIds.length === 0 || !status) {
        return res.status(400).json({ error: 'Invalid parameters for bulk status update' });
      }
      const count = await bulkUpdateStatus(propertyIds, status, currentUser);
      res.json({ success: true, updatedCount: count });
    } catch (error: any) {
      console.error('API bulk-status error:', error);
      res.status(500).json({ error: error.message || 'Failed to bulk update status' });
    }
  });

  // POST /api/properties/import-mapping-analyze - Analyze column mapping
  app.post('/api/properties/import-mapping-analyze', (req: Request, res: Response) => {
    try {
      const { headers, customMapping } = req.body;
      if (!Array.isArray(headers)) {
        return res.status(400).json({ error: 'headers must be an array of column names' });
      }
      const mappingResult = analyzeColumnMapping(headers, customMapping);
      res.json({
        ...mappingResult,
        canonicalFields: CANONICAL_FIELDS,
      });
    } catch (error: any) {
      console.error('API import-mapping-analyze error:', error);
      res.status(500).json({ error: error.message || 'Failed to analyze column mapping' });
    }
  });

  // POST /api/properties/validate-file - Real file security & structure validation
  app.post('/api/properties/validate-file', async (req: Request, res: Response) => {
    try {
      const { fileName, fileSize, base64Content, mimeType } = req.body;
      if (!fileName) {
        return res.status(400).json({ error: 'fileName is required' });
      }

      const buffer = base64Content ? Buffer.from(base64Content, 'base64') : undefined;
      const size = Number(fileSize) || (buffer ? buffer.length : 0);

      // Perform deep security check: extension, path traversal, magic bytes, MIME, scripts
      const securityCheck = validateFileSecurity(fileName, size, buffer, mimeType);
      if (!securityCheck.isValid) {
        return res.status(400).json({
          success: false,
          error: securityCheck.error,
          securityCheck,
        });
      }

      // If buffer is present, test parsing structure and extract headers/rows
      let parsed = null;
      if (buffer) {
        parsed = parseSpreadsheetBuffer(buffer, securityCheck.cleanFileName, 5000);
      }

      res.json({
        success: true,
        securityCheck,
        parsed: parsed ? {
          headers: parsed.headers,
          totalRows: parsed.totalRows,
          warnings: parsed.warnings,
          sampleRows: parsed.rows.slice(0, 5),
        } : null,
      });
    } catch (error: any) {
      console.error('API validate-file error:', error);
      res.status(400).json({ success: false, error: error.message || 'File validation failed' });
    }
  });

  // POST /api/properties/import-dry-run - 100% Read-only inspection & simulation
  app.post('/api/properties/import-dry-run', async (req: Request, res: Response) => {
    try {
      const { batchRows, rawRows, options } = req.body;
      const rows = batchRows || rawRows;
      if (!Array.isArray(rows)) {
        return res.status(400).json({ error: 'batchRows or rawRows must be an array' });
      }

      const result = await executeImportDryRun(rows, options || {
        duplicateMode: 'skip',
        fileName: 'upload.xlsx',
        userName: 'Admin',
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('API import-dry-run error:', error);
      res.status(500).json({ error: error.message || 'Import dry run failed' });
    }
  });

  // POST /api/properties/import-confirm - B14 Safe Live Import execution endpoint
  app.post('/api/properties/import-confirm', async (req: Request, res: Response) => {
    try {
      const {
        importToken,
        confirmRealImport,
        fileFingerprint,
        duplicateMode,
        fileName,
        user,
        matchedImages,
      } = req.body;

      const result = await executeSafeLiveImport({
        importToken,
        confirmRealImport,
        fileFingerprint,
        duplicateMode,
        fileName,
        user: user || { name: 'Admin', role: 'Super Admin', id: 'usr-admin' },
        matchedImages,
      });

      if (!result.success) {
        return res.status(result.statusCode || 400).json(result);
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error('API import-confirm error:', error);
      res.status(500).json({
        success: false,
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        error: error.message || 'Live import execution failed',
      });
    }
  });

  // POST /api/properties/match-images - B21 Image Matching endpoint
  app.post('/api/properties/match-images', async (req: Request, res: Response) => {
    try {
      const { images, propertyCodes } = req.body;
      if (!Array.isArray(images)) {
        return res.status(400).json({ error: 'images must be an array' });
      }

      const result = await matchImagesToProperties(images, propertyCodes || []);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      console.error('API match-images error:', error);
      res.status(500).json({ error: error.message || 'Image matching failed' });
    }
  });

  // POST /api/properties/import-batch - Bulk import batch with safety gate
  app.post('/api/properties/import-batch', async (req: Request, res: Response) => {
    try {
      const { batchRows, rawRows, options } = req.body;
      const rows = batchRows || rawRows;

      // If dryRun is requested, strictly execute Dry Run (0 DB writes)
      if (options?.dryRun) {
        if (!Array.isArray(rows)) {
          return res.status(400).json({ error: 'batchRows or rawRows must be an array' });
        }
        const dryRunResult = await executeImportDryRun(rows, options);
        return res.json({ success: true, ...dryRunResult });
      }

      // If importToken is provided, route through Safe Live Import Engine
      if (options?.importToken) {
        const liveResult = await executeSafeLiveImport({
          importToken: options.importToken,
          confirmRealImport: options.confirmRealImport === true,
          fileFingerprint: options.fileFingerprint,
          duplicateMode: options.duplicateMode,
          fileName: options.fileName,
          user: options.user || { name: options.userName || 'Admin', role: options.userRole || 'Super Admin' },
        });

        if (!liveResult.success) {
          return res.status(liveResult.statusCode || 400).json(liveResult);
        }
        return res.json(liveResult);
      }

      // Safety gate: real import execution requires explicit confirmation flag
      if (!options?.confirmRealImport) {
        return res.status(403).json({
          error: 'Real import requires explicit user confirmation (confirmRealImport: true). Run dry run first.',
          dryRunRequired: true,
        });
      }

      if (!Array.isArray(rows)) {
        return res.status(400).json({ error: 'batchRows must be an array' });
      }

      const result = await importBatch(rows, options || {
        duplicateMode: 'skip',
        fileName: 'upload.xlsx',
        userName: 'Admin',
      });

      res.json(result);
    } catch (error: any) {
      console.error('API import-batch error:', error);
      res.status(500).json({ error: error.message || 'Import batch failed' });
    }
  });

  // GET /api/properties/export - Direct database export to XLSX or CSV
  app.get('/api/properties/export', async (req: Request, res: Response) => {
    try {
      const format = (req.query.format as string) === 'csv' ? 'csv' : 'xlsx';
      
      // Query up to 5000 records based on current filters
      const result = await getProperties({
        page: 1,
        pageSize: 5000,
        search: req.query.search ? String(req.query.search) : undefined,
        category: req.query.category ? String(req.query.category) : undefined,
        status: req.query.status ? String(req.query.status) : undefined,
        propertyLabel: req.query.propertyLabel ? String(req.query.propertyLabel) : undefined,
        agentName: req.query.agentName ? String(req.query.agentName) : undefined,
        zone: req.query.zone ? String(req.query.zone) : undefined,
        area: req.query.area ? String(req.query.area) : undefined,
      });

      const rows = result.data.map((p) => ({
        'Property ID': p.propertyId,
        'Project Name': escapeFormulaInjection(p.title || p.projectName),
        'Project Name (TH)': escapeFormulaInjection(p.titleTh || p.projectNameTh || ''),
        'Category': p.category,
        'Status': p.status,
        'Label': p.propertyLabel,
        'Zone': escapeFormulaInjection(p.zone),
        'Area': escapeFormulaInjection(p.area),
        'District': escapeFormulaInjection(p.district),
        'City': escapeFormulaInjection(p.city),
        'Rent Price (THB)': Number(p.rentPrice) || 0,
        'Sale Price (THB)': Number(p.price) || 0,
        'Usable Area (sq.m)': Number(p.usableArea) || 0,
        'Land Area (sq.m)': Number(p.landArea) || 0,
        'Bedrooms': p.bedrooms,
        'Bathrooms': p.bathrooms,
        'Floor': p.floor || '',
        'Year Built': p.yearBuilt || '',
        'Furniture': p.furniture,
        'Pet Friendly': p.petFriendly ? 'Yes' : 'No',
        'Private Pool': p.hasPool ? 'Yes' : 'No',
        'Agent Name': escapeFormulaInjection(p.agentName),
        'Agency Type': p.agencyType,
        'Landlord Name': escapeFormulaInjection(p.ownerName),
        'Landlord Phone': escapeFormulaInjection(p.ownerPhone),
        'Landlord Email': escapeFormulaInjection(p.ownerEmail || ''),
        'Virtual Phone 1': escapeFormulaInjection(p.virtualPhone1 || ''),
        'Virtual Phone 2': escapeFormulaInjection(p.virtualPhone2 || ''),
        'Last Follow Up': p.lastFollowUpDate || '',
        'Last Follow Up Status': p.lastFollowUpStatus || '',
        'Website Status': p.publishStatus,
        'Created At': p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Properties');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      if (format === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="peak_properties_${timestamp}.csv"`);
        return res.send(csv);
      } else {
        const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="peak_properties_${timestamp}.xlsx"`);
        return res.send(buf);
      }
    } catch (error: any) {
      console.error('API export error:', error);
      res.status(500).json({ error: error.message || 'Export failed' });
    }
  });

  // POST /api/properties - Create property
  app.post('/api/properties', async (req: Request, res: Response) => {
    try {
      const currentUser = getUserFromReq(req);
      if (!hasPermission(currentUser, 'canCreateProperty')) {
        return res.status(403).json({ error: 'Permission denied: Cannot create property' });
      }
      const propertyData = req.body.property || req.body;
      const created = await createProperty(propertyData, currentUser);
      res.status(201).json(created);
    } catch (error: any) {
      console.error('API POST /api/properties error:', error);
      res.status(400).json({ error: error.message || 'Failed to create property' });
    }
  });

  // GET /api/properties/:propertyId - Get single property (Parameter route at bottom)
  app.get('/api/properties/:propertyId', async (req: Request, res: Response) => {
    try {
      const currentUser = getUserFromReq(req);
      const property = await getPropertyByPropertyId(req.params.propertyId);
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
      res.json(maskOwnerContactIfNeeded(property, currentUser));
    } catch (error: any) {
      console.error(`API /api/properties/${req.params.propertyId} error:`, error);
      res.status(500).json({ error: error.message || 'Failed to fetch property' });
    }
  });

  // PUT /api/properties/:propertyId - Update property
  app.put('/api/properties/:propertyId', async (req: Request, res: Response) => {
    try {
      const currentUser = getUserFromReq(req);
      const existing = await getPropertyByPropertyId(req.params.propertyId);
      if (!existing) {
        return res.status(404).json({ error: 'Property not found' });
      }
      if (!canUserEditProperty(currentUser, existing as any)) {
        return res.status(403).json({ error: 'Permission denied: You do not have permission to edit this property' });
      }
      const propertyData = req.body.property || req.body;
      const updated = await updateProperty(req.params.propertyId, propertyData, currentUser);
      res.json(updated);
    } catch (error: any) {
      console.error(`API PUT /api/properties/${req.params.propertyId} error:`, error);
      res.status(400).json({ error: error.message || 'Failed to update property' });
    }
  });

  // DELETE /api/properties/:propertyId - Soft Delete (Archive) property
  app.delete('/api/properties/:propertyId', async (req: Request, res: Response) => {
    try {
      const currentUser = getUserFromReq(req);
      const existing = await getPropertyByPropertyId(req.params.propertyId);
      if (!existing) {
        return res.status(404).json({ error: 'Property not found' });
      }
      if (!canUserArchiveProperty(currentUser, existing as any)) {
        return res.status(403).json({ error: 'Permission denied: You do not have permission to archive this property' });
      }
      await deleteProperty(req.params.propertyId, currentUser);
      res.json({ success: true, message: `Property ${req.params.propertyId} archived successfully` });
    } catch (error: any) {
      console.error(`API DELETE /api/properties/${req.params.propertyId} error:`, error);
      res.status(400).json({ error: error.message || 'Failed to archive property' });
    }
  });

  // POST /api/properties/:propertyId/restore - Restore archived property
  app.post('/api/properties/:propertyId/restore', async (req: Request, res: Response) => {
    try {
      const currentUser = getUserFromReq(req);
      if (!canUserRestoreProperty(currentUser)) {
        return res.status(403).json({ error: 'Permission denied: Only Admins can restore archived properties' });
      }
      const restored = await restoreProperty(req.params.propertyId, currentUser);
      res.json({ success: true, property: restored, message: `Property ${req.params.propertyId} restored to active` });
    } catch (error: any) {
      console.error(`API restore /api/properties/${req.params.propertyId} error:`, error);
      res.status(400).json({ error: error.message || 'Failed to restore property' });
    }
  });

  // GET /api/template/download - Download official Excel Template
  app.get('/api/template/download', (req: Request, res: Response) => {
    try {
      const templateData = [
        {
          'Property ID': 'VL-2001',
          'Category': 'Villa',
          'Agent': 'Somchai Prasert',
          'Agency Type': 'Exclusive',
          'Property Label': 'Rent and Sale',
          'Property Status': 'Available',
          'Nation': 'Thailand',
          'City': 'Phuket',
          'Zone': 'Zone 2',
          'Area': 'Rawai',
          'District': 'Mueang Phuket',
          'Postal Code': '83130',
          'Villa Ownership': 'Freehold',
          'Land Ownership': 'Chanote',
          'House No': '12/8',
          'Land': '600',
          'Project': 'Rawai Palm Sanctuary Pool Villa',
          'Project TH': 'ราไวย์ ปาล์ม แซงค์ทัวรี่ พูลวิลล่า',
          'Usable Area': 450,
          'Bedroom': 4,
          'Bathroom': 4,
          'Building': 'A',
          'Floor': 1,
          'Room No': '',
          'Furniture': 'Fully Furnished',
          'Pet': 'Pets Allowed',
          'Year Build': 2023,
          'Type': 'Pool Villa',
          'Pool': 'Yes',
          'Pool Type': 'Saltwater Pool',
          'View': 'Garden & Pool View',
          'Service Include': 'Pool Cleaning, Garden Maintenance',
          'Address TH': '12/8 ซอยใสยวน ต.ราไวย์',
          'Address EN': '12/8 Soi Saiyuan, Rawai',
          'Property Info TH': 'พูลวิลล่าหรู 4 ห้องนอน ใกล้หาดราไวย์และหาดในหาน',
          'Property Info EN': 'Luxury 4-bedroom pool villa close to Rawai and Nai Harn beach',
          'Location Info TH': 'ใกล้ร้านสะดวกซื้อและร้านอาหาร 300 เมตร',
          'Location Info EN': '300m to convenience stores and restaurants',
          'Comments': 'Owner is ready to negotiate on long-term rental contract',
          'Rent Price': 180000,
          'Sale Price': 28500000,
          'Landlord Name': 'Khun Anan Kittipon',
          'Landlord Phone': '081-555-1234',
          'Landlord Email': 'anan.k@gmail.com',
          'Photo URLs': 'https://images.unsplash.com/photo-1613490493576-7fde63acd811,https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
        },
        {
          'Property ID': 'CD-3002',
          'Category': 'Condo',
          'Agent': 'Nichada Prasert',
          'Agency Type': 'Co-Broke',
          'Property Label': 'Rent',
          'Property Status': 'Available',
          'Nation': 'Thailand',
          'City': 'Phuket',
          'Zone': 'Zone 3',
          'Area': 'Patong',
          'District': 'Kathu',
          'Postal Code': '83150',
          'Villa Ownership': '',
          'Land Ownership': '',
          'House No': '',
          'Land': '',
          'Project': 'Andaman Heights Seaview Condo',
          'Project TH': 'อันดามัน ไฮท์ ซีวิว คอนโด',
          'Usable Area': 68,
          'Bedroom': 1,
          'Bathroom': 1,
          'Building': 'Tower B',
          'Floor': 12,
          'Room No': '1204',
          'Furniture': 'Fully Furnished',
          'Pet': 'Pets Not Allowed',
          'Year Build': 2022,
          'Type': 'Condo',
          'Pool': 'Yes',
          'Pool Type': 'Shared Pool',
          'View': 'Sea View',
          'Service Include': 'WiFi, Common Area Maintenance',
          'Address TH': '45 ถนนพระบารมี ต.ป่าตอง',
          'Address EN': '45 Phra Barami Rd, Patong',
          'Property Info TH': 'คอนโดวิวทะเลป่าตอง ตกแต่งโมเดิร์นพร้อมอยู่',
          'Property Info EN': 'Modern seaview condo in Patong ready to move in',
          'Location Info TH': 'ห่างจากชายหาดป่าตอง 5 นาที',
          'Location Info EN': '5 minutes drive to Patong Beach',
          'Comments': 'Minimum 1 year contract',
          'Rent Price': 45000,
          'Sale Price': 0,
          'Landlord Name': 'Khun Sasicha Mongkol',
          'Landlord Phone': '089-776-5432',
          'Landlord Email': 'sasicha.m@gmail.com',
          'Photo URLs': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Import_Template');

      // Add a Zone reference guide sheet
      const zoneRows = Object.entries(PHUKET_ZONE_MAPPING).flatMap(([zone, areas]) =>
        areas.map((area) => ({ Zone: zone, 'Valid Areas': area }))
      );
      const zoneSheet = XLSX.utils.json_to_sheet(zoneRows);
      XLSX.utils.book_append_sheet(workbook, zoneSheet, 'Phuket_Zone_Guide');

      const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="PEAK_Property_Import_Template.xlsx"');
      return res.send(buf);
    } catch (error: any) {
      console.error('API template error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate template' });
    }
  });

  // GET and POST /api/import-history & /api/properties/import-history
  app.get(['/api/import-history', '/api/properties/import-history'], async (req: Request, res: Response) => {
    try {
      const isExportCsv = req.query.export === 'csv' || req.query.format === 'csv';
      if (isExportCsv) {
        const csv = await generateImportHistoryCsv(req.query as any);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="peak_import_history_${timestamp}.csv"`);
        return res.send(csv);
      }

      const hasQueryParams =
        req.query.search !== undefined ||
        req.query.status !== undefined ||
        req.query.mode !== undefined ||
        req.query.operator !== undefined ||
        req.query.dateRange !== undefined ||
        req.query.startDate !== undefined ||
        req.query.endDate !== undefined ||
        req.query.sortBy !== undefined ||
        req.query.sortOrder !== undefined ||
        req.query.page !== undefined ||
        req.query.pageSize !== undefined ||
        req.query.format === 'paginated';

      if (hasQueryParams) {
        const result = await getImportHistory(req.query as any);
        return res.json(result);
      }

      const limit = Number(req.query.limit) || 50;
      const history = await getImportHistory(limit);
      res.json(history);
    } catch (error: any) {
      console.error('API get import-history error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch import history' });
    }
  });

  app.get(['/api/import-history/:importId', '/api/properties/import-history/:importId'], async (req: Request, res: Response) => {
    try {
      const record = await getImportHistoryById(req.params.importId);
      if (!record) {
        return res.status(404).json({ error: 'Import history record not found' });
      }
      res.json(record);
    } catch (error: any) {
      console.error('API get import-history by id error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch import history record' });
    }
  });

  app.post(['/api/import-history', '/api/properties/import-history'], async (req: Request, res: Response) => {
    try {
      const record = await recordImportHistory(req.body);
      res.status(201).json(record);
    } catch (error: any) {
      console.error('API record import-history error:', error);
      res.status(500).json({ error: error.message || 'Failed to save import history' });
    }
  });

  // GET /api/audit-logs
  app.get('/api/audit-logs', async (req: Request, res: Response) => {
    try {
      const hasQueryParams =
        req.query.importId !== undefined ||
        req.query.userName !== undefined ||
        req.query.action !== undefined ||
        req.query.search !== undefined ||
        req.query.startDate !== undefined ||
        req.query.endDate !== undefined ||
        req.query.page !== undefined ||
        req.query.pageSize !== undefined ||
        req.query.format === 'paginated';

      if (hasQueryParams) {
        const result = await getAuditLogs(req.query as any);
        return res.json(result);
      }

      const propertyId = req.query.propertyId as string | undefined;
      const limit = Number(req.query.limit) || 100;
      const logs = await getAuditLogs(propertyId, limit);
      res.json(logs);
    } catch (error: any) {
      console.error('API audit-logs error:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch audit logs' });
    }
  });

  // GET /api/data-quality - Full scan of property data quality
  app.get('/api/data-quality', async (req: Request, res: Response) => {
    try {
      const severity = req.query.severity as any;
      const field = req.query.field as string | undefined;
      const search = req.query.search as string | undefined;
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 25;

      const report = await scanPropertyDataQuality({
        severity,
        field,
        search,
        page,
        pageSize,
      });

      res.json({ success: true, ...report });
    } catch (error: any) {
      console.error('API /api/data-quality error:', error);
      res.status(500).json({ success: false, error: error.message || 'Data quality scan failed' });
    }
  });

  // GET /api/data-quality/summary - Quick summary KPIs
  app.get('/api/data-quality/summary', async (req: Request, res: Response) => {
    try {
      const report = await scanPropertyDataQuality({ pageSize: 1 });
      res.json({ success: true, summary: report.summary });
    } catch (error: any) {
      console.error('API /api/data-quality/summary error:', error);
      res.status(500).json({ success: false, error: error.message || 'Data quality summary failed' });
    }
  });

  // Database Backup and Recovery Routes
  app.get('/api/backups', async (req: Request, res: Response) => {
    try {
      const backups = await listDatabaseBackups();
      res.json(backups);
    } catch (error: any) {
      console.error('API backups error:', error);
      res.status(500).json({ error: error.message || 'Failed to list backups' });
    }
  });

  app.post('/api/backups/create', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'administrator') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Administrator privileges required',
          code: 'FORBIDDEN',
        });
      }
      const fullBackup = await systemSettingsService.createFullBackup({
        id: operator.id,
        name: operator.name,
        role: operator.role,
      });
      res.status(201).json(fullBackup);
    } catch (error: any) {
      console.error('API create backup error:', error);
      res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create backup' });
    }
  });

  app.post('/api/backups/full', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'administrator') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Administrator privileges required',
          code: 'FORBIDDEN',
        });
      }
      const fullBackup = await systemSettingsService.createFullBackup({
        id: operator.id,
        name: operator.name,
        role: operator.role,
      });
      res.status(201).json(fullBackup);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/backups/validate', async (req: Request, res: Response) => {
    try {
      const payload = req.body?.backupData || req.body?.data || req.body;
      const validation = systemSettingsService.validateBackupFile(payload);
      res.json(validation);
    } catch (error: any) {
      res.status(400).json({ valid: false, errors: [error.message] });
    }
  });

  app.post('/api/backups/restore-full', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'administrator') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Administrator privileges required',
          code: 'FORBIDDEN',
        });
      }
      const payload = req.body?.backupData || req.body?.data || req.body;
      const result = await systemSettingsService.restoreBackup(payload, {
        id: operator.id,
        name: operator.name,
        role: operator.role,
      });
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, error: error.message });
    }
  });

  app.post('/api/backups/restore', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'administrator') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Administrator privileges required',
          code: 'FORBIDDEN',
        });
      }
      const { backupId, userName } = req.body;
      if (!backupId) {
        return res.status(400).json({ error: 'backupId is required' });
      }
      const result = await restoreDatabaseBackup(backupId, userName || operator.name || 'System Admin');
      res.json(result);
    } catch (error: any) {
      console.error('API restore backup error:', error);
      res.status(error.statusCode || 500).json({ error: error.message || 'Failed to restore backup' });
    }
  });

  // -------------------------------------------------------------
  // B28 — System Settings & Administration API Routes
  // -------------------------------------------------------------

  // GET /api/settings - Get all settings categories
  app.get('/api/settings', async (req: Request, res: Response) => {
    try {
      const settings = await systemSettingsService.getAllSettings();
      res.json({ success: true, settings, data: settings });
    } catch (error: any) {
      console.error('API /api/settings error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/settings/:category - Get settings for specific category
  app.get('/api/settings/:category', async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const result = await systemSettingsService.getSettings(category);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT /api/settings/:category - Update settings category (Admin Only)
  app.put('/api/settings/:category', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'administrator') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Administrator privileges required to update system settings',
          code: 'FORBIDDEN',
        });
      }

      const { category } = req.params;
      const updated = await systemSettingsService.updateSettings(
        category,
        req.body?.data || req.body,
        { id: operator.id, name: operator.name, role: operator.role }
      );
      res.json({ success: true, ...updated });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  });

  // POST /api/settings/numbering/next - Generate next document sequence
  app.post('/api/settings/numbering/next', async (req: Request, res: Response) => {
    try {
      const entity = req.body?.entity || 'property';
      const code = await systemSettingsService.getNextNumber(entity);
      res.json({ success: true, entity, nextNumber: code, code });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/permissions/catalog - Get full list of available permissions
  app.get('/api/permissions/catalog', (req: Request, res: Response) => {
    res.json({ success: true, permissions: PERMISSION_CATALOG });
  });

  // GET /api/roles - List all roles with permission matrix
  app.get('/api/roles', async (req: Request, res: Response) => {
    try {
      const roles = await systemSettingsService.getRoles();
      res.json({ success: true, roles, items: roles });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/roles/:id - Get single role
  app.get('/api/roles/:id', async (req: Request, res: Response) => {
    try {
      const role = await systemSettingsService.getRoleById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, error: `Role ${req.params.id} not found` });
      }
      res.json({ success: true, role });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/roles - Create new custom role (Admin Only)
  app.post('/api/roles', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'administrator') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Administrator privileges required to manage roles',
          code: 'FORBIDDEN',
        });
      }

      const role = await systemSettingsService.createRole(req.body, {
        id: operator.id,
        name: operator.name,
        role: operator.role,
      });
      res.status(201).json({ success: true, role });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, error: error.message });
    }
  });

  // PUT /api/roles/:id - Update role permissions (Admin Only)
  app.put('/api/roles/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'administrator') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Administrator privileges required to manage roles',
          code: 'FORBIDDEN',
        });
      }

      const updated = await systemSettingsService.updateRole(req.params.id, req.body, {
        id: operator.id,
        name: operator.name,
        role: operator.role,
      });
      res.json({ success: true, role: updated });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/roles/:id - Delete role (Admin Only, non-system only)
  app.delete('/api/roles/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'administrator') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Administrator privileges required to manage roles',
          code: 'FORBIDDEN',
        });
      }

      const result = await systemSettingsService.deleteRole(req.params.id, {
        id: operator.id,
        name: operator.name,
        role: operator.role,
      });
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, error: error.message });
    }
  });

  // GET /api/users/:id/overrides - Get permission overrides for user
  app.get('/api/users/:id/overrides', async (req: Request, res: Response) => {
    try {
      const overrides = await systemSettingsService.getUserPermissionOverrides(req.params.id);
      res.json({ success: true, overrides });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/users/:id/overrides - Set permission override (Admin Only)
  app.post('/api/users/:id/overrides', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'administrator') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Administrator privileges required to set permission overrides',
          code: 'FORBIDDEN',
        });
      }

      const { permissionKey, granted } = req.body;
      if (!permissionKey || granted === undefined) {
        return res.status(400).json({ success: false, error: 'permissionKey and granted boolean are required' });
      }

      const override = await systemSettingsService.setUserPermissionOverride(
        req.params.id,
        permissionKey,
        Boolean(granted),
        { id: operator.id, name: operator.name, role: operator.role }
      );
      res.json({ success: true, override });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/users/:id/overrides/:key - Delete permission override (Admin Only)
  app.delete('/api/users/:id/overrides/:key', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower !== 'admin' && roleLower !== 'administrator') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Administrator privileges required to delete permission overrides',
          code: 'FORBIDDEN',
        });
      }

      const result = await systemSettingsService.deleteUserPermissionOverride(
        req.params.id,
        req.params.key,
        { id: operator.id, name: operator.name, role: operator.role }
      );
      res.json(result);
    } catch (error: any) {
      res.status(error.statusCode || 400).json({ success: false, error: error.message });
    }
  });

  // GET /api/users/:id/effective-permissions - Get computed effective permissions for a user
  app.get('/api/users/:id/effective-permissions', async (req: Request, res: Response) => {
    try {
      const perms = await systemSettingsService.getEffectiveUserPermissions(req.params.id);
      res.json({ success: true, userId: req.params.id, effectivePermissions: perms });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // -------------------------------------------------------------
  // B20 — Users & Staff API Routes (PostgreSQL + Drizzle)
  // -------------------------------------------------------------

  // GET /api/users - List users with search, role filter, status filter, pagination, stats
  app.get('/api/users', async (req: Request, res: Response) => {
    try {
      const { search, role, status, page, pageSize, sortBy, sortOrder } = req.query;
      const result = await userService.getUsers({
        search: search as string,
        role: role as string,
        status: status as string,
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 50,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      });
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('API /api/users error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch users' });
    }
  });

  // GET /api/users/:id - Get single user by ID
  app.get('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({ success: true, user });
    } catch (error: any) {
      console.error('API /api/users/:id error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get user' });
    }
  });

  // GET /api/users/:id/properties - Get properties assigned to agent
  app.get('/api/users/:id/properties', async (req: Request, res: Response) => {
    try {
      const properties = await userService.getAgentProperties(req.params.id);
      res.json({ success: true, properties, count: properties.length });
    } catch (error: any) {
      console.error('API /api/users/:id/properties error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get agent properties' });
    }
  });

  // POST /api/users - Create User (Backend Role & Permission Check)
  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const operatorRole = normalizeRole(operator.role);

      // Backend permission check: Only Admin and Manager can create users
      if (operatorRole !== 'Admin' && operatorRole !== 'Manager') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient permissions to create users. Requires Admin or Manager role.',
        });
      }

      const targetRole = normalizeRole(req.body.role);
      // Manager cannot create Admin
      if (operatorRole === 'Manager' && targetRole === 'Admin') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Manager cannot create Admin users. Requires Admin role.',
        });
      }

      const newUser = await userService.createUser(req.body, {
        id: operator.id,
        name: operator.name,
        role: operatorRole,
      });

      res.status(201).json({ success: true, user: newUser });
    } catch (error: any) {
      console.error('API POST /api/users error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to create user' });
    }
  });

  // PUT /api/users/:id - Update User (Backend Role & Permission Check)
  app.put('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const operatorRole = normalizeRole(operator.role);

      const targetUserId = req.params.id;

      // Backend permission check: Admin or Manager can update anyone; Agents can update their own profile
      if (operatorRole !== 'Admin' && operatorRole !== 'Manager' && operator.id !== targetUserId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient permissions to edit other users. Requires Admin or Manager role.',
        });
      }

      const targetUser = await userService.getUserById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Manager cannot edit an Admin or promote to Admin
      if (operatorRole === 'Manager') {
        if (targetUser.role === 'Admin') {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Manager cannot edit an Admin user.',
          });
        }
        if (req.body.role && normalizeRole(req.body.role) === 'Admin') {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Manager cannot promote user to Admin.',
          });
        }
      }

      const updated = await userService.updateUser(targetUserId, req.body, {
        id: operator.id,
        name: operator.name,
        role: operatorRole,
      });

      res.json({ success: true, user: updated });
    } catch (error: any) {
      console.error('API PUT /api/users/:id error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to update user' });
    }
  });

  // PATCH /api/users/:id/status - Toggle Active / Inactive (Backend Role & Permission Check)
  app.patch('/api/users/:id/status', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const operatorRole = normalizeRole(operator.role);

      if (operatorRole !== 'Admin' && operatorRole !== 'Manager') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient permissions to change user status.',
        });
      }

      const targetUser = await userService.getUserById(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (operatorRole === 'Manager' && targetUser.role === 'Admin') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Manager cannot change Admin user status.',
        });
      }

      const updated = await userService.toggleUserStatus(req.params.id, {
        id: operator.id,
        name: operator.name,
        role: operatorRole,
      });

      res.json({ success: true, user: updated });
    } catch (error: any) {
      console.error('API PATCH /api/users/:id/status error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to toggle user status' });
    }
  });

  // POST /api/users/:id/toggle-status - Toggle Active / Inactive
  app.post('/api/users/:id/toggle-status', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const operatorRole = normalizeRole(operator.role);

      if (operatorRole !== 'Admin' && operatorRole !== 'Manager') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient permissions to change user status.',
        });
      }

      const targetUser = await userService.getUserById(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (operatorRole === 'Manager' && targetUser.role === 'Admin') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Manager cannot change Admin user status.',
        });
      }

      const updated = await userService.toggleUserStatus(req.params.id, {
        id: operator.id,
        name: operator.name,
        role: operatorRole,
      });

      res.json({ success: true, user: updated });
    } catch (error: any) {
      console.error('API toggle-status error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to toggle user status' });
    }
  });

  // DELETE /api/users/:id - Soft Delete / Deactivate User (Strict Requirement: NEVER Hard Delete)
  app.delete('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const operatorRole = normalizeRole(operator.role);

      if (operatorRole !== 'Admin' && operatorRole !== 'Manager') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient permissions to deactivate users.',
        });
      }

      const targetUser = await userService.getUserById(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (operatorRole === 'Manager' && targetUser.role === 'Admin') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Manager cannot deactivate Admin users.',
        });
      }

      const result = await userService.deactivateUser(req.params.id, {
        id: operator.id,
        name: operator.name,
        role: operatorRole,
      });

      res.json({
        success: true,
        message: 'User deactivated successfully (Soft delete preserved).',
        user: result,
      });
    } catch (error: any) {
      console.error('API DELETE /api/users/:id error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to deactivate user' });
    }
  });

  // -------------------------------------------------------------
  // B22 — Contracts & Word (.docx) Management API
  // -------------------------------------------------------------

  // Static directory for generated Word files and contract uploads
  app.use('/generated_contracts', express.static(GENERATED_CONTRACTS_DIR));
  const CONTRACT_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'contracts');
  if (!fs.existsSync(CONTRACT_UPLOADS_DIR)) {
    fs.mkdirSync(CONTRACT_UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads/contracts', express.static(CONTRACT_UPLOADS_DIR));

  // GET /api/contracts — List and search contracts
  app.get('/api/contracts', async (req: Request, res: Response) => {
    try {
      const queryParams: ContractQueryParams = {
        search: req.query.search as string | undefined,
        contractType: req.query.contractType as string | undefined,
        status: req.query.status as string | undefined,
        propertyId: req.query.propertyId as string | undefined,
        agent: req.query.agent as string | undefined,
        isArchived: req.query.isArchived as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50,
      };

      const result = await contractService.getContracts(queryParams);
      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('API GET /api/contracts error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch contracts' });
    }
  });

  // GET /api/contracts/:id — Get single contract
  app.get('/api/contracts/:id', async (req: Request, res: Response) => {
    try {
      const contract = await contractService.getContractById(req.params.id);
      if (!contract) {
        return res.status(404).json({ success: false, error: 'Contract not found' });
      }
      res.json({ success: true, contract });
    } catch (error: any) {
      console.error('API GET /api/contracts/:id error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get contract' });
    }
  });

  // POST /api/contracts — Create contract + auto-generate Word (.docx)
  app.post('/api/contracts', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const created = await contractService.createContract(req.body, operator);
      res.status(201).json({
        success: true,
        message: 'Contract created successfully with Word (.docx) document.',
        contract: created,
      });
    } catch (error: any) {
      console.error('API POST /api/contracts error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to create contract' });
    }
  });

  // PUT /api/contracts/:id — Edit contract + generate new Word version
  app.put('/api/contracts/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const updated = await contractService.updateContract(req.params.id, req.body, operator);
      res.json({
        success: true,
        message: 'Contract updated successfully and new Word version generated.',
        contract: updated,
      });
    } catch (error: any) {
      console.error('API PUT /api/contracts/:id error:', error);
      const status = error.message?.includes('Unauthorized') ? 403 : 400;
      res.status(status).json({ success: false, error: error.message || 'Failed to update contract' });
    }
  });

  // PATCH /api/contracts/:id/status — Update contract status
  app.patch('/api/contracts/:id/status', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }
      const updated = await contractService.updateStatus(req.params.id, status, operator);
      res.json({
        success: true,
        message: `Contract status updated to ${status}.`,
        contract: updated,
      });
    } catch (error: any) {
      console.error('API PATCH /api/contracts/:id/status error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to update status' });
    }
  });

  // DELETE /api/contracts/:id — Soft delete contract (isArchived = true)
  app.delete('/api/contracts/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const updated = await contractService.archiveContract(req.params.id, operator);
      res.json({
        success: true,
        message: 'Contract archived successfully (Soft deleted, history preserved).',
        contract: updated,
      });
    } catch (error: any) {
      console.error('API DELETE /api/contracts/:id error:', error);
      const status = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(status).json({ success: false, error: error.message || 'Failed to archive contract' });
    }
  });

  // POST /api/contracts/:id/generate-docx — Manually trigger Word generation
  app.post('/api/contracts/:id/generate-docx', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const result = await contractService.regenerateWord(req.params.id, operator);
      res.json({
        success: true,
        message: `Word document version ${result.file.version} generated successfully.`,
        ...result,
      });
    } catch (error: any) {
      console.error('API POST /api/contracts/:id/generate-docx error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to generate Word document' });
    }
  });

  // GET /api/contracts/:id/download-docx — Direct download stream of the latest Word docx
  app.get('/api/contracts/:id/download-docx', async (req: Request, res: Response) => {
    try {
      const contract = await contractService.getContractById(req.params.id);
      if (!contract) {
        return res.status(404).json({ success: false, error: 'Contract not found' });
      }

      const wordFiles = (contract.generatedWordFiles as any[]) || [];
      const requestedVersion = req.query.version ? parseInt(req.query.version as string, 10) : null;
      let targetFile = requestedVersion
        ? wordFiles.find((f) => f.version === requestedVersion)
        : wordFiles[0];

      if (!targetFile && contract.currentWordFileUrl) {
        const basename = path.basename(contract.currentWordFileUrl);
        const diskPath = path.join(GENERATED_CONTRACTS_DIR, basename);
        if (fs.existsSync(diskPath)) {
          targetFile = { filePath: diskPath, fileName: basename };
        }
      }

      if (!targetFile || !targetFile.filePath || !fs.existsSync(targetFile.filePath)) {
        // Generate freshly if not found
        const operator = getUserFromReq(req);
        const regen = await contractService.regenerateWord(contract.id, operator);
        targetFile = regen.file;
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(targetFile.fileName || 'Contract.docx')}"`);
      const stream = fs.createReadStream(targetFile.filePath);
      stream.pipe(res);
    } catch (error: any) {
      console.error('API download docx error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to download document' });
    }
  });

  // POST /api/contracts/upload — Safe upload for House Registration, Thai ID, Passport, and Attachments
  app.post('/api/contracts/upload', async (req: Request, res: Response) => {
    try {
      const { fileName, fileData, fileType } = req.body;
      if (!fileName || !fileData) {
        return res.status(400).json({ success: false, error: 'fileName and fileData are required' });
      }

      // Security check: strictly disallow dangerous extensions
      const dangerousExtensions = ['.exe', '.sh', '.bat', '.cmd', '.js', '.vbs', '.php', '.py', '.bin', '.msi', '.jar'];
      const ext = path.extname(fileName).toLowerCase();
      if (dangerousExtensions.includes(ext)) {
        return res.status(400).json({ success: false, error: `Upload of executable/script files (${ext}) is forbidden.` });
      }

      // Sanitize filename to prevent directory traversal
      const cleanBaseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${Date.now()}_${cleanBaseName}`;
      const savePath = path.join(CONTRACT_UPLOADS_DIR, uniqueFileName);

      // Handle base64 data url or raw base64
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Max size limit: 15MB
      if (buffer.length > 15 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'File size exceeds maximum allowed 15MB' });
      }

      fs.writeFileSync(savePath, buffer);

      const relativeUrl = `/uploads/contracts/${uniqueFileName}`;
      res.json({
        success: true,
        file: {
          id: `att-${Date.now()}`,
          name: fileName,
          savedName: uniqueFileName,
          size: buffer.length,
          type: fileType || 'application/octet-stream',
          url: relativeUrl,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('API upload contract file error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to process file upload' });
    }
  });

  // -------------------------------------------------------------
  // B23 — Payment Management Lite API Routes
  // -------------------------------------------------------------

  const PAYMENT_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'receipts');
  if (!fs.existsSync(PAYMENT_UPLOADS_DIR)) {
    fs.mkdirSync(PAYMENT_UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads/receipts', express.static(PAYMENT_UPLOADS_DIR));

  // GET /api/payments/schedules — List payment schedules with filters & summary
  app.get('/api/payments/schedules', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const result = await paymentService.getSchedules(
        {
          contractId: req.query.contractId as string | undefined,
          propertyId: req.query.propertyId as string | undefined,
          status: req.query.status as string | undefined,
          paymentType: req.query.paymentType as string | undefined,
          startDate: req.query.startDate as string | undefined,
          endDate: req.query.endDate as string | undefined,
          search: req.query.search as string | undefined,
          isArchived: req.query.isArchived as string | undefined,
        },
        operator
      );
      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('API GET /api/payments/schedules error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch payment schedules' });
    }
  });

  // GET /api/payments/schedules/:id — Get single schedule by ID
  app.get('/api/payments/schedules/:id', async (req: Request, res: Response) => {
    try {
      const result = await paymentService.getScheduleById(req.params.id);
      if (!result.schedule) {
        return res.status(404).json({ success: false, error: 'Payment schedule not found' });
      }
      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('API GET /api/payments/schedules/:id error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch schedule' });
    }
  });

  // POST /api/payments/schedules — Create manual payment schedule
  app.post('/api/payments/schedules', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const created = await paymentService.createSchedule(req.body, operator);
      res.status(201).json({
        success: true,
        message: 'Payment schedule created successfully',
        schedule: created,
      });
    } catch (error: any) {
      console.error('API POST /api/payments/schedules error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to create payment schedule' });
    }
  });

  // PUT /api/payments/schedules/:id — Update payment schedule
  app.put('/api/payments/schedules/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const updated = await paymentService.updateSchedule(req.params.id, req.body, operator);
      res.json({
        success: true,
        message: 'Payment schedule updated successfully',
        schedule: updated,
      });
    } catch (error: any) {
      console.error('API PUT /api/payments/schedules/:id error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to update payment schedule' });
    }
  });

  // DELETE /api/payments/schedules/:id — Cancel/Archive payment schedule (Soft delete, RBAC protected)
  app.delete('/api/payments/schedules/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const cancelled = await paymentService.cancelOrArchiveSchedule(req.params.id, operator);
      res.json({
        success: true,
        message: 'Payment schedule cancelled and archived (soft deleted)',
        schedule: cancelled,
      });
    } catch (error: any) {
      console.error('API DELETE /api/payments/schedules/:id error:', error);
      const status = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(status).json({ success: false, error: error.message || 'Failed to cancel schedule' });
    }
  });

  // GET /api/payments/records — List actual payment transactions
  app.get('/api/payments/records', async (req: Request, res: Response) => {
    try {
      const records = await paymentService.getPaymentRecords({
        contractId: req.query.contractId as string | undefined,
        paymentScheduleId: req.query.paymentScheduleId as string | undefined,
      });
      res.json({
        success: true,
        records,
      });
    } catch (error: any) {
      console.error('API GET /api/payments/records error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch payment records' });
    }
  });

  // POST /api/payments/records — Record an actual payment transaction
  app.post('/api/payments/records', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const result = await paymentService.recordPayment(req.body, operator);
      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        ...result,
      });
    } catch (error: any) {
      console.error('API POST /api/payments/records error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to record payment' });
    }
  });

  // POST /api/payments/records/:id/attach-receipt — Attach proof of payment
  app.post('/api/payments/records/:id/attach-receipt', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { receiptFile } = req.body;
      if (!receiptFile) {
        return res.status(400).json({ success: false, error: 'receiptFile is required' });
      }
      const updated = await paymentService.attachReceipt(req.params.id, receiptFile, operator);
      res.json({
        success: true,
        message: 'Receipt attached successfully',
        record: updated,
      });
    } catch (error: any) {
      console.error('API POST /api/payments/records/:id/attach-receipt error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to attach receipt' });
    }
  });

  // GET /api/contracts/:id/payments — Get payment summary and schedule linked to contract (B22 Integration)
  app.get('/api/contracts/:id/payments', async (req: Request, res: Response) => {
    try {
      const summary = await paymentService.getContractPaymentSummary(req.params.id);
      res.json({
        success: true,
        ...summary,
      });
    } catch (error: any) {
      console.error('API GET /api/contracts/:id/payments error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get contract payments' });
    }
  });

  // POST /api/contracts/:id/generate-payment-schedule — Generate schedule from Contract terms
  app.post('/api/contracts/:id/generate-payment-schedule', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const schedules = await paymentService.generateScheduleFromContract(req.params.id, operator);
      res.json({
        success: true,
        message: `Payment schedule generated successfully (${schedules.length} items)`,
        schedules,
      });
    } catch (error: any) {
      console.error('API POST /api/contracts/:id/generate-payment-schedule error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to generate schedule' });
    }
  });

  // POST /api/payments/upload-receipt — Secure receipt upload (JPG, JPEG, PNG, PDF)
  app.post('/api/payments/upload-receipt', async (req: Request, res: Response) => {
    try {
      const { fileName, fileData, fileType } = req.body;
      if (!fileName || !fileData) {
        return res.status(400).json({ success: false, error: 'fileName and fileData are required' });
      }

      // Security check: strictly allow only JPG, JPEG, PNG, PDF
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
      const ext = path.extname(fileName).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return res.status(400).json({
          success: false,
          error: `Invalid file extension (${ext}). Only JPG, JPEG, PNG, and PDF are permitted.`,
        });
      }

      // Dangerous extension blacklist safety check
      const dangerousExtensions = ['.exe', '.sh', '.bat', '.cmd', '.js', '.vbs', '.php', '.py', '.bin', '.msi', '.jar', '.html'];
      if (dangerousExtensions.includes(ext)) {
        return res.status(400).json({ success: false, error: `Malicious or executable file upload forbidden.` });
      }

      // Sanitize filename to prevent directory traversal
      const cleanBaseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${Date.now()}_receipt_${cleanBaseName}`;
      const savePath = path.join(PAYMENT_UPLOADS_DIR, uniqueFileName);

      // Handle base64
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Max size limit: 10MB
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'Receipt file size exceeds maximum allowed 10MB' });
      }

      fs.writeFileSync(savePath, buffer);

      const relativeUrl = `/uploads/receipts/${uniqueFileName}`;
      res.json({
        success: true,
        file: {
          fileName,
          fileUrl: relativeUrl,
          fileType: fileType || (ext === '.pdf' ? 'application/pdf' : `image/${ext.replace('.', '')}`),
          fileSize: buffer.length,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('API upload receipt error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to upload receipt' });
    }
  });

  // -------------------------------------------------------------
  // B24 — Viewing / Appointment Management Lite Endpoints
  // -------------------------------------------------------------

  // GET /api/viewings — List all viewings with filters
  app.get('/api/viewings', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const {
        agentId,
        agentName,
        status,
        startDate,
        endDate,
        search,
        customerId,
        propertyId,
        isArchived,
      } = req.query;

      const list = await viewingService.getViewings(
        {
          agentId: agentId as string,
          agentName: agentName as string,
          status: status as string,
          startDate: startDate as string,
          endDate: endDate as string,
          search: search as string,
          customerId: customerId as string,
          propertyId: propertyId as string,
          isArchived: isArchived as string,
        },
        operator
      );

      res.json({
        success: true,
        count: list.length,
        data: list,
      });
    } catch (error: any) {
      console.error('API GET /api/viewings error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to retrieve viewings' });
    }
  });

  // GET /api/viewings/customer/:customerId — Customer viewing history
  app.get('/api/viewings/customer/:customerId', async (req: Request, res: Response) => {
    try {
      const list = await viewingService.getViewingsByCustomer(req.params.customerId);
      res.json({
        success: true,
        count: list.length,
        data: list,
      });
    } catch (error: any) {
      console.error('API GET /api/viewings/customer/:customerId error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to retrieve customer viewing history' });
    }
  });

  // GET /api/viewings/property/:propertyId — Property viewing history
  app.get('/api/viewings/property/:propertyId', async (req: Request, res: Response) => {
    try {
      const list = await viewingService.getViewingsByProperty(req.params.propertyId);
      res.json({
        success: true,
        count: list.length,
        data: list,
      });
    } catch (error: any) {
      console.error('API GET /api/viewings/property/:propertyId error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to retrieve property viewing history' });
    }
  });

  // GET /api/viewings/:id — Get viewing by ID or viewingCode
  app.get('/api/viewings/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const viewing = await viewingService.getViewingById(req.params.id, operator);
      res.json({
        success: true,
        viewing,
      });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message || 'Viewing appointment not found' });
    }
  });

  // POST /api/viewings — Schedule new viewing appointment
  app.post('/api/viewings', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const viewing = await viewingService.createViewing(req.body, operator);
      res.status(201).json({
        success: true,
        message: 'Viewing appointment scheduled successfully',
        viewing,
      });
    } catch (error: any) {
      console.error('API POST /api/viewings error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to schedule viewing' });
    }
  });

  // PUT /api/viewings/:id — Edit/update viewing appointment
  app.put('/api/viewings/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const viewing = await viewingService.updateViewing(req.params.id, req.body, operator);
      res.json({
        success: true,
        message: 'Viewing appointment updated successfully',
        viewing,
      });
    } catch (error: any) {
      console.error('API PUT /api/viewings/:id error:', error);
      const status = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(status).json({ success: false, error: error.message || 'Failed to update viewing' });
    }
  });

  // POST /api/viewings/:id/cancel — Cancel viewing appointment
  app.post('/api/viewings/:id/cancel', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { reason } = req.body;
      const viewing = await viewingService.cancelViewing(req.params.id, reason, operator);
      res.json({
        success: true,
        message: 'Viewing appointment cancelled',
        viewing,
      });
    } catch (error: any) {
      console.error('API POST /api/viewings/:id/cancel error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to cancel viewing' });
    }
  });

  // POST /api/viewings/:id/status — Quick status change
  app.post('/api/viewings/:id/status', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }
      const viewing = await viewingService.updateViewing(req.params.id, { status }, operator);
      res.json({
        success: true,
        message: `Viewing appointment status updated to ${viewing.status}`,
        viewing,
      });
    } catch (error: any) {
      console.error('API POST /api/viewings/:id/status error:', error);
      const statusCode = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(statusCode).json({ success: false, error: error.message || 'Failed to update status' });
    }
  });

  // DELETE /api/viewings/:id — Soft delete viewing (Admin/Manager only)
  app.delete('/api/viewings/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const viewing = await viewingService.softDeleteViewing(req.params.id, operator);
      res.json({
        success: true,
        message: `Viewing appointment ${viewing.viewingCode} soft-deleted successfully`,
        viewing,
      });
    } catch (error: any) {
      console.error('API DELETE /api/viewings/:id error:', error);
      const statusCode = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(statusCode).json({ success: false, error: error.message || 'Failed to delete viewing' });
    }
  });

  // =============================================================
  // B25 — Client / CRM Management Lite Endpoints
  // =============================================================

  // GET /api/clients/pipeline/summary — Lead / Sales Pipeline stages summary & deal value
  app.get('/api/clients/pipeline/summary', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const summary = await clientService.getPipelineSummary(operator);
      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('API GET /api/clients/pipeline/summary error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get pipeline summary' });
    }
  });

  // GET /api/clients/follow-ups/summary — Summary counts (overdue, due today, upcoming)
  app.get('/api/clients/follow-ups/summary', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const summary = await clientService.getFollowUpSummary(operator);
      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('API GET /api/clients/follow-ups/summary error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get follow-up summary' });
    }
  });

  // GET /api/clients — List clients with search, filter, pagination
  app.get('/api/clients', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { clients, total } = await clientService.getClients(req.query, operator);
      res.json({
        success: true,
        data: clients,
        total,
      });
    } catch (error: any) {
      console.error('API GET /api/clients error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to retrieve clients' });
    }
  });

  // GET /api/clients/:id — Client detail with properties, viewings, contracts, payments, follow-ups
  app.get('/api/clients/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const client = await clientService.getClientById(req.params.id, operator);
      res.json({
        success: true,
        client,
      });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message || 'Client not found' });
    }
  });

  // POST /api/clients — Create new client
  app.post('/api/clients', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const client = await clientService.createClient(req.body, operator);
      res.status(201).json({
        success: true,
        message: 'Client created successfully',
        client,
      });
    } catch (error: any) {
      console.error('API POST /api/clients error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to create client' });
    }
  });

  // PUT /api/clients/:id — Update client
  app.put('/api/clients/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const client = await clientService.updateClient(req.params.id, req.body, operator);
      res.json({
        success: true,
        message: 'Client updated successfully',
        client,
      });
    } catch (error: any) {
      console.error('API PUT /api/clients/:id error:', error);
      const status = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(status).json({ success: false, error: error.message || 'Failed to update client' });
    }
  });

  // PATCH /api/clients/:id/status — Quick change status
  app.patch('/api/clients/:id/status', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }
      const client = await clientService.changeStatus(req.params.id, status, operator);
      res.json({
        success: true,
        message: `Client status changed to ${client.status}`,
        client,
      });
    } catch (error: any) {
      console.error('API PATCH /api/clients/:id/status error:', error);
      const statusCode = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(statusCode).json({ success: false, error: error.message || 'Failed to change status' });
    }
  });

  // PATCH /api/clients/:id/pipeline-stage — Change pipeline stage with optional lostReason
  app.patch('/api/clients/:id/pipeline-stage', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { stage, status, lostReason } = req.body;
      const targetStage = stage || status;
      if (!targetStage) {
        return res.status(400).json({ success: false, error: 'Pipeline stage is required' });
      }
      const client = await clientService.changePipelineStage(req.params.id, targetStage, lostReason, operator);
      res.json({
        success: true,
        message: `Pipeline stage updated to ${client.status}`,
        client,
      });
    } catch (error: any) {
      console.error('API PATCH /api/clients/:id/pipeline-stage error:', error);
      const statusCode = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(statusCode).json({ success: false, error: error.message || 'Failed to change pipeline stage' });
    }
  });

  // PATCH /api/clients/:id/assign — Assign Agent (Manager/Admin)
  app.patch('/api/clients/:id/assign', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { agentId, agentName } = req.body;
      if (!agentId) {
        return res.status(400).json({ success: false, error: 'agentId is required' });
      }
      const client = await clientService.assignAgent(req.params.id, agentId, agentName, operator);
      res.json({
        success: true,
        message: `Client assigned to ${client.assignedAgentName}`,
        client,
      });
    } catch (error: any) {
      console.error('API PATCH /api/clients/:id/assign error:', error);
      const statusCode = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(statusCode).json({ success: false, error: error.message || 'Failed to assign agent' });
    }
  });

  // POST /api/clients/:id/properties — Link property
  app.post('/api/clients/:id/properties', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { propertyId, notes } = req.body;
      if (!propertyId) {
        return res.status(400).json({ success: false, error: 'propertyId is required' });
      }
      const link = await clientService.linkProperty(req.params.id, propertyId, notes, operator);
      res.status(201).json({
        success: true,
        message: 'Property linked to client',
        link,
      });
    } catch (error: any) {
      console.error('API POST /api/clients/:id/properties error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to link property' });
    }
  });

  // DELETE /api/clients/:id/properties/:propertyId — Unlink property
  app.delete('/api/clients/:id/properties/:propertyId', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      await clientService.unlinkProperty(req.params.id, req.params.propertyId, operator);
      res.json({
        success: true,
        message: 'Property unlinked from client',
      });
    } catch (error: any) {
      console.error('API DELETE /api/clients/:id/properties/:propertyId error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to unlink property' });
    }
  });

  // POST /api/clients/:id/follow-ups — Add Follow-up
  app.post('/api/clients/:id/follow-ups', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const followUp = await clientService.addFollowUp(req.params.id, req.body, operator);
      res.status(201).json({
        success: true,
        message: 'Follow-up created successfully',
        followUp,
      });
    } catch (error: any) {
      console.error('API POST /api/clients/:id/follow-ups error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to add follow-up' });
    }
  });

  // GET /api/follow-ups — List & search follow-ups (B27)
  app.get('/api/follow-ups', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const result = await clientService.getFollowUps(req.query, operator);
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        summary: result.summary,
      });
    } catch (error: any) {
      console.error('API GET /api/follow-ups error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to list follow-ups' });
    }
  });

  // GET /api/clients/follow-ups — Alias to list & search follow-ups
  app.get('/api/clients/follow-ups', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const result = await clientService.getFollowUps(req.query, operator);
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        summary: result.summary,
      });
    } catch (error: any) {
      console.error('API GET /api/clients/follow-ups error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to list follow-ups' });
    }
  });

  // GET /api/follow-ups/:id — Get single follow-up task
  app.get('/api/follow-ups/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const followUp = await clientService.getFollowUpById(req.params.id, operator);
      res.json({
        success: true,
        followUp,
      });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message || 'Follow-up not found' });
    }
  });

  // POST /api/follow-ups — Create follow-up task
  app.post('/api/follow-ups', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const followUp = await clientService.createFollowUpTask(req.body, operator);
      res.status(201).json({
        success: true,
        message: 'Follow-up task created successfully',
        followUp,
      });
    } catch (error: any) {
      console.error('API POST /api/follow-ups error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to create follow-up task' });
    }
  });

  // PUT /api/follow-ups/:id — Update follow-up task
  app.put('/api/follow-ups/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const followUp = await clientService.updateFollowUp(req.params.id, req.body, operator);
      res.json({
        success: true,
        message: 'Follow-up task updated successfully',
        followUp,
      });
    } catch (error: any) {
      console.error('API PUT /api/follow-ups/:id error:', error);
      const status = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(status).json({ success: false, error: error.message || 'Failed to update follow-up task' });
    }
  });

  // PATCH /api/follow-ups/:id/status — Quick change status
  app.patch('/api/follow-ups/:id/status', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { status, reason, notes } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }
      let followUp;
      if (status === 'Completed') {
        followUp = await clientService.completeFollowUp(req.params.id, operator);
      } else if (status === 'Cancelled') {
        followUp = await clientService.cancelFollowUp(req.params.id, reason || notes || '', operator);
      } else {
        followUp = await clientService.updateFollowUp(req.params.id, { status }, operator);
      }
      res.json({
        success: true,
        message: `Follow-up status changed to ${followUp.status}`,
        followUp,
      });
    } catch (error: any) {
      console.error('API PATCH /api/follow-ups/:id/status error:', error);
      const statusCode = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(statusCode).json({ success: false, error: error.message || 'Failed to change follow-up status' });
    }
  });

  // PATCH /api/follow-ups/:id/cancel — Cancel follow up task
  app.patch('/api/follow-ups/:id/cancel', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { reason, notes } = req.body;
      const followUp = await clientService.cancelFollowUp(req.params.id, reason || notes || '', operator);
      res.json({
        success: true,
        message: 'Follow-up task cancelled',
        followUp,
      });
    } catch (error: any) {
      console.error('API PATCH /api/follow-ups/:id/cancel error:', error);
      const statusCode = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(statusCode).json({ success: false, error: error.message || 'Failed to cancel follow-up' });
    }
  });

  // DELETE /api/follow-ups/:id — Soft delete follow-up task (Admin/Manager)
  app.delete('/api/follow-ups/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const followUp = await clientService.softDeleteFollowUp(req.params.id, operator);
      res.json({
        success: true,
        message: 'Follow-up task deleted successfully',
        followUp,
      });
    } catch (error: any) {
      console.error('API DELETE /api/follow-ups/:id error:', error);
      const statusCode = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(statusCode).json({ success: false, error: error.message || 'Failed to delete follow-up task' });
    }
  });

  // PATCH /api/clients/follow-ups/:followUpId/complete — Complete follow up
  app.patch('/api/clients/follow-ups/:followUpId/complete', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const followUp = await clientService.completeFollowUp(req.params.followUpId, operator);
      res.json({
        success: true,
        message: 'Follow-up marked as completed',
        followUp,
      });
    } catch (error: any) {
      console.error('API PATCH /api/clients/follow-ups/:followUpId/complete error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to complete follow-up' });
    }
  });

  // POST /api/clients/:id/notes — Add lead note
  app.post('/api/clients/:id/notes', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { note } = req.body;
      if (!note || !note.trim()) {
        return res.status(400).json({ success: false, error: 'Note content is required' });
      }
      const client = await clientService.addLeadNote(req.params.id, note, operator);
      res.json({
        success: true,
        message: 'Lead note added successfully',
        client,
      });
    } catch (error: any) {
      console.error('API POST /api/clients/:id/notes error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to add lead note' });
    }
  });

  // DELETE /api/clients/:id — Soft delete client (Admin / Manager only)
  app.delete('/api/clients/:id', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const client = await clientService.softDeleteClient(req.params.id, operator);
      res.json({
        success: true,
        message: `Client ${client.clientCode} archived successfully`,
        client,
      });
    } catch (error: any) {
      console.error('API DELETE /api/clients/:id error:', error);
      const statusCode = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(statusCode).json({ success: false, error: error.message || 'Failed to archive client' });
    }
  });

  // =============================================================
  // B29 — Dashboard & Reporting Endpoints
  // =============================================================

  // GET /api/reports/dashboard-kpi — Aggregated KPI metrics for dashboard
  app.get('/api/reports/dashboard-kpi', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower === 'staff') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient permissions to view dashboard KPI metrics.',
        });
      }

      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        agentId: req.query.agentId as string | undefined,
        branch: req.query.branch as string | undefined,
        status: req.query.status as string | undefined,
        propertyType: req.query.propertyType as string | undefined,
      };

      const kpi = await reportingService.getDashboardKPI(filters, operator);
      res.json(kpi);
    } catch (error: any) {
      console.error('API GET /api/reports/dashboard-kpi error:', error);
      const status = error.message?.includes('Forbidden') ? 403 : 500;
      res.status(status).json({ success: false, error: error.message || 'Failed to fetch dashboard KPI' });
    }
  });

  // GET /api/reports/analytics-charts — Chart data series (Sales trend, rental trend, funnel, payment status)
  app.get('/api/reports/analytics-charts', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower === 'staff') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient permissions to view analytics charts.',
        });
      }

      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        agentId: req.query.agentId as string | undefined,
        branch: req.query.branch as string | undefined,
        status: req.query.status as string | undefined,
        propertyType: req.query.propertyType as string | undefined,
      };

      const charts = await reportingService.getChartAnalytics(filters, operator);
      res.json(charts);
    } catch (error: any) {
      console.error('API GET /api/reports/analytics-charts error:', error);
      const status = error.message?.includes('Forbidden') ? 403 : 500;
      res.status(status).json({ success: false, error: error.message || 'Failed to fetch analytics charts' });
    }
  });

  // GET /api/reports/data/:reportType — Structured report data (9 report types supported)
  app.get('/api/reports/data/:reportType', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const roleLower = (operator.role || '').toLowerCase();
      if (roleLower === 'staff') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Insufficient permissions to access business reports.',
        });
      }

      const reportType = req.params.reportType as ReportType;
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        agentId: req.query.agentId as string | undefined,
        branch: req.query.branch as string | undefined,
        status: req.query.status as string | undefined,
        propertyType: req.query.propertyType as string | undefined,
        contractType: req.query.contractType as string | undefined,
        paymentStatus: req.query.paymentStatus as string | undefined,
        search: req.query.search as string | undefined,
      };

      const report = await reportingService.getReportData(reportType, filters, operator);
      res.json(report);
    } catch (error: any) {
      console.error('API GET /api/reports/data/:reportType error:', error);
      const status = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(status).json({ success: false, error: error.message || 'Failed to fetch report data' });
    }
  });

  // POST /api/reports/export — Export report to Excel (.xlsx) or CSV with RBAC verification & Audit log
  app.post('/api/reports/export', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const { reportType, format = 'excel', filters = {} } = req.body;

      if (!reportType) {
        return res.status(400).json({ success: false, error: 'reportType is required' });
      }

      const result = await reportingService.exportReport(
        reportType as ReportType,
        format === 'csv' ? 'csv' : 'excel',
        filters,
        operator
      );

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.fileBuffer);
    } catch (error: any) {
      console.error('API POST /api/reports/export error:', error);
      const status = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(status).json({ success: false, error: error.message || 'Failed to export report' });
    }
  });

  // GET /api/reports/export/:reportType — Export via direct download link
  app.get('/api/reports/export/:reportType', async (req: Request, res: Response) => {
    try {
      const operator = getUserFromReq(req);
      const reportType = req.params.reportType as ReportType;
      const format = (req.query.format as string) === 'csv' ? 'csv' : 'excel';
      const filters = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        agentId: req.query.agentId as string | undefined,
        branch: req.query.branch as string | undefined,
        status: req.query.status as string | undefined,
      };

      const result = await reportingService.exportReport(reportType, format, filters, operator);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.fileBuffer);
    } catch (error: any) {
      console.error('API GET /api/reports/export/:reportType error:', error);
      const status = error.message?.includes('Forbidden') ? 403 : 400;
      res.status(status).json({ success: false, error: error.message || 'Failed to export report' });
    }
  });

  // =========================================================================
  // B30 — OPERATIONS / MAINTENANCE MANAGEMENT APIS
  // =========================================================================

  const enforceMaintenanceRbac = (req: Request, res: Response, perm: string): boolean => {
    const operator = getUserFromReq(req);
    if (!checkGranularPermission(operator.role, perm)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: User role '${operator.role}' lacks '${perm}' permission.`,
      });
      return false;
    }
    return true;
  };

  // 1. Vendors / Technicians
  app.get('/api/maintenance/vendors', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:view')) return;
      const vendors = await maintenanceService.listVendors({
        search: req.query.search as string,
        serviceType: req.query.serviceType as string,
        isActive: req.query.isActive as string,
        isArchived: req.query.isArchived as string,
      });
      res.json({ success: true, count: vendors.length, data: vendors });
    } catch (error: any) {
      console.error('API GET /api/maintenance/vendors error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to list vendors' });
    }
  });

  app.get('/api/maintenance/vendors/:id', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:view')) return;
      const vendor = await maintenanceService.getVendorById(req.params.id);
      if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
      res.json({ success: true, data: vendor });
    } catch (error: any) {
      console.error('API GET /api/maintenance/vendors/:id error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/maintenance/vendors', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:edit')) return;
      const operator = getUserFromReq(req);
      const vendor = await maintenanceService.createVendor(req.body, operator);
      res.status(201).json({ success: true, message: 'Vendor created successfully', data: vendor });
    } catch (error: any) {
      console.error('API POST /api/maintenance/vendors error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to create vendor' });
    }
  });

  app.put('/api/maintenance/vendors/:id', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:edit')) return;
      const operator = getUserFromReq(req);
      const vendor = await maintenanceService.updateVendor(req.params.id, req.body, operator);
      if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
      res.json({ success: true, message: 'Vendor updated successfully', data: vendor });
    } catch (error: any) {
      console.error('API PUT /api/maintenance/vendors/:id error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to update vendor' });
    }
  });

  app.patch('/api/maintenance/vendors/:id/status', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:edit')) return;
      const operator = getUserFromReq(req);
      const vendor = await maintenanceService.toggleVendorActive(req.params.id, operator);
      if (!vendor) return res.status(404).json({ success: false, error: 'Vendor not found' });
      res.json({ success: true, message: `Vendor status toggled to ${vendor.isActive ? 'Active' : 'Inactive'}`, data: vendor });
    } catch (error: any) {
      console.error('API PATCH /api/maintenance/vendors/:id/status error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/maintenance/vendors/:id', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:delete')) return;
      const operator = getUserFromReq(req);
      const deleted = await maintenanceService.deleteVendor(req.params.id, operator);
      if (!deleted) return res.status(404).json({ success: false, error: 'Vendor not found' });
      res.json({ success: true, message: 'Vendor archived successfully (soft deleted)' });
    } catch (error: any) {
      console.error('API DELETE /api/maintenance/vendors/:id error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // 2. Maintenance Requests
  app.get('/api/maintenance/requests', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:view')) return;
      const result = await maintenanceService.listMaintenanceRequests({
        search: req.query.search as string,
        propertyId: req.query.propertyId as string,
        customerId: req.query.customerId as string,
        contractId: req.query.contractId as string,
        priority: req.query.priority as string,
        status: req.query.status as string,
        category: req.query.category as string,
        assignedVendorId: req.query.assignedVendorId as string,
        assignedAgentId: req.query.assignedAgentId as string,
        isArchived: req.query.isArchived as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50,
      });
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('API GET /api/maintenance/requests error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to list maintenance requests' });
    }
  });

  app.get('/api/maintenance/requests/:id', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:view')) return;
      const detail = await maintenanceService.getMaintenanceRequestById(req.params.id);
      if (!detail.request) return res.status(404).json({ success: false, error: 'Maintenance ticket not found' });
      res.json({ success: true, data: detail });
    } catch (error: any) {
      console.error('API GET /api/maintenance/requests/:id error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/maintenance/requests', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:create')) return;
      const operator = getUserFromReq(req);
      const request = await maintenanceService.createMaintenanceRequest(req.body, operator);
      res.status(201).json({ success: true, message: 'Maintenance ticket created successfully', data: request });
    } catch (error: any) {
      console.error('API POST /api/maintenance/requests error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to create ticket' });
    }
  });

  app.put('/api/maintenance/requests/:id', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:edit')) return;
      const operator = getUserFromReq(req);
      const updated = await maintenanceService.updateMaintenanceRequest(req.params.id, req.body, operator);
      if (!updated) return res.status(404).json({ success: false, error: 'Ticket not found' });
      res.json({ success: true, message: 'Maintenance ticket updated successfully', data: updated });
    } catch (error: any) {
      console.error('API PUT /api/maintenance/requests/:id error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to update ticket' });
    }
  });

  app.patch('/api/maintenance/requests/:id/assign', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:assign')) return;
      const operator = getUserFromReq(req);
      const updated = await maintenanceService.assignMaintenance(req.params.id, req.body, operator);
      if (!updated) return res.status(404).json({ success: false, error: 'Ticket not found' });
      res.json({ success: true, message: 'Maintenance assigned successfully', data: updated });
    } catch (error: any) {
      console.error('API PATCH /api/maintenance/requests/:id/assign error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to assign maintenance' });
    }
  });

  app.patch('/api/maintenance/requests/:id/status', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:edit')) return;
      const operator = getUserFromReq(req);
      const { status, solution } = req.body;
      if (!status) return res.status(400).json({ success: false, error: 'Status is required' });
      const updated = await maintenanceService.updateRequestStatus(req.params.id, status, solution, operator);
      if (!updated) return res.status(404).json({ success: false, error: 'Ticket not found' });
      res.json({ success: true, message: `Status updated to ${status}`, data: updated });
    } catch (error: any) {
      console.error('API PATCH /api/maintenance/requests/:id/status error:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to update status' });
    }
  });

  app.patch('/api/maintenance/requests/:id/complete', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:approve')) return;
      const operator = getUserFromReq(req);
      const { solution } = req.body;
      const updated = await maintenanceService.updateRequestStatus(req.params.id, 'Completed', solution, operator);
      if (!updated) return res.status(404).json({ success: false, error: 'Ticket not found' });
      res.json({ success: true, message: 'Maintenance ticket approved & completed', data: updated });
    } catch (error: any) {
      console.error('API PATCH /api/maintenance/requests/:id/complete error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.patch('/api/maintenance/requests/:id/approve', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:approve')) return;
      const operator = getUserFromReq(req);
      const { solution } = req.body;
      const updated = await maintenanceService.updateRequestStatus(req.params.id, 'Completed', solution, operator);
      if (!updated) return res.status(404).json({ success: false, error: 'Ticket not found' });
      res.json({ success: true, message: 'Maintenance ticket approved & completed', data: updated });
    } catch (error: any) {
      console.error('API PATCH /api/maintenance/requests/:id/approve error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.patch('/api/maintenance/requests/:id/cancel', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:edit')) return;
      const operator = getUserFromReq(req);
      const { solution } = req.body;
      const updated = await maintenanceService.updateRequestStatus(req.params.id, 'Cancelled', solution, operator);
      if (!updated) return res.status(404).json({ success: false, error: 'Ticket not found' });
      res.json({ success: true, message: 'Maintenance ticket cancelled', data: updated });
    } catch (error: any) {
      console.error('API PATCH /api/maintenance/requests/:id/cancel error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/maintenance/requests/:id', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:delete')) return;
      const operator = getUserFromReq(req);
      const deleted = await maintenanceService.softDeleteRequest(req.params.id, operator);
      if (!deleted) return res.status(404).json({ success: false, error: 'Ticket not found' });
      res.json({ success: true, message: 'Maintenance ticket archived (soft deleted)' });
    } catch (error: any) {
      console.error('API DELETE /api/maintenance/requests/:id error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post('/api/maintenance/requests/:id/restore', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:delete')) return;
      const operator = getUserFromReq(req);
      const restored = await maintenanceService.restoreRequest(req.params.id, operator);
      if (!restored) return res.status(404).json({ success: false, error: 'Ticket not found' });
      res.json({ success: true, message: 'Maintenance ticket restored' });
    } catch (error: any) {
      console.error('API POST /api/maintenance/requests/:id/restore error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // 3. Maintenance Cost Management
  app.post('/api/maintenance/requests/:id/costs', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:cost')) return;
      const operator = getUserFromReq(req);
      const costItem = await maintenanceService.addMaintenanceCost(req.params.id, req.body, operator);
      if (!costItem) return res.status(404).json({ success: false, error: 'Maintenance ticket not found' });
      res.status(201).json({ success: true, message: 'Cost item recorded', data: costItem });
    } catch (error: any) {
      console.error('API POST /api/maintenance/requests/:id/costs error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/maintenance/costs/:costId', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:cost')) return;
      const operator = getUserFromReq(req);
      const deleted = await maintenanceService.deleteMaintenanceCost(req.params.costId, operator);
      if (!deleted) return res.status(404).json({ success: false, error: 'Cost item not found' });
      res.json({ success: true, message: 'Cost item removed' });
    } catch (error: any) {
      console.error('API DELETE /api/maintenance/costs/:costId error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // 4. Preventive Maintenance
  app.get('/api/maintenance/preventive', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:view')) return;
      const list = await maintenanceService.listPreventiveMaintenance({
        propertyId: req.query.propertyId as string,
        serviceType: req.query.serviceType as string,
        status: req.query.status as string,
        isArchived: req.query.isArchived as string,
      });
      res.json({ success: true, count: list.length, data: list });
    } catch (error: any) {
      console.error('API GET /api/maintenance/preventive error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/maintenance/preventive', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:create')) return;
      const operator = getUserFromReq(req);
      const item = await maintenanceService.createPreventiveMaintenance(req.body, operator);
      res.status(201).json({ success: true, message: 'Preventive maintenance schedule created', data: item });
    } catch (error: any) {
      console.error('API POST /api/maintenance/preventive error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post('/api/maintenance/preventive/:id/execute', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:edit')) return;
      const operator = getUserFromReq(req);
      const updated = await maintenanceService.markPreventiveServiceDone(req.params.id, operator);
      if (!updated) return res.status(404).json({ success: false, error: 'Schedule not found' });
      res.json({ success: true, message: 'Preventive service recorded and next schedule updated', data: updated });
    } catch (error: any) {
      console.error('API POST /api/maintenance/preventive/:id/execute error:', error);
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // 5. Dashboard Metrics & Reports
  app.get('/api/maintenance/dashboard', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:view')) return;
      const metrics = await maintenanceService.getDashboardMetrics({
        propertyId: req.query.propertyId as string,
        agentId: req.query.agentId as string,
        vendorId: req.query.vendorId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });
      res.json({ success: true, data: metrics });
    } catch (error: any) {
      console.error('API GET /api/maintenance/dashboard error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/maintenance/export', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:export')) return;
      const csv = await maintenanceService.exportMaintenanceRequestsCsv({
        search: req.query.search as string,
        propertyId: req.query.propertyId as string,
        priority: req.query.priority as string,
        status: req.query.status as string,
        category: req.query.category as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="maintenance-requests.csv"');
      res.send(csv);
    } catch (error: any) {
      console.error('API GET /api/maintenance/export error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/maintenance/export', async (req: Request, res: Response) => {
    try {
      if (!enforceMaintenanceRbac(req, res, 'maintenance:export')) return;
      const csv = await maintenanceService.exportMaintenanceRequestsCsv(req.body);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="maintenance-requests.csv"');
      res.send(csv);
    } catch (error: any) {
      console.error('API POST /api/maintenance/export error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // -------------------------------------------------------------
  // Vite Middleware (Development) / Static Files (Production)
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  const server = app.listen(PORT, HOST, () => {
    console.log(`Peak Real Estate Server running on http://${HOST}:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
    process.exit(1);
  });

  const handleShutdown = () => {
    try {
      server.close(() => {
        process.exit(0);
      });
    } catch {
      process.exit(0);
    }
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
