import fs from 'fs';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  contractsTable,
  auditLogsTable,
  propertiesTable,
  DbContract,
  InsertDbContract,
} from '../db/schema.ts';
import { generateLeaseContractDocx } from './docx-generator.ts';
import { canUserArchiveProperty, canUserEditProperty } from '../lib/permissions.ts';
import { User } from '../types.ts';
import { numberToThaiBaht, numberToEnglishWords } from '../lib/number-words.ts';

export interface ContractQueryParams {
  search?: string;
  contractType?: string;
  status?: string;
  propertyId?: string;
  agent?: string;
  isArchived?: boolean | string;
  page?: number;
  pageSize?: number;
}

export interface ContractValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
}

export function validateContractPayload(payload: Partial<InsertDbContract>): ContractValidationResult {
  const errors: Array<{ field: string; message: string }> = [];

  if (!payload.signDate?.trim()) {
    errors.push({ field: 'signDate', message: 'Sign Date is required (วันที่ทำสัญญาจำเป็นต้องระบุ)' });
  }

  if (!payload.rentalStart?.trim()) {
    errors.push({ field: 'rentalStart', message: 'Rental Start Date is required (วันเริ่มสัญญาจำเป็นต้องระบุ)' });
  }

  if (!payload.rentalEnd?.trim()) {
    errors.push({ field: 'rentalEnd', message: 'Rental End Date is required (วันสิ้นสุดสัญญาจำเป็นต้องระบุ)' });
  }

  if (payload.rentalStart && payload.rentalEnd) {
    if (new Date(payload.rentalEnd) <= new Date(payload.rentalStart)) {
      errors.push({ field: 'rentalEnd', message: 'Rental End Date must be after Rental Start Date' });
    }
  }

  if (!payload.propertyId?.trim()) {
    errors.push({ field: 'propertyId', message: 'Property ID is required (รหัสทรัพย์จำเป็นต้องระบุ)' });
  }

  if (!payload.tenantPhone?.trim()) {
    errors.push({ field: 'tenantPhone', message: 'Tenant Phone is required (เบอร์โทรศัพท์ผู้เช่าจำเป็นต้องระบุ)' });
  }

  if (payload.monthlyRent === undefined || payload.monthlyRent === null || Number(payload.monthlyRent) < 0) {
    errors.push({ field: 'monthlyRent', message: 'Monthly Rent must be a positive number' });
  }

  if (!payload.paymentTerm?.trim()) {
    errors.push({ field: 'paymentTerm', message: 'Payment Term is required' });
  }

  if (payload.deposit === undefined || payload.deposit === null || Number(payload.deposit) < 0) {
    errors.push({ field: 'deposit', message: 'Deposit is required and cannot be negative' });
  }

  if (payload.advanceRental === undefined || payload.advanceRental === null || Number(payload.advanceRental) < 0) {
    errors.push({ field: 'advanceRental', message: 'Advance Rental is required and cannot be negative' });
  }

  if (!payload.salesName?.trim()) {
    errors.push({ field: 'salesName', message: 'Sales Person is required (เจ้าหน้าที่ฝ่ายขายจำเป็นต้องระบุ)' });
  }

  if (payload.salesCommission === undefined || payload.salesCommission === null || String(payload.salesCommission).trim() === '') {
    errors.push({ field: 'salesCommission', message: 'Commission is required (ค่านายหน้าจำเป็นต้องระบุ)' });
  }

  if (payload.comments && payload.comments.length > 500) {
    errors.push({ field: 'comments', message: 'Comments cannot exceed 500 characters (ความคิดเห็นไม่เกิน 500 ตัวอักษร)' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export class ContractService {
  /**
   * List contracts with filtering and search
   */
  async getContracts(params: ContractQueryParams = {}) {
    const page = Math.max(1, Number(params.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize || 50)));
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [];

    // Archive filter: default show active unarchived contracts
    if (params.isArchived === true || params.isArchived === 'true') {
      conditions.push(eq(contractsTable.isArchived, true));
    } else if (params.isArchived === 'all') {
      // include both
    } else {
      conditions.push(eq(contractsTable.isArchived, false));
    }

    if (params.contractType && params.contractType !== 'all') {
      conditions.push(eq(contractsTable.contractType, params.contractType));
    }

    if (params.status && params.status !== 'all') {
      conditions.push(eq(contractsTable.status, params.status));
    }

    if (params.propertyId) {
      conditions.push(eq(contractsTable.propertyId, params.propertyId));
    }

    if (params.agent) {
      conditions.push(
        or(
          eq(contractsTable.agent, params.agent),
          eq(contractsTable.salesName, params.agent)
        )
      );
    }

    if (params.search?.trim()) {
      const q = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(contractsTable.contractId, q),
          ilike(contractsTable.propertyId, q),
          ilike(contractsTable.projectEn, q),
          ilike(contractsTable.projectTh, q),
          ilike(contractsTable.tenantName, q),
          ilike(contractsTable.tenantPhone, q),
          ilike(contractsTable.ownerName, q),
          ilike(contractsTable.salesName, q),
          ilike(contractsTable.agent, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(contractsTable)
        .where(whereClause)
        .orderBy(desc(contractsTable.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(contractsTable)
        .where(whereClause),
    ]);

    const total = Number(totalResult[0]?.count || 0);

    return {
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get single contract by ID or Contract ID
   */
  async getContractById(id: string): Promise<DbContract | null> {
    const result = await db
      .select()
      .from(contractsTable)
      .where(or(eq(contractsTable.id, id), eq(contractsTable.contractId, id)))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create new contract with validation, Word generation, and audit trail
   */
  async createContract(payload: Partial<InsertDbContract> & Record<string, any>, operator: User): Promise<DbContract> {
    const validation = validateContractPayload(payload);
    if (!validation.isValid) {
      const msg = validation.errors.map((e) => e.message).join('; ');
      throw new Error(`Contract validation failed: ${msg}`);
    }

    const id = payload.id || `ctr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const contractId = payload.contractId || `RENT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const monthlyRent = Number(payload.monthlyRent || 0);
    const deposit = Number(payload.deposit || 0);
    const advanceRental = Number(payload.advanceRental || 0);
    const totalPrice = deposit + advanceRental;

    // Auto compute word representations if omitted
    const monthlyRentBahtTh = payload.monthlyRentBahtTh || numberToThaiBaht(monthlyRent);
    const monthlyRentBahtEn = payload.monthlyRentBahtEn || numberToEnglishWords(monthlyRent);
    const depositBahtTh = payload.depositBahtTh || numberToThaiBaht(deposit);
    const depositBahtEn = payload.depositBahtEn || numberToEnglishWords(deposit);
    const advanceRentalBahtTh = payload.advanceRentalBahtTh || numberToThaiBaht(advanceRental);
    const advanceRentalBahtEn = payload.advanceRentalBahtEn || numberToEnglishWords(advanceRental);
    const totalPriceBahtTh = payload.totalPriceBahtTh || numberToThaiBaht(totalPrice);
    const totalPriceBahtEn = payload.totalPriceBahtEn || numberToEnglishWords(totalPrice);

    const newRecord: InsertDbContract = {
      ...payload,
      id,
      contractId,
      contractType: payload.contractType || 'Rent Contract',
      status: payload.status || 'Active',
      signDate: payload.signDate,
      rentalStart: payload.rentalStart,
      rentalEnd: payload.rentalEnd,
      rentalTime: payload.rentalTime || '12 Months',
      withPet: Boolean(payload.withPet),
      propertyId: payload.propertyId,
      agent: payload.agent || operator.name,
      agentPhone: payload.agentPhone || operator.phone || '',
      houseNo: payload.houseNo || '',
      projectEn: payload.projectEn || '',
      projectTh: payload.projectTh || '',
      nation: payload.nation || 'Thailand',
      province: payload.province || 'Phuket',
      district: payload.district || '',
      subDistrict: payload.subDistrict || '',
      roadEn: payload.roadEn || '',
      roadTh: payload.roadTh || '',
      soiEn: payload.soiEn || '',
      soiTh: payload.soiTh || '',
      mooEn: payload.mooEn || '',
      mooTh: payload.mooTh || '',
      postalCode: payload.postalCode || '',
      houseRegistrationFile: payload.houseRegistrationFile || null,
      ownerName: payload.ownerName || '',
      landlordCertificateType: payload.landlordCertificateType || 'Thai ID',
      landlordIdNo: payload.landlordIdNo || '',
      landlordNationality: payload.landlordNationality || 'Thai',
      landlordBank: payload.landlordBank || 'Kasikorn Bank',
      landlordAccountName: payload.landlordAccountName || payload.ownerName || '',
      landlordAccountNo: payload.landlordAccountNo || '',
      landlordAddressHouseNo: payload.landlordAddressHouseNo || '',
      landlordAddressProject: payload.landlordAddressProject || '',
      landlordAddressNation: payload.landlordAddressNation || 'Thailand',
      landlordAddressProvince: payload.landlordAddressProvince || 'Phuket',
      landlordAddressDistrict: payload.landlordAddressDistrict || '',
      landlordAddressSubDistrict: payload.landlordAddressSubDistrict || '',
      landlordAddressRoad: payload.landlordAddressRoad || '',
      landlordAddressSoi: payload.landlordAddressSoi || '',
      landlordAddressMoo: payload.landlordAddressMoo || '',
      landlordAddressPostalCode: payload.landlordAddressPostalCode || '',
      ownerThaiIdFile: payload.ownerThaiIdFile || null,
      tenantId: payload.tenantId || '',
      tenantName: payload.tenantName || '',
      tenantPhone: payload.tenantPhone,
      tenantNationality: payload.tenantNationality || '',
      tenantCertificateType: payload.tenantCertificateType || 'Passport',
      tenantIdNo: payload.tenantIdNo || '',
      tenantPassportFile: payload.tenantPassportFile || null,
      moreTenants: payload.moreTenants || [],
      monthlyRent: String(monthlyRent),
      paymentTerm: payload.paymentTerm || 'Monthly',
      monthlyRentBahtEn,
      monthlyRentBahtTh,
      paymentDate: payload.paymentDate || '23',
      penaltyAmount: payload.penaltyAmount || '437.50',
      priceComments: payload.priceComments || '',
      totalPrice: String(totalPrice),
      totalPriceBahtEn,
      totalPriceBahtTh,
      deposit: String(deposit),
      depositBahtEn,
      depositBahtTh,
      advanceRental: String(advanceRental),
      advanceRentalBahtEn,
      advanceRentalBahtTh,
      commissionFromOwner: String(payload.commissionFromOwner || 0),
      commissionBahtEn: payload.commissionBahtEn || '',
      commissionBahtTh: payload.commissionBahtTh || '',
      salesId: payload.salesId || operator.id,
      salesName: payload.salesName || operator.name,
      salesPhone: payload.salesPhone || operator.phone || '',
      salesCommission: String(payload.salesCommission || '0'),
      comments: payload.comments || '',
      attachments: payload.attachments || [],
      generatedWordFiles: [],
      currentWordFileUrl: '',
      isArchived: false,
      createdBy: operator.id,
      createdByName: operator.name,
      updatedBy: operator.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 1. Insert preliminary contract record
    const inserted = await db.insert(contractsTable).values(newRecord).returning();
    let created = inserted[0];

    // 2. Generate Word document (.docx Version 1)
    try {
      const docxResult = await generateLeaseContractDocx(created, 1);
      const wordRecord = {
        id: `doc-${Date.now()}`,
        version: 1,
        fileName: docxResult.fileName,
        url: docxResult.relativeUrl,
        filePath: docxResult.filePath,
        generatedAt: new Date().toISOString(),
        generatedBy: operator.name,
      };

      const updated = await db
        .update(contractsTable)
        .set({
          generatedWordFiles: [wordRecord],
          currentWordFileUrl: docxResult.relativeUrl,
          updatedAt: new Date(),
        })
        .where(eq(contractsTable.id, created.id))
        .returning();

      created = updated[0];
    } catch (docxErr) {
      console.error('Failed to generate initial Word contract document:', docxErr);
    }

    // 3. Audit Logging: 'Create Contract'
    await db.insert(auditLogsTable).values({
      propertyId: created.propertyId || `contract:${created.id}`,
      action: 'Create Contract',
      userName: operator.name || 'System',
      userId: operator.id || null,
      oldValue: null,
      newValue: JSON.stringify({
        contractId: created.contractId,
        propertyId: created.propertyId,
        tenantName: created.tenantName,
        tenantPhone: created.tenantPhone,
        monthlyRent: created.monthlyRent,
        status: created.status,
      }),
      createdAt: new Date(),
    });

    return created;
  }

  /**
   * Update contract with RBAC enforcement, new Word generation (preserving history), and audit trail
   */
  async updateContract(
    id: string,
    updates: Partial<InsertDbContract>,
    operator: User
  ): Promise<DbContract> {
    const existing = await this.getContractById(id);
    if (!existing) {
      throw new Error(`Contract with ID "${id}" not found`);
    }

    // RBAC: Agent can only edit contracts assigned to them; Manager/Admin can edit any
    const roleLower = (operator.role || '').toLowerCase();
    const isAdminOrManager = roleLower.includes('admin') || roleLower.includes('manager');
    if (!isAdminOrManager && existing.createdBy !== operator.id && existing.salesId !== operator.id) {
      throw new Error('Unauthorized: Agents can only edit contracts they created or are assigned to');
    }

    // Validate fields if critical fields are being modified
    const merged = { ...existing, ...updates };
    const validation = validateContractPayload(merged);
    if (!validation.isValid) {
      const msg = validation.errors.map((e) => e.message).join('; ');
      throw new Error(`Contract update validation failed: ${msg}`);
    }

    // Calculate totals & words if financial fields updated
    const monthlyRent = Number(updates.monthlyRent !== undefined ? updates.monthlyRent : existing.monthlyRent);
    const deposit = Number(updates.deposit !== undefined ? updates.deposit : existing.deposit);
    const advanceRental = Number(updates.advanceRental !== undefined ? updates.advanceRental : existing.advanceRental);
    const totalPrice = deposit + advanceRental;

    const monthlyRentBahtTh = updates.monthlyRentBahtTh || numberToThaiBaht(monthlyRent);
    const monthlyRentBahtEn = updates.monthlyRentBahtEn || numberToEnglishWords(monthlyRent);
    const depositBahtTh = updates.depositBahtTh || numberToThaiBaht(deposit);
    const depositBahtEn = updates.depositBahtEn || numberToEnglishWords(deposit);
    const advanceRentalBahtTh = updates.advanceRentalBahtTh || numberToThaiBaht(advanceRental);
    const advanceRentalBahtEn = updates.advanceRentalBahtEn || numberToEnglishWords(advanceRental);
    const totalPriceBahtTh = updates.totalPriceBahtTh || numberToThaiBaht(totalPrice);
    const totalPriceBahtEn = updates.totalPriceBahtEn || numberToEnglishWords(totalPrice);

    // Compute new version number
    const currentWordFiles = (existing.generatedWordFiles as any[]) || [];
    const newVersion = currentWordFiles.length + 1;

    // Construct merged object for docx generation
    const contractToGenerate: DbContract = {
      ...existing,
      ...updates,
      monthlyRent: String(monthlyRent),
      deposit: String(deposit),
      advanceRental: String(advanceRental),
      totalPrice: String(totalPrice),
      monthlyRentBahtTh,
      monthlyRentBahtEn,
      depositBahtTh,
      depositBahtEn,
      advanceRentalBahtTh,
      advanceRentalBahtEn,
      totalPriceBahtTh,
      totalPriceBahtEn,
      updatedBy: operator.id,
      updatedAt: new Date(),
    } as DbContract;

    // Generate new version Word file without destroying history!
    let newWordFiles = [...currentWordFiles];
    let newCurrentWordUrl = existing.currentWordFileUrl;

    try {
      const docxResult = await generateLeaseContractDocx(contractToGenerate, newVersion);
      const newWordEntry = {
        id: `doc-${Date.now()}`,
        version: newVersion,
        fileName: docxResult.fileName,
        url: docxResult.relativeUrl,
        filePath: docxResult.filePath,
        generatedAt: new Date().toISOString(),
        generatedBy: operator.name,
      };
      newWordFiles = [newWordEntry, ...currentWordFiles];
      newCurrentWordUrl = docxResult.relativeUrl;
    } catch (err) {
      console.error('Failed to generate updated Word document:', err);
    }

    const updatePayload: Partial<InsertDbContract> = {
      ...updates,
      monthlyRent: String(monthlyRent),
      deposit: String(deposit),
      advanceRental: String(advanceRental),
      totalPrice: String(totalPrice),
      monthlyRentBahtTh,
      monthlyRentBahtEn,
      depositBahtTh,
      depositBahtEn,
      advanceRentalBahtTh,
      advanceRentalBahtEn,
      totalPriceBahtTh,
      totalPriceBahtEn,
      generatedWordFiles: newWordFiles,
      currentWordFileUrl: newCurrentWordUrl,
      updatedBy: operator.id,
      updatedAt: new Date(),
    };

    const updated = await db
      .update(contractsTable)
      .set(updatePayload)
      .where(eq(contractsTable.id, existing.id))
      .returning();

    const saved = updated[0];

    // Audit Logging: 'Update Contract'
    await db.insert(auditLogsTable).values({
      propertyId: saved.propertyId || `contract:${saved.id}`,
      action: 'Update Contract',
      userName: operator.name || 'System',
      userId: operator.id || null,
      oldValue: JSON.stringify({
        status: existing.status,
        monthlyRent: existing.monthlyRent,
        rentalStart: existing.rentalStart,
        rentalEnd: existing.rentalEnd,
      }),
      newValue: JSON.stringify({
        status: saved.status,
        monthlyRent: saved.monthlyRent,
        rentalStart: saved.rentalStart,
        rentalEnd: saved.rentalEnd,
        docxVersion: newVersion,
      }),
      createdAt: new Date(),
    });

    return saved;
  }

  /**
   * Update Contract Status (Draft -> Active -> Expiring Soon -> Expired -> Terminated)
   */
  async updateStatus(id: string, status: string, operator: User): Promise<DbContract> {
    const existing = await this.getContractById(id);
    if (!existing) {
      throw new Error(`Contract with ID "${id}" not found`);
    }

    const validStatuses = ['Draft', 'Active', 'Expiring Soon', 'Expired', 'Terminated'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status "${status}". Allowed: ${validStatuses.join(', ')}`);
    }

    const updated = await db
      .update(contractsTable)
      .set({
        status,
        updatedBy: operator.id,
        updatedAt: new Date(),
      })
      .where(eq(contractsTable.id, existing.id))
      .returning();

    const saved = updated[0];

    // Audit Log: 'Contract Status Changed'
    await db.insert(auditLogsTable).values({
      propertyId: saved.propertyId || `contract:${saved.id}`,
      action: 'Contract Status Changed',
      userName: operator.name || 'System',
      userId: operator.id || null,
      oldValue: existing.status,
      newValue: saved.status,
      createdAt: new Date(),
    });

    return saved;
  }

  /**
   * Soft delete contract (isArchived = true) - strictly NO hard delete!
   * RBAC: Only Admin and Manager can archive/delete. Agents are rejected.
   */
  async archiveContract(id: string, operator: User): Promise<DbContract> {
    const roleLower = (operator.role || '').toLowerCase();
    if (!roleLower.includes('admin') && !roleLower.includes('manager')) {
      throw new Error('Forbidden: Only Admin and Manager roles can archive/delete contracts (RBAC Protected)');
    }

    const existing = await this.getContractById(id);
    if (!existing) {
      throw new Error(`Contract with ID "${id}" not found`);
    }

    const updated = await db
      .update(contractsTable)
      .set({
        isArchived: true,
        status: 'Terminated',
        updatedBy: operator.id,
        updatedAt: new Date(),
      })
      .where(eq(contractsTable.id, existing.id))
      .returning();

    const saved = updated[0];

    // Audit Log: 'Contract Soft Deleted'
    await db.insert(auditLogsTable).values({
      propertyId: saved.propertyId || `contract:${saved.id}`,
      action: 'Contract Soft Deleted',
      userName: operator.name || 'System',
      userId: operator.id || null,
      oldValue: `Status: ${existing.status}, isArchived: false`,
      newValue: `Status: Terminated, isArchived: true (Record preserved)`,
      createdAt: new Date(),
    });

    return saved;
  }

  /**
   * Manually regenerate Word docx file for a contract
   */
  async regenerateWord(id: string, operator: User) {
    const existing = await this.getContractById(id);
    if (!existing) {
      throw new Error(`Contract with ID "${id}" not found`);
    }

    const currentWordFiles = (existing.generatedWordFiles as any[]) || [];
    const newVersion = currentWordFiles.length + 1;

    const docxResult = await generateLeaseContractDocx(existing, newVersion);
    const newWordEntry = {
      id: `doc-${Date.now()}`,
      version: newVersion,
      fileName: docxResult.fileName,
      url: docxResult.relativeUrl,
      filePath: docxResult.filePath,
      generatedAt: new Date().toISOString(),
      generatedBy: operator.name,
    };

    const newHistory = [newWordEntry, ...currentWordFiles];

    const updated = await db
      .update(contractsTable)
      .set({
        generatedWordFiles: newHistory,
        currentWordFileUrl: docxResult.relativeUrl,
        updatedAt: new Date(),
      })
      .where(eq(contractsTable.id, existing.id))
      .returning();

    // Audit Log: 'Contract Word Regenerated'
    await db.insert(auditLogsTable).values({
      propertyId: existing.propertyId || `contract:${existing.id}`,
      action: 'Contract Word Regenerated',
      userName: operator.name || 'System',
      userId: operator.id || null,
      oldValue: `Version ${currentWordFiles.length}`,
      newValue: `Version ${newVersion} (${docxResult.fileName})`,
      createdAt: new Date(),
    });

    return {
      contract: updated[0],
      file: newWordEntry,
    };
  }

  /**
   * Seed the official 13-Page Bilingual Standard Lease Agreement (RENT-2026-0923)
   * if it does not already exist in the database.
   */
  async seedSampleContractIfEmpty() {
    if (process.env.NODE_ENV !== 'test') {
      return;
    }
    try {
      const existing = await db
        .select()
        .from(contractsTable)
        .where(eq(contractsTable.contractId, 'RENT-2026-0923'))
        .limit(1);

      if (existing && existing.length > 0) {
        const item = existing[0];
        const wordFiles = (item.generatedWordFiles as any[]) || [];
        const hasValidFile = wordFiles.length > 0 && wordFiles[0].filePath && fs.existsSync(wordFiles[0].filePath);
        if (!hasValidFile) {
          try {
            const docxResult = await generateLeaseContractDocx(item, 1);
            const wordEntry = {
              id: `doc-${Date.now()}`,
              version: 1,
              fileName: docxResult.fileName,
              url: docxResult.relativeUrl,
              filePath: docxResult.filePath,
              generatedAt: new Date().toISOString(),
              generatedBy: 'System Seed (Thai Official Standard 13-Page)',
            };
            await db
              .update(contractsTable)
              .set({
                generatedWordFiles: [wordEntry],
                currentWordFileUrl: docxResult.relativeUrl,
                updatedAt: new Date(),
              })
              .where(eq(contractsTable.id, item.id));
            return { ...item, generatedWordFiles: [wordEntry], currentWordFileUrl: docxResult.relativeUrl };
          } catch (e) {
            console.warn('Could not re-generate docx for seeded contract:', e);
          }
        }
        return item;
      }

      const contractId = 'RENT-2026-0923';
      const sampleRecord: any = {
        id: 'ctr-rent-2026-0923',
        contractId,
        contractNumber: contractId,
        contractType: 'Rent Contract',
        status: 'Active',
        isArchived: false,
        signDate: '2026-09-23',
        rentalStart: '2026-09-23',
        rentalEnd: '2027-09-22',
        rentalTime: '12 Months',
        withPet: false,

        propertyId: 'PK-23528',
        agent: 'Sarah Jenkins',
        agentPhone: '+66 81 234 5678',
        houseNo: '23/528',
        projectEn: 'Phanason Thepanusorn',
        projectTh: 'พนาสนธิ์ เทพอนุสรณ์',
        nation: 'Thailand',
        province: 'Phuket',
        district: 'Mueang',
        subDistrict: 'Wichit',
        roadEn: '-',
        roadTh: '-',
        soiEn: '-',
        soiTh: '-',
        mooEn: '2',
        mooTh: '2',
        postalCode: '83000',
        propertyTitle: 'Phanason Thepanusorn Chalong House 23/528',

        ownerName: 'Miss Jongjit Sutthichuay (นางสาว จงจิต สุทธิช่วย)',
        landlordCertificateType: 'Thai ID',
        landlordIdNo: '3 8015 00082 81 1',
        landlordNationality: 'Thai',
        landlordBank: 'Kasikorn Bank (ธนาคารกสิกรไทย)',
        landlordAccountName: 'Miss Kanyanat Chuaychai (นางสาว กัญญาณัฐ ช่วยชัย)',
        landlordAccountNo: '132-8-78628-8',
        landlordAddressHouseNo: '12/406',
        landlordAddressProject: 'Chalong',
        landlordAddressMoo: '2',
        landlordAddressSoi: '-',
        landlordAddressRoad: '-',
        landlordAddressSubDistrict: 'Wichit',
        landlordAddressDistrict: 'Mueang',
        landlordAddressProvince: 'Phuket',
        landlordAddressPostalCode: '83000',

        tenantName: 'MR. DMITRII KONDRATEV',
        tenantPhone: '+66800300571',
        tenantNationality: 'Russia',
        tenantCertificateType: 'Passport',
        tenantIdNo: '77 1803669',

        monthlyRent: '35000',
        paymentTerm: 'Monthly',
        monthlyRentBahtEn: 'Thirty-five thousand baht',
        monthlyRentBahtTh: 'สามหมื่นห้าพันบาท',
        paymentDate: '23',
        penaltyAmount: '437.50',
        totalPrice: '105000',
        totalPriceBahtEn: 'One hundred five thousand baht',
        totalPriceBahtTh: 'หนึ่งแสนห้าพันบาท',
        deposit: '70000',
        depositBahtEn: 'Seventy thousand baht',
        depositBahtTh: 'เจ็ดหมื่นบาท',
        advanceRental: '35000',
        advanceRentalBahtEn: 'Thirty-five thousand baht',
        advanceRentalBahtTh: 'สามหมื่นห้าพันบาท',

        commissionFromOwner: '35000',
        commissionBahtEn: 'Thirty-five thousand baht',
        commissionBahtTh: 'สามหมื่นห้าพันบาท',
        salesName: 'Sarah Jenkins',
        salesPhone: '+66 81 234 5678',
        salesCommission: '35000',
        salesCommissionReceived: true,
        comments: 'Standard 13-Page Bilingual Lease Agreement (สัญญาเช่าแบบมาตรฐาน 13 หน้า)',

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const inserted = await db.insert(contractsTable).values(sampleRecord).returning();
      const createdContract = inserted[0];

      // Generate the initial Word document
      try {
        const docxResult = await generateLeaseContractDocx(createdContract, 1);
        const wordEntry = {
          id: `doc-${Date.now()}`,
          version: 1,
          fileName: docxResult.fileName,
          url: docxResult.relativeUrl,
          filePath: docxResult.filePath,
          generatedAt: new Date().toISOString(),
          generatedBy: 'System Seed',
        };

        await db
          .update(contractsTable)
          .set({
            generatedWordFiles: [wordEntry],
            currentWordFileUrl: docxResult.relativeUrl,
          })
          .where(eq(contractsTable.id, createdContract.id));
      } catch (docErr) {
        console.warn('Initial seed docx generation note:', docErr);
      }

      console.log('Seeded 13-page standard sample contract RENT-2026-0923 successfully.');
      return createdContract;
    } catch (err) {
      console.error('Failed to seed sample lease contract:', err);
    }
  }
}

export const contractService = new ContractService();
