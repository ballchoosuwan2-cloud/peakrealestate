import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  paymentSchedulesTable,
  paymentRecordsTable,
  contractsTable,
  auditLogsTable,
  propertiesTable,
  DbPaymentSchedule,
  InsertDbPaymentSchedule,
  DbPaymentRecord,
  InsertDbPaymentRecord,
} from '../db/schema.ts';
import { User } from '../types.ts';

export interface PaymentScheduleQueryParams {
  contractId?: string;
  propertyId?: string;
  status?: string;
  paymentType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  isArchived?: boolean | string;
}

export class PaymentService {
  /**
   * Helper: Calculate real-time status for a schedule based on dates and payments
   */
  calculateScheduleStatus(
    amount: number,
    paidAmount: number,
    dueDate: string,
    currentStatus?: string
  ): 'Pending' | 'Paid' | 'Partially Paid' | 'Overdue' | 'Cancelled' {
    if (currentStatus === 'Cancelled') return 'Cancelled';

    const amt = Number(amount) || 0;
    const paid = Number(paidAmount) || 0;

    if (paid >= amt && amt > 0) {
      return 'Paid';
    }

    if (paid > 0 && paid < amt) {
      return 'Partially Paid';
    }

    // Unpaid
    const today = new Date().toISOString().split('T')[0];
    if (dueDate && dueDate < today) {
      return 'Overdue';
    }

    return 'Pending';
  }

  /**
   * List all payment schedules with search and filtering
   */
  async getSchedules(params: PaymentScheduleQueryParams = {}, operator?: User): Promise<{
    schedules: DbPaymentSchedule[];
    summary: {
      totalExpected: number;
      totalPaid: number;
      totalRemaining: number;
      totalOverdue: number;
      countPending: number;
      countPaid: number;
      countPartial: number;
      countOverdue: number;
      countCancelled: number;
    };
  }> {
    const conditions = [];

    // Default exclude archived
    if (params.isArchived === true || params.isArchived === 'true') {
      conditions.push(eq(paymentSchedulesTable.isArchived, true));
    } else {
      conditions.push(eq(paymentSchedulesTable.isArchived, false));
    }

    if (params.contractId) {
      conditions.push(eq(paymentSchedulesTable.contractId, params.contractId));
    }

    if (params.propertyId) {
      conditions.push(eq(paymentSchedulesTable.propertyId, params.propertyId));
    }

    if (params.paymentType && params.paymentType !== 'all') {
      conditions.push(eq(paymentSchedulesTable.paymentType, params.paymentType));
    }

    if (params.status && params.status !== 'all') {
      conditions.push(eq(paymentSchedulesTable.status, params.status));
    }

    if (params.startDate) {
      conditions.push(sql`${paymentSchedulesTable.dueDate} >= ${params.startDate}`);
    }

    if (params.endDate) {
      conditions.push(sql`${paymentSchedulesTable.dueDate} <= ${params.endDate}`);
    }

    if (params.search?.trim()) {
      const q = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(paymentSchedulesTable.contractId, q),
          ilike(paymentSchedulesTable.propertyId, q),
          ilike(paymentSchedulesTable.title, q),
          ilike(paymentSchedulesTable.payerName, q)
        )
      );
    }

    // RBAC: If agent, they can see payments related to their contracts/properties
    if (operator?.role === 'Agent') {
      // Find properties or contracts assigned to agent
      const agentContracts = await db
        .select({ contractId: contractsTable.contractId })
        .from(contractsTable)
        .where(
          or(
            eq(contractsTable.agent, operator.name),
            eq(contractsTable.salesName, operator.name),
            eq(contractsTable.createdBy, operator.id)
          )
        );

      const contractIds = agentContracts.map((c) => c.contractId);
      if (contractIds.length > 0) {
        conditions.push(
          or(
            sql`${paymentSchedulesTable.contractId} IN ${contractIds}`,
            eq(paymentSchedulesTable.createdBy, operator.id)
          )
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const rawSchedules = await db
      .select()
      .from(paymentSchedulesTable)
      .where(whereClause)
      .orderBy(paymentSchedulesTable.dueDate, desc(paymentSchedulesTable.createdAt));

    // Dynamic auto-evaluation of status (e.g. turning Pending to Overdue if today > dueDate)
    let totalExpected = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let totalOverdue = 0;
    let countPending = 0;
    let countPaid = 0;
    let countPartial = 0;
    let countOverdue = 0;
    let countCancelled = 0;

    const evaluatedSchedules = rawSchedules.map((s) => {
      const amt = Number(s.amount) || 0;
      const paid = Number(s.paidAmount) || 0;
      const remaining = Math.max(0, amt - paid);

      const realStatus = this.calculateScheduleStatus(amt, paid, s.dueDate, s.status);

      totalExpected += amt;
      totalPaid += paid;
      totalRemaining += remaining;

      if (realStatus === 'Overdue') {
        totalOverdue += remaining;
        countOverdue++;
      } else if (realStatus === 'Paid') {
        countPaid++;
      } else if (realStatus === 'Partially Paid') {
        countPartial++;
      } else if (realStatus === 'Pending') {
        countPending++;
      } else if (realStatus === 'Cancelled') {
        countCancelled++;
      }

      return {
        ...s,
        remainingAmount: remaining.toString(),
        status: realStatus,
      };
    });

    return {
      schedules: evaluatedSchedules,
      summary: {
        totalExpected,
        totalPaid,
        totalRemaining,
        totalOverdue,
        countPending,
        countPaid,
        countPartial,
        countOverdue,
        countCancelled,
      },
    };
  }

  /**
   * Get single schedule by ID with its payment records
   */
  async getScheduleById(id: string): Promise<{
    schedule: DbPaymentSchedule | null;
    records: DbPaymentRecord[];
  }> {
    const schedules = await db
      .select()
      .from(paymentSchedulesTable)
      .where(eq(paymentSchedulesTable.id, id))
      .limit(1);

    if (schedules.length === 0) {
      return { schedule: null, records: [] };
    }

    const schedule = schedules[0];
    const amt = Number(schedule.amount) || 0;
    const paid = Number(schedule.paidAmount) || 0;
    const realStatus = this.calculateScheduleStatus(amt, paid, schedule.dueDate, schedule.status);

    const records = await db
      .select()
      .from(paymentRecordsTable)
      .where(and(eq(paymentRecordsTable.paymentScheduleId, id), eq(paymentRecordsTable.isArchived, false)))
      .orderBy(desc(paymentRecordsTable.paymentDate), desc(paymentRecordsTable.createdAt));

    return {
      schedule: {
        ...schedule,
        status: realStatus,
        remainingAmount: Math.max(0, amt - paid).toString(),
      },
      records,
    };
  }

  /**
   * Create a single manual payment schedule
   */
  async createSchedule(
    payload: Omit<Partial<InsertDbPaymentSchedule>, 'amount'> & {
      contractId: string;
      propertyId: string;
      title: string;
      dueDate: string;
      amount: number | string;
    },
    operator: User
  ): Promise<DbPaymentSchedule> {
    const id = payload.id || `sched-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const amt = Number(payload.amount) || 0;
    const paid = Number(payload.paidAmount) || 0;
    const remaining = Math.max(0, amt - paid);
    const status = this.calculateScheduleStatus(amt, paid, payload.dueDate, payload.status);

    const [created] = await db
      .insert(paymentSchedulesTable)
      .values({
        id,
        contractId: payload.contractId,
        propertyId: payload.propertyId,
        payerName: payload.payerName || '',
        payerPhone: payload.payerPhone || '',
        title: payload.title,
        paymentType: payload.paymentType || 'Rent',
        dueDate: payload.dueDate,
        amount: amt.toString(),
        paidAmount: paid.toString(),
        remainingAmount: remaining.toString(),
        status,
        cycleNumber: payload.cycleNumber || null,
        totalCycles: payload.totalCycles || null,
        notes: payload.notes || '',
        isArchived: false,
        createdBy: operator.id || null,
        createdByName: operator.name || 'System',
      })
      .returning();

    // Audit Log
    await db.insert(auditLogsTable).values({
      propertyId: created.propertyId || `contract:${created.contractId}`,
      action: 'Create Payment',
      userName: operator.name || 'System',
      userId: operator.id || null,
      newValue: `Created schedule "${created.title}" (฿${amt.toLocaleString()}) for Contract ${created.contractId}`,
    });

    return created;
  }

  /**
   * Generate complete Payment Schedule automatically from Contract (Deposit, Advance, Monthly Rent, Commission)
   */
  async generateScheduleFromContract(contractId: string, operator: User): Promise<DbPaymentSchedule[]> {
    const contracts = await db
      .select()
      .from(contractsTable)
      .where(eq(contractsTable.contractId, contractId))
      .limit(1);

    if (contracts.length === 0) {
      throw new Error(`Contract with ID ${contractId} not found`);
    }

    const c = contracts[0];
    const existingSchedules = await db
      .select()
      .from(paymentSchedulesTable)
      .where(and(eq(paymentSchedulesTable.contractId, contractId), eq(paymentSchedulesTable.isArchived, false)));

    const existingAutoSchedules = existingSchedules.filter(
      (s) => s.paymentType === 'Deposit' || s.paymentType === 'Advance Rental' || s.paymentType === 'Rent'
    );

    // Avoid duplicating if auto-generated items already exist
    if (existingAutoSchedules.length > 0) {
      return existingSchedules;
    }

    const generatedList: InsertDbPaymentSchedule[] = [];
    const depositAmt = Number(c.deposit) || 0;
    const advanceAmt = Number(c.advanceRental) || 0;
    const monthlyRent = Number(c.monthlyRent) || 0;
    const salesCommission = Number(c.salesCommission) || Number(c.commissionFromOwner) || 0;

    // 1. Deposit (Security Deposit)
    if (depositAmt > 0) {
      const dueDate = c.signDate || c.rentalStart || new Date().toISOString().split('T')[0];
      generatedList.push({
        id: `sched-dep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        contractId: c.contractId,
        propertyId: c.propertyId,
        payerName: c.tenantName || 'Tenant',
        payerPhone: c.tenantPhone || '',
        title: 'เงินประกันสัญญา / Security Deposit',
        paymentType: 'Deposit',
        dueDate,
        amount: depositAmt.toString(),
        paidAmount: '0',
        remainingAmount: depositAmt.toString(),
        status: this.calculateScheduleStatus(depositAmt, 0, dueDate),
        cycleNumber: null,
        totalCycles: null,
        notes: 'Deposit paid prior to or upon signing',
        isArchived: false,
        createdBy: operator.id || null,
        createdByName: operator.name || 'System',
      });
    }

    // 2. Advance Rental
    if (advanceAmt > 0) {
      const dueDate = c.rentalStart || c.signDate || new Date().toISOString().split('T')[0];
      generatedList.push({
        id: `sched-adv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        contractId: c.contractId,
        propertyId: c.propertyId,
        payerName: c.tenantName || 'Tenant',
        payerPhone: c.tenantPhone || '',
        title: 'ค่าเช่าล่วงหน้า / Advance Rental',
        paymentType: 'Advance Rental',
        dueDate,
        amount: advanceAmt.toString(),
        paidAmount: '0',
        remainingAmount: advanceAmt.toString(),
        status: this.calculateScheduleStatus(advanceAmt, 0, dueDate),
        cycleNumber: null,
        totalCycles: null,
        notes: 'Advance rental payment for first lease period',
        isArchived: false,
        createdBy: operator.id || null,
        createdByName: operator.name || 'System',
      });
    }

    // 3. Monthly Rent installments (based on duration between rentalStart and rentalEnd)
    if (monthlyRent > 0 && c.rentalStart && c.rentalEnd) {
      const startDate = new Date(c.rentalStart);
      const endDate = new Date(c.rentalEnd);

      // Calculate number of months: prefer explicit rentalTime (e.g. "12 Months") or inclusive date diff
      let months = 12;
      const parsedTime = parseInt(c.rentalTime || '', 10);
      if (!isNaN(parsedTime) && parsedTime > 0) {
        months = parsedTime;
      } else {
        const diffMonths =
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth());
        // If end date is at the end of the month or close to 1 year, add 1 for inclusive full period
        months = diffMonths >= 0 ? diffMonths + 1 : 12;
      }
      if (months <= 0) months = 12; // Fallback to 12 months

      const payDay = parseInt(c.paymentDate || '23', 10) || 23;

      for (let i = 1; i <= months; i++) {
        // Due date calculation for each month
        const cycleDate = new Date(startDate.getFullYear(), startDate.getMonth() + (i - 1), payDay);
        const yyyy = cycleDate.getFullYear();
        const mm = String(cycleDate.getMonth() + 1).padStart(2, '0');
        const dd = String(Math.min(payDay, new Date(yyyy, cycleDate.getMonth() + 1, 0).getDate())).padStart(2, '0');
        const dueDateStr = `${yyyy}-${mm}-${dd}`;

        const monthNameEn = cycleDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        const monthNameTh = cycleDate.toLocaleString('th-TH', { month: 'short', year: 'numeric' });

        generatedList.push({
          id: `sched-rent-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          contractId: c.contractId,
          propertyId: c.propertyId,
          payerName: c.tenantName || 'Tenant',
          payerPhone: c.tenantPhone || '',
          title: `ค่าเช่า งวดที่ ${i}/${months} (${monthNameTh} / ${monthNameEn})`,
          paymentType: 'Rent',
          dueDate: dueDateStr,
          amount: monthlyRent.toString(),
          paidAmount: '0',
          remainingAmount: monthlyRent.toString(),
          status: this.calculateScheduleStatus(monthlyRent, 0, dueDateStr),
          cycleNumber: i,
          totalCycles: months,
          notes: `Monthly rent cycle ${i} of ${months}`,
          isArchived: false,
          createdBy: operator.id || null,
          createdByName: operator.name || 'System',
        });
      }
    }

    // 4. Commission (Agency / Sales Commission)
    if (salesCommission > 0) {
      const dueDate = c.rentalStart || c.signDate || new Date().toISOString().split('T')[0];
      generatedList.push({
        id: `sched-com-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        contractId: c.contractId,
        propertyId: c.propertyId,
        payerName: c.ownerName || 'Property Owner',
        payerPhone: '',
        title: `ค่าคอมมิชชั่น / Commission (${c.salesName || 'Agent'})`,
        paymentType: 'Commission',
        dueDate,
        amount: salesCommission.toString(),
        paidAmount: '0',
        remainingAmount: salesCommission.toString(),
        status: this.calculateScheduleStatus(salesCommission, 0, dueDate),
        cycleNumber: null,
        totalCycles: null,
        notes: `Sales Commission for deal ${c.contractId}`,
        isArchived: false,
        createdBy: operator.id || null,
        createdByName: operator.name || 'System',
      });
    }

    if (generatedList.length === 0) {
      return [];
    }

    const inserted = await db.insert(paymentSchedulesTable).values(generatedList).returning();

    // Audit log
    await db.insert(auditLogsTable).values({
      propertyId: c.propertyId || `contract:${c.contractId}`,
      action: 'Create Payment',
      userName: operator.name || 'System',
      userId: operator.id || null,
      newValue: `Auto-generated ${inserted.length} payment schedule items for Contract ${c.contractId}`,
    });

    return inserted;
  }

  /**
   * Record an actual payment (Payment Record) + update schedule status and remaining balance
   */
  async recordPayment(
    payload: {
      contractId: string;
      paymentScheduleId?: string;
      paymentDate: string;
      amount: number | string;
      paymentMethod?: string;
      bank?: string;
      accountNo?: string;
      referenceNo?: string;
      notes?: string;
      receiptFile?: any;
    },
    operator: User
  ): Promise<{
    record: DbPaymentRecord;
    updatedSchedule: DbPaymentSchedule | null;
  }> {
    const payAmt = Number(payload.amount);
    if (!payAmt || payAmt <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (!payload.paymentDate?.trim()) {
      throw new Error('Payment Date is required');
    }

    if (!payload.contractId?.trim()) {
      throw new Error('Contract ID is required');
    }

    const recordId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const [recorded] = await db
      .insert(paymentRecordsTable)
      .values({
        id: recordId,
        contractId: payload.contractId,
        paymentScheduleId: payload.paymentScheduleId || null,
        paymentDate: payload.paymentDate,
        amount: payAmt.toString(),
        paymentMethod: payload.paymentMethod || 'Bank Transfer',
        bank: payload.bank || '',
        accountNo: payload.accountNo || '',
        referenceNo: payload.referenceNo || '',
        notes: payload.notes || '',
        receiptFile: payload.receiptFile || null,
        isArchived: false,
        createdBy: operator.id || null,
        createdByName: operator.name || 'System',
      })
      .returning();

    let updatedSchedule: DbPaymentSchedule | null = null;

    // Update Schedule if linked
    if (payload.paymentScheduleId) {
      const schedules = await db
        .select()
        .from(paymentSchedulesTable)
        .where(eq(paymentSchedulesTable.id, payload.paymentScheduleId))
        .limit(1);

      if (schedules.length > 0) {
        const schedule = schedules[0];
        const oldStatus = schedule.status;
        const totalAmount = Number(schedule.amount) || 0;
        const currentPaid = Number(schedule.paidAmount) || 0;
        const newPaid = currentPaid + payAmt;
        const newRemaining = Math.max(0, totalAmount - newPaid);
        const newStatus = this.calculateScheduleStatus(totalAmount, newPaid, schedule.dueDate);

        const [saved] = await db
          .update(paymentSchedulesTable)
          .set({
            paidAmount: newPaid.toString(),
            remainingAmount: newRemaining.toString(),
            status: newStatus,
            updatedBy: operator.id || null,
            updatedAt: new Date(),
          })
          .where(eq(paymentSchedulesTable.id, schedule.id))
          .returning();

        updatedSchedule = saved;

        // Log status change if changed
        if (oldStatus !== newStatus) {
          await db.insert(auditLogsTable).values({
            propertyId: schedule.propertyId || `contract:${schedule.contractId}`,
            action: 'Payment Status Change',
            userName: operator.name || 'System',
            userId: operator.id || null,
            oldValue: oldStatus,
            newValue: `${newStatus} (Schedule: ${schedule.title}, Paid: ฿${newPaid.toLocaleString()})`,
          });
        }
      }
    }

    // Audit log for Create Payment
    await db.insert(auditLogsTable).values({
      propertyId: `contract:${payload.contractId}`,
      action: 'Create Payment',
      userName: operator.name || 'System',
      userId: operator.id || null,
      newValue: `Recorded payment ฿${payAmt.toLocaleString()} (${payload.paymentMethod || 'Bank Transfer'}) Ref: ${payload.referenceNo || 'N/A'} for Contract ${payload.contractId}`,
    });

    return {
      record: recorded,
      updatedSchedule,
    };
  }

  /**
   * Update an existing payment schedule
   */
  async updateSchedule(
    id: string,
    payload: Partial<InsertDbPaymentSchedule>,
    operator: User
  ): Promise<DbPaymentSchedule> {
    const existingList = await db
      .select()
      .from(paymentSchedulesTable)
      .where(eq(paymentSchedulesTable.id, id))
      .limit(1);

    if (existingList.length === 0) {
      throw new Error(`Schedule ${id} not found`);
    }

    const existing = existingList[0];
    const amount = payload.amount !== undefined ? Number(payload.amount) : Number(existing.amount);
    const paidAmount = payload.paidAmount !== undefined ? Number(payload.paidAmount) : Number(existing.paidAmount);
    const dueDate = payload.dueDate || existing.dueDate;
    const remainingAmount = Math.max(0, amount - paidAmount);
    const status = this.calculateScheduleStatus(amount, paidAmount, dueDate, payload.status || existing.status);

    const [updated] = await db
      .update(paymentSchedulesTable)
      .set({
        ...payload,
        amount: amount.toString(),
        paidAmount: paidAmount.toString(),
        remainingAmount: remainingAmount.toString(),
        status,
        dueDate,
        updatedBy: operator.id || null,
        updatedAt: new Date(),
      })
      .where(eq(paymentSchedulesTable.id, id))
      .returning();

    await db.insert(auditLogsTable).values({
      propertyId: updated.propertyId || `contract:${updated.contractId}`,
      action: 'Update Payment',
      userName: operator.name || 'System',
      userId: operator.id || null,
      oldValue: `Amount: ฿${existing.amount}, Due: ${existing.dueDate}, Status: ${existing.status}`,
      newValue: `Amount: ฿${updated.amount}, Due: ${updated.dueDate}, Status: ${updated.status}`,
    });

    return updated;
  }

  /**
   * Cancel/Archive a payment schedule (Soft delete)
   */
  async cancelOrArchiveSchedule(id: string, operator: User): Promise<DbPaymentSchedule> {
    const isManagerOrAdmin =
      (operator?.role || '').toLowerCase().includes('admin') ||
      (operator?.role || '').toLowerCase().includes('manager');

    if (!isManagerOrAdmin) {
      throw new Error('Forbidden: Only Manager or Administrator can cancel or archive payment schedules.');
    }

    const existingList = await db
      .select()
      .from(paymentSchedulesTable)
      .where(eq(paymentSchedulesTable.id, id))
      .limit(1);

    if (existingList.length === 0) {
      throw new Error(`Schedule ${id} not found`);
    }

    const existing = existingList[0];

    const [updated] = await db
      .update(paymentSchedulesTable)
      .set({
        isArchived: true,
        status: 'Cancelled',
        updatedBy: operator.id || null,
        updatedAt: new Date(),
      })
      .where(eq(paymentSchedulesTable.id, id))
      .returning();

    await db.insert(auditLogsTable).values({
      propertyId: updated.propertyId || `contract:${updated.contractId}`,
      action: 'Cancel Payment',
      userName: operator.name || 'System',
      userId: operator.id || null,
      oldValue: `Schedule ${existing.title} (${existing.status})`,
      newValue: 'Status: Cancelled, isArchived: true (Soft Deleted)',
    });

    return updated;
  }

  /**
   * Attach receipt file to a payment record
   */
  async attachReceipt(
    paymentRecordId: string,
    receiptFile: {
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize?: number;
      uploadedAt?: string;
    },
    operator: User
  ): Promise<DbPaymentRecord> {
    // Validate file extensions
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const lowerName = (receiptFile.fileName || '').toLowerCase();
    const isAllowed = allowedExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isAllowed) {
      throw new Error('Invalid file type. Only JPG, JPEG, PNG, and PDF files are allowed.');
    }

    const records = await db
      .select()
      .from(paymentRecordsTable)
      .where(eq(paymentRecordsTable.id, paymentRecordId))
      .limit(1);

    if (records.length === 0) {
      throw new Error(`Payment Record ${paymentRecordId} not found`);
    }

    const [updated] = await db
      .update(paymentRecordsTable)
      .set({
        receiptFile,
        updatedAt: new Date(),
      })
      .where(eq(paymentRecordsTable.id, paymentRecordId))
      .returning();

    await db.insert(auditLogsTable).values({
      propertyId: `contract:${updated.contractId}`,
      action: 'Attach Receipt',
      userName: operator.name || 'System',
      userId: operator.id || null,
      newValue: `Attached receipt file "${receiptFile.fileName}" to Payment ${paymentRecordId}`,
    });

    return updated;
  }

  /**
   * Get complete payment summary for a Contract (Integration with B22)
   */
  async getContractPaymentSummary(contractId: string): Promise<{
    contractId: string;
    totalScheduled: number;
    totalPaid: number;
    totalRemaining: number;
    totalOverdue: number;
    schedulesCount: {
      total: number;
      paid: number;
      pending: number;
      overdue: number;
      partial: number;
      cancelled: number;
    };
    schedules: DbPaymentSchedule[];
    records: DbPaymentRecord[];
  }> {
    const rawSchedules = await db
      .select()
      .from(paymentSchedulesTable)
      .where(and(eq(paymentSchedulesTable.contractId, contractId), eq(paymentSchedulesTable.isArchived, false)))
      .orderBy(paymentSchedulesTable.dueDate);

    const records = await db
      .select()
      .from(paymentRecordsTable)
      .where(and(eq(paymentRecordsTable.contractId, contractId), eq(paymentRecordsTable.isArchived, false)))
      .orderBy(desc(paymentRecordsTable.paymentDate));

    let totalScheduled = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let totalOverdue = 0;

    const schedulesCount = {
      total: rawSchedules.length,
      paid: 0,
      pending: 0,
      overdue: 0,
      partial: 0,
      cancelled: 0,
    };

    const schedules = rawSchedules.map((s) => {
      const amt = Number(s.amount) || 0;
      const paid = Number(s.paidAmount) || 0;
      const remaining = Math.max(0, amt - paid);
      const status = this.calculateScheduleStatus(amt, paid, s.dueDate, s.status);

      totalScheduled += amt;
      totalPaid += paid;
      totalRemaining += remaining;

      if (status === 'Overdue') {
        totalOverdue += remaining;
        schedulesCount.overdue++;
      } else if (status === 'Paid') {
        schedulesCount.paid++;
      } else if (status === 'Partially Paid') {
        schedulesCount.partial++;
      } else if (status === 'Pending') {
        schedulesCount.pending++;
      } else if (status === 'Cancelled') {
        schedulesCount.cancelled++;
      }

      return {
        ...s,
        status,
        remainingAmount: remaining.toString(),
      };
    });

    return {
      contractId,
      totalScheduled,
      totalPaid,
      totalRemaining,
      totalOverdue,
      schedulesCount,
      schedules,
      records,
    };
  }

  /**
   * List all payment records (Transactions)
   */
  async getPaymentRecords(params: { contractId?: string; paymentScheduleId?: string } = {}): Promise<DbPaymentRecord[]> {
    const conditions = [eq(paymentRecordsTable.isArchived, false)];
    if (params.contractId) conditions.push(eq(paymentRecordsTable.contractId, params.contractId));
    if (params.paymentScheduleId) conditions.push(eq(paymentRecordsTable.paymentScheduleId, params.paymentScheduleId));

    return db
      .select()
      .from(paymentRecordsTable)
      .where(and(...conditions))
      .orderBy(desc(paymentRecordsTable.paymentDate), desc(paymentRecordsTable.createdAt));
  }
}

export const paymentService = new PaymentService();
