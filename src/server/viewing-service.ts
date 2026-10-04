import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  viewingsTable,
  propertiesTable,
  usersTable,
  auditLogsTable,
  DbViewing,
  InsertDbViewing,
} from '../db/schema.ts';
import { User } from '../types.ts';

export interface ViewingQueryParams {
  agentId?: string;
  agentName?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  customerId?: string;
  propertyId?: string;
  isArchived?: boolean | string;
}

export class ViewingService {
  /**
   * Seed initial viewings if table is empty
   */
  async seedInitialViewingsIfEmpty(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      return;
    }
    try {
      const countRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(viewingsTable);
      const count = Number(countRes[0]?.count || 0);

      if (count === 0) {
        const initialSeeds: InsertDbViewing[] = [
          {
            id: 'vw-1',
            viewingCode: 'VW-2026-0101',
            customerId: 'cust-1',
            customerName: 'Alexander Ivanov',
            customerPhone: '+7 925 123 4567',
            propertyId: 'prop-1',
            propertyCustomId: 'VL-1001',
            propertyTitle: 'The Peak Oceanfront Pool Villa',
            agentId: 'user-admin-1',
            agentName: 'Administrator',
            dateTime: '2026-09-25T14:30',
            location: 'Kamala Bay, Millionaires Mile',
            status: 'Confirmed',
            notes: 'Client arriving via private chauffeur. Ensure air conditioning is pre-cooled.',
            feedback: '',
            interestScore: 4,
            clientInterest: 'Warm',
            isArchived: false,
            createdByName: 'System',
          },
          {
            id: 'vw-2',
            viewingCode: 'VW-2026-0102',
            customerId: 'cust-2',
            customerName: 'Somsak & Waraporn Wattana',
            customerPhone: '081-789-0123',
            propertyId: 'prop-2',
            propertyCustomId: 'CD-2045',
            propertyTitle: 'Skyline Sea View Penthouse Patong',
            agentId: 'user-agt-1',
            agentName: 'Kittisak Vong',
            dateTime: '2026-09-26T10:30',
            location: 'Phra Barami Road, Patong',
            status: 'Scheduled',
            notes: 'Key card collected from juristic office on level 1.',
            feedback: '',
            interestScore: 4,
            clientInterest: 'Warm',
            isArchived: false,
            createdByName: 'System',
          },
          {
            id: 'vw-3',
            viewingCode: 'VW-2026-0098',
            customerId: 'cust-3',
            customerName: 'Francois Dupont',
            customerPhone: '+33 6 12 34 56 78',
            propertyId: 'prop-3',
            propertyCustomId: 'VL-1002',
            propertyTitle: 'Bang Tao Sanctuary Luxury Pool Residence',
            agentId: 'user-agt-1',
            agentName: 'Kittisak Vong',
            dateTime: '2026-09-20T14:00',
            location: 'Choeng Thale Soi 1',
            status: 'Completed',
            notes: 'Client requested lease contract draft.',
            feedback: 'Loved the private pool and quiet cul-de-sac. Decided to sign lease.',
            interestScore: 5,
            clientInterest: 'Hot',
            isArchived: false,
            createdByName: 'System',
          },
          {
            id: 'vw-4',
            viewingCode: 'VW-2026-0103',
            customerId: 'cust-7',
            customerName: 'David & Lisa Miller',
            customerPhone: '+61 4 1234 5678',
            propertyId: 'prop-8',
            propertyCustomId: 'VL-1003',
            propertyTitle: 'Rawai Tropical Pool Villa near Nai Harn Beach',
            agentId: 'user-agt-1',
            agentName: 'Kittisak Vong',
            dateTime: '2026-09-28T11:00',
            location: 'Saiyuan Road, Rawai',
            status: 'Scheduled',
            notes: 'Pick up clients at The Nai Harn Resort lobby.',
            feedback: '',
            interestScore: 3,
            clientInterest: 'Warm',
            isArchived: false,
            createdByName: 'System',
          },
        ];

        await db.insert(viewingsTable).values(initialSeeds);
      }
    } catch (e) {
      console.warn('ViewingService seedInitialViewingsIfEmpty notice:', e);
    }
  }

  /**
   * Helper: Normalize status input
   */
  normalizeStatus(status?: string): 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show' {
    if (!status) return 'Scheduled';
    const s = status.trim().toLowerCase();
    if (s === 'confirmed') return 'Confirmed';
    if (s === 'completed') return 'Completed';
    if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
    if (s === 'no show' || s === 'no-show' || s === 'noshow') return 'No Show';
    return 'Scheduled';
  }

  /**
   * List all viewings with search, filters, date range, and pagination
   */
  async getViewings(params: ViewingQueryParams, operator?: User): Promise<DbViewing[]> {
    await this.seedInitialViewingsIfEmpty();

    const conditions: any[] = [];

    // Soft delete filtering
    if (params.isArchived === 'all') {
      // no condition
    } else if (params.isArchived === true || params.isArchived === 'true') {
      conditions.push(eq(viewingsTable.isArchived, true));
    } else {
      conditions.push(eq(viewingsTable.isArchived, false));
    }

    // Customer filter
    if (params.customerId) {
      conditions.push(eq(viewingsTable.customerId, params.customerId));
    }

    // Property filter
    if (params.propertyId) {
      conditions.push(eq(viewingsTable.propertyId, params.propertyId));
    }

    // Agent filter (by ID or name)
    if (params.agentId) {
      conditions.push(eq(viewingsTable.agentId, params.agentId));
    } else if (params.agentName) {
      conditions.push(ilike(viewingsTable.agentName, `%${params.agentName}%`));
    }

    // Status filter
    if (params.status && params.status !== 'all') {
      const normalized = this.normalizeStatus(params.status);
      conditions.push(eq(viewingsTable.status, normalized));
    }

    // Date range filter
    if (params.startDate) {
      conditions.push(sql`${viewingsTable.dateTime} >= ${params.startDate}`);
    }
    if (params.endDate) {
      // If endDate is just YYYY-MM-DD, include up to end of day
      const endBoundary = params.endDate.length === 10 ? `${params.endDate}T23:59:59` : params.endDate;
      conditions.push(sql`${viewingsTable.dateTime} <= ${endBoundary}`);
    }

    // Search filter across Customer, Property, Code, Location, Notes
    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(viewingsTable.customerName, q),
          ilike(viewingsTable.customerPhone, q),
          ilike(viewingsTable.propertyTitle, q),
          ilike(viewingsTable.propertyCustomId, q),
          ilike(viewingsTable.viewingCode, q),
          ilike(viewingsTable.location, q),
          ilike(viewingsTable.notes, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select()
      .from(viewingsTable)
      .where(whereClause)
      .orderBy(desc(viewingsTable.dateTime));

    return list;
  }

  /**
   * Get single viewing by ID or viewingCode
   */
  async getViewingById(id: string, operator?: User): Promise<DbViewing> {
    await this.seedInitialViewingsIfEmpty();

    const results = await db
      .select()
      .from(viewingsTable)
      .where(or(eq(viewingsTable.id, id), eq(viewingsTable.viewingCode, id)))
      .limit(1);

    if (!results || results.length === 0) {
      throw new Error(`Viewing with ID "${id}" not found`);
    }

    return results[0];
  }

  /**
   * Get viewing history for a customer
   */
  async getViewingsByCustomer(customerId: string): Promise<DbViewing[]> {
    await this.seedInitialViewingsIfEmpty();

    return db
      .select()
      .from(viewingsTable)
      .where(and(eq(viewingsTable.customerId, customerId), eq(viewingsTable.isArchived, false)))
      .orderBy(desc(viewingsTable.dateTime));
  }

  /**
   * Get viewing history for a property
   */
  async getViewingsByProperty(propertyId: string): Promise<DbViewing[]> {
    await this.seedInitialViewingsIfEmpty();

    return db
      .select()
      .from(viewingsTable)
      .where(and(eq(viewingsTable.propertyId, propertyId), eq(viewingsTable.isArchived, false)))
      .orderBy(desc(viewingsTable.dateTime));
  }

  /**
   * Create a new viewing appointment
   */
  async createViewing(
    payload: {
      customerId: string;
      customerName?: string;
      customerPhone?: string;
      propertyId: string;
      propertyCustomId?: string;
      propertyTitle?: string;
      agentId: string;
      agentName?: string;
      dateTime: string;
      location?: string;
      notes?: string;
      status?: string;
      feedback?: string;
      interestScore?: number;
      clientInterest?: string;
      viewingCode?: string;
    },
    operator: User
  ): Promise<DbViewing> {
    if (!payload.customerId) {
      throw new Error('Customer is required for scheduling a viewing.');
    }
    if (!payload.propertyId) {
      throw new Error('Property is required for scheduling a viewing.');
    }
    if (!payload.agentId) {
      throw new Error('Assigned Agent is required.');
    }
    if (!payload.dateTime) {
      throw new Error('Viewing Date & Time is required.');
    }

    // Auto-link property info if missing
    let propTitle = payload.propertyTitle || '';
    let propCustomId = payload.propertyCustomId || '';
    let location = payload.location || '';

    try {
      const prop = await db
        .select()
        .from(propertiesTable)
        .where(or(eq(propertiesTable.id, parseInt(payload.propertyId) || 0), eq(propertiesTable.propertyId, payload.propertyId)))
        .limit(1);

      if (prop.length > 0) {
        if (!propTitle) propTitle = prop[0].title || prop[0].titleTh || prop[0].propertyId;
        if (!propCustomId) propCustomId = prop[0].propertyId;
        if (!location) location = `${prop[0].district || ''}, ${prop[0].city || 'Phuket'}`.replace(/^,\s*/, '');
      }
    } catch {
      // Proceed if not in db
    }

    // Auto-link agent info if missing
    let agentName = payload.agentName || '';
    if (!agentName) {
      try {
        const user = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, payload.agentId))
          .limit(1);
        if (user.length > 0) {
          agentName = user[0].name;
        }
      } catch {
        // Proceed
      }
      if (!agentName) agentName = operator.name || 'Agent';
    }

    const viewingId = `vw-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const year = new Date(payload.dateTime || Date.now()).getFullYear();
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const viewingCode = payload.viewingCode || `VW-${year}-${randCode}`;

    const newStatus = this.normalizeStatus(payload.status || 'Scheduled');

    const newViewing: InsertDbViewing = {
      id: viewingId,
      viewingCode,
      customerId: payload.customerId,
      customerName: payload.customerName || 'Customer',
      customerPhone: payload.customerPhone || '',
      propertyId: payload.propertyId,
      propertyCustomId: propCustomId,
      propertyTitle: propTitle || 'Property Viewing',
      agentId: payload.agentId,
      agentName,
      dateTime: payload.dateTime,
      location: location || 'Phuket',
      notes: payload.notes || '',
      status: newStatus,
      feedback: payload.feedback || '',
      interestScore: payload.interestScore || 4,
      clientInterest: payload.clientInterest || 'Warm',
      cancellationReason: '',
      isArchived: false,
      createdBy: operator.id || null,
      createdByName: operator.name || 'System',
      updatedBy: operator.id || null,
    };

    const [created] = await db.insert(viewingsTable).values(newViewing).returning();

    // Audit Log Entry
    try {
      await db.insert(auditLogsTable).values({
        propertyId: created.propertyId,
        action: 'Create Viewing',
        userName: operator.name || 'System',
        userId: operator.id || null,
        newValue: `Scheduled viewing ${created.viewingCode} with ${created.customerName} for ${created.propertyTitle} on ${created.dateTime} (Agent: ${created.agentName})`,
      });
    } catch (e) {
      console.warn('Audit log creation notice:', e);
    }

    return created;
  }

  /**
   * Update viewing details
   */
  async updateViewing(
    id: string,
    updates: Partial<InsertDbViewing>,
    operator: User
  ): Promise<DbViewing> {
    const existing = await this.getViewingById(id, operator);

    if (existing.isArchived) {
      throw new Error(`Cannot update archived viewing appointment (${existing.viewingCode})`);
    }

    // Role check: Admin and Manager can update any; Agent can update if assigned to it or created it
    const roleLower = (operator.role || '').toLowerCase();
    const isManagerOrAdmin = roleLower.includes('admin') || roleLower.includes('manager');
    if (!isManagerOrAdmin && operator.id) {
      if (existing.agentId !== operator.id && existing.createdBy !== operator.id) {
        throw new Error('Forbidden: Agents may only modify viewings assigned to them.');
      }
    }

    const payload: Partial<InsertDbViewing> = {
      ...updates,
      updatedBy: operator.id || null,
      updatedAt: new Date(),
    };

    if (updates.status) {
      payload.status = this.normalizeStatus(updates.status);
    }

    const [updated] = await db
      .update(viewingsTable)
      .set(payload)
      .where(eq(viewingsTable.id, existing.id))
      .returning();

    // Audit Log Entry
    try {
      const statusChanged = updates.status && updates.status !== existing.status;
      const action = statusChanged ? 'Viewing Status Change' : 'Update Viewing';
      const oldValue = statusChanged
        ? `Status: ${existing.status}`
        : `Date: ${existing.dateTime}, Agent: ${existing.agentName}, Status: ${existing.status}`;
      const newValue = statusChanged
        ? `Status: ${updated.status}`
        : `Date: ${updated.dateTime}, Agent: ${updated.agentName}, Status: ${updated.status}`;

      await db.insert(auditLogsTable).values({
        propertyId: updated.propertyId,
        action,
        userName: operator.name || 'System',
        userId: operator.id || null,
        oldValue,
        newValue,
      });
    } catch (e) {
      console.warn('Audit log update notice:', e);
    }

    return updated;
  }

  /**
   * Cancel viewing appointment with reason
   */
  async cancelViewing(id: string, reason: string | undefined, operator: User): Promise<DbViewing> {
    const existing = await this.getViewingById(id, operator);

    if (existing.isArchived) {
      throw new Error(`Cannot cancel archived viewing appointment (${existing.viewingCode})`);
    }

    const [updated] = await db
      .update(viewingsTable)
      .set({
        status: 'Cancelled',
        cancellationReason: reason || 'Cancelled by user',
        updatedBy: operator.id || null,
        updatedAt: new Date(),
      })
      .where(eq(viewingsTable.id, existing.id))
      .returning();

    // Audit Log Entry
    try {
      await db.insert(auditLogsTable).values({
        propertyId: updated.propertyId,
        action: 'Cancel Viewing',
        userName: operator.name || 'System',
        userId: operator.id || null,
        oldValue: `Status: ${existing.status}`,
        newValue: `Status: Cancelled (Reason: ${reason || 'Cancelled by user'})`,
      });
    } catch (e) {
      console.warn('Audit log cancel notice:', e);
    }

    return updated;
  }

  /**
   * Soft delete viewing appointment (Only Manager & Admin)
   */
  async softDeleteViewing(id: string, operator: User): Promise<DbViewing> {
    const roleLower = (operator.role || '').toLowerCase();
    const isManagerOrAdmin = roleLower.includes('admin') || roleLower.includes('manager');

    if (!isManagerOrAdmin) {
      throw new Error('Forbidden: Only Manager or Administrator can delete or archive viewings.');
    }

    const existing = await this.getViewingById(id, operator);

    const [updated] = await db
      .update(viewingsTable)
      .set({
        isArchived: true,
        status: 'Cancelled',
        updatedBy: operator.id || null,
        updatedAt: new Date(),
      })
      .where(eq(viewingsTable.id, existing.id))
      .returning();

    // Audit Log Entry
    try {
      await db.insert(auditLogsTable).values({
        propertyId: existing.propertyId,
        action: 'Delete Viewing',
        userName: operator.name || 'System',
        userId: operator.id || null,
        oldValue: `Viewing ${existing.viewingCode} (Active)`,
        newValue: `Viewing ${existing.viewingCode} (Soft Deleted / Archived)`,
      });
    } catch (e) {
      console.warn('Audit log delete notice:', e);
    }

    return updated;
  }
}

export const viewingService = new ViewingService();
