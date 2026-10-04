export type UserRole = 'Admin' | 'Manager' | 'Agent' | 'Administrator' | 'Staff';
export type UserPermission = 'View' | 'Create' | 'Edit' | 'Archive' | 'Restore';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  branch: string;
  department?: string;
  phone: string;
  avatar: string;
  title: string;
  isActive?: boolean;
  status?: 'Active' | 'Inactive';
  permissions?: (UserPermission | string)[];
  monthlyTarget?: number;
  monthlyCommission?: number;
  targetDeals?: number;
  completedDeals?: number;
  assignedPropertiesCount?: number;
  assignedCustomersCount?: number;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
}

export type PropertyCategory =
  | 'Villa'
  | 'House'
  | 'Condo'
  | 'Land'
  | 'Commercial'
  | 'Warehouse'
  | 'Office'
  | 'Hotel';

export type PropertyStatus =
  | 'Available'
  | 'Rented'
  | 'Sold'
  | 'Reserved'
  | 'Under Offer'
  | 'Inactive';

export type PropertyLabel = 'Rent' | 'Sale' | 'Rent and Sale';

export interface PropertyImage {
  id: string;
  url: string;
  isCover?: boolean;
  hasWatermark?: boolean;
  title?: string;
}

export interface PropertyVideo {
  id: string;
  url: string;
  title?: string;
}

export interface FollowUpRecord {
  id: string;
  propertyId: string;
  landlordId?: string;
  landlordName?: string;
  userId: string;
  userName: string;
  updateTime: string;
  content: string[];
  customContent?: string;
  latestPrice?: number;
  nextFollowUp?: string;
  blackList?: boolean;
  virtualPhone1?: string;
  virtualPhone2?: string;
  landlordPhone3?: string;
  channel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LandlordPhoneRecord {
  id: string;
  landlordId?: string;
  landlordName?: string;
  propertyId: string;
  virtualPhone1?: string;
  virtualPhone2?: string;
  phone3?: string;
  dateAdded: string;
  addedBy: string;
  changeNote?: string;
}

export interface UpdateLog {
  id: string;
  date: string;
  time: string;
  user: string;
  action: string;
  prevValue?: string;
  newValue?: string;
}

export interface Property {
  id: string;
  propertyId: string; // e.g. "VL-1001" or "VN015-1001"
  title: string;
  titleTh?: string;
  address: string;
  district: string;
  subDistrict?: string;
  province?: string;
  city: string;
  zone?: string;
  area?: string;
  nation?: string;
  postalCode?: string;
  category: PropertyCategory;
  status: PropertyStatus;
  propertyLabel?: PropertyLabel;
  isPublished?: boolean;
  publishStatus?: 'Draft' | 'Published' | 'Unpublished';
  price?: number;
  rentPrice?: number;
  dailyRent?: number;
  bedrooms: number;
  bathrooms: number;
  usableArea: number;
  landArea?: number;
  floor?: number;
  yearBuilt?: number;
  furniture?: string;
  petFriendly?: boolean;
  petType?: string;
  petRemark?: string;
  hasPool?: boolean;
  hasHousePool?: string;
  poolType?: string;
  ownerId?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  virtualPhone1?: string;
  virtualPhone2?: string;
  landlordPhone3?: string;
  agentId: string;
  agentName: string;
  agencyType?: string;
  agencyFrom?: string;
  agencyTo?: string;
  rentedOutBy?: string;
  rentFrom?: string;
  rentTo?: string;
  description: string;
  descriptionTh?: string;
  googleMapUrl?: string;
  amenities: string[];
  images: PropertyImage[];
  videos?: PropertyVideo[];
  featured?: boolean;
  isBlackList?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  approvalStatus?: 'Pass' | 'Pending' | 'Rejected';
  villaOwnership?: string;
  landOwnership?: string;
  houseNo?: string;
  building?: string;
  buildingNo?: string;
  roomNo?: string;
  buildingYear?: number;
  landUnit?: 'Sq.w' | 'Sq.m';
  usableAreaUnit?: 'Sq.m' | 'Sq.ft';
  projectName?: string;
  projectNameTh?: string;
  propertyType?: string;
  furnitureType?: 'Include' | 'Partly Furnished' | 'Exclude';
  views?: string[];
  checkList?: string[];
  serviceInclude?: string[];
  addressThDetail?: { road?: string; soi?: string; moo?: string };
  addressEnDetail?: { road?: string; soi?: string; moo?: string };
  locationInfoTh?: string;
  locationInfoEn?: string;
  comments?: string;
  deposit?: string;
  advancePayment?: string;
  commission?: string;
  saleCommission?: string;
  transferType?: string;
  commonFee?: number;
  electricityBill?: string;
  waterBill?: string;
  landlordContactMethod?: string;
  landlordIdNumber?: string;
  landlordNotes?: string;
  latitude?: number;
  longitude?: number;
  lastFollowUpDate?: string;
  lastFollowUpStatus?: string;
  lastFollowUpContent?: string;
  followUpRecords?: FollowUpRecord[];
  landlordPhoneRecords?: LandlordPhoneRecord[];
  updateLogs?: UpdateLog[];
  createdAt: string;
  updatedAt: string;
}

export type CustomerType = 'Buyer' | 'Tenant' | 'Landlord' | 'Investor' | 'Owner' | 'Lead' | 'Partner';
export type ClientStatus =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Viewing'
  | 'Negotiation'
  | 'Won'
  | 'Lost'
  | 'Following Up'
  | 'Deposit'
  | 'Contract'
  | 'Closed';
export type LeadSource =
  | 'Website'
  | 'Facebook'
  | 'Line'
  | 'Walk-in'
  | 'Referral'
  | 'Agent Network'
  | 'Google'
  | 'Campaign'
  | 'Other';
export type PipelineStage = 'New' | 'Contacted' | 'Qualified' | 'Viewing' | 'Negotiation' | 'Won' | 'Lost';
export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Viewing' | 'Negotiation' | 'Won' | 'Closed Won' | 'Lost' | ClientStatus;
export type ClientIntent = 'Buy' | 'Rent' | 'Both';

export interface CustomerTimelineEvent {
  id: string;
  date: string;
  type: 'Call' | 'Message' | 'Viewing' | 'Offer' | 'Note' | 'Status Change' | string;
  note: string;
  operator: string;
}

export interface ClientFollowUp {
  id: string;
  clientId: string;
  followUpDate: string;
  followUpNote: string;
  assignedAgentId: string;
  assignedAgentName: string;
  status: 'Pending' | 'Completed';
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ClientPropertyLink {
  id: string;
  clientId: string;
  propertyId: string;
  propertyCustomId?: string;
  propertyTitle?: string;
  notes?: string;
  createdAt: string;
  category?: string;
  price?: number;
  rentPrice?: number;
  status?: string;
  area?: string;
  zone?: string;
}

export interface Customer {
  id: string;
  customerCode: string;
  clientCode?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone: string;
  email: string;
  nationality?: string;
  idNumber?: string;
  type: CustomerType;
  clientType?: CustomerType;
  intent?: ClientIntent;
  leadStatus: LeadStatus;
  status?: ClientStatus;
  propertyType?: string;
  preferredType?: string;
  preferredLocations?: string[];
  interestedCategory?: PropertyCategory;
  budgetMin?: number;
  budgetMax?: number;
  preferredLocation?: string;
  leadSource?: LeadSource | string;
  lostReason?: string;
  assignedAgentId: string;
  assignedAgentName: string;
  notes?: string;
  timeline: CustomerTimelineEvent[];
  lastContactDate?: string;
  nextFollowUpDate?: string;
  isArchived?: boolean;
  linkedProperties?: ClientPropertyLink[];
  followUps?: ClientFollowUp[];
  viewings?: any[];
  contracts?: any[];
  payments?: any[];
  createdAt: string;
  updatedAt?: string;
}

export type Client = Customer;

export type ViewingStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-show' | 'No Show';

export interface Viewing {
  id: string;
  viewingCode: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  propertyId: string;
  propertyCustomId: string;
  propertyTitle: string;
  agentId: string;
  agentName: string;
  dateTime: string;
  location: string;
  status: ViewingStatus;
  notes?: string;
  feedback?: string;
  interestScore?: number; // 1 to 5
  clientInterest?: 'Hot' | 'Warm' | 'Cold';
  createdAt: string;
  updatedAt?: string;
}

export type ContractType = 'Rental Agreement' | 'Sales & Purchase' | 'Exclusive Listing' | 'Open Listing' | 'Rent' | 'Sale' | string;
export type ContractStatus = 'Draft' | 'Active' | 'Expiring Soon' | 'Expired' | 'Terminated';

export interface ContractDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface Contract {
  id: string;
  contractId?: string;
  contractNo?: string;
  contractNumber?: string;
  contractType?: ContractType;
  type?: ContractType;
  status: ContractStatus;
  signDate?: string;
  rentalStart?: string;
  rentalEnd?: string;
  rentalTime?: string;
  withPet?: boolean;

  // Property Information
  propertyId: string;
  propertyCustomId?: string;
  propertyTitle?: string;
  agent?: string;
  agentPhone?: string;
  houseNo?: string;
  projectEn?: string;
  projectTh?: string;
  nation?: string;
  province?: string;
  district?: string;
  subDistrict?: string;
  roadEn?: string;
  roadTh?: string;
  soiEn?: string;
  soiTh?: string;
  mooEn?: string;
  mooTh?: string;
  postalCode?: string;
  houseRegistrationFile?: any;

  // Landlord Information
  ownerName?: string;
  landlordCertificateType?: string;
  landlordIdNo?: string;
  landlordNationality?: string;
  landlordBank?: string;
  landlordAccountName?: string;
  landlordAccountNo?: string;
  landlordAddressHouseNo?: string;
  landlordAddressProject?: string;
  landlordAddressNation?: string;
  landlordAddressProvince?: string;
  landlordAddressDistrict?: string;
  landlordAddressSubDistrict?: string;
  landlordAddressRoad?: string;
  landlordAddressSoi?: string;
  landlordAddressMoo?: string;
  landlordAddressPostalCode?: string;
  ownerThaiIdFile?: any;

  // Tenant Information
  customerId?: string;
  customerName?: string;
  tenantId?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantNationality?: string;
  tenantCertificateType?: string;
  tenantIdNo?: string;
  tenantPassportFile?: any;
  moreTenants?: any[];

  // Rental Fee And Payment Term
  monthlyRent?: number;
  paymentTerm?: string;
  monthlyRentBahtEn?: string;
  monthlyRentBahtTh?: string;
  paymentDate?: string;
  penaltyAmount?: string;
  priceComments?: string;
  totalPrice?: number;
  totalPriceBahtEn?: string;
  totalPriceBahtTh?: string;
  deposit?: number;
  depositAmount?: number;
  depositBahtEn?: string;
  depositBahtTh?: string;
  advanceRental?: number;
  advanceRentalBahtEn?: string;
  advanceRentalBahtTh?: string;
  commissionFromOwner?: number;
  commissionBahtEn?: string;
  commissionBahtTh?: string;

  // Sales Information And Commission
  salesId?: string;
  salesName?: string;
  salesPhone?: string;
  salesCommission?: string;

  // Legacy & General
  partyAName?: string;
  partyARole?: string;
  partyBName?: string;
  partyBRole?: string;
  startDate?: string;
  endDate?: string;
  totalValue?: number;
  salePrice?: number;
  rentPrice?: number;
  price?: number;
  commission?: number;
  commissionAmount?: number;
  commissionRate?: number;
  agentId?: string;
  agentName?: string;
  documents?: ContractDocument[];
  attachments?: any[];
  generatedWordFiles?: Array<{
    id: string;
    version: number;
    fileName: string;
    url: string;
    filePath?: string;
    generatedAt: string;
    generatedBy: string;
  }>;
  currentWordFileUrl?: string;
  isArchived?: boolean;
  comments?: string;
  fileName?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CheckInOutType = 'Check-in' | 'Check-out';

export interface DamageItem {
  id: string;
  item: string;
  area: string;
  description: string;
  estimatedCost: number;
  photoUrl?: string;
}

export interface CheckListItem {
  id?: string;
  item: string;
  passed: boolean;
  note?: string;
}

export interface CheckInOut {
  id: string;
  code?: string;
  recordNumber?: string;
  type: CheckInOutType;
  propertyId: string;
  propertyCustomId: string;
  propertyTitle: string;
  customerId?: string;
  customerName?: string;
  tenantName?: string;
  tenantPhone?: string;
  agentId?: string;
  agentName?: string;
  date: string;
  electricityMeter: number;
  waterMeter: number;
  electricityMeterImage?: string;
  waterMeterImage?: string;
  keySetsDelivered?: number;
  accessCardDelivered?: number;
  damages?: DamageItem[];
  damageNotes?: string;
  depositAmount?: number;
  depositTotal?: number;
  depositReturnStatus?: string;
  depositReturnedAmount?: number;
  depositDeductions?: number;
  depositRefunded?: number;
  depositStatus?: 'Full Refund' | 'Partial Deduction' | 'Fully Forfeited' | 'Pending Calculation' | string;
  checklist?: (string | CheckListItem)[];
  photos?: string[];
  status?: string;
  inspectorId?: string;
  inspectorName?: string;
  recipientName?: string;
  meterElectricity?: number;
  meterWater?: number;
  keyCount?: number;
  keyCardCount?: number;
  damageReport?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ConditionReportItem {
  id: string;
  room: string;
  item: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Damaged' | 'Missing';
  passed: boolean;
  notes?: string;
  photoUrl?: string;
}

export interface PropertyExpense {
  id: string;
  expenseNumber: string;
  propertyId: string;
  propertyCustomId?: string;
  propertyTitle?: string;
  contractId?: string;
  maintenanceTicketId?: string;
  title: string;
  category: 'Common Fee' | 'Maintenance' | 'Utility' | 'Renovation' | 'Cleaning' | 'Insurance' | 'Tax' | 'Marketing' | 'Management Fee' | 'Other' | string;
  amount: number;
  date: string;
  paidBy: 'Owner' | 'Tenant' | 'Agency' | string;
  paidTo?: string;
  paymentMethod?: 'Bank Transfer' | 'Cash' | 'Credit Card' | 'Cheque' | string;
  status: 'Pending' | 'Paid' | 'Reimbursed' | 'Cancelled' | string;
  receiptUrl?: string;
  receiptFile?: {
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    fileType?: string;
    uploadedAt?: string;
  } | null;
  notes?: string;
  isArchived?: boolean;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PropertyHistoryItem {
  id: string;
  propertyId: string;
  eventType: 'Status Change' | 'Price Change' | 'Check-in' | 'Check-out' | 'Maintenance' | 'Expense' | 'Contract' | 'Viewing' | 'Inspection' | 'Tenant Change' | 'General Note' | string;
  title: string;
  description?: string;
  referenceType?: 'contracts' | 'viewings' | 'check_in_outs' | 'maintenance' | 'expenses' | 'properties' | string;
  referenceId?: string;
  oldValue?: string;
  newValue?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  metadata?: Record<string, any>;
  isArchived?: boolean;
  createdAt: string;
}

export interface PropertyOperationsOverview {
  property: Property;
  activeContract?: Contract | null;
  tenant?: Customer | null;
  landlord?: Customer | null;
  checkInOuts: CheckInOut[];
  maintenanceTickets: MaintenanceIssue[];
  expenses: PropertyExpense[];
  history: PropertyHistoryItem[];
  paymentSchedules?: any[];
  totalExpenses: number;
  openMaintenanceCount: number;
}

export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type IssueStatus = 'New' | 'In Progress' | 'Waiting Parts' | 'Resolved' | 'Closed';

export interface MaintenanceResolutionLog {
  date: string;
  note: string;
  author: string;
  status: string;
}

export interface MaintenanceIssue {
  id: string;
  issueCode?: string;
  ticketNumber?: string;
  propertyId: string;
  propertyCustomId: string;
  propertyTitle: string;
  roomNo?: string;
  title: string;
  category?: string;
  priority: IssuePriority;
  status: IssueStatus;
  reportedBy?: string;
  reporterPhone?: string;
  assignedToId?: string;
  assignedToName?: string;
  assignedVendor?: string;
  vendorPhone?: string;
  estimatedCost?: number;
  actualCost?: number;
  cost?: number;
  paidBy?: 'Owner' | 'Tenant' | 'Agency' | 'Landlord' | string;
  photos?: string[];
  images?: string[];
  resolutionHistory?: (string | MaintenanceResolutionLog)[];
  description: string;
  createdAt: string;
  resolvedAt?: string;
  updatedAt?: string;
}

export type FollowUpStatus = 'Pending' | 'Completed' | 'Cancelled';
export type FollowUpPriority = 'Low' | 'Medium' | 'High' | 'Urgent' | 'Normal';

export interface FollowUpTask {
  id: string;
  clientId: string;
  clientCode?: string;
  clientName?: string;
  clientType?: string;
  clientPhone?: string;
  clientStatus?: string;
  title?: string;
  followUpDate: string; // YYYY-MM-DD
  followUpTime?: string; // HH:mm
  followUpNote: string;
  notes?: string;
  priority?: FollowUpPriority;
  assignedAgentId: string;
  assignedAgentName: string;
  status: FollowUpStatus;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string;
  isArchived?: boolean;
  createdBy?: string | null;
  createdByName?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkTask {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'Low' | 'Normal' | 'Medium' | 'High' | 'Urgent';
  status: 'To Do' | 'Pending' | 'In Progress' | 'Completed';
  category?: 'Follow-up' | 'Viewing' | 'Inspection' | 'Contract' | 'Maintenance' | string;
  assignedToId?: string;
  assignedToName?: string;
  assigneeId?: string;
  assigneeName?: string;
  relatedId?: string;
  relatedType?: string;
  notes?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlyKPI {
  targetSales: number;
  currentSales: number;
  viewingsTarget: number;
  viewings: number;
  ownerFollowUpsTarget: number;
  ownerFollowUps: number;
  newListingsTarget: number;
  newListings: number;
  kpiScore: number;
}

export interface ActivityRecord {
  id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  userRole?: UserRole;
  operatorName?: string;
  operatorRole?: UserRole | string;
  module?: 'Properties' | 'Customers' | 'Viewings' | 'Contracts' | 'CheckInOut' | 'Maintenance' | 'Work' | 'Users' | string;
  action: string;
  targetType?: string;
  targetId?: string;
  description?: string;
  details?: string;
}

export type ActivityLog = ActivityRecord;

export interface DatabaseSchema {
  properties: Property[];
  customers: Customer[];
  viewings: Viewing[];
  contracts: Contract[];
  checkInOuts: CheckInOut[];
  maintenanceIssues: MaintenanceIssue[];
  tasks: WorkTask[];
  workTasks?: WorkTask[];
  users: User[];
  monthlyKPI: MonthlyKPI;
  records: ActivityRecord[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type?: 'viewing' | 'contract' | 'maintenance' | 'lead' | string;
  linkToTab?: string;
}

export type CheckInOutRecord = CheckInOut;
export type MaintenanceRequest = MaintenanceIssue;

// -------------------------------------------------------------
// B23 — Payment Management Lite Types
// -------------------------------------------------------------
export type PaymentType = 'Rent' | 'Deposit' | 'Advance Rental' | 'Commission' | 'Other';
export type PaymentStatus = 'Pending' | 'Paid' | 'Partially Paid' | 'Overdue' | 'Cancelled';
export type PaymentMethod = 'Bank Transfer' | 'Cash' | 'Other';

export interface PaymentReceiptFile {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  uploadedAt?: string;
}

export interface PaymentSchedule {
  id: string;
  contractId: string;
  propertyId: string;
  payerName?: string;
  payerPhone?: string;
  title: string;
  paymentType: PaymentType;
  dueDate: string;
  amount: number | string;
  paidAmount: number | string;
  remainingAmount: number | string;
  status: PaymentStatus;
  cycleNumber?: number;
  totalCycles?: number;
  notes?: string;
  isArchived: boolean;
  createdBy?: string;
  createdByName?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  contractId: string;
  paymentScheduleId?: string;
  paymentDate: string;
  amount: number | string;
  paymentMethod: PaymentMethod;
  bank?: string;
  accountNo?: string;
  referenceNo?: string;
  notes?: string;
  receiptFile?: PaymentReceiptFile | null;
  isArchived: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractPaymentSummary {
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
  schedules: PaymentSchedule[];
  records: PaymentRecord[];
}

