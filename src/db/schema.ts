import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const propertiesTable = pgTable(
  'properties',
  {
    id: serial('id').primaryKey(),
    propertyId: text('property_id').notNull().unique(),
    title: text('title').notNull().default(''),
    titleTh: text('title_th'),
    address: text('address').notNull().default(''),
    district: text('district').notNull().default('Mueang Phuket'),
    city: text('city').notNull().default('Phuket'),
    zone: text('zone').default('Zone 2'),
    area: text('area').default('Rawai'),
    nation: text('nation').default('Thailand'),
    postalCode: text('postal_code').default('83130'),
    category: text('category').notNull().default('Villa'),
    status: text('status').notNull().default('Available'),
    propertyLabel: text('property_label').default('Rent'),
    isPublished: boolean('is_published').default(false),
    publishStatus: text('publish_status').default('Draft'),
    price: numeric('price').default('0'), // Sale price in THB
    rentPrice: numeric('rent_price').default('0'), // Rent price in THB
    dailyRent: numeric('daily_rent').default('0'),
    bedrooms: integer('bedrooms').default(0),
    bathrooms: integer('bathrooms').default(0),
    usableArea: numeric('usable_area').default('0'),
    landArea: numeric('land_area').default('0'),
    floor: integer('floor'),
    yearBuilt: integer('year_built'),
    furniture: text('furniture').default('Fully Furnished'),
    petFriendly: boolean('pet_friendly').default(false),
    petType: text('pet_type').default('Pets Not Allowed'),
    petRemark: text('pet_remark'),
    hasPool: boolean('has_pool').default(false),
    hasHousePool: text('has_house_pool').default('No Pool'),
    poolType: text('pool_type').default('No Pool'),
    ownerId: text('owner_id'),
    ownerName: text('owner_name').notNull().default(''),
    ownerPhone: text('owner_phone').notNull().default(''),
    ownerEmail: text('owner_email'),
    virtualPhone1: text('virtual_phone_1'),
    virtualPhone2: text('virtual_phone_2'),
    landlordPhone3: text('landlord_phone_3'),
    agentId: text('agent_id').notNull().default('usr-1'),
    agentName: text('agent_name').notNull().default('Somchai Prasert'),
    agencyType: text('agency_type').default('Co-Broke'),
    agencyFrom: text('agency_from'),
    agencyTo: text('agency_to'),
    description: text('description').default(''),
    descriptionTh: text('description_th').default(''),
    googleMapUrl: text('google_map_url'),
    amenities: jsonb('amenities').$type<string[]>().default([]),
    images: jsonb('images').$type<any[]>().default([]),
    videos: jsonb('videos').$type<any[]>().default([]),
    featured: boolean('featured').default(false),
    isBlackList: boolean('is_black_list').default(false),
    isFavorite: boolean('is_favorite').default(false),
    approvalStatus: text('approval_status').default('Pending'),
    villaOwnership: text('villa_ownership'),
    landOwnership: text('land_ownership'),
    houseNo: text('house_no'),
    building: text('building'),
    buildingNo: text('building_no'),
    roomNo: text('room_no'),
    landUnit: text('land_unit').default('Sq.w'),
    usableAreaUnit: text('usable_area_unit').default('Sq.m'),
    projectName: text('project_name'),
    projectNameTh: text('project_name_th'),
    propertyType: text('property_type'),
    views: jsonb('views').$type<string[]>().default([]),
    checkList: jsonb('check_list').$type<string[]>().default([]),
    serviceInclude: jsonb('service_include').$type<string[]>().default([]),
    locationInfoTh: text('location_info_th'),
    locationInfoEn: text('location_info_en'),
    comments: text('comments'),
    deposit: text('deposit'),
    advancePayment: text('advance_payment'),
    commission: text('commission'),
    saleCommission: text('sale_commission'),
    transferType: text('transfer_type').default('50/50'),
    commonFee: numeric('common_fee').default('0'),
    electricityBill: text('electricity_bill'),
    waterBill: text('water_bill'),
    landlordContactMethod: text('landlord_contact_method'),
    landlordIdNumber: text('landlord_id_number'),
    landlordNotes: text('landlord_notes'),
    latitude: numeric('latitude'),
    longitude: numeric('longitude'),
    lastFollowUpDate: text('last_follow_up_date'),
    lastFollowUpStatus: text('last_follow_up_status'),
    lastFollowUpContent: text('last_follow_up_content'),
    followUpRecords: jsonb('follow_up_records').$type<any[]>().default([]),
    landlordPhoneRecords: jsonb('landlord_phone_records').$type<any[]>().default([]),
    updateLogs: jsonb('update_logs').$type<any[]>().default([]),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('prop_id_idx').on(table.propertyId),
    index('prop_status_idx').on(table.status),
    index('prop_cat_idx').on(table.category),
    index('prop_agent_idx').on(table.agentName),
    index('prop_zone_idx').on(table.zone),
    index('prop_area_idx').on(table.area),
    index('prop_archived_idx').on(table.isArchived),
    index('prop_created_idx').on(table.createdAt),
  ]
);

export const importHistoryTable = pgTable('import_history', {
  id: serial('id').primaryKey(),
  importId: text('import_id').notNull().unique(),
  fileName: text('file_name').notNull(),
  userName: text('user_name').notNull(),
  userId: text('user_id'),
  totalRows: integer('total_rows').notNull().default(0),
  newCount: integer('new_count').notNull().default(0),
  updatedCount: integer('updated_count').notNull().default(0),
  skippedCount: integer('skipped_count').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),
  status: text('status').notNull().default('Completed'),
  errorsJson: jsonb('errors_json').$type<any>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogsTable = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  propertyId: text('property_id'),
  action: text('action').notNull(), // 'Created' | 'Updated' | 'Imported' | 'Deleted' | 'Status Changed' | 'Price Changed' | 'Agent Changed'
  userName: text('user_name').notNull(),
  userId: text('user_id'),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const databaseBackupsTable = pgTable('database_backups', {
  id: serial('id').primaryKey(),
  backupId: text('backup_id').notNull().unique(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull().default(0),
  recordCount: integer('record_count').notNull().default(0),
  status: text('status').notNull().default('Success'),
  createdByName: text('created_by_name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  username: text('username'),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('Agent'), // 'Admin' | 'Manager' | 'Agent'
  phone: text('phone').default(''),
  avatar: text('avatar').default(''),
  branch: text('branch').default('Phuket Head Office'),
  department: text('department').default('Sales'),
  title: text('title').default('Real Estate Agent'),
  isActive: boolean('is_active').notNull().default(true),
  status: text('status').notNull().default('Active'), // 'Active' | 'Inactive'
  permissions: jsonb('permissions').$type<string[]>().default(['View', 'Create', 'Edit']),
  monthlyTarget: numeric('monthly_target').default('0'),
  monthlyCommission: numeric('monthly_commission').default('0'),
  targetDeals: integer('target_deals').default(0),
  completedDeals: integer('completed_deals').default(0),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contractsTable = pgTable(
  'contracts',
  {
    id: text('id').primaryKey(),
    contractId: text('contract_id').notNull().unique(),
    contractType: text('contract_type').notNull().default('Rent Contract'), // 'Rent Contract' | 'Sale Contract'
    status: text('status').notNull().default('Active'), // 'Draft' | 'Active' | 'Expiring Soon' | 'Expired' | 'Terminated'
    signDate: text('sign_date').notNull(),
    rentalStart: text('rental_start').notNull(),
    rentalEnd: text('rental_end').notNull(),
    rentalTime: text('rental_time').default('12 Months'),
    withPet: boolean('with_pet').default(false).notNull(),

    // Property Information
    propertyId: text('property_id').notNull(),
    agent: text('agent').default(''),
    agentPhone: text('agent_phone').default(''),
    houseNo: text('house_no').default(''),
    projectEn: text('project_en').default(''),
    projectTh: text('project_th').default(''),
    nation: text('nation').default('Thailand'),
    province: text('province').default('Phuket'),
    district: text('district').default(''),
    subDistrict: text('sub_district').default(''),
    roadEn: text('road_en').default(''),
    roadTh: text('road_th').default(''),
    soiEn: text('soi_en').default(''),
    soiTh: text('soi_th').default(''),
    mooEn: text('moo_en').default(''),
    mooTh: text('moo_th').default(''),
    postalCode: text('postal_code').default(''),
    houseRegistrationFile: jsonb('house_registration_file').$type<any>().default(null),

    // Landlord Information
    ownerName: text('owner_name').default(''),
    landlordCertificateType: text('landlord_certificate_type').default('Thai ID'),
    landlordIdNo: text('landlord_id_no').default(''),
    landlordNationality: text('landlord_nationality').default('Thai'),
    landlordBank: text('landlord_bank').default('Kasikorn Bank'),
    landlordAccountName: text('landlord_account_name').default(''),
    landlordAccountNo: text('landlord_account_no').default(''),
    landlordAddressHouseNo: text('landlord_address_house_no').default(''),
    landlordAddressProject: text('landlord_address_project').default(''),
    landlordAddressNation: text('landlord_address_nation').default('Thailand'),
    landlordAddressProvince: text('landlord_address_province').default('Phuket'),
    landlordAddressDistrict: text('landlord_address_district').default(''),
    landlordAddressSubDistrict: text('landlord_address_sub_district').default(''),
    landlordAddressRoad: text('landlord_address_road').default(''),
    landlordAddressSoi: text('landlord_address_soi').default(''),
    landlordAddressMoo: text('landlord_address_moo').default(''),
    landlordAddressPostalCode: text('landlord_address_postal_code').default(''),
    ownerThaiIdFile: jsonb('owner_thai_id_file').$type<any>().default(null),

    // Tenant Information
    tenantId: text('tenant_id').default(''),
    tenantName: text('tenant_name').default(''),
    tenantPhone: text('tenant_phone').notNull(),
    tenantNationality: text('tenant_nationality').default(''),
    tenantCertificateType: text('tenant_certificate_type').default('Passport'),
    tenantIdNo: text('tenant_id_no').default(''),
    tenantPassportFile: jsonb('tenant_passport_file').$type<any>().default(null),
    moreTenants: jsonb('more_tenants').$type<any[]>().default([]),

    // Rental Fee And Payment Term
    monthlyRent: numeric('monthly_rent').notNull().default('0'),
    paymentTerm: text('payment_term').notNull().default('Monthly'),
    monthlyRentBahtEn: text('monthly_rent_baht_en').default(''),
    monthlyRentBahtTh: text('monthly_rent_baht_th').default(''),
    paymentDate: text('payment_date').default('23'),
    penaltyAmount: text('penalty_amount').default('437.50'),
    priceComments: text('price_comments').default(''),
    totalPrice: numeric('total_price').default('0'),
    totalPriceBahtEn: text('total_price_baht_en').default(''),
    totalPriceBahtTh: text('total_price_baht_th').default(''),
    deposit: numeric('deposit').notNull().default('0'),
    depositBahtEn: text('deposit_baht_en').default(''),
    depositBahtTh: text('deposit_baht_th').default(''),
    advanceRental: numeric('advance_rental').notNull().default('0'),
    advanceRentalBahtEn: text('advance_rental_baht_en').default(''),
    advanceRentalBahtTh: text('advance_rental_baht_th').default(''),
    commissionFromOwner: numeric('commission_from_owner').default('0'),
    commissionBahtEn: text('commission_baht_en').default(''),
    commissionBahtTh: text('commission_baht_th').default(''),

    // Sales Information And Commission
    salesId: text('sales_id').default(''),
    salesName: text('sales_name').notNull().default(''),
    salesPhone: text('sales_phone').default(''),
    salesCommission: text('sales_commission').notNull().default(''),

    // Comments
    comments: text('comments').default(''),

    // Attach Files & Generated Word Files History
    attachments: jsonb('attachments').$type<any[]>().default([]),
    generatedWordFiles: jsonb('generated_word_files').$type<any[]>().default([]),
    currentWordFileUrl: text('current_word_file_url').default(''),

    // Audit & Soft Delete
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by'),
    createdByName: text('created_by_name'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('contracts_id_idx').on(table.contractId),
    index('contracts_prop_id_idx').on(table.propertyId),
    index('contracts_status_idx').on(table.status),
    index('contracts_type_idx').on(table.contractType),
    index('contracts_archived_idx').on(table.isArchived),
  ]
);

// -------------------------------------------------------------
// B23 — Payment Management Lite Tables
// -------------------------------------------------------------

export const paymentSchedulesTable = pgTable(
  'payment_schedules',
  {
    id: text('id').primaryKey(),
    contractId: text('contract_id').notNull(),
    propertyId: text('property_id').notNull(),
    payerName: text('payer_name').default(''),
    payerPhone: text('payer_phone').default(''),
    title: text('title').notNull(),
    paymentType: text('payment_type').notNull().default('Rent'), // 'Rent' | 'Deposit' | 'Advance Rental' | 'Commission' | 'Other'
    dueDate: text('due_date').notNull(),
    amount: numeric('amount').notNull().default('0'),
    paidAmount: numeric('paid_amount').notNull().default('0'),
    remainingAmount: numeric('remaining_amount').notNull().default('0'),
    status: text('status').notNull().default('Pending'), // 'Pending' | 'Paid' | 'Partially Paid' | 'Overdue' | 'Cancelled'
    cycleNumber: integer('cycle_number'),
    totalCycles: integer('total_cycles'),
    notes: text('notes').default(''),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by'),
    createdByName: text('created_by_name'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('sched_contract_id_idx').on(table.contractId),
    index('sched_prop_id_idx').on(table.propertyId),
    index('sched_status_idx').on(table.status),
    index('sched_type_idx').on(table.paymentType),
    index('sched_due_date_idx').on(table.dueDate),
    index('sched_archived_idx').on(table.isArchived),
  ]
);

export const paymentRecordsTable = pgTable(
  'payment_records',
  {
    id: text('id').primaryKey(),
    contractId: text('contract_id').notNull(),
    paymentScheduleId: text('payment_schedule_id'),
    paymentDate: text('payment_date').notNull(),
    amount: numeric('amount').notNull().default('0'),
    paymentMethod: text('payment_method').notNull().default('Bank Transfer'), // 'Bank Transfer' | 'Cash' | 'Other'
    bank: text('bank').default(''),
    accountNo: text('account_no').default(''),
    referenceNo: text('reference_no').default(''),
    notes: text('notes').default(''),
    receiptFile: jsonb('receipt_file').$type<{
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize?: number;
      uploadedAt?: string;
    } | null>().default(null),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by'),
    createdByName: text('created_by_name'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('pay_rec_contract_id_idx').on(table.contractId),
    index('pay_rec_sched_id_idx').on(table.paymentScheduleId),
    index('pay_rec_date_idx').on(table.paymentDate),
    index('pay_rec_archived_idx').on(table.isArchived),
  ]
);

// -------------------------------------------------------------
// B24 — Viewing / Appointment Management Lite Table
// -------------------------------------------------------------

export const viewingsTable = pgTable(
  'viewings',
  {
    id: text('id').primaryKey(),
    viewingCode: text('viewing_code').notNull().unique(),
    customerId: text('customer_id').notNull(),
    customerName: text('customer_name').notNull().default(''),
    customerPhone: text('customer_phone').default(''),
    propertyId: text('property_id').notNull(),
    propertyCustomId: text('property_custom_id').default(''),
    propertyTitle: text('property_title').default(''),
    agentId: text('agent_id').notNull(),
    agentName: text('agent_name').notNull().default(''),
    dateTime: text('date_time').notNull(), // ISO string format e.g. 2026-09-25T14:00
    location: text('location').notNull().default(''),
    notes: text('notes').default(''),
    status: text('status').notNull().default('Scheduled'), // 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show'
    feedback: text('feedback').default(''),
    interestScore: integer('interest_score').default(4),
    clientInterest: text('client_interest').default('Warm'), // 'Hot' | 'Warm' | 'Cold'
    cancellationReason: text('cancellation_reason').default(''),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by'),
    createdByName: text('created_by_name'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('viewings_code_idx').on(table.viewingCode),
    index('viewings_cust_idx').on(table.customerId),
    index('viewings_prop_idx').on(table.propertyId),
    index('viewings_agent_idx').on(table.agentId),
    index('viewings_status_idx').on(table.status),
    index('viewings_date_idx').on(table.dateTime),
    index('viewings_archived_idx').on(table.isArchived),
  ]
);

export type DbProperty = typeof propertiesTable.$inferSelect;
export type InsertDbProperty = typeof propertiesTable.$inferInsert;
export type DbImportHistory = typeof importHistoryTable.$inferSelect;
export type DbAuditLog = typeof auditLogsTable.$inferSelect;
export type DbBackup = typeof databaseBackupsTable.$inferSelect;
export type DbUser = typeof usersTable.$inferSelect;
export type InsertDbUser = typeof usersTable.$inferInsert;
export type DbContract = typeof contractsTable.$inferSelect;
export type InsertDbContract = typeof contractsTable.$inferInsert;
export type DbPaymentSchedule = typeof paymentSchedulesTable.$inferSelect;
export type InsertDbPaymentSchedule = typeof paymentSchedulesTable.$inferInsert;
export type DbPaymentRecord = typeof paymentRecordsTable.$inferSelect;
export type InsertDbPaymentRecord = typeof paymentRecordsTable.$inferInsert;
export type DbViewing = typeof viewingsTable.$inferSelect;
export type InsertDbViewing = typeof viewingsTable.$inferInsert;

// -------------------------------------------------------------
// B25 — Client / CRM Management Lite Tables
// -------------------------------------------------------------

export const clientsTable = pgTable(
  'clients',
  {
    id: text('id').primaryKey(),
    clientCode: text('client_code').notNull().unique(),
    firstName: text('first_name').notNull().default(''),
    lastName: text('last_name').default(''),
    companyName: text('company_name').default(''),
    phone: text('phone').notNull(),
    email: text('email').default(''),
    nationality: text('nationality').default('Thai'),
    idNumber: text('id_number').default(''), // Passport / Thai ID
    clientType: text('client_type').notNull().default('Buyer'), // 'Buyer' | 'Tenant' | 'Landlord' | 'Investor'
    intent: text('intent').default('Buy'), // 'Buy' | 'Rent' | 'Both'
    budgetMin: numeric('budget_min').default('0'),
    budgetMax: numeric('budget_max').default('0'),
    propertyType: text('property_type').default('Villa'), // 'Condo' | 'Villa' | 'House' | 'Land' | 'Commercial'
    preferredLocation: text('preferred_location').default(''),
    status: text('status').notNull().default('New'), // 'New' | 'Contacted' | 'Qualified' | 'Viewing' | 'Negotiation' | 'Won' | 'Lost' | 'Following Up' | 'Deposit' | 'Contract' | 'Closed'
    leadSource: text('lead_source').default('Website'), // 'Website' | 'Facebook' | 'Line' | 'Walk-in' | 'Referral' | 'Agent Network' | 'Google' | 'Campaign' | 'Other'
    lostReason: text('lost_reason').default(''),
    assignedAgentId: text('assigned_agent_id').notNull().default('user-admin-1'),
    assignedAgentName: text('assigned_agent_name').notNull().default('Administrator'),
    nextFollowUpDate: text('next_follow_up_date'),
    notes: text('notes').default(''),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by'),
    createdByName: text('created_by_name'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('clients_code_idx').on(table.clientCode),
    index('clients_phone_idx').on(table.phone),
    index('clients_status_idx').on(table.status),
    index('clients_lead_source_idx').on(table.leadSource),
    index('clients_type_idx').on(table.clientType),
    index('clients_agent_idx').on(table.assignedAgentId),
    index('clients_archived_idx').on(table.isArchived),
    index('clients_created_idx').on(table.createdAt),
  ]
);

export const clientPropertiesTable = pgTable(
  'client_properties',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id').notNull(),
    propertyId: text('property_id').notNull(),
    propertyCustomId: text('property_custom_id').default(''),
    propertyTitle: text('property_title').default(''),
    notes: text('notes').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('cl_prop_client_idx').on(table.clientId),
    index('cl_prop_property_idx').on(table.propertyId),
  ]
);

export const clientFollowUpsTable = pgTable(
  'client_follow_ups',
  {
    id: text('id').primaryKey(),
    clientId: text('client_id').notNull(),
    title: text('title').default(''),
    followUpDate: text('follow_up_date').notNull(),
    followUpTime: text('follow_up_time').default('10:00'),
    followUpNote: text('follow_up_note').notNull(),
    notes: text('notes').default(''),
    priority: text('priority').default('Normal'), // 'Low' | 'Normal' | 'High' | 'Urgent'
    assignedAgentId: text('assigned_agent_id').notNull(),
    assignedAgentName: text('assigned_agent_name').notNull().default(''),
    status: text('status').notNull().default('Pending'), // 'Pending' | 'Completed' | 'Cancelled'
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
    cancelReason: text('cancel_reason').default(''),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by'),
    createdByName: text('created_by_name'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('cl_fu_client_idx').on(table.clientId),
    index('cl_fu_agent_idx').on(table.assignedAgentId),
    index('cl_fu_date_idx').on(table.followUpDate),
    index('cl_fu_status_idx').on(table.status),
    index('cl_fu_archived_idx').on(table.isArchived),
  ]
);

export type DbClient = typeof clientsTable.$inferSelect;
export type InsertDbClient = typeof clientsTable.$inferInsert;
export type DbClientProperty = typeof clientPropertiesTable.$inferSelect;
export type InsertDbClientProperty = typeof clientPropertiesTable.$inferInsert;
export type DbClientFollowUp = typeof clientFollowUpsTable.$inferSelect;
export type InsertDbClientFollowUp = typeof clientFollowUpsTable.$inferInsert;

// -------------------------------------------------------------
// B28 — System Administration, RBAC & Settings Tables
// -------------------------------------------------------------

export const systemSettingsTable = pgTable(
  'system_settings',
  {
    id: text('id').primaryKey(), // 'system' | 'business' | 'numbering' | 'notification'
    category: text('category').notNull(),
    data: jsonb('data').$type<Record<string, any>>().notNull().default({}),
    updatedBy: text('updated_by'),
    updatedByName: text('updated_by_name'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('sys_set_cat_idx').on(table.category),
  ]
);

export const rolesTable = pgTable(
  'roles',
  {
    id: text('id').primaryKey(), // e.g. 'admin', 'manager', 'agent', 'staff'
    name: text('name').notNull(),
    description: text('description').default(''),
    permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
    isSystem: boolean('is_system').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('roles_name_idx').on(table.name),
  ]
);

export const userPermissionOverridesTable = pgTable(
  'user_permission_overrides',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    permissionKey: text('permission_key').notNull(),
    granted: boolean('granted').notNull(), // true = force grant, false = force revoke
    grantedBy: text('granted_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('u_perm_user_idx').on(table.userId),
    index('u_perm_key_idx').on(table.permissionKey),
  ]
);

export const sessionsTable = pgTable(
  'sessions',
  {
    token: text('token').primaryKey(),
    userId: text('user_id').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('sess_user_idx').on(table.userId),
    index('sess_expires_idx').on(table.expiresAt),
  ]
);

export type DbSystemSetting = typeof systemSettingsTable.$inferSelect;
export type InsertDbSystemSetting = typeof systemSettingsTable.$inferInsert;
export type DbRole = typeof rolesTable.$inferSelect;
export type InsertDbRole = typeof rolesTable.$inferInsert;
export type DbUserPermissionOverride = typeof userPermissionOverridesTable.$inferSelect;
export type InsertDbUserPermissionOverride = typeof userPermissionOverridesTable.$inferInsert;
export type DbSession = typeof sessionsTable.$inferSelect;
export type InsertDbSession = typeof sessionsTable.$inferInsert;

// -------------------------------------------------------------
// B30 — Property Operations Tables
// -------------------------------------------------------------

export const checkInOutsTable = pgTable(
  'check_in_outs',
  {
    id: text('id').primaryKey(),
    recordNumber: text('record_number').notNull().unique(),
    type: text('type').notNull().default('Check-in'), // 'Check-in' | 'Check-out'
    propertyId: text('property_id').notNull(),
    propertyCustomId: text('property_custom_id').default(''),
    propertyTitle: text('property_title').default(''),
    customerId: text('customer_id').default(''),
    customerName: text('customer_name').default(''),
    tenantName: text('tenant_name').default(''),
    tenantPhone: text('tenant_phone').default(''),
    contractId: text('contract_id').default(''),
    agentId: text('agent_id').default(''),
    agentName: text('agent_name').default(''),
    inspectorId: text('inspector_id').default(''),
    inspectorName: text('inspector_name').default(''),
    recipientName: text('recipient_name').default(''),
    date: text('date').notNull(),
    electricityMeter: numeric('electricity_meter').default('0'),
    waterMeter: numeric('water_meter').default('0'),
    electricityMeterImage: text('electricity_meter_image').default(''),
    waterMeterImage: text('water_meter_image').default(''),
    keySetsDelivered: integer('key_sets_delivered').default(0),
    accessCardDelivered: integer('access_card_delivered').default(0),
    status: text('status').notNull().default('Draft'), // 'Draft' | 'Completed' | 'Signed' | 'Approved'
    conditionReport: jsonb('condition_report').$type<Array<{
      id: string;
      room: string;
      item: string;
      condition: 'Excellent' | 'Good' | 'Fair' | 'Damaged' | 'Missing';
      passed: boolean;
      notes?: string;
      photoUrl?: string;
    }>>().default([]),
    damages: jsonb('damages').$type<Array<{
      id: string;
      item: string;
      area: string;
      description: string;
      estimatedCost: number;
      actualCost?: number;
      photoUrl?: string;
      liableParty: 'Tenant' | 'Owner' | 'Agency';
    }>>().default([]),
    depositAmount: numeric('deposit_amount').default('0'),
    depositDeductions: numeric('deposit_deductions').default('0'),
    depositRefunded: numeric('deposit_refunded').default('0'),
    depositStatus: text('deposit_status').default('Pending Calculation'), // 'Full Refund' | 'Partial Deduction' | 'Fully Forfeited' | 'Pending Calculation'
    photos: jsonb('photos').$type<string[]>().default([]),
    notes: text('notes').default(''),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by'),
    createdByName: text('created_by_name'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('chk_rec_no_idx').on(table.recordNumber),
    index('chk_prop_id_idx').on(table.propertyId),
    index('chk_cust_id_idx').on(table.customerId),
    index('chk_contract_id_idx').on(table.contractId),
    index('chk_type_idx').on(table.type),
    index('chk_status_idx').on(table.status),
    index('chk_date_idx').on(table.date),
    index('chk_archived_idx').on(table.isArchived),
  ]
);

export const maintenanceTicketsTable = pgTable(
  'maintenance_tickets',
  {
    id: text('id').primaryKey(),
    ticketNumber: text('ticket_number').notNull().unique(),
    propertyId: text('property_id').notNull(),
    propertyCustomId: text('property_custom_id').default(''),
    propertyTitle: text('property_title').default(''),
    contractId: text('contract_id').default(''),
    customerId: text('customer_id').default(''),
    customerName: text('customer_name').default(''),
    roomNo: text('room_no').default(''),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    category: text('category').notNull().default('General'), // 'Plumbing' | 'Electrical' | 'Air Condition' | 'Appliance' | 'Structural' | 'Cleaning' | 'Painting' | 'Other'
    priority: text('priority').notNull().default('Medium'), // 'Low' | 'Medium' | 'High' | 'Urgent'
    status: text('status').notNull().default('New'), // 'New' | 'In Progress' | 'Waiting Parts' | 'Resolved' | 'Closed' | 'Cancelled'
    reportedBy: text('reported_by').default(''),
    reporterPhone: text('reporter_phone').default(''),
    reporterType: text('reporter_type').default('Tenant'), // 'Tenant' | 'Owner' | 'Agent' | 'Staff'
    assignedToId: text('assigned_to_id').default(''),
    assignedToName: text('assigned_to_name').default(''),
    vendorName: text('vendor_name').default(''),
    vendorPhone: text('vendor_phone').default(''),
    vendorCost: numeric('vendor_cost').default('0'),
    estimatedCost: numeric('estimated_cost').default('0'),
    actualCost: numeric('actual_cost').default('0'),
    cost: numeric('cost').default('0'),
    paidBy: text('paid_by').default('Owner'), // 'Owner' | 'Tenant' | 'Agency' | 'Shared'
    paymentStatus: text('payment_status').default('Unpaid'), // 'Unpaid' | 'Paid' | 'Reimbursed'
    photos: jsonb('photos').$type<string[]>().default([]),
    completionPhotos: jsonb('completion_photos').$type<string[]>().default([]),
    resolutionHistory: jsonb('resolution_history').$type<Array<{
      date: string;
      note: string;
      author: string;
      status: string;
    }>>().default([]),
    scheduledDate: text('scheduled_date'),
    resolvedAt: text('resolved_at'),
    closedAt: text('closed_at'),
    notes: text('notes').default(''),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by'),
    createdByName: text('created_by_name'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('mnt_ticket_no_idx').on(table.ticketNumber),
    index('mnt_prop_id_idx').on(table.propertyId),
    index('mnt_contract_id_idx').on(table.contractId),
    index('mnt_status_idx').on(table.status),
    index('mnt_priority_idx').on(table.priority),
    index('mnt_category_idx').on(table.category),
    index('mnt_archived_idx').on(table.isArchived),
    index('mnt_created_idx').on(table.createdAt),
  ]
);

export const propertyExpensesTable = pgTable(
  'property_expenses',
  {
    id: text('id').primaryKey(),
    expenseNumber: text('expense_number').notNull().unique(),
    propertyId: text('property_id').notNull(),
    propertyCustomId: text('property_custom_id').default(''),
    propertyTitle: text('property_title').default(''),
    contractId: text('contract_id').default(''),
    maintenanceTicketId: text('maintenance_ticket_id').default(''),
    title: text('title').notNull(),
    category: text('category').notNull().default('Maintenance'), // 'Common Fee' | 'Maintenance' | 'Utility' | 'Renovation' | 'Cleaning' | 'Insurance' | 'Tax' | 'Marketing' | 'Management Fee' | 'Other'
    amount: numeric('amount').notNull().default('0'),
    date: text('date').notNull(),
    paidBy: text('paid_by').notNull().default('Owner'), // 'Owner' | 'Tenant' | 'Agency'
    paidTo: text('paid_to').default(''),
    paymentMethod: text('payment_method').default('Bank Transfer'), // 'Bank Transfer' | 'Cash' | 'Credit Card' | 'Cheque'
    status: text('status').notNull().default('Paid'), // 'Pending' | 'Paid' | 'Reimbursed' | 'Cancelled'
    receiptUrl: text('receipt_url').default(''),
    receiptFile: jsonb('receipt_file').$type<{
      fileName: string;
      fileUrl: string;
      fileSize?: number;
      fileType?: string;
      uploadedAt?: string;
    } | null>().default(null),
    notes: text('notes').default(''),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by'),
    createdByName: text('created_by_name'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('exp_number_idx').on(table.expenseNumber),
    index('exp_prop_id_idx').on(table.propertyId),
    index('exp_category_idx').on(table.category),
    index('exp_date_idx').on(table.date),
    index('exp_status_idx').on(table.status),
    index('exp_paid_by_idx').on(table.paidBy),
    index('exp_archived_idx').on(table.isArchived),
  ]
);

export const propertyHistoryTable = pgTable(
  'property_history',
  {
    id: text('id').primaryKey(),
    propertyId: text('property_id').notNull(),
    eventType: text('event_type').notNull(), // 'Status Change' | 'Price Change' | 'Check-in' | 'Check-out' | 'Maintenance' | 'Expense' | 'Contract' | 'Viewing' | 'Inspection' | 'Tenant Change' | 'General Note'
    title: text('title').notNull(),
    description: text('description').default(''),
    referenceType: text('reference_type').default(''), // 'contracts' | 'viewings' | 'check_in_outs' | 'maintenance' | 'expenses' | 'properties'
    referenceId: text('reference_id').default(''),
    oldValue: text('old_value').default(''),
    newValue: text('new_value').default(''),
    actorId: text('actor_id').default(''),
    actorName: text('actor_name').default(''),
    actorRole: text('actor_role').default(''),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('hist_prop_id_idx').on(table.propertyId),
    index('hist_event_type_idx').on(table.eventType),
    index('hist_created_idx').on(table.createdAt),
    index('hist_archived_idx').on(table.isArchived),
  ]
);

export type DbCheckInOut = typeof checkInOutsTable.$inferSelect;
export type InsertDbCheckInOut = typeof checkInOutsTable.$inferInsert;
export type DbMaintenanceTicket = typeof maintenanceTicketsTable.$inferSelect;
export type InsertDbMaintenanceTicket = typeof maintenanceTicketsTable.$inferInsert;
export type DbPropertyExpense = typeof propertyExpensesTable.$inferSelect;
export type InsertDbPropertyExpense = typeof propertyExpensesTable.$inferInsert;
export type DbPropertyHistory = typeof propertyHistoryTable.$inferSelect;
export type InsertDbPropertyHistory = typeof propertyHistoryTable.$inferInsert;

// -------------------------------------------------------------
// B30 — Dedicated Operations / Maintenance Management Tables
// -------------------------------------------------------------

export const maintenanceVendorsTable = pgTable(
  'maintenance_vendors',
  {
    id: text('id').primaryKey(),
    vendorCode: text('vendor_code').notNull().unique(),
    name: text('name').notNull(),
    company: text('company').default(''),
    phone: text('phone').notNull(),
    email: text('email').default(''),
    serviceType: text('service_type').notNull().default('General'), // 'Air Conditioner' | 'Pool' | 'Garden' | 'Electrical' | 'Plumbing' | 'Cleaning' | 'General' | 'Other'
    rating: numeric('rating').default('5.0'),
    isActive: boolean('is_active').notNull().default(true),
    notes: text('notes').default(''),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by'),
    createdByName: text('created_by_name'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('vnd_code_idx').on(table.vendorCode),
    index('vnd_type_idx').on(table.serviceType),
    index('vnd_active_idx').on(table.isActive),
    index('vnd_archived_idx').on(table.isArchived),
  ]
);

export const maintenanceRequestsTable = pgTable(
  'maintenance_requests',
  {
    id: text('id').primaryKey(),
    ticketNumber: text('ticket_number').notNull().unique(),
    propertyId: text('property_id').notNull(),
    propertyCustomId: text('property_custom_id').default(''),
    propertyTitle: text('property_title').default(''),
    customerId: text('customer_id').default(''),
    customerName: text('customer_name').default(''),
    contractId: text('contract_id').default(''),
    title: text('title').notNull(),
    problem: text('problem').notNull().default(''),
    solution: text('solution').default(''),
    category: text('category').notNull().default('General'), // 'Air Conditioner' | 'Pool' | 'Garden' | 'Electrical' | 'Plumbing' | 'Cleaning' | 'General' | 'Other'
    priority: text('priority').notNull().default('Normal'), // 'Low' | 'Normal' | 'High' | 'Urgent'
    status: text('status').notNull().default('Open'), // 'Open' | 'Assigned' | 'In Progress' | 'Waiting' | 'Completed' | 'Cancelled'
    assignedAgentId: text('assigned_agent_id').default(''),
    assignedAgentName: text('assigned_agent_name').default(''),
    assignedVendorId: text('assigned_vendor_id').default(''),
    assignedVendorName: text('assigned_vendor_name').default(''),
    dueDate: text('due_date'),
    startDate: text('start_date'),
    completedDate: text('completed_date'),
    totalCost: numeric('total_cost').notNull().default('0'),
    paidAmount: numeric('paid_amount').notNull().default('0'),
    outstandingAmount: numeric('outstanding_amount').notNull().default('0'),
    paidBy: text('paid_by').default('Owner'), // 'Owner' | 'Tenant' | 'Agency' | 'Shared'
    attachments: jsonb('attachments').$type<Array<{
      id: string;
      name: string;
      url: string;
      fileType?: string;
      uploadedAt?: string;
    }>>().default([]),
    notes: text('notes').default(''),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by'),
    createdByName: text('created_by_name'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('mnt_req_ticket_idx').on(table.ticketNumber),
    index('mnt_req_prop_idx').on(table.propertyId),
    index('mnt_req_cust_idx').on(table.customerId),
    index('mnt_req_status_idx').on(table.status),
    index('mnt_req_priority_idx').on(table.priority),
    index('mnt_req_vendor_idx').on(table.assignedVendorId),
    index('mnt_req_agent_idx').on(table.assignedAgentId),
    index('mnt_req_archived_idx').on(table.isArchived),
    index('mnt_req_created_idx').on(table.createdAt),
  ]
);

export const maintenanceCostsTable = pgTable(
  'maintenance_costs',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id').notNull(),
    itemType: text('item_type').notNull().default('Labor'), // 'Labor' | 'Parts' | 'Travel' | 'Other'
    description: text('description').notNull(),
    amount: numeric('amount').notNull().default('0'),
    paidAmount: numeric('paid_amount').notNull().default('0'),
    isPaid: boolean('is_paid').notNull().default(false),
    paidBy: text('paid_by').default('Owner'), // 'Owner' | 'Tenant' | 'Agency'
    paymentMethod: text('payment_method').default('Bank Transfer'),
    receiptUrl: text('receipt_url').default(''),
    paymentRecordId: text('payment_record_id').default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('mnt_cost_req_idx').on(table.requestId),
    index('mnt_cost_type_idx').on(table.itemType),
  ]
);

export const preventiveMaintenanceTable = pgTable(
  'preventive_maintenance',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    propertyId: text('property_id').notNull(),
    propertyCustomId: text('property_custom_id').default(''),
    propertyTitle: text('property_title').default(''),
    title: text('title').notNull(),
    serviceType: text('service_type').notNull().default('Air Conditioner'), // 'Air Conditioner' | 'Pool' | 'Garden' | 'Electrical' | 'Plumbing' | 'General' | 'Other'
    cycleMonths: integer('cycle_months').notNull().default(3),
    lastServiceDate: text('last_service_date'),
    nextDueDate: text('next_due_date').notNull(),
    reminderDays: integer('reminder_days').notNull().default(7),
    assignedVendorId: text('assigned_vendor_id').default(''),
    assignedVendorName: text('assigned_vendor_name').default(''),
    assignedAgentId: text('assigned_agent_id').default(''),
    assignedAgentName: text('assigned_agent_name').default(''),
    estimatedCost: numeric('estimated_cost').default('0'),
    status: text('status').notNull().default('Active'), // 'Active' | 'Paused' | 'Completed'
    notes: text('notes').default(''),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: text('created_by'),
    createdByName: text('created_by_name'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('pm_code_idx').on(table.code),
    index('pm_prop_idx').on(table.propertyId),
    index('pm_due_idx').on(table.nextDueDate),
    index('pm_status_idx').on(table.status),
    index('pm_archived_idx').on(table.isArchived),
  ]
);

export type DbMaintenanceVendor = typeof maintenanceVendorsTable.$inferSelect;
export type InsertDbMaintenanceVendor = typeof maintenanceVendorsTable.$inferInsert;
export type DbMaintenanceRequest = typeof maintenanceRequestsTable.$inferSelect;
export type InsertDbMaintenanceRequest = typeof maintenanceRequestsTable.$inferInsert;
export type DbMaintenanceCost = typeof maintenanceCostsTable.$inferSelect;
export type InsertDbMaintenanceCost = typeof maintenanceCostsTable.$inferInsert;
export type DbPreventiveMaintenance = typeof preventiveMaintenanceTable.$inferSelect;
export type InsertDbPreventiveMaintenance = typeof preventiveMaintenanceTable.$inferInsert;




