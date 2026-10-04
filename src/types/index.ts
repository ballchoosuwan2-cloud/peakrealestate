export type UserRole = 'Administrator' | 'Manager' | 'Agent' | 'Staff';

export type PropertyCategory =
  | 'House'
  | 'Condo'
  | 'Condominium'
  | 'Villa'
  | 'Land'
  | 'Commercial'
  | 'Hotel'
  | 'Warehouse'
  | 'Office';

export type PropertyStatus = 'Available' | 'Reserved' | 'Sold' | 'Rented' | 'Inactive' | 'Unavailable';

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

export type ViewingStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-show' | 'No Show';

export type ContractType =
  | 'Sale'
  | 'Rent'
  | 'Agency'
  | 'Listing'
  | 'Rental Agreement'
  | 'Sales & Purchase'
  | 'Exclusive Listing'
  | 'Open Listing'
  | 'Other';

export type ContractStatus = 'Draft' | 'Pending Approval' | 'Active' | 'Expiring Soon' | 'Renewed' | 'Terminated' | 'Expired';

export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type IssuePriority = MaintenancePriority;

export type MaintenanceStatus = 'New' | 'In Progress' | 'Waiting' | 'Waiting Parts' | 'Resolved' | 'Closed';
export type IssueStatus = MaintenanceStatus;

export type MaintenanceCategory =
  | 'Plumbing'
  | 'Electrical'
  | 'Air Conditioner'
  | 'Air Conditioning'
  | 'Structural'
  | 'Appliance'
  | 'Furniture'
  | 'General'
  | 'Other';

export type CheckInOutType = 'Check-in' | 'Check-out';

export interface DamageItem {
  id: string;
  item: string;
  area: string;
  description: string;
  estimatedCost: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  phone: string;
  avatar: string;
  branch: string;
  title: string;
  monthlyTarget: number;
  monthlyCommission: number;
  targetDeals: number;
  completedDeals: number;
}

export interface PropertyImage {
  id: string;
  url: string;
  isCover: boolean;
  hasWatermark: boolean;
  title?: string;
}

export interface Property {
  id: string;
  propertyId: string;
  title: string;
  titleTh?: string;
  address: string;
  district: string;
  city: string;
  category: PropertyCategory;
  status: PropertyStatus;
  isPublished: boolean;
  price: number; // Sale price in THB
  rentPrice?: number; // Monthly rent in THB
  bedrooms: number;
  bathrooms: number;
  usableArea: number; // sq.m
  landArea?: number; // sq.wah or sq.m
  floor?: number;
  yearBuilt?: number;
  furniture: 'Fully Furnished' | 'Partially Furnished' | 'Unfurnished';
  petFriendly: boolean;
  hasPool: boolean;
  ownerId?: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  agentId: string;
  agentName: string;
  description: string;
  descriptionTh?: string;
  googleMapUrl?: string;
  amenities: string[];
  images: PropertyImage[];
  featured?: boolean;
  createdAt: string;
  updatedAt: string;

  // Extended fields for Comprehensive Property Operations
  zone?: string; // 'Zone 1' | 'Zone 2' | 'Zone 3' | 'Zone 4' | 'Zone 5'
  area?: string; // e.g. 'Zone 2 / Rawai'
  nation?: string; // default 'Thailand'
  postalCode?: string;
  agencyType?: string; // 'Representative' | 'Exclusive' | 'Co-broke' | 'Direct'
  agencyFrom?: string;
  agencyTo?: string;
  propertyLabel?: 'Rent' | 'Sale' | 'Rent and Sale';
  rentedOutBy?: string;
  rentFrom?: string;
  rentTo?: string;
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
  furnitureType?: 'Include' | 'Exclude' | 'Partly Furnished';
  petType?: 'Pets Allowed' | 'Pets Not Allowed' | 'Ask Owner';
  petRemark?: string;
  propertyType?: string; // e.g. '3B', '2B', 'Villa', 'Studio'
  hasHousePool?: 'No Pool' | 'Private Pool' | 'Shared Pool';
  poolType?: 'Chlorine Pool' | 'Saltwater Pool' | 'Other Pool' | 'No Pool';
  views?: string[];
  checkList?: string[];
  serviceInclude?: string[];
  addressThDetail?: { road?: string; soi?: string; moo?: string };
  addressEnDetail?: { road?: string; soi?: string; moo?: string };
  locationInfoTh?: string;
  locationInfoEn?: string;
  comments?: string;
  dailyRent?: number;
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
  videos?: { id: string; url: string; title?: string }[];
  latitude?: number;
  longitude?: number;
  updateLogs?: {
    id: string;
    date: string;
    time: string;
    user: string;
    action: string;
    prevValue?: string;
    newValue?: string;
  }[];
  publishStatus?: 'Draft' | 'Unpublished' | 'Published';

  // Landlord Follow-up & Status Operations (Sections 35-81)
  approvalStatus?: 'Pass' | 'Pending' | 'Rejected';
  isBlackList?: boolean;
  isFavorite?: boolean;
  virtualPhone1?: string;
  virtualPhone2?: string;
  landlordPhone3?: string;
  lastFollowUpDate?: string; // YYYY-MM-DD
  lastFollowUpStatus?: string;
  lastFollowUpContent?: string;
  followUpRecords?: FollowUpRecord[];
  landlordPhoneRecords?: LandlordPhoneRecord[];
}

export interface FollowUpRecord {
  id: string;
  propertyId: string;
  landlordId?: string;
  landlordName?: string;
  userId: string;
  userName: string;
  updateTime: string; // YYYY-MM-DD HH:mm:ss
  content: string[]; // multi-select chips
  customContent?: string;
  latestPrice?: number;
  nextFollowUp?: string; // date or string e.g. '23 Sep 2026'
  blackList?: boolean;
  virtualPhone1?: string;
  virtualPhone2?: string;
  landlordPhone3?: string;
  channel?: string; // e.g. '[GoView] Spoke · Call'
  createdAt: string;
  updatedAt: string;
}

export interface LandlordPhoneRecord {
  id: string;
  landlordId?: string;
  landlordName: string;
  propertyId: string;
  virtualPhone1: string;
  virtualPhone2: string;
  phone3?: string;
  dateAdded: string;
  addedBy: string;
  changeNote?: string;
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

export interface CustomerTimelineEvent {
  id: string;
  date: string;
  type: 'Call' | 'Message' | 'Viewing' | 'Offer' | 'Note' | 'Status Change';
  note: string;
  operator: string;
}

export interface Viewing {
  id: string;
  viewingCode: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  propertyId: string;
  propertyCustomId: string;
  propertyTitle: string;
  agentId: string;
  agentName: string;
  dateTime: string;
  location: string;
  status: ViewingStatus;
  feedback?: string;
  interestScore?: number; // 1 to 5
  clientInterest?: 'Hot' | 'Warm' | 'Cold' | string | number;
  notes?: string;
  createdAt: string;
}

export interface Contract {
  id: string;
  contractNo: string;
  contractNumber?: string;
  contractType: ContractType;
  type?: ContractType;
  customerId: string;
  customerName: string;
  ownerName: string;
  partyAName?: string;
  partyARole?: string;
  partyBName?: string;
  partyBRole?: string;
  propertyId: string;
  propertyCustomId: string;
  propertyTitle: string;
  agentId: string;
  agentName: string;
  startDate: string;
  endDate: string;
  salePrice?: number;
  rentPrice?: number;
  monthlyRent?: number;
  totalValue?: number;
  commission: number;
  commissionAmount?: number;
  commissionRate?: number;
  deposit: number;
  depositAmount?: number;
  documents?: any[];
  status: ContractStatus;
  documentUrl?: string;
  fileName?: string;
  notes?: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  item: string;
  passed: boolean;
  note?: string;
}

export interface CheckInOut {
  id: string;
  code: string;
  recordNumber?: string;
  type: CheckInOutType;
  propertyId: string;
  propertyCustomId: string;
  propertyTitle: string;
  customerId: string;
  customerName: string;
  tenantName?: string;
  tenantPhone?: string;
  agentId: string;
  agentName: string;
  date: string;
  electricityMeter: number;
  waterMeter: number;
  electricityMeterImage?: string;
  waterMeterImage?: string;
  keySetsDelivered?: number;
  accessCardDelivered?: number;
  damages?: DamageItem[];
  depositTotal?: number;
  depositDeductions?: number;
  depositRefunded?: number;
  depositStatus?: string;
  depositAmount: number;
  depositReturnStatus: 'Pending' | 'Returned' | 'Deducted';
  depositReturnedAmount?: number;
  damageNotes?: string;
  checklist: ChecklistItem[];
  photos: string[];
  status: 'Completed' | 'Draft';
  inspectorName?: string;
  recipientName?: string;
  notes?: string;
  createdAt: string;
}

export interface MaintenanceIssue {
  id: string;
  issueCode: string;
  ticketNumber?: string;
  propertyId: string;
  propertyCustomId: string;
  propertyTitle: string;
  roomNo?: string;
  reportedBy: string;
  reporterPhone: string;
  category: MaintenanceCategory;
  title: string;
  description: string;
  priority: MaintenancePriority;
  assignedToId: string;
  assignedToName: string;
  assignedVendor?: string;
  vendorPhone?: string;
  estimatedCost?: number;
  actualCost?: number;
  paidBy?: 'Owner' | 'Tenant' | 'Agency';
  status: MaintenanceStatus;
  cost: number;
  photos: string[];
  images?: string[];
  resolutionHistory: {
    date: string;
    note: string;
    author: string;
    status: MaintenanceStatus;
  }[];
  createdAt: string;
  resolvedAt?: string;
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
  category: 'Viewing' | 'Follow-up' | 'Document' | 'Maintenance' | 'Contract Expiry' | 'General' | 'Inspection' | 'Contract';
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | 'Normal';
  status: 'Pending' | 'Completed';
  relatedId?: string;
  relatedType?: string;
  assignedToId?: string;
  assignedToName: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  operatorName: string;
  operatorRole: UserRole;
  action: 'Create' | 'Update' | 'Delete' | 'Status Change' | 'Viewing' | 'Check-in' | 'Check-out' | 'Upload' | 'Login';
  targetType: 'Property' | 'Customer' | 'Viewing' | 'Contract' | 'Maintenance' | 'CheckInOut' | 'Auth';
  targetId: string;
  details: string;
}

export interface ActivityRecord {
  id: string;
  timestamp: string;
  userId?: string;
  userName: string;
  userRole: UserRole;
  module: string;
  action: string;
  targetId?: string;
  description: string;
}

export interface DatabaseSchema {
  users: User[];
  currentUser: User | null;
  properties: Property[];
  customers: Customer[];
  viewings: Viewing[];
  contracts: Contract[];
  checkInOuts: CheckInOut[];
  maintenanceIssues: MaintenanceIssue[];
  tasks: WorkTask[];
  records: ActivityRecord[];
  monthlyKPI: MonthlyKPI;
  notifications: AppNotification[];
  language: 'th' | 'en';
}

export interface MonthlyKPI {
  viewings: number;
  viewingsTarget: number;
  ownerFollowUps: number;
  ownerFollowUpsTarget: number;
  newListings: number;
  newListingsTarget: number;
  targetSales: number;
  currentSales: number;
  kpiScore: number; // 0-100
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'viewing' | 'contract' | 'maintenance' | 'lead' | 'system';
  isRead: boolean;
  createdAt: string;
  linkToTab?: string;
}

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
