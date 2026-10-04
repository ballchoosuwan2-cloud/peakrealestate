import { and, asc, desc, eq, ilike, or, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  clientsTable,
  clientPropertiesTable,
  clientFollowUpsTable,
  propertiesTable,
  viewingsTable,
  contractsTable,
  paymentSchedulesTable,
  paymentRecordsTable,
  usersTable,
  auditLogsTable,
  type DbClient,
  type InsertDbClient,
  type DbClientProperty,
  type InsertDbClientProperty,
  type DbClientFollowUp,
  type InsertDbClientFollowUp,
  type DbViewing,
  type DbContract,
} from '../db/schema.ts';
import type { User, ClientStatus, CustomerType, ClientIntent } from '../types.ts';

export interface FollowUpQueryParams {
  search?: string;
  q?: string;
  status?: string; // 'Pending' | 'Completed' | 'Cancelled' | 'all'
  clientId?: string;
  assignedAgentId?: string;
  agentId?: string;
  priority?: string;
  timeframe?: string; // 'overdue' | 'today' | 'upcoming' | 'all'
  dateFilter?: string;
  startDate?: string;
  endDate?: string;
  isArchived?: boolean | string;
  page?: number | string;
  limit?: number | string;
  pageSize?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ClientQueryParams {
  status?: string;
  leadSource?: string;
  clientType?: string;
  intent?: string;
  propertyType?: string;
  assignedAgentId?: string;
  agentId?: string;
  followUpStatus?: 'all' | 'dueToday' | 'overdue' | 'upcoming';
  search?: string;
  isArchived?: boolean | string;
  page?: number | string;
  limit?: number | string;
  pageSize?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ClientService {
  /**
   * Seed initial clients if empty
   */
  async seedInitialClientsIfEmpty(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      return;
    }
    try {
      const countRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(clientsTable);
      const count = Number(countRes[0]?.count || 0);

      if (count === 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

        const initialClients: InsertDbClient[] = [
          {
            id: 'cust-1',
            clientCode: 'CLI-2026-0001',
            firstName: 'Alexander',
            lastName: 'Ivanov',
            companyName: 'Nordic Peak Capital',
            phone: '+7 925 123 4567',
            email: 'alexander.ivanov@nordicpeak.com',
            nationality: 'Russian',
            idNumber: 'PA9876543',
            clientType: 'Buyer',
            intent: 'Buy',
            budgetMin: '50000000',
            budgetMax: '120000000',
            propertyType: 'Villa',
            preferredLocation: 'Kamala, Millionaires Mile',
            status: 'Viewing',
            assignedAgentId: 'user-admin-1',
            assignedAgentName: 'Administrator',
            nextFollowUpDate: todayStr,
            notes: 'High net worth buyer looking for luxury beachfront or ocean view villa in Kamala/Surin.',
            isArchived: false,
            createdBy: 'user-admin-1',
            createdByName: 'System Seed',
          },
          {
            id: 'cust-2',
            clientCode: 'CLI-2026-0002',
            firstName: 'Somsak',
            lastName: 'Wattana',
            companyName: 'Wattana Group Co., Ltd.',
            phone: '081-789-0123',
            email: 'somsak.w@wattanagroup.co.th',
            nationality: 'Thai',
            idNumber: '1-8399-00123-45-6',
            clientType: 'Investor',
            intent: 'Buy',
            budgetMin: '15000000',
            budgetMax: '35000000',
            propertyType: 'Condo',
            preferredLocation: 'Patong / Kalim',
            status: 'Viewing',
            assignedAgentId: 'user-agt-1',
            assignedAgentName: 'Kittisak Vong',
            nextFollowUpDate: nextWeek,
            notes: 'Looking for high rental yield condominium units with sea views.',
            isArchived: false,
            createdBy: 'user-agt-1',
            createdByName: 'System Seed',
          },
          {
            id: 'cust-3',
            clientCode: 'CLI-2026-0003',
            firstName: 'Francois',
            lastName: 'Dupont',
            companyName: '',
            phone: '+33 6 12 34 56 78',
            email: 'francois.dupont@orange.fr',
            nationality: 'French',
            idNumber: 'FR21980011',
            clientType: 'Tenant',
            intent: 'Rent',
            budgetMin: '120000',
            budgetMax: '250000',
            propertyType: 'Villa',
            preferredLocation: 'Bang Tao, Cherngtalay',
            status: 'Contract',
            assignedAgentId: 'user-agt-1',
            assignedAgentName: 'Kittisak Vong',
            nextFollowUpDate: undefined,
            notes: 'Expat family relocating to Phuket. 12-month lease contract signed.',
            isArchived: false,
            createdBy: 'user-agt-1',
            createdByName: 'System Seed',
          },
          {
            id: 'cust-7',
            clientCode: 'CLI-2026-0004',
            firstName: 'David',
            lastName: 'Miller',
            companyName: 'Pacific Rim Holdings',
            phone: '+61 4 1234 5678',
            email: 'david.miller@pacificrim.com.au',
            nationality: 'Australian',
            idNumber: 'AUS-4481023',
            clientType: 'Buyer',
            intent: 'Both',
            budgetMin: '25000000',
            budgetMax: '45000000',
            propertyType: 'Villa',
            preferredLocation: 'Rawai, Nai Harn',
            status: 'Following Up',
            assignedAgentId: 'user-agt-1',
            assignedAgentName: 'Kittisak Vong',
            nextFollowUpDate: yesterday, // Intentionally overdue for testing
            notes: 'Visited Rawai villa. Waiting for owner to confirm negotiable price.',
            isArchived: false,
            createdBy: 'user-agt-1',
            createdByName: 'System Seed',
          },
        ];

        await db.insert(clientsTable).values(initialClients);

        // Seed initial linked properties
        await db.insert(clientPropertiesTable).values([
          {
            id: 'cl-prop-1',
            clientId: 'cust-1',
            propertyId: 'prop-1',
            propertyCustomId: 'VL-1001',
            propertyTitle: 'The Peak Oceanfront Pool Villa',
            notes: 'Primary interest for purchase',
          },
          {
            id: 'cl-prop-2',
            clientId: 'cust-2',
            propertyId: 'prop-2',
            propertyCustomId: 'CD-2045',
            propertyTitle: 'Skyline Sea View Penthouse Patong',
            notes: 'High rental yield target',
          },
          {
            id: 'cl-prop-3',
            clientId: 'cust-3',
            propertyId: 'prop-3',
            propertyCustomId: 'VL-1002',
            propertyTitle: 'Bang Tao Sanctuary Luxury Pool Residence',
            notes: 'Active lease signed',
          },
          {
            id: 'cl-prop-4',
            clientId: 'cust-7',
            propertyId: 'prop-8',
            propertyCustomId: 'VL-1003',
            propertyTitle: 'Rawai Tropical Pool Villa near Nai Harn Beach',
            notes: 'Awaiting price negotiation',
          },
        ]);

        // Seed initial follow-ups
        await db.insert(clientFollowUpsTable).values([
          {
            id: 'cl-fu-1',
            clientId: 'cust-1',
            followUpDate: todayStr,
            followUpNote: 'Send updated floor plan and villa title deed copy to client attorney.',
            assignedAgentId: 'user-admin-1',
            assignedAgentName: 'Administrator',
            status: 'Pending',
          },
          {
            id: 'cl-fu-2',
            clientId: 'cust-7',
            followUpDate: yesterday,
            followUpNote: 'Check in with owner regarding counter-offer on Rawai Villa.',
            assignedAgentId: 'user-agt-1',
            assignedAgentName: 'Kittisak Vong',
            status: 'Pending',
          },
          {
            id: 'cl-fu-3',
            clientId: 'cust-3',
            followUpDate: '2026-09-15',
            followUpNote: 'Handover keys and review inventory list.',
            assignedAgentId: 'user-agt-1',
            assignedAgentName: 'Kittisak Vong',
            status: 'Completed',
            completedAt: new Date('2026-09-15T10:00:00Z'),
          },
        ]);
      }
    } catch (e) {
      console.warn('ClientService seedInitialClientsIfEmpty notice:', e);
    }
  }

  /**
   * Normalize client status
   */
  normalizeStatus(status?: string): ClientStatus {
    if (!status) return 'New';
    const s = status.trim().toLowerCase();
    if (s === 'new') return 'New';
    if (s === 'contacted') return 'Contacted';
    if (s === 'qualified') return 'Qualified';
    if (s === 'viewing') return 'Viewing';
    if (s === 'negotiation') return 'Negotiation';
    if (s === 'won' || s === 'closed won') return 'Won';
    if (s === 'lost') return 'Lost';
    if (s === 'closed') return 'Closed';
    if (s === 'following up' || s === 'followingup' || s === 'follow-up' || s === 'follow up') return 'Following Up';
    if (s === 'deposit') return 'Deposit';
    if (s === 'contract') return 'Contract';
    return status as any;
  }

  /**
   * Generate next auto client code: CLI-2026-0001
   */
  async generateNextClientCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CLI-${year}-`;

    const records = await db
      .select({ clientCode: clientsTable.clientCode })
      .from(clientsTable)
      .where(ilike(clientsTable.clientCode, `${prefix}%`));

    let maxNum = 0;
    for (const r of records) {
      const parts = r.clientCode.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNum = maxNum + 1;
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * List clients with search, filters, follow-up flags, and pagination
   */
  async getClients(params: ClientQueryParams, operator?: User): Promise<{ clients: any[]; total: number }> {
    await this.seedInitialClientsIfEmpty();

    const conditions: any[] = [];

    // Soft delete check
    if (params.isArchived === 'all') {
      // include all
    } else if (params.isArchived === true || params.isArchived === 'true') {
      conditions.push(eq(clientsTable.isArchived, true));
    } else {
      conditions.push(eq(clientsTable.isArchived, false));
    }

    // Status / Pipeline Stage filter
    if (params.status && params.status !== 'all') {
      const norm = this.normalizeStatus(params.status);
      if (norm === 'Won') {
        conditions.push(or(eq(clientsTable.status, 'Won'), eq(clientsTable.status, 'Closed'), eq(clientsTable.status, 'Closed Won')));
      } else {
        conditions.push(eq(clientsTable.status, norm));
      }
    }

    // Lead Source filter
    if (params.leadSource && params.leadSource !== 'all') {
      conditions.push(eq(clientsTable.leadSource, params.leadSource));
    }

    // Client Type filter
    if (params.clientType && params.clientType !== 'all') {
      conditions.push(eq(clientsTable.clientType, params.clientType));
    }

    // Intent filter (Buy, Rent, Both)
    if (params.intent && params.intent !== 'all') {
      conditions.push(eq(clientsTable.intent, params.intent));
    }

    // Property Type filter
    if (params.propertyType && params.propertyType !== 'all') {
      conditions.push(eq(clientsTable.propertyType, params.propertyType));
    }

    // Agent filter
    const targetAgent = params.assignedAgentId || params.agentId;
    if (targetAgent && targetAgent !== 'all') {
      conditions.push(eq(clientsTable.assignedAgentId, targetAgent));
    }

    // Follow-up status filter (dueToday, overdue, upcoming)
    const todayStr = new Date().toISOString().split('T')[0];
    if (params.followUpStatus === 'dueToday') {
      conditions.push(eq(clientsTable.nextFollowUpDate, todayStr));
    } else if (params.followUpStatus === 'overdue') {
      conditions.push(sql`${clientsTable.nextFollowUpDate} IS NOT NULL AND ${clientsTable.nextFollowUpDate} < ${todayStr}`);
    } else if (params.followUpStatus === 'upcoming') {
      conditions.push(sql`${clientsTable.nextFollowUpDate} IS NOT NULL AND ${clientsTable.nextFollowUpDate} > ${todayStr}`);
    }

    // Search filter across firstName, lastName, companyName, phone, email, clientCode, nationality, preferredLocation, leadSource, notes
    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(clientsTable.firstName, q),
          ilike(clientsTable.lastName, q),
          ilike(clientsTable.companyName, q),
          ilike(clientsTable.phone, q),
          ilike(clientsTable.email, q),
          ilike(clientsTable.clientCode, q),
          ilike(clientsTable.nationality, q),
          ilike(clientsTable.preferredLocation, q),
          ilike(clientsTable.leadSource, q),
          ilike(clientsTable.notes, q)
        )
      );
    }

    // RBAC: If agent and not admin/manager, can restrict if needed.
    // However in typical Peak Real Estate CRM, agents can see all or assigned clients.
    // If strict agent isolation is needed:
    if (operator) {
      const roleLower = (operator.role || '').toLowerCase();
      const isManagerOrAdmin = roleLower.includes('admin') || roleLower.includes('manager');
      if (!isManagerOrAdmin && operator.id && params.assignedAgentId === 'me') {
        conditions.push(eq(clientsTable.assignedAgentId, operator.id));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(clientsTable)
      .where(whereClause);
    const total = Number(countRes[0]?.count || 0);

    // Sorting
    let orderByCol = desc(clientsTable.createdAt);
    if (params.sortBy === 'clientCode') {
      orderByCol = params.sortOrder === 'asc' ? sql`${clientsTable.clientCode} ASC` : sql`${clientsTable.clientCode} DESC`;
    } else if (params.sortBy === 'name') {
      orderByCol = params.sortOrder === 'asc' ? sql`${clientsTable.firstName} ASC` : sql`${clientsTable.firstName} DESC`;
    } else if (params.sortBy === 'status') {
      orderByCol = params.sortOrder === 'asc' ? sql`${clientsTable.status} ASC` : sql`${clientsTable.status} DESC`;
    } else if (params.sortBy === 'nextFollowUpDate') {
      orderByCol = params.sortOrder === 'asc' ? sql`${clientsTable.nextFollowUpDate} ASC NULLS LAST` : sql`${clientsTable.nextFollowUpDate} DESC NULLS LAST`;
    }

    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(200, Math.max(1, Number(params.pageSize || params.limit || 50)));
    const offset = (page - 1) * limit;

    const list = await db
      .select()
      .from(clientsTable)
      .where(whereClause)
      .orderBy(orderByCol)
      .limit(limit)
      .offset(offset);

    // Format output with name and aliases
    const formatted = list.map((c) => ({
      ...c,
      name: `${c.firstName} ${c.lastName || ''}`.trim() || c.companyName || 'Unnamed Client',
      budgetMin: Number(c.budgetMin) || 0,
      budgetMax: Number(c.budgetMax) || 0,
      customerCode: c.clientCode,
      type: c.clientType,
      leadStatus: c.status,
    }));

    return { clients: formatted, total };
  }

  /**
   * Get client by ID or clientCode with full FK relations (Properties, Viewings, Contracts, Payments, Follow-ups)
   */
  async getClientById(id: string, operator?: User): Promise<any> {
    await this.seedInitialClientsIfEmpty();

    const [client] = await db
      .select()
      .from(clientsTable)
      .where(or(eq(clientsTable.id, id), eq(clientsTable.clientCode, id)))
      .limit(1);

    if (!client) {
      throw new Error(`Client not found with ID or Code: ${id}`);
    }

    const clientId = client.id;
    const clientCode = client.clientCode;
    const clientPhone = client.phone;
    const fullName = `${client.firstName} ${client.lastName || ''}`.trim();

    // 1. Linked Properties with rich property details
    const propertyLinks = await db
      .select()
      .from(clientPropertiesTable)
      .where(eq(clientPropertiesTable.clientId, clientId));

    let enrichedProperties: any[] = [];
    if (propertyLinks.length > 0) {
      const propIds = propertyLinks.map((p) => p.propertyId);
      const props = await db
        .select()
        .from(propertiesTable)
        .where(inArray(propertiesTable.propertyId, propIds));

      const propMap = new Map<string, any>(props.map((p) => [p.propertyId, p]));

      enrichedProperties = propertyLinks.map((link) => {
        const p = propMap.get(link.propertyId);
        return {
          id: link.id,
          clientId: link.clientId,
          propertyId: link.propertyId,
          propertyCustomId: link.propertyCustomId || p?.propertyId || '',
          propertyTitle: link.propertyTitle || p?.title || '',
          notes: link.notes || '',
          category: p?.category || 'Villa',
          price: Number(p?.price) || 0,
          rentPrice: Number(p?.rentPrice) || 0,
          status: p?.status || 'Available',
          area: p?.area || '',
          zone: p?.zone || '',
          createdAt: link.createdAt,
        };
      });
    }

    // 2. Viewing History from B24 viewingsTable (reusing FK link without duplicate data)
    const viewings = await db
      .select()
      .from(viewingsTable)
      .where(
        and(
          or(
            eq(viewingsTable.customerId, clientId),
            eq(viewingsTable.customerId, clientCode),
            eq(viewingsTable.customerPhone, clientPhone)
          ),
          eq(viewingsTable.isArchived, false)
        )
      )
      .orderBy(desc(viewingsTable.dateTime));

    // 3. Contracts from B22 contractsTable (reusing FK link without duplicate data)
    const contracts = await db
      .select()
      .from(contractsTable)
      .where(
        and(
          or(
            eq(contractsTable.tenantId, clientId),
            eq(contractsTable.tenantId, clientCode),
            eq(contractsTable.tenantPhone, clientPhone),
            eq(contractsTable.ownerName, fullName)
          ),
          eq(contractsTable.isArchived, false)
        )
      )
      .orderBy(desc(contractsTable.signDate));

    // 4. Payments from B23 paymentSchedulesTable & paymentRecordsTable
    let payments: any[] = [];
    if (contracts.length > 0) {
      const contractIds = contracts.map((c) => c.contractId);
      const schedules = await db
        .select()
        .from(paymentSchedulesTable)
        .where(
          and(
            inArray(paymentSchedulesTable.contractId, contractIds),
            eq(paymentSchedulesTable.isArchived, false)
          )
        )
        .orderBy(desc(paymentSchedulesTable.dueDate));

      const records = await db
        .select()
        .from(paymentRecordsTable)
        .where(
          and(
            inArray(paymentRecordsTable.contractId, contractIds),
            eq(paymentRecordsTable.isArchived, false)
          )
        )
        .orderBy(desc(paymentRecordsTable.paymentDate));

      payments = schedules.map((s) => ({
        ...s,
        records: records.filter((r) => r.paymentScheduleId === s.id),
      }));
    }

    // 5. Follow-ups from clientFollowUpsTable
    const followUps = await db
      .select()
      .from(clientFollowUpsTable)
      .where(and(eq(clientFollowUpsTable.clientId, clientId), eq(clientFollowUpsTable.isArchived, false)))
      .orderBy(desc(clientFollowUpsTable.followUpDate));

    return {
      ...client,
      name: fullName || client.companyName || 'Unnamed Client',
      budgetMin: Number(client.budgetMin) || 0,
      budgetMax: Number(client.budgetMax) || 0,
      customerCode: client.clientCode,
      type: client.clientType,
      leadStatus: client.status,
      linkedProperties: enrichedProperties,
      viewings,
      contracts,
      payments,
      followUps,
    };
  }

  /**
   * Create new client with audit log & code generation
   */
  async createClient(payload: Partial<InsertDbClient> & { propertyIds?: string[]; initialFollowUpNote?: string }, operator: User): Promise<any> {
    await this.seedInitialClientsIfEmpty();

    if (!payload.phone || !payload.phone.trim()) {
      throw new Error('Phone number is required to register a client.');
    }

    const firstName = (payload.firstName || (payload as any).name || '').trim();
    if (!firstName && !payload.companyName) {
      throw new Error('Client name or Company name is required.');
    }

    const clientCode = payload.clientCode?.trim() || (await this.generateNextClientCode());
    const clientId = payload.id || `cli-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const agentId = payload.assignedAgentId || operator.id || 'user-admin-1';
    let agentName = payload.assignedAgentName || operator.name || 'Administrator';

    // Verify agent name if only ID provided
    if (agentId && !payload.assignedAgentName) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, agentId)).limit(1);
      if (u) agentName = u.name;
    }

    const newClient: InsertDbClient = {
      id: clientId,
      clientCode,
      firstName,
      lastName: payload.lastName?.trim() || '',
      companyName: payload.companyName?.trim() || '',
      phone: payload.phone.trim(),
      email: payload.email?.trim() || '',
      nationality: payload.nationality?.trim() || 'Thai',
      idNumber: payload.idNumber?.trim() || '',
      clientType: payload.clientType || 'Buyer',
      intent: payload.intent || 'Buy',
      budgetMin: String(payload.budgetMin || 0),
      budgetMax: String(payload.budgetMax || 0),
      propertyType: payload.propertyType || 'Villa',
      preferredLocation: payload.preferredLocation?.trim() || '',
      status: this.normalizeStatus(payload.status),
      leadSource: payload.leadSource?.trim() || 'Website',
      lostReason: payload.lostReason?.trim() || '',
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      nextFollowUpDate: payload.nextFollowUpDate || null,
      notes: payload.notes?.trim() || '',
      isArchived: false,
      createdBy: operator.id || null,
      createdByName: operator.name || 'System',
      updatedBy: operator.id || null,
    };

    const [created] = await db.insert(clientsTable).values(newClient).returning();

    // Link initial properties if passed
    if (Array.isArray(payload.propertyIds) && payload.propertyIds.length > 0) {
      for (const pId of payload.propertyIds) {
        await this.linkProperty(clientId, pId, 'Initial interest', operator);
      }
    }

    // Add initial follow-up if requested
    if (payload.nextFollowUpDate && payload.initialFollowUpNote) {
      await this.addFollowUp(
        clientId,
        {
          followUpDate: payload.nextFollowUpDate,
          followUpNote: payload.initialFollowUpNote,
          assignedAgentId: agentId,
          assignedAgentName: agentName,
        },
        operator
      );
    }

    // Audit Log Entry
    try {
      await db.insert(auditLogsTable).values({
        propertyId: created.id,
        action: 'Create Client',
        userName: operator.name || 'System',
        userId: operator.id || null,
        newValue: `Created lead/client ${created.clientCode} (${created.firstName} ${created.lastName || ''}) [Stage: ${created.status}, Source: ${created.leadSource}, Agent: ${created.assignedAgentName}]`,
      });
    } catch (e) {
      console.warn('Audit log creation notice:', e);
    }

    return this.getClientById(created.id, operator);
  }

  /**
   * Update client details with RBAC & Audit Log
   */
  async updateClient(id: string, updates: Partial<InsertDbClient>, operator: User): Promise<any> {
    const existing = await this.getClientById(id, operator);

    if (existing.isArchived) {
      throw new Error(`Cannot update archived client record (${existing.clientCode})`);
    }

    // RBAC: Admin and Manager can update any client. Agent can update if assigned to it or created it
    const roleLower = (operator.role || '').toLowerCase();
    const isManagerOrAdmin = roleLower.includes('admin') || roleLower.includes('manager');
    if (!isManagerOrAdmin && operator.id) {
      if (existing.assignedAgentId !== operator.id && existing.createdBy !== operator.id) {
        throw new Error('Forbidden: Agents may only modify clients assigned to them.');
      }
    }

    const payload: Partial<InsertDbClient> = {
      ...updates,
      updatedBy: operator.id || null,
      updatedAt: new Date(),
    };

    if (updates.status) {
      payload.status = this.normalizeStatus(updates.status);
    }
    if (updates.leadSource !== undefined) {
      payload.leadSource = updates.leadSource;
    }
    if (updates.lostReason !== undefined) {
      payload.lostReason = updates.lostReason;
    }

    const [updated] = await db
      .update(clientsTable)
      .set(payload)
      .where(eq(clientsTable.id, existing.id))
      .returning();

    // Audit Log Entries
    try {
      const statusChanged = updates.status && updates.status !== existing.status;
      const agentChanged = updates.assignedAgentId && updates.assignedAgentId !== existing.assignedAgentId;
      const sourceChanged = updates.leadSource && updates.leadSource !== existing.leadSource;

      if (statusChanged) {
        await db.insert(auditLogsTable).values({
          propertyId: updated.id,
          action: 'Pipeline Stage Change',
          userName: operator.name || 'System',
          userId: operator.id || null,
          oldValue: `Stage: ${existing.status}`,
          newValue: `Stage: ${updated.status}${updated.lostReason ? ` (Reason: ${updated.lostReason})` : ''}`,
        });
      }

      if (agentChanged) {
        await db.insert(auditLogsTable).values({
          propertyId: updated.id,
          action: 'Assign Agent',
          userName: operator.name || 'System',
          userId: operator.id || null,
          oldValue: `Agent: ${existing.assignedAgentName} (${existing.assignedAgentId})`,
          newValue: `Agent: ${updated.assignedAgentName} (${updated.assignedAgentId})`,
        });
      }

      if (sourceChanged) {
        await db.insert(auditLogsTable).values({
          propertyId: updated.id,
          action: 'Update Lead Source',
          userName: operator.name || 'System',
          userId: operator.id || null,
          oldValue: `Source: ${existing.leadSource || 'Website'}`,
          newValue: `Source: ${updated.leadSource || 'Website'}`,
        });
      }

      if (!statusChanged && !agentChanged && !sourceChanged) {
        await db.insert(auditLogsTable).values({
          propertyId: updated.id,
          action: 'Update Client',
          userName: operator.name || 'System',
          userId: operator.id || null,
          oldValue: `${existing.firstName} ${existing.lastName || ''} | Phone: ${existing.phone}`,
          newValue: `${updated.firstName} ${updated.lastName || ''} | Phone: ${updated.phone}`,
        });
      }
    } catch (e) {
      console.warn('Audit log update notice:', e);
    }

    return this.getClientById(updated.id, operator);
  }

  /**
   * Change client status / pipeline stage
   */
  async changeStatus(id: string, newStatus: string, operator: User): Promise<any> {
    const normalized = this.normalizeStatus(newStatus);
    return this.updateClient(id, { status: normalized }, operator);
  }

  /**
   * Advance or set pipeline stage with optional lost reason
   */
  async changePipelineStage(
    id: string,
    stage: string,
    operatorOrReason?: string | User,
    operator?: User
  ): Promise<any> {
    let lostReason: string | undefined = undefined;
    let actualOperator: User | undefined = operator;

    if (typeof operatorOrReason === 'string') {
      lostReason = operatorOrReason;
    } else if (operatorOrReason && typeof operatorOrReason === 'object') {
      actualOperator = operatorOrReason as User;
    }

    const normalized = this.normalizeStatus(stage);
    const updates: Partial<InsertDbClient> = {
      status: normalized,
    };
    if (lostReason !== undefined) {
      updates.lostReason = lostReason;
    }
    return this.updateClient(
      id,
      updates,
      actualOperator || ({ id: 'usr-1', name: 'System', role: 'Administrator' } as User)
    );
  }

  /**
   * Get pipeline summary counts & values per stage
   */
  async getPipelineSummary(operator?: User): Promise<{
    stages: Record<string, { count: number; totalBudget: number; clients: any[] }>;
    totalActiveLeads: number;
    totalActiveValue: number;
  }> {
    await this.seedInitialClientsIfEmpty();

    const activeClients = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.isArchived, false));

    const pipelineStages = ['New', 'Contacted', 'Qualified', 'Viewing', 'Negotiation', 'Won', 'Lost'];
    const stages: Record<string, { count: number; totalBudget: number; clients: any[] }> = {};
    for (const stage of pipelineStages) {
      stages[stage] = { count: 0, totalBudget: 0, clients: [] };
    }

    let totalActiveLeads = 0;
    let totalActiveValue = 0;

    for (const c of activeClients) {
      const norm = this.normalizeStatus(c.status);
      const stageKey = norm === 'Closed' ? 'Won' : stages[norm] ? norm : 'New';
      const budget = Number(c.budgetMax || c.budgetMin || 0);

      if (stages[stageKey]) {
        stages[stageKey].count += 1;
        stages[stageKey].totalBudget += budget;
        stages[stageKey].clients.push({
          ...c,
          name: `${c.firstName} ${c.lastName || ''}`.trim() || c.companyName || 'Unnamed Client',
          budgetMax: Number(c.budgetMax || 0),
          budgetMin: Number(c.budgetMin || 0),
        });
      }

      if (stageKey !== 'Lost') {
        totalActiveLeads += 1;
        totalActiveValue += budget;
      }
    }

    return {
      stages,
      totalActiveLeads,
      totalActiveValue,
    };
  }

  /**
   * Assign Agent (Manager / Admin)
   */
  async assignAgent(id: string, agentId: string, agentName: string, operator: User): Promise<any> {
    const roleLower = (operator.role || '').toLowerCase();
    const isManagerOrAdmin = roleLower.includes('admin') || roleLower.includes('manager');
    if (!isManagerOrAdmin) {
      throw new Error('Forbidden: Only Managers or Administrators can reassign client agents.');
    }

    let resolvedName = agentName;
    if (!resolvedName && agentId) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, agentId)).limit(1);
      if (u) resolvedName = u.name;
    }

    return this.updateClient(
      id,
      {
        assignedAgentId: agentId,
        assignedAgentName: resolvedName || 'Agent',
      },
      operator
    );
  }

  /**
   * Link property to client
   */
  async linkProperty(clientId: string, propertyId: string, notes?: string, operator?: User): Promise<DbClientProperty> {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);
    if (!client) throw new Error(`Client not found with ID: ${clientId}`);

    // Check if property exists
    const [prop] = await db.select().from(propertiesTable).where(eq(propertiesTable.propertyId, propertyId)).limit(1);

    // Check if already linked
    const existingLinks = await db
      .select()
      .from(clientPropertiesTable)
      .where(and(eq(clientPropertiesTable.clientId, clientId), eq(clientPropertiesTable.propertyId, propertyId)));

    if (existingLinks.length > 0) {
      return existingLinks[0];
    }

    const newLink: InsertDbClientProperty = {
      id: `cl-prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientId,
      propertyId,
      propertyCustomId: prop?.propertyId || propertyId,
      propertyTitle: prop?.title || '',
      notes: notes || '',
    };

    const [created] = await db.insert(clientPropertiesTable).values(newLink).returning();

    // Audit log
    if (operator) {
      try {
        await db.insert(auditLogsTable).values({
          propertyId: clientId,
          action: 'Add Property',
          userName: operator.name || 'System',
          userId: operator.id || null,
          newValue: `Linked property ${created.propertyCustomId || created.propertyId} (${created.propertyTitle || 'Property'}) to client ${client.clientCode}`,
        });
      } catch (e) {
        console.warn('Audit log link property notice:', e);
      }
    }

    return created;
  }

  /**
   * Unlink property from client
   */
  async unlinkProperty(clientId: string, propertyId: string, operator: User): Promise<void> {
    await db
      .delete(clientPropertiesTable)
      .where(and(eq(clientPropertiesTable.clientId, clientId), eq(clientPropertiesTable.propertyId, propertyId)));

    try {
      await db.insert(auditLogsTable).values({
        propertyId: clientId,
        action: 'Remove Property',
        userName: operator.name || 'System',
        userId: operator.id || null,
        oldValue: `Unlinked property ${propertyId} from client ${clientId}`,
      });
    } catch (e) {
      console.warn('Audit log unlink property notice:', e);
    }
  }

  /**
   * Recalculate client's nextFollowUpDate based on remaining pending non-archived follow-ups
   */
  async recalculateNextFollowUpDate(clientId: string): Promise<void> {
    const pending = await db
      .select({ followUpDate: clientFollowUpsTable.followUpDate })
      .from(clientFollowUpsTable)
      .where(
        and(
          eq(clientFollowUpsTable.clientId, clientId),
          eq(clientFollowUpsTable.status, 'Pending'),
          eq(clientFollowUpsTable.isArchived, false)
        )
      )
      .orderBy(asc(clientFollowUpsTable.followUpDate))
      .limit(1);

    const nextDate = pending.length > 0 ? pending[0].followUpDate : null;
    await db
      .update(clientsTable)
      .set({
        nextFollowUpDate: nextDate,
        updatedAt: new Date(),
      })
      .where(eq(clientsTable.id, clientId));
  }

  /**
   * Add Follow-up to client (B25/B26/B27)
   */
  async addFollowUp(
    clientId: string,
    payload: {
      followUpDate: string;
      followUpTime?: string;
      followUpNote: string;
      notes?: string;
      title?: string;
      priority?: 'Low' | 'Normal' | 'Medium' | 'High' | 'Urgent';
      assignedAgentId?: string;
      assignedAgentName?: string;
      status?: 'Pending' | 'Completed' | 'Cancelled';
    },
    operator: User
  ): Promise<DbClientFollowUp> {
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);
    if (!client) throw new Error(`Client not found with ID: ${clientId}`);

    if (!payload.followUpDate) throw new Error('Follow-up date is required.');
    if (!payload.followUpNote || !payload.followUpNote.trim()) throw new Error('Follow-up note is required.');

    const agentId = payload.assignedAgentId || client.assignedAgentId || operator.id || 'user-admin-1';
    const agentName = payload.assignedAgentName || client.assignedAgentName || operator.name || 'Agent';

    const newFollowUp: InsertDbClientFollowUp = {
      id: `cl-fu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      clientId,
      title: payload.title || payload.followUpNote.trim().slice(0, 80),
      followUpDate: payload.followUpDate,
      followUpTime: payload.followUpTime || '10:00',
      followUpNote: payload.followUpNote.trim(),
      notes: payload.notes || payload.followUpNote.trim(),
      priority: payload.priority || 'Normal',
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      status: (payload.status as any) || 'Pending',
      isArchived: false,
      createdBy: operator.id || null,
      createdByName: operator.name || null,
    };

    const [created] = await db.insert(clientFollowUpsTable).values(newFollowUp).returning();

    // Recalculate client's nextFollowUpDate
    await this.recalculateNextFollowUpDate(clientId);

    // Audit log
    try {
      await db.insert(auditLogsTable).values({
        propertyId: clientId,
        action: 'Add Follow-up',
        userName: operator.name || 'System',
        userId: operator.id || null,
        newValue: `Scheduled follow-up for client ${client.clientCode} on ${created.followUpDate}: "${created.followUpNote}" (Agent: ${created.assignedAgentName})`,
      });
    } catch (e) {
      console.warn('Audit log follow up notice:', e);
    }

    return created;
  }

  /**
   * Create Follow-up Task with clientId in payload
   */
  async createFollowUpTask(payload: any, operator: User): Promise<DbClientFollowUp> {
    if (!payload.clientId) throw new Error('Client / Lead ID is required for follow-up task.');
    return this.addFollowUp(payload.clientId, payload, operator);
  }

  /**
   * Get Follow-up Task by ID with client details & audit logs
   */
  async getFollowUpById(followUpId: string, operator?: User): Promise<any> {
    const [row] = await db
      .select({
        followUp: clientFollowUpsTable,
        client: clientsTable,
      })
      .from(clientFollowUpsTable)
      .leftJoin(clientsTable, eq(clientFollowUpsTable.clientId, clientsTable.id))
      .where(eq(clientFollowUpsTable.id, followUpId))
      .limit(1);

    if (!row || !row.followUp) {
      throw new Error(`Follow-up record not found with ID: ${followUpId}`);
    }

    const { followUp, client } = row;
    const clientName = client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.companyName || 'Unknown Client' : 'Unknown Client';

    const auditLogs = await db
      .select()
      .from(auditLogsTable)
      .where(or(eq(auditLogsTable.propertyId, followUp.id), eq(auditLogsTable.propertyId, followUp.clientId)))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(15);

    return {
      ...followUp,
      clientCode: client?.clientCode || '',
      clientName,
      clientPhone: client?.phone || '',
      clientType: client?.clientType || '',
      clientIntent: client?.intent || '',
      clientStatus: client?.status || '',
      client,
      auditLogs,
    };
  }

  /**
   * List / Search / Filter Follow-up Tasks (B27)
   */
  async getFollowUps(params: FollowUpQueryParams = {}, operator?: User): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    summary: {
      total: number;
      pending: number;
      completed: number;
      cancelled: number;
      overdue: number;
      dueToday: number;
      upcoming: number;
    };
  }> {
    await this.seedInitialClientsIfEmpty();

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(params.limit || params.pageSize) || 50));
    const offset = (page - 1) * limit;

    const todayStr = new Date().toISOString().split('T')[0];

    // Determine conditions
    const conditions: any[] = [];

    // Soft delete: isArchived
    const includeArchived = params.isArchived === true || params.isArchived === 'true' || params.isArchived === 'all';
    if (!includeArchived) {
      conditions.push(eq(clientFollowUpsTable.isArchived, false));
    }

    // Status filter
    if (params.status && params.status !== 'all') {
      conditions.push(eq(clientFollowUpsTable.status, params.status));
    }

    // Client ID filter
    if (params.clientId) {
      conditions.push(eq(clientFollowUpsTable.clientId, params.clientId));
    }

    // Agent filter
    const agentFilter = params.assignedAgentId || params.agentId;
    if (agentFilter) {
      conditions.push(eq(clientFollowUpsTable.assignedAgentId, agentFilter));
    }

    // Priority filter
    if (params.priority && params.priority !== 'all') {
      conditions.push(eq(clientFollowUpsTable.priority, params.priority));
    }

    // Date / Timeframe filter
    const tf = params.timeframe || params.dateFilter;
    if (tf === 'overdue') {
      conditions.push(sql`${clientFollowUpsTable.followUpDate} < ${todayStr} AND ${clientFollowUpsTable.status} = 'Pending'`);
    } else if (tf === 'today') {
      conditions.push(eq(clientFollowUpsTable.followUpDate, todayStr));
    } else if (tf === 'upcoming') {
      conditions.push(sql`${clientFollowUpsTable.followUpDate} > ${todayStr} AND ${clientFollowUpsTable.status} = 'Pending'`);
    }

    if (params.startDate) {
      conditions.push(sql`${clientFollowUpsTable.followUpDate} >= ${params.startDate}`);
    }
    if (params.endDate) {
      conditions.push(sql`${clientFollowUpsTable.followUpDate} <= ${params.endDate}`);
    }

    // Keyword search
    const search = (params.search || params.q || '').trim();
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(clientFollowUpsTable.followUpNote, pattern),
          ilike(clientFollowUpsTable.notes, pattern),
          ilike(clientFollowUpsTable.title, pattern),
          ilike(clientFollowUpsTable.assignedAgentName, pattern),
          ilike(clientsTable.clientCode, pattern),
          ilike(clientsTable.firstName, pattern),
          ilike(clientsTable.lastName, pattern),
          ilike(clientsTable.companyName, pattern),
          ilike(clientsTable.phone, pattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
    let orderByClause: any = desc(clientFollowUpsTable.followUpDate);
    if (params.sortBy === 'date' || !params.sortBy) {
      orderByClause = sortOrder === 'asc' ? asc(clientFollowUpsTable.followUpDate) : desc(clientFollowUpsTable.followUpDate);
    } else if (params.sortBy === 'createdAt') {
      orderByClause = sortOrder === 'asc' ? asc(clientFollowUpsTable.createdAt) : desc(clientFollowUpsTable.createdAt);
    }

    // Total count
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(clientFollowUpsTable)
      .leftJoin(clientsTable, eq(clientFollowUpsTable.clientId, clientsTable.id))
      .where(whereClause);
    const total = Number(countRows[0]?.count || 0);

    // Query records with client join
    const rows = await db
      .select({
        followUp: clientFollowUpsTable,
        client: {
          id: clientsTable.id,
          clientCode: clientsTable.clientCode,
          firstName: clientsTable.firstName,
          lastName: clientsTable.lastName,
          companyName: clientsTable.companyName,
          phone: clientsTable.phone,
          clientType: clientsTable.clientType,
          intent: clientsTable.intent,
          status: clientsTable.status,
        },
      })
      .from(clientFollowUpsTable)
      .leftJoin(clientsTable, eq(clientFollowUpsTable.clientId, clientsTable.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    const formattedData = rows.map((r) => {
      const c = r.client;
      const clientName = c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.companyName || 'Unknown Client' : 'Unknown Client';
      return {
        ...r.followUp,
        clientCode: c?.clientCode || '',
        clientName,
        clientPhone: c?.phone || '',
        clientType: c?.clientType || '',
        clientIntent: c?.intent || '',
        clientStatus: c?.status || '',
      };
    });

    // Summary calculation (across non-archived follow-ups)
    const allActiveFollowUps = await db
      .select()
      .from(clientFollowUpsTable)
      .where(eq(clientFollowUpsTable.isArchived, false));

    let pendingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let overdueCount = 0;
    let dueTodayCount = 0;
    let upcomingCount = 0;

    for (const f of allActiveFollowUps) {
      if (f.status === 'Completed') completedCount++;
      else if (f.status === 'Cancelled') cancelledCount++;
      else if (f.status === 'Pending') {
        pendingCount++;
        if (f.followUpDate < todayStr) overdueCount++;
        else if (f.followUpDate === todayStr) dueTodayCount++;
        else upcomingCount++;
      }
    }

    return {
      data: formattedData,
      total,
      page,
      limit,
      summary: {
        total: allActiveFollowUps.length,
        pending: pendingCount,
        completed: completedCount,
        cancelled: cancelledCount,
        overdue: overdueCount,
        dueToday: dueTodayCount,
        upcoming: upcomingCount,
      },
    };
  }

  /**
   * Update follow-up task (Edit / Reschedule / Reassign)
   */
  async updateFollowUp(
    followUpId: string,
    payload: {
      title?: string;
      followUpDate?: string;
      followUpTime?: string;
      followUpNote?: string;
      notes?: string;
      priority?: 'Low' | 'Normal' | 'Medium' | 'High' | 'Urgent';
      assignedAgentId?: string;
      assignedAgentName?: string;
      status?: 'Pending' | 'Completed' | 'Cancelled';
      cancelReason?: string;
    },
    operator: User
  ): Promise<DbClientFollowUp> {
    const [existing] = await db.select().from(clientFollowUpsTable).where(eq(clientFollowUpsTable.id, followUpId)).limit(1);
    if (!existing) throw new Error(`Follow-up record not found with ID: ${followUpId}`);

    // RBAC: Admin or Manager can edit any task. Agent can edit tasks assigned to them.
    const roleLower = (operator.role || '').toLowerCase();
    const isManagerOrAdmin = roleLower.includes('admin') || roleLower.includes('manager');
    if (!isManagerOrAdmin && existing.assignedAgentId !== operator.id) {
      throw new Error('Forbidden: You can only edit follow-up tasks assigned to you.');
    }

    const updates: Partial<InsertDbClientFollowUp> = {
      updatedAt: new Date(),
      updatedBy: operator.id || null,
    };

    if (payload.title !== undefined) updates.title = payload.title;
    if (payload.followUpDate !== undefined) updates.followUpDate = payload.followUpDate;
    if (payload.followUpTime !== undefined) updates.followUpTime = payload.followUpTime;
    if (payload.followUpNote !== undefined) {
      updates.followUpNote = payload.followUpNote;
      if (!payload.notes) updates.notes = payload.followUpNote;
    }
    if (payload.notes !== undefined) updates.notes = payload.notes;
    if (payload.priority !== undefined) updates.priority = payload.priority;
    if (payload.assignedAgentId !== undefined) updates.assignedAgentId = payload.assignedAgentId;
    if (payload.assignedAgentName !== undefined) updates.assignedAgentName = payload.assignedAgentName;
    if (payload.status !== undefined) {
      updates.status = payload.status;
      if (payload.status === 'Completed' && existing.status !== 'Completed') {
        updates.completedAt = new Date();
      } else if (payload.status === 'Cancelled' && existing.status !== 'Cancelled') {
        updates.cancelledAt = new Date();
        updates.cancelReason = payload.cancelReason || 'Cancelled';
      }
    }
    if (payload.cancelReason !== undefined) updates.cancelReason = payload.cancelReason;

    const [updated] = await db
      .update(clientFollowUpsTable)
      .set(updates)
      .where(eq(clientFollowUpsTable.id, followUpId))
      .returning();

    await this.recalculateNextFollowUpDate(updated.clientId);

    // Audit log
    try {
      await db.insert(auditLogsTable).values({
        propertyId: updated.clientId,
        action: 'Update Follow-up',
        userName: operator.name || 'System',
        userId: operator.id || null,
        oldValue: `Status: ${existing.status}, Date: ${existing.followUpDate}, Agent: ${existing.assignedAgentName}`,
        newValue: `Status: ${updated.status}, Date: ${updated.followUpDate}, Agent: ${updated.assignedAgentName} (Updated by ${operator.name})`,
      });
    } catch (e) {
      console.warn('Audit log update follow up notice:', e);
    }

    return updated;
  }

  /**
   * Complete follow up (B25/B26/B27)
   */
  async completeFollowUp(followUpId: string, operator: User): Promise<DbClientFollowUp> {
    const [existing] = await db.select().from(clientFollowUpsTable).where(eq(clientFollowUpsTable.id, followUpId)).limit(1);
    if (!existing) throw new Error(`Follow-up record not found with ID: ${followUpId}`);

    const [updated] = await db
      .update(clientFollowUpsTable)
      .set({
        status: 'Completed',
        completedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: operator.id || null,
      })
      .where(eq(clientFollowUpsTable.id, followUpId))
      .returning();

    await this.recalculateNextFollowUpDate(updated.clientId);

    // Audit log
    try {
      await db.insert(auditLogsTable).values({
        propertyId: updated.clientId,
        action: 'Complete Follow-up',
        userName: operator.name || 'System',
        userId: operator.id || null,
        oldValue: `Status: ${existing.status}`,
        newValue: `Status: Completed on ${new Date().toISOString()} by ${operator.name} (${operator.role})`,
      });
    } catch (e) {
      console.warn('Audit log complete follow up notice:', e);
    }

    return updated;
  }

  /**
   * Cancel follow up task with reason
   */
  async cancelFollowUp(followUpId: string, reason: string, operator: User): Promise<DbClientFollowUp> {
    const [existing] = await db.select().from(clientFollowUpsTable).where(eq(clientFollowUpsTable.id, followUpId)).limit(1);
    if (!existing) throw new Error(`Follow-up record not found with ID: ${followUpId}`);

    // RBAC: Admin or Manager can cancel any task. Agent can cancel their own tasks.
    const roleLower = (operator.role || '').toLowerCase();
    const isManagerOrAdmin = roleLower.includes('admin') || roleLower.includes('manager');
    if (!isManagerOrAdmin && existing.assignedAgentId !== operator.id) {
      throw new Error('Forbidden: You can only cancel follow-up tasks assigned to you.');
    }

    const [updated] = await db
      .update(clientFollowUpsTable)
      .set({
        status: 'Cancelled',
        cancelledAt: new Date(),
        cancelReason: reason || 'Cancelled by operator',
        updatedAt: new Date(),
        updatedBy: operator.id || null,
      })
      .where(eq(clientFollowUpsTable.id, followUpId))
      .returning();

    await this.recalculateNextFollowUpDate(updated.clientId);

    // Audit log
    try {
      await db.insert(auditLogsTable).values({
        propertyId: updated.clientId,
        action: 'Cancel Follow-up',
        userName: operator.name || 'System',
        userId: operator.id || null,
        oldValue: `Status: ${existing.status}`,
        newValue: `Status: Cancelled. Reason: "${reason || 'No reason provided'}" by ${operator.name} (${operator.role})`,
      });
    } catch (e) {
      console.warn('Audit log cancel follow up notice:', e);
    }

    return updated;
  }

  /**
   * Soft Delete Follow-up Task (Admin / Manager only)
   */
  async softDeleteFollowUp(followUpId: string, operator: User): Promise<DbClientFollowUp> {
    const [existing] = await db.select().from(clientFollowUpsTable).where(eq(clientFollowUpsTable.id, followUpId)).limit(1);
    if (!existing) throw new Error(`Follow-up record not found with ID: ${followUpId}`);

    // RBAC: Only Admin or Manager can soft delete
    const roleLower = (operator.role || '').toLowerCase();
    const isManagerOrAdmin = roleLower.includes('admin') || roleLower.includes('manager');
    if (!isManagerOrAdmin) {
      throw new Error('Forbidden: Only Administrators or Managers have permission to delete follow-up tasks.');
    }

    const [archived] = await db
      .update(clientFollowUpsTable)
      .set({
        isArchived: true,
        updatedBy: operator.id || null,
        updatedAt: new Date(),
      })
      .where(eq(clientFollowUpsTable.id, followUpId))
      .returning();

    await this.recalculateNextFollowUpDate(archived.clientId);

    // Audit log
    try {
      await db.insert(auditLogsTable).values({
        propertyId: archived.clientId,
        action: 'Delete Follow-up',
        userName: operator.name || 'System',
        userId: operator.id || null,
        oldValue: `Active: Follow-up ID ${archived.id} (${archived.followUpDate} ${archived.followUpNote})`,
        newValue: `Archived: true by ${operator.name} (${operator.role})`,
      });
    } catch (e) {
      console.warn('Audit log archive follow up notice:', e);
    }

    return archived;
  }

  /**
   * Add Lead Note with author and timestamp to client
   */
  async addLeadNote(id: string, note: string, operator: User): Promise<any> {
    const [existing] = await db.select().from(clientsTable).where(eq(clientsTable.id, id)).limit(1);
    if (!existing) throw new Error(`Client not found with ID: ${id}`);

    if (!note || !note.trim()) {
      throw new Error('Note content cannot be empty.');
    }

    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newEntry = `[${timeStr}] ${operator.name} (${operator.role}): ${note.trim()}`;
    const updatedNotes = existing.notes ? `${newEntry}\n\n${existing.notes}` : newEntry;

    const [updated] = await db
      .update(clientsTable)
      .set({
        notes: updatedNotes,
        updatedAt: new Date(),
        updatedBy: operator.id || null,
      })
      .where(eq(clientsTable.id, id))
      .returning();

    // Audit log
    try {
      await db.insert(auditLogsTable).values({
        propertyId: updated.id,
        action: 'Add Lead Note',
        userName: operator.name || 'System',
        userId: operator.id || null,
        newValue: note.trim(),
      });
    } catch (e) {
      console.warn('Audit log add lead note notice:', e);
    }

    return this.getClientById(updated.id, operator);
  }

  /**
   * Soft delete client (Admin / Manager only)
   */
  async softDeleteClient(id: string, operator: User): Promise<DbClient> {
    const [existing] = await db.select().from(clientsTable).where(eq(clientsTable.id, id)).limit(1);
    if (!existing) throw new Error(`Client not found with ID: ${id}`);

    // Role check: Only Admin or Manager can delete
    const roleLower = (operator.role || '').toLowerCase();
    const isManagerOrAdmin = roleLower.includes('admin') || roleLower.includes('manager');
    if (!isManagerOrAdmin) {
      throw new Error('Forbidden: Only Administrators or Managers have permission to archive clients.');
    }

    const [archived] = await db
      .update(clientsTable)
      .set({
        isArchived: true,
        updatedBy: operator.id || null,
        updatedAt: new Date(),
      })
      .where(eq(clientsTable.id, id))
      .returning();

    // Audit Log Entry
    try {
      await db.insert(auditLogsTable).values({
        propertyId: archived.id,
        action: 'Archive Client',
        userName: operator.name || 'System',
        userId: operator.id || null,
        oldValue: `Active: ${archived.clientCode} (${archived.firstName} ${archived.lastName || ''})`,
        newValue: `Archived: true by ${operator.name} (${operator.role})`,
      });
    } catch (e) {
      console.warn('Audit log archive notice:', e);
    }

    return archived;
  }

  /**
   * Get follow up summary counts (B25/B26/B27)
   */
  async getFollowUpSummary(operator?: User): Promise<{
    overdue: number;
    dueToday: number;
    upcoming: number;
    totalPending: number;
    totalCompleted: number;
    totalCancelled: number;
    total: number;
  }> {
    await this.seedInitialClientsIfEmpty();

    const todayStr = new Date().toISOString().split('T')[0];

    const allActive = await db
      .select()
      .from(clientFollowUpsTable)
      .where(eq(clientFollowUpsTable.isArchived, false));

    let overdue = 0;
    let dueToday = 0;
    let upcoming = 0;
    let totalPending = 0;
    let totalCompleted = 0;
    let totalCancelled = 0;

    for (const f of allActive) {
      if (f.status === 'Completed') {
        totalCompleted++;
      } else if (f.status === 'Cancelled') {
        totalCancelled++;
      } else if (f.status === 'Pending') {
        totalPending++;
        if (f.followUpDate < todayStr) overdue++;
        else if (f.followUpDate === todayStr) dueToday++;
        else upcoming++;
      }
    }

    return {
      overdue,
      dueToday,
      upcoming,
      totalPending,
      totalCompleted,
      totalCancelled,
      total: allActive.length,
    };
  }
}

export const clientService = new ClientService();
