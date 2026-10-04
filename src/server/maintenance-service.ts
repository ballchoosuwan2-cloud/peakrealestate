import { db, pool, schema } from '../db/index.ts';
import {
  maintenanceVendorsTable,
  maintenanceRequestsTable,
  maintenanceCostsTable,
  preventiveMaintenanceTable,
  propertiesTable,
  clientsTable,
  contractsTable,
  auditLogsTable,
  DbMaintenanceVendor,
  DbMaintenanceRequest,
  DbMaintenanceCost,
  DbPreventiveMaintenance,
} from '../db/schema.ts';
import { eq, and, desc, asc, sql, ilike, or, gte, lte } from 'drizzle-orm';
import { User } from '../types.ts';

export interface MaintenanceFilterParams {
  search?: string;
  propertyId?: string;
  customerId?: string;
  contractId?: string;
  priority?: string;
  status?: string;
  category?: string;
  assignedVendorId?: string;
  assignedAgentId?: string;
  isArchived?: boolean | string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

class MaintenanceService {
  // =========================================================================
  // 1. VENDORS & TECHNICIANS
  // =========================================================================

  async listVendors(params: { search?: string; serviceType?: string; isActive?: boolean | string; isArchived?: boolean | string } = {}): Promise<DbMaintenanceVendor[]> {
    const conditions = [];

    if (params.isArchived !== 'all') {
      const isArch = params.isArchived === true || params.isArchived === 'true';
      conditions.push(eq(maintenanceVendorsTable.isArchived, isArch));
    }

    if (params.isActive !== undefined && params.isActive !== '') {
      const isAct = params.isActive === true || params.isActive === 'true';
      conditions.push(eq(maintenanceVendorsTable.isActive, isAct));
    }

    if (params.serviceType) {
      conditions.push(eq(maintenanceVendorsTable.serviceType, params.serviceType));
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(maintenanceVendorsTable.name, term),
          ilike(maintenanceVendorsTable.company, term),
          ilike(maintenanceVendorsTable.phone, term),
          ilike(maintenanceVendorsTable.serviceType, term),
          ilike(maintenanceVendorsTable.vendorCode, term)
        )
      );
    }

    return await db
      .select()
      .from(maintenanceVendorsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(maintenanceVendorsTable.createdAt));
  }

  async getVendorById(id: string): Promise<DbMaintenanceVendor | null> {
    const rows = await db
      .select()
      .from(maintenanceVendorsTable)
      .where(eq(maintenanceVendorsTable.id, id))
      .limit(1);
    return rows[0] || null;
  }

  async createVendor(
    data: {
      name: string;
      company?: string;
      phone: string;
      email?: string;
      serviceType: string;
      rating?: number | string;
      notes?: string;
    },
    operator?: User
  ): Promise<DbMaintenanceVendor> {
    // Generate vendor code: VND-001
    const countCheck = await db.select({ count: sql<number>`count(*)` }).from(maintenanceVendorsTable);
    const seq = (Number(countCheck[0]?.count || 0) + 1).toString().padStart(3, '0');
    const vendorCode = `VND-${seq}`;
    const id = `vnd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newVendor = {
      id,
      vendorCode,
      name: data.name,
      company: data.company || '',
      phone: data.phone,
      email: data.email || '',
      serviceType: data.serviceType || 'General',
      rating: data.rating ? data.rating.toString() : '5.0',
      isActive: true,
      notes: data.notes || '',
      isArchived: false,
      createdBy: operator?.id || 'system',
      createdByName: operator?.name || 'Administrator',
      updatedBy: operator?.name || 'Administrator',
    };

    const inserted = await db.insert(maintenanceVendorsTable).values(newVendor).returning();

    // Audit log
    await this.logAudit({
      action: 'Created Vendor',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      newValue: `Created vendor ${data.name} (${vendorCode})`,
    });

    return inserted[0];
  }

  async updateVendor(
    id: string,
    data: Partial<{
      name: string;
      company: string;
      phone: string;
      email: string;
      serviceType: string;
      rating: number | string;
      isActive: boolean;
      notes: string;
    }>,
    operator?: User
  ): Promise<DbMaintenanceVendor | null> {
    const existing = await this.getVendorById(id);
    if (!existing) return null;

    const updatePayload: any = {
      ...data,
      updatedBy: operator?.name || 'Administrator',
      updatedAt: new Date(),
    };
    if (data.rating !== undefined) {
      updatePayload.rating = data.rating.toString();
    }

    const updated = await db
      .update(maintenanceVendorsTable)
      .set(updatePayload)
      .where(eq(maintenanceVendorsTable.id, id))
      .returning();

    await this.logAudit({
      action: 'Updated Vendor',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated[0]),
    });

    return updated[0] || null;
  }

  async toggleVendorActive(id: string, operator?: User): Promise<DbMaintenanceVendor | null> {
    const existing = await this.getVendorById(id);
    if (!existing) return null;

    const newActive = !existing.isActive;
    const updated = await db
      .update(maintenanceVendorsTable)
      .set({
        isActive: newActive,
        updatedBy: operator?.name || 'Administrator',
        updatedAt: new Date(),
      })
      .where(eq(maintenanceVendorsTable.id, id))
      .returning();

    await this.logAudit({
      action: newActive ? 'Activated Vendor' : 'Deactivated Vendor',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      newValue: `Vendor ${existing.name} set to ${newActive ? 'Active' : 'Inactive'}`,
    });

    return updated[0] || null;
  }

  async deleteVendor(id: string, operator?: User): Promise<boolean> {
    const existing = await this.getVendorById(id);
    if (!existing) return false;

    await db
      .update(maintenanceVendorsTable)
      .set({
        isArchived: true,
        updatedBy: operator?.name || 'Administrator',
        updatedAt: new Date(),
      })
      .where(eq(maintenanceVendorsTable.id, id));

    await this.logAudit({
      action: 'Archived Vendor',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      newValue: `Archived vendor ${existing.name} (${existing.vendorCode})`,
    });

    return true;
  }

  // =========================================================================
  // 2. MAINTENANCE REQUESTS
  // =========================================================================

  async listMaintenanceRequests(params: MaintenanceFilterParams = {}): Promise<{
    data: DbMaintenanceRequest[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const conditions = [];

    if (params.isArchived !== 'all') {
      const isArch = params.isArchived === true || params.isArchived === 'true';
      conditions.push(eq(maintenanceRequestsTable.isArchived, isArch));
    }

    if (params.propertyId) {
      conditions.push(eq(maintenanceRequestsTable.propertyId, params.propertyId));
    }

    if (params.customerId) {
      conditions.push(eq(maintenanceRequestsTable.customerId, params.customerId));
    }

    if (params.contractId) {
      conditions.push(eq(maintenanceRequestsTable.contractId, params.contractId));
    }

    if (params.priority && params.priority !== 'All') {
      conditions.push(eq(maintenanceRequestsTable.priority, params.priority));
    }

    if (params.status && params.status !== 'All') {
      conditions.push(eq(maintenanceRequestsTable.status, params.status));
    }

    if (params.category && params.category !== 'All') {
      conditions.push(eq(maintenanceRequestsTable.category, params.category));
    }

    if (params.assignedVendorId) {
      conditions.push(eq(maintenanceRequestsTable.assignedVendorId, params.assignedVendorId));
    }

    if (params.assignedAgentId) {
      conditions.push(eq(maintenanceRequestsTable.assignedAgentId, params.assignedAgentId));
    }

    if (params.startDate) {
      conditions.push(gte(maintenanceRequestsTable.createdAt, new Date(params.startDate)));
    }

    if (params.endDate) {
      conditions.push(lte(maintenanceRequestsTable.createdAt, new Date(params.endDate)));
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(maintenanceRequestsTable.ticketNumber, term),
          ilike(maintenanceRequestsTable.title, term),
          ilike(maintenanceRequestsTable.problem, term),
          ilike(maintenanceRequestsTable.propertyTitle, term),
          ilike(maintenanceRequestsTable.customerName, term),
          ilike(maintenanceRequestsTable.assignedVendorName, term),
          ilike(maintenanceRequestsTable.assignedAgentName, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total Count
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(maintenanceRequestsTable)
      .where(whereClause);
    const total = Number(countRes[0]?.count || 0);

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 50));
    const offset = (page - 1) * pageSize;

    const data = await db
      .select()
      .from(maintenanceRequestsTable)
      .where(whereClause)
      .orderBy(desc(maintenanceRequestsTable.createdAt))
      .limit(pageSize)
      .offset(offset);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async getMaintenanceRequestById(id: string): Promise<{
    request: DbMaintenanceRequest | null;
    costs: DbMaintenanceCost[];
    vendor?: DbMaintenanceVendor | null;
  }> {
    const rows = await db
      .select()
      .from(maintenanceRequestsTable)
      .where(eq(maintenanceRequestsTable.id, id))
      .limit(1);

    const request = rows[0] || null;
    if (!request) {
      return { request: null, costs: [] };
    }

    const costs = await db
      .select()
      .from(maintenanceCostsTable)
      .where(eq(maintenanceCostsTable.requestId, id))
      .orderBy(desc(maintenanceCostsTable.createdAt));

    let vendor = null;
    if (request.assignedVendorId) {
      vendor = await this.getVendorById(request.assignedVendorId);
    }

    return { request, costs, vendor };
  }

  async createMaintenanceRequest(
    data: {
      propertyId: string;
      propertyCustomId?: string;
      propertyTitle?: string;
      customerId?: string;
      customerName?: string;
      contractId?: string;
      title: string;
      problem: string;
      solution?: string;
      category?: string;
      priority?: string; // Low / Normal / High / Urgent
      status?: string; // Open / Assigned / In Progress / Waiting / Completed / Cancelled
      assignedAgentId?: string;
      assignedAgentName?: string;
      assignedVendorId?: string;
      assignedVendorName?: string;
      dueDate?: string;
      startDate?: string;
      completedDate?: string;
      paidBy?: string; // Owner / Tenant / Agency / Shared
      attachments?: any[];
      notes?: string;
      initialCosts?: Array<{ itemType: string; description: string; amount: number; isPaid?: boolean; paidBy?: string }>;
    },
    operator?: User
  ): Promise<DbMaintenanceRequest> {
    // Generate ticketNumber: MNT-2026-0001
    const year = new Date().getFullYear();
    const countCheck = await db.select({ count: sql<number>`count(*)` }).from(maintenanceRequestsTable);
    const seq = (Number(countCheck[0]?.count || 0) + 1).toString().padStart(4, '0');
    const ticketNumber = `MNT-${year}-${seq}`;
    const id = `mnt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Resolve property title if missing
    let propTitle = data.propertyTitle || '';
    let propCustomId = data.propertyCustomId || '';
    if (!propTitle && data.propertyId) {
      const p = await db.select().from(propertiesTable).where(eq(propertiesTable.propertyId, data.propertyId)).limit(1);
      if (p[0]) {
        propTitle = p[0].title;
        propCustomId = p[0].propertyId;
      }
    }

    // Resolve customer name if missing
    let custName = data.customerName || '';
    if (!custName && data.customerId) {
      const c = await db.select().from(clientsTable).where(eq(clientsTable.id, data.customerId)).limit(1);
      if (c[0]) {
        custName = `${c[0].firstName} ${c[0].lastName || ''}`.trim();
      }
    }

    // Resolve vendor name if assigned
    let vendorName = data.assignedVendorName || '';
    if (data.assignedVendorId && !vendorName) {
      const v = await this.getVendorById(data.assignedVendorId);
      if (v) vendorName = v.name;
    }

    const initialStatus = data.status || (data.assignedVendorId || data.assignedAgentId ? 'Assigned' : 'Open');

    const newRecord = {
      id,
      ticketNumber,
      propertyId: data.propertyId,
      propertyCustomId: propCustomId,
      propertyTitle: propTitle,
      customerId: data.customerId || '',
      customerName: custName,
      contractId: data.contractId || '',
      title: data.title,
      problem: data.problem || '',
      solution: data.solution || '',
      category: data.category || 'General',
      priority: data.priority || 'Normal',
      status: initialStatus,
      assignedAgentId: data.assignedAgentId || '',
      assignedAgentName: data.assignedAgentName || '',
      assignedVendorId: data.assignedVendorId || '',
      assignedVendorName: vendorName,
      dueDate: data.dueDate || null,
      startDate: data.startDate || null,
      completedDate: data.completedDate || null,
      totalCost: '0',
      paidAmount: '0',
      outstandingAmount: '0',
      paidBy: data.paidBy || 'Owner',
      attachments: data.attachments || [],
      notes: data.notes || '',
      isArchived: false,
      createdBy: operator?.id || 'system',
      createdByName: operator?.name || 'Administrator',
      updatedBy: operator?.name || 'Administrator',
    };

    const inserted = await db.insert(maintenanceRequestsTable).values(newRecord).returning();

    // If initial costs provided, insert and recalculate
    if (data.initialCosts && data.initialCosts.length > 0) {
      let sumCost = 0;
      let sumPaid = 0;
      for (const item of data.initialCosts) {
        const costId = `mc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const amountNum = Number(item.amount) || 0;
        const paidNum = item.isPaid ? amountNum : 0;
        sumCost += amountNum;
        sumPaid += paidNum;

        await db.insert(maintenanceCostsTable).values({
          id: costId,
          requestId: id,
          itemType: item.itemType || 'Labor',
          description: item.description,
          amount: amountNum.toString(),
          paidAmount: paidNum.toString(),
          isPaid: Boolean(item.isPaid),
          paidBy: item.paidBy || data.paidBy || 'Owner',
        });
      }

      await db
        .update(maintenanceRequestsTable)
        .set({
          totalCost: sumCost.toString(),
          paidAmount: sumPaid.toString(),
          outstandingAmount: (sumCost - sumPaid).toString(),
        })
        .where(eq(maintenanceRequestsTable.id, id));
    }

    // Audit log
    await this.logAudit({
      propertyId: data.propertyId,
      action: 'Created Maintenance Request',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      newValue: `Ticket ${ticketNumber}: ${data.title} (${data.priority}) for ${propTitle}`,
    });

    return inserted[0];
  }

  async updateMaintenanceRequest(
    id: string,
    data: Partial<{
      title: string;
      problem: string;
      solution: string;
      category: string;
      priority: string;
      status: string;
      assignedAgentId: string;
      assignedAgentName: string;
      assignedVendorId: string;
      assignedVendorName: string;
      dueDate: string;
      startDate: string;
      completedDate: string;
      paidBy: string;
      notes: string;
      attachments: any[];
    }>,
    operator?: User
  ): Promise<DbMaintenanceRequest | null> {
    const existing = (await this.getMaintenanceRequestById(id)).request;
    if (!existing) return null;

    const updatePayload: any = {
      ...data,
      updatedBy: operator?.name || 'Administrator',
      updatedAt: new Date(),
    };

    // If status updated to Completed, ensure completedDate is filled
    if (data.status === 'Completed' && !data.completedDate && !existing.completedDate) {
      updatePayload.completedDate = new Date().toISOString().split('T')[0];
    }

    // If assigned vendor updated, verify vendor name
    if (data.assignedVendorId && !data.assignedVendorName) {
      const v = await this.getVendorById(data.assignedVendorId);
      if (v) updatePayload.assignedVendorName = v.name;
    }

    const updated = await db
      .update(maintenanceRequestsTable)
      .set(updatePayload)
      .where(eq(maintenanceRequestsTable.id, id))
      .returning();

    await this.logAudit({
      propertyId: existing.propertyId,
      action: 'Updated Maintenance Request',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      oldValue: JSON.stringify({ status: existing.status, priority: existing.priority, vendor: existing.assignedVendorName }),
      newValue: JSON.stringify({ status: updated[0].status, priority: updated[0].priority, vendor: updated[0].assignedVendorName }),
    });

    return updated[0] || null;
  }

  async assignMaintenance(
    id: string,
    payload: {
      assignedVendorId?: string;
      assignedVendorName?: string;
      assignedAgentId?: string;
      assignedAgentName?: string;
      dueDate?: string;
    },
    operator?: User
  ): Promise<DbMaintenanceRequest | null> {
    const existing = (await this.getMaintenanceRequestById(id)).request;
    if (!existing) return null;

    let vendorName = payload.assignedVendorName || '';
    if (payload.assignedVendorId && !vendorName) {
      const v = await this.getVendorById(payload.assignedVendorId);
      if (v) vendorName = v.name;
    }

    const newStatus = existing.status === 'Open' ? 'Assigned' : existing.status;

    const updated = await db
      .update(maintenanceRequestsTable)
      .set({
        assignedVendorId: payload.assignedVendorId ?? existing.assignedVendorId,
        assignedVendorName: vendorName || existing.assignedVendorName,
        assignedAgentId: payload.assignedAgentId ?? existing.assignedAgentId,
        assignedAgentName: payload.assignedAgentName ?? existing.assignedAgentName,
        dueDate: payload.dueDate ?? existing.dueDate,
        status: newStatus,
        updatedBy: operator?.name || 'Administrator',
        updatedAt: new Date(),
      })
      .where(eq(maintenanceRequestsTable.id, id))
      .returning();

    await this.logAudit({
      propertyId: existing.propertyId,
      action: 'Assigned Maintenance Ticket',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      newValue: `Assigned ticket ${existing.ticketNumber} to Vendor: ${vendorName || 'None'}, Agent: ${payload.assignedAgentName || existing.assignedAgentName}`,
    });

    return updated[0] || null;
  }

  async updateRequestStatus(
    id: string,
    status: 'Open' | 'Assigned' | 'In Progress' | 'Waiting' | 'Completed' | 'Cancelled' | string,
    solution?: string,
    operator?: User
  ): Promise<DbMaintenanceRequest | null> {
    const existing = (await this.getMaintenanceRequestById(id)).request;
    if (!existing) return null;

    const payload: any = {
      status,
      updatedBy: operator?.name || 'Administrator',
      updatedAt: new Date(),
    };

    if (solution !== undefined) {
      payload.solution = solution;
    }

    if (status === 'In Progress' && !existing.startDate) {
      payload.startDate = new Date().toISOString().split('T')[0];
    }

    if (status === 'Completed') {
      payload.completedDate = new Date().toISOString().split('T')[0];
    }

    const updated = await db
      .update(maintenanceRequestsTable)
      .set(payload)
      .where(eq(maintenanceRequestsTable.id, id))
      .returning();

    await this.logAudit({
      propertyId: existing.propertyId,
      action: `Status Changed to ${status}`,
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      oldValue: existing.status,
      newValue: status,
    });

    return updated[0] || null;
  }

  async softDeleteRequest(id: string, operator?: User): Promise<boolean> {
    const existing = (await this.getMaintenanceRequestById(id)).request;
    if (!existing) return false;

    await db
      .update(maintenanceRequestsTable)
      .set({
        isArchived: true,
        updatedBy: operator?.name || 'Administrator',
        updatedAt: new Date(),
      })
      .where(eq(maintenanceRequestsTable.id, id));

    await this.logAudit({
      propertyId: existing.propertyId,
      action: 'Archived Maintenance Request',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      newValue: `Archived ticket ${existing.ticketNumber} (${existing.title})`,
    });

    return true;
  }

  async restoreRequest(id: string, operator?: User): Promise<boolean> {
    const existing = (await this.getMaintenanceRequestById(id)).request;
    if (!existing) return false;

    await db
      .update(maintenanceRequestsTable)
      .set({
        isArchived: false,
        updatedBy: operator?.name || 'Administrator',
        updatedAt: new Date(),
      })
      .where(eq(maintenanceRequestsTable.id, id));

    await this.logAudit({
      propertyId: existing.propertyId,
      action: 'Restored Maintenance Request',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      newValue: `Restored ticket ${existing.ticketNumber}`,
    });

    return true;
  }

  // =========================================================================
  // 3. MAINTENANCE COSTS
  // =========================================================================

  async addMaintenanceCost(
    requestId: string,
    data: {
      itemType: 'Labor' | 'Parts' | 'Travel' | 'Other' | string;
      description: string;
      amount: number | string;
      paidAmount?: number | string;
      isPaid?: boolean;
      paidBy?: string;
      paymentMethod?: string;
      receiptUrl?: string;
      paymentRecordId?: string;
    },
    operator?: User
  ): Promise<DbMaintenanceCost | null> {
    const req = (await this.getMaintenanceRequestById(requestId)).request;
    if (!req) return null;

    const amountNum = Number(data.amount) || 0;
    const isPaid = Boolean(data.isPaid);
    const paidAmountNum = isPaid ? (Number(data.paidAmount) || amountNum) : (Number(data.paidAmount) || 0);

    const costId = `mc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const costRecord = {
      id: costId,
      requestId,
      itemType: data.itemType || 'Labor',
      description: data.description,
      amount: amountNum.toString(),
      paidAmount: paidAmountNum.toString(),
      isPaid,
      paidBy: data.paidBy || req.paidBy || 'Owner',
      paymentMethod: data.paymentMethod || 'Bank Transfer',
      receiptUrl: data.receiptUrl || '',
      paymentRecordId: data.paymentRecordId || '',
    };

    const inserted = await db.insert(maintenanceCostsTable).values(costRecord).returning();

    // Recalculate totals on request
    await this.recalculateRequestCosts(requestId);

    await this.logAudit({
      propertyId: req.propertyId,
      action: 'Added Maintenance Cost',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      newValue: `${data.itemType}: ${data.description} (THB ${amountNum.toLocaleString()}) for ticket ${req.ticketNumber}`,
    });

    return inserted[0] || null;
  }

  async deleteMaintenanceCost(costId: string, operator?: User): Promise<boolean> {
    const rows = await db.select().from(maintenanceCostsTable).where(eq(maintenanceCostsTable.id, costId)).limit(1);
    const cost = rows[0];
    if (!cost) return false;

    await db.delete(maintenanceCostsTable).where(eq(maintenanceCostsTable.id, costId));
    await this.recalculateRequestCosts(cost.requestId);

    await this.logAudit({
      action: 'Deleted Maintenance Cost',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      newValue: `Removed cost item ${cost.description} (THB ${cost.amount})`,
    });

    return true;
  }

  private async recalculateRequestCosts(requestId: string): Promise<void> {
    const costs = await db.select().from(maintenanceCostsTable).where(eq(maintenanceCostsTable.requestId, requestId));
    let total = 0;
    let paid = 0;
    for (const c of costs) {
      total += Number(c.amount) || 0;
      paid += Number(c.paidAmount) || (c.isPaid ? Number(c.amount) || 0 : 0);
    }
    const outstanding = Math.max(0, total - paid);

    await db
      .update(maintenanceRequestsTable)
      .set({
        totalCost: total.toString(),
        paidAmount: paid.toString(),
        outstandingAmount: outstanding.toString(),
        updatedAt: new Date(),
      })
      .where(eq(maintenanceRequestsTable.id, requestId));
  }

  // =========================================================================
  // 4. PREVENTIVE MAINTENANCE
  // =========================================================================

  async listPreventiveMaintenance(params: { propertyId?: string; serviceType?: string; status?: string; isArchived?: boolean | string } = {}): Promise<DbPreventiveMaintenance[]> {
    const conditions = [];

    if (params.isArchived !== 'all') {
      const isArch = params.isArchived === true || params.isArchived === 'true';
      conditions.push(eq(preventiveMaintenanceTable.isArchived, isArch));
    }

    if (params.propertyId) {
      conditions.push(eq(preventiveMaintenanceTable.propertyId, params.propertyId));
    }

    if (params.serviceType) {
      conditions.push(eq(preventiveMaintenanceTable.serviceType, params.serviceType));
    }

    if (params.status) {
      conditions.push(eq(preventiveMaintenanceTable.status, params.status));
    }

    return await db
      .select()
      .from(preventiveMaintenanceTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(preventiveMaintenanceTable.nextDueDate));
  }

  async createPreventiveMaintenance(
    data: {
      propertyId: string;
      propertyCustomId?: string;
      propertyTitle?: string;
      title: string;
      serviceType: string;
      cycleMonths?: number;
      lastServiceDate?: string;
      nextDueDate: string;
      reminderDays?: number;
      assignedVendorId?: string;
      assignedVendorName?: string;
      assignedAgentId?: string;
      assignedAgentName?: string;
      estimatedCost?: number | string;
      notes?: string;
    },
    operator?: User
  ): Promise<DbPreventiveMaintenance> {
    const countCheck = await db.select({ count: sql<number>`count(*)` }).from(preventiveMaintenanceTable);
    const seq = (Number(countCheck[0]?.count || 0) + 1).toString().padStart(3, '0');
    const code = `PM-${seq}`;
    const id = `pm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Resolve property title if missing
    let propTitle = data.propertyTitle || '';
    let propCustomId = data.propertyCustomId || '';
    if (!propTitle && data.propertyId) {
      const p = await db.select().from(propertiesTable).where(eq(propertiesTable.propertyId, data.propertyId)).limit(1);
      if (p[0]) {
        propTitle = p[0].title;
        propCustomId = p[0].propertyId;
      }
    }

    let vendorName = data.assignedVendorName || '';
    if (data.assignedVendorId && !vendorName) {
      const v = await this.getVendorById(data.assignedVendorId);
      if (v) vendorName = v.name;
    }

    const newRecord = {
      id,
      code,
      propertyId: data.propertyId,
      propertyCustomId: propCustomId,
      propertyTitle: propTitle,
      title: data.title,
      serviceType: data.serviceType || 'Air Conditioner',
      cycleMonths: Number(data.cycleMonths) || 3,
      lastServiceDate: data.lastServiceDate || null,
      nextDueDate: data.nextDueDate,
      reminderDays: Number(data.reminderDays) || 7,
      assignedVendorId: data.assignedVendorId || '',
      assignedVendorName: vendorName,
      assignedAgentId: data.assignedAgentId || '',
      assignedAgentName: data.assignedAgentName || '',
      estimatedCost: data.estimatedCost ? data.estimatedCost.toString() : '0',
      status: 'Active',
      notes: data.notes || '',
      isArchived: false,
      createdBy: operator?.id || 'system',
      createdByName: operator?.name || 'Administrator',
      updatedBy: operator?.name || 'Administrator',
    };

    const inserted = await db.insert(preventiveMaintenanceTable).values(newRecord).returning();

    await this.logAudit({
      propertyId: data.propertyId,
      action: 'Created Preventive Maintenance Schedule',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      newValue: `${code}: ${data.title} (${data.serviceType}) every ${data.cycleMonths || 3} months for ${propTitle}`,
    });

    return inserted[0];
  }

  async markPreventiveServiceDone(id: string, operator?: User): Promise<DbPreventiveMaintenance | null> {
    const rows = await db.select().from(preventiveMaintenanceTable).where(eq(preventiveMaintenanceTable.id, id)).limit(1);
    const existing = rows[0];
    if (!existing) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + existing.cycleMonths);
    const nextDueDateStr = nextDate.toISOString().split('T')[0];

    const updated = await db
      .update(preventiveMaintenanceTable)
      .set({
        lastServiceDate: todayStr,
        nextDueDate: nextDueDateStr,
        updatedBy: operator?.name || 'Administrator',
        updatedAt: new Date(),
      })
      .where(eq(preventiveMaintenanceTable.id, id))
      .returning();

    // Auto-create Completed maintenance request ticket as historical record
    await this.createMaintenanceRequest(
      {
        propertyId: existing.propertyId,
        propertyCustomId: existing.propertyCustomId || '',
        propertyTitle: existing.propertyTitle || '',
        title: `[Preventive] ${existing.title}`,
        problem: `Scheduled periodic ${existing.serviceType} maintenance completed`,
        solution: `Routine maintenance executed according to ${existing.code} protocol.`,
        category: existing.serviceType,
        priority: 'Normal',
        status: 'Completed',
        assignedVendorId: existing.assignedVendorId || '',
        assignedVendorName: existing.assignedVendorName || '',
        startDate: todayStr,
        completedDate: todayStr,
        notes: `Auto-logged from Preventive Maintenance Schedule ${existing.code}`,
        initialCosts: Number(existing.estimatedCost) > 0 ? [
          {
            itemType: 'Labor',
            description: `${existing.serviceType} routine service fee`,
            amount: Number(existing.estimatedCost),
            isPaid: true,
          }
        ] : [],
      },
      operator
    );

    await this.logAudit({
      propertyId: existing.propertyId,
      action: 'Executed Preventive Maintenance',
      userName: operator?.name || 'Administrator',
      userId: operator?.id || 'system',
      newValue: `Completed ${existing.code} on ${todayStr}. Next due date: ${nextDueDateStr}`,
    });

    return updated[0] || null;
  }

  // =========================================================================
  // 5. DASHBOARD METRICS & SUMMARY
  // =========================================================================

  async getDashboardMetrics(params: {
    propertyId?: string;
    agentId?: string;
    vendorId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{
    total: number;
    open: number;
    assigned: number;
    inProgress: number;
    waiting: number;
    completed: number;
    cancelled: number;
    urgent: number;
    overdue: number;
    totalCost: number;
    totalLaborCost: number;
    totalPartsCost: number;
    totalOtherCost: number;
    averageCompletionDays: number;
    statusBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    preventiveCount: number;
    preventiveDueSoonCount: number;
  }> {
    const conditions = [eq(maintenanceRequestsTable.isArchived, false)];

    if (params.propertyId) {
      conditions.push(eq(maintenanceRequestsTable.propertyId, params.propertyId));
    }
    if (params.agentId) {
      conditions.push(eq(maintenanceRequestsTable.assignedAgentId, params.agentId));
    }
    if (params.vendorId) {
      conditions.push(eq(maintenanceRequestsTable.assignedVendorId, params.vendorId));
    }
    if (params.startDate) {
      conditions.push(gte(maintenanceRequestsTable.createdAt, new Date(params.startDate)));
    }
    if (params.endDate) {
      conditions.push(lte(maintenanceRequestsTable.createdAt, new Date(params.endDate)));
    }

    const allRequests = await db
      .select()
      .from(maintenanceRequestsTable)
      .where(and(...conditions));

    const todayStr = new Date().toISOString().split('T')[0];

    let total = allRequests.length;
    let open = 0;
    let assigned = 0;
    let inProgress = 0;
    let waiting = 0;
    let completed = 0;
    let cancelled = 0;
    let urgent = 0;
    let overdue = 0;
    let totalCost = 0;

    let completionDaysSum = 0;
    let completedCountWithDuration = 0;

    const statusBreakdown: Record<string, number> = {
      Open: 0,
      Assigned: 0,
      'In Progress': 0,
      Waiting: 0,
      Completed: 0,
      Cancelled: 0,
    };

    const priorityBreakdown: Record<string, number> = {
      Low: 0,
      Normal: 0,
      High: 0,
      Urgent: 0,
    };

    const categoryBreakdown: Record<string, number> = {};

    for (const r of allRequests) {
      // Status
      if (r.status === 'Open') open++;
      else if (r.status === 'Assigned') assigned++;
      else if (r.status === 'In Progress') inProgress++;
      else if (r.status === 'Waiting') waiting++;
      else if (r.status === 'Completed') completed++;
      else if (r.status === 'Cancelled') cancelled++;

      statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;

      // Priority
      if (r.priority === 'Urgent') urgent++;
      priorityBreakdown[r.priority] = (priorityBreakdown[r.priority] || 0) + 1;

      // Category
      categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + 1;

      // Overdue: not completed/cancelled, and dueDate < today
      if (r.status !== 'Completed' && r.status !== 'Cancelled' && r.dueDate && r.dueDate < todayStr) {
        overdue++;
      }

      // Cost
      totalCost += Number(r.totalCost) || 0;

      // Completion Duration
      if (r.status === 'Completed' && r.completedDate && r.createdAt) {
        const start = new Date(r.startDate || r.createdAt).getTime();
        const end = new Date(r.completedDate).getTime();
        const diffDays = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        completionDaysSum += diffDays;
        completedCountWithDuration++;
      }
    }

    const averageCompletionDays = completedCountWithDuration > 0
      ? Number((completionDaysSum / completedCountWithDuration).toFixed(1))
      : 2.5;

    // Costs Breakdown
    const costsRows = await db
      .select({
        itemType: maintenanceCostsTable.itemType,
        total: sql<number>`SUM(CAST(${maintenanceCostsTable.amount} AS NUMERIC))`,
      })
      .from(maintenanceCostsTable)
      .groupBy(maintenanceCostsTable.itemType);

    let totalLaborCost = 0;
    let totalPartsCost = 0;
    let totalOtherCost = 0;

    for (const c of costsRows) {
      const amt = Number(c.total) || 0;
      if (c.itemType === 'Labor') totalLaborCost += amt;
      else if (c.itemType === 'Parts') totalPartsCost += amt;
      else totalOtherCost += amt;
    }

    // Preventive counts
    const pmRows = await db.select().from(preventiveMaintenanceTable).where(eq(preventiveMaintenanceTable.isArchived, false));
    const preventiveCount = pmRows.length;
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 14);
    const soonDateStr = soonDate.toISOString().split('T')[0];
    const preventiveDueSoonCount = pmRows.filter((p) => p.status === 'Active' && p.nextDueDate <= soonDateStr).length;

    return {
      total,
      open,
      assigned,
      inProgress,
      waiting,
      completed,
      cancelled,
      urgent,
      overdue,
      totalCost,
      totalLaborCost,
      totalPartsCost,
      totalOtherCost,
      averageCompletionDays,
      statusBreakdown,
      priorityBreakdown,
      categoryBreakdown,
      preventiveCount,
      preventiveDueSoonCount,
    };
  }

  // =========================================================================
  // 6. CSV & REPORT EXPORT
  // =========================================================================

  async exportMaintenanceRequestsCsv(params: MaintenanceFilterParams = {}): Promise<string> {
    const { data } = await this.listMaintenanceRequests({ ...params, pageSize: 1000 });

    const headers = [
      'Ticket Number',
      'Title',
      'Property ID',
      'Property Title',
      'Customer',
      'Category',
      'Priority',
      'Status',
      'Assigned Vendor',
      'Assigned Agent',
      'Due Date',
      'Start Date',
      'Completed Date',
      'Total Cost (THB)',
      'Paid By',
      'Created Date',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = data.map((r) => [
      escapeCsv(r.ticketNumber),
      escapeCsv(r.title),
      escapeCsv(r.propertyCustomId || r.propertyId),
      escapeCsv(r.propertyTitle),
      escapeCsv(r.customerName),
      escapeCsv(r.category),
      escapeCsv(r.priority),
      escapeCsv(r.status),
      escapeCsv(r.assignedVendorName),
      escapeCsv(r.assignedAgentName),
      escapeCsv(r.dueDate || ''),
      escapeCsv(r.startDate || ''),
      escapeCsv(r.completedDate || ''),
      escapeCsv(r.totalCost),
      escapeCsv(r.paidBy),
      escapeCsv(new Date(r.createdAt).toISOString().split('T')[0]),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    return csvContent;
  }

  // =========================================================================
  // 7. SEED INITIAL BASELINE DATA
  // =========================================================================

  async seedInitialMaintenanceIfEmpty(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      return;
    }
    try {
      // 1. Check vendors
      const vCount = await db.select({ count: sql<number>`count(*)` }).from(maintenanceVendorsTable);
      if (Number(vCount[0]?.count || 0) === 0) {
        await db.insert(maintenanceVendorsTable).values([
          {
            id: 'vnd-1',
            vendorCode: 'VND-001',
            name: 'Phuket Cool Air Services',
            company: 'Phuket Cool Air Co., Ltd.',
            phone: '081-445-9988',
            email: 'service@phuketcoolair.com',
            serviceType: 'Air Conditioner',
            rating: '4.9',
            isActive: true,
            notes: 'Top certified inverter AC specialist with 24h emergency team.',
          },
          {
            id: 'vnd-2',
            vendorCode: 'VND-002',
            name: 'Andaman Pool & Water Masters',
            company: 'Andaman Pool Co., Ltd.',
            phone: '089-771-2233',
            email: 'contact@andamanpool.com',
            serviceType: 'Pool',
            rating: '4.8',
            isActive: true,
            notes: 'Salt chlorination & pump automation maintenance for luxury villas.',
          },
          {
            id: 'vnd-3',
            vendorCode: 'VND-003',
            name: 'Siam Electric & Plumbing Pro',
            company: 'Siam Electrical Engineers Ltd.',
            phone: '092-334-5566',
            email: 'support@siamelectric.co.th',
            serviceType: 'Electrical',
            rating: '4.7',
            isActive: true,
            notes: 'Certified 3-phase wiring, smart home integration and water heaters.',
          },
          {
            id: 'vnd-4',
            vendorCode: 'VND-004',
            name: 'Green Oasis Villa Gardening',
            company: 'Green Oasis Phuket',
            phone: '086-554-1122',
            email: 'green@oasisgarden.com',
            serviceType: 'Garden',
            rating: '5.0',
            isActive: true,
            notes: 'Tropical landscape care, sprinkler automation, tree pruning.',
          },
        ]);
      }

      // 2. Check maintenance requests
      const rCount = await db.select({ count: sql<number>`count(*)` }).from(maintenanceRequestsTable);
      if (Number(rCount[0]?.count || 0) === 0) {
        // Fetch a sample property
        const props = await db.select().from(propertiesTable).limit(2);
        const prop1 = props[0] || { propertyId: 'PROP-1001', title: 'Luxury Ocean Villa Kamala' };
        const prop2 = props[1] || { propertyId: 'PROP-1002', title: 'Serene Bay Residence Rawai' };

        const clients = await db.select().from(clientsTable).limit(2);
        const client1 = clients[0] || { id: 'cli-1', firstName: 'Alexander', lastName: 'Novikov' };

        await db.insert(maintenanceRequestsTable).values([
          {
            id: 'mnt-sample-1',
            ticketNumber: 'MNT-2026-0001',
            propertyId: prop1.propertyId,
            propertyCustomId: prop1.propertyId,
            propertyTitle: prop1.title,
            customerId: client1.id,
            customerName: `${client1.firstName} ${client1.lastName || ''}`.trim(),
            title: 'Master Bedroom AC Not Cooling',
            problem: 'The Daikin 24,000 BTU unit in Master Bedroom blows warm air and produces rattling noise.',
            solution: 'Refrigerant leak detected in copper flare joint. Repaired flare and refilled R32 gas.',
            category: 'Air Conditioner',
            priority: 'Urgent',
            status: 'Completed',
            assignedAgentId: 'user-admin-1',
            assignedAgentName: 'Administrator',
            assignedVendorId: 'vnd-1',
            assignedVendorName: 'Phuket Cool Air Services',
            dueDate: '2026-09-28',
            startDate: '2026-09-27',
            completedDate: '2026-09-28',
            totalCost: '3500',
            paidAmount: '3500',
            outstandingAmount: '0',
            paidBy: 'Owner',
            notes: 'Landlord authorized immediate repair.',
            isArchived: false,
          },
          {
            id: 'mnt-sample-2',
            ticketNumber: 'MNT-2026-0002',
            propertyId: prop1.propertyId,
            propertyCustomId: prop1.propertyId,
            propertyTitle: prop1.title,
            customerId: client1.id,
            customerName: `${client1.firstName} ${client1.lastName || ''}`.trim(),
            title: 'Infinity Pool Salt Cell Sensor Fault',
            problem: 'Pool water turned slightly cloudy. Automated dosing unit displays Error Code E-04.',
            solution: '',
            category: 'Pool',
            priority: 'High',
            status: 'In Progress',
            assignedAgentId: 'user-admin-1',
            assignedAgentName: 'Administrator',
            assignedVendorId: 'vnd-2',
            assignedVendorName: 'Andaman Pool & Water Masters',
            dueDate: '2026-10-02',
            startDate: '2026-09-29',
            totalCost: '4800',
            paidAmount: '0',
            outstandingAmount: '4800',
            paidBy: 'Owner',
            notes: 'Technician on-site inspection scheduled.',
            isArchived: false,
          },
          {
            id: 'mnt-sample-3',
            ticketNumber: 'MNT-2026-0003',
            propertyId: prop2.propertyId,
            propertyCustomId: prop2.propertyId,
            propertyTitle: prop2.title,
            title: 'Kitchen Sink Drain Leakage & Water Pressure Check',
            problem: 'Minor water dripping beneath the secondary prep sink basin inside wooden cabinet.',
            category: 'Plumbing',
            priority: 'Normal',
            status: 'Assigned',
            assignedVendorId: 'vnd-3',
            assignedVendorName: 'Siam Electric & Plumbing Pro',
            dueDate: '2026-10-05',
            totalCost: '1800',
            paidAmount: '0',
            outstandingAmount: '1800',
            paidBy: 'Owner',
            isArchived: false,
          },
        ]);

        // Insert costs for sample 1
        await db.insert(maintenanceCostsTable).values([
          {
            id: 'mc-1',
            requestId: 'mnt-sample-1',
            itemType: 'Labor',
            description: 'Technician diagnostic fee & flare re-piping',
            amount: '1500',
            paidAmount: '1500',
            isPaid: true,
            paidBy: 'Owner',
            paymentMethod: 'Bank Transfer',
          },
          {
            id: 'mc-2',
            requestId: 'mnt-sample-1',
            itemType: 'Parts',
            description: 'R32 Refrigerant top-up (2.2 kg) & replacement valve',
            amount: '2000',
            paidAmount: '2000',
            isPaid: true,
            paidBy: 'Owner',
            paymentMethod: 'Bank Transfer',
          },
        ]);

        // Insert costs for sample 2
        await db.insert(maintenanceCostsTable).values([
          {
            id: 'mc-3',
            requestId: 'mnt-sample-2',
            itemType: 'Parts',
            description: 'Hayward Salt Cell sensor probe replacement',
            amount: '3800',
            paidAmount: '0',
            isPaid: false,
            paidBy: 'Owner',
          },
          {
            id: 'mc-4',
            requestId: 'mnt-sample-2',
            itemType: 'Labor',
            description: 'Pool calibration & shock chlorination',
            amount: '1000',
            paidAmount: '0',
            isPaid: false,
            paidBy: 'Owner',
          },
        ]);
      }

      // 3. Check preventive maintenance
      const pmCount = await db.select({ count: sql<number>`count(*)` }).from(preventiveMaintenanceTable);
      if (Number(pmCount[0]?.count || 0) === 0) {
        const props = await db.select().from(propertiesTable).limit(2);
        const prop1 = props[0] || { propertyId: 'PROP-1001', title: 'Luxury Ocean Villa Kamala' };

        await db.insert(preventiveMaintenanceTable).values([
          {
            id: 'pm-1',
            code: 'PM-001',
            propertyId: prop1.propertyId,
            propertyCustomId: prop1.propertyId,
            propertyTitle: prop1.title,
            title: 'Quarterly Air Conditioner Coil Chemical Wash',
            serviceType: 'Air Conditioner',
            cycleMonths: 3,
            lastServiceDate: '2026-07-15',
            nextDueDate: '2026-10-15',
            reminderDays: 7,
            assignedVendorId: 'vnd-1',
            assignedVendorName: 'Phuket Cool Air Services',
            estimatedCost: '4500',
            status: 'Active',
            notes: 'Covers 5 split AC units + 1 ducted central unit in living lounge.',
          },
          {
            id: 'pm-2',
            code: 'PM-002',
            propertyId: prop1.propertyId,
            propertyCustomId: prop1.propertyId,
            propertyTitle: prop1.title,
            title: 'Bi-Monthly Swimming Pool Balancing & Pump Service',
            serviceType: 'Pool',
            cycleMonths: 2,
            lastServiceDate: '2026-08-10',
            nextDueDate: '2026-10-10',
            reminderDays: 5,
            assignedVendorId: 'vnd-2',
            assignedVendorName: 'Andaman Pool & Water Masters',
            estimatedCost: '3000',
            status: 'Active',
            notes: 'Includes sand filter backwash and water hardness balance.',
          },
          {
            id: 'pm-3',
            code: 'PM-003',
            propertyId: prop1.propertyId,
            propertyCustomId: prop1.propertyId,
            propertyTitle: prop1.title,
            title: 'Annual Electrical Grounding & Solar Inverter Check',
            serviceType: 'Electrical',
            cycleMonths: 12,
            lastServiceDate: '2025-11-20',
            nextDueDate: '2026-11-20',
            reminderDays: 14,
            assignedVendorId: 'vnd-3',
            assignedVendorName: 'Siam Electric & Plumbing Pro',
            estimatedCost: '6000',
            status: 'Active',
            notes: 'Check main DB board, RCD tripping times and 10kW solar roof array.',
          },
        ]);
      }
    } catch (err) {
      console.warn('Seed maintenance notice:', err);
    }
  }

  private async logAudit(entry: {
    propertyId?: string;
    action: string;
    userName: string;
    userId?: string;
    oldValue?: string;
    newValue?: string;
  }) {
    try {
      await db.insert(auditLogsTable).values({
        propertyId: entry.propertyId || null,
        action: entry.action,
        userName: entry.userName,
        userId: entry.userId || 'system',
        oldValue: entry.oldValue || null,
        newValue: entry.newValue || null,
      });
    } catch (e) {
      console.warn('Audit log write error:', e);
    }
  }
}

export const maintenanceService = new MaintenanceService();
