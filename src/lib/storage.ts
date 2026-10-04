import {
  User,
  Property,
  Customer,
  Viewing,
  Contract,
  CheckInOut,
  MaintenanceIssue,
  WorkTask,
  ActivityLog,
  MonthlyKPI,
  AppNotification,
} from '../types';

export const STORAGE_KEY = 'PEAK_REAL_ESTATE_STORE_V1';

export interface AppDatabase {
  users: User[];
  currentUser: User | null;
  properties: Property[];
  customers: Customer[];
  viewings: Viewing[];
  contracts: Contract[];
  checkInOuts: CheckInOut[];
  maintenanceIssues: MaintenanceIssue[];
  workTasks: WorkTask[];
  tasks: WorkTask[];
  activityLogs: ActivityLog[];
  records: any[];
  monthlyKPI: MonthlyKPI;
  notifications: AppNotification[];
  language: 'th' | 'en';
}

// 4 Essential System Role Accounts for Authentication & RBAC
export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-1',
    name: 'Administrator',
    email: 'admin@peakrealestate.com',
    username: 'administrator',
    role: 'Administrator',
    phone: '081-899-7701',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
    branch: 'Headquarters (Phuket)',
    title: 'Managing Director & Lead Broker',
    monthlyTarget: 50000000,
    monthlyCommission: 1500000,
    targetDeals: 10,
    completedDeals: 0,
  },
  {
    id: 'user-mgr-1',
    name: 'Nichada Prasert (Manager)',
    email: 'nichada@peakrealestate.com',
    username: 'manager_nichada',
    role: 'Manager',
    phone: '089-445-1234',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&h=200&q=80',
    branch: 'Headquarters (Phuket)',
    title: 'Senior Operations & Sales Manager',
    monthlyTarget: 30000000,
    monthlyCommission: 750000,
    targetDeals: 8,
    completedDeals: 0,
  },
  {
    id: 'user-agt-1',
    name: 'Kittisak Vong (Senior Agent)',
    email: 'kittisak@peakrealestate.com',
    username: 'agent_kittisak',
    role: 'Agent',
    phone: '092-778-9901',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200&q=80',
    branch: 'Bang Tao Branch',
    title: 'Luxury Villa Specialist',
    monthlyTarget: 20000000,
    monthlyCommission: 600000,
    targetDeals: 5,
    completedDeals: 0,
  },
  {
    id: 'user-stf-1',
    name: 'Tanawat Boonmee (Property Care Staff)',
    email: 'tanawat@peakrealestate.com',
    username: 'staff_tanawat',
    role: 'Staff',
    phone: '084-332-1199',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200&q=80',
    branch: 'Headquarters (Phuket)',
    title: 'Property Coordinator & Inspection Officer',
    monthlyTarget: 0,
    monthlyCommission: 45000,
    targetDeals: 0,
    completedDeals: 0,
  },
];

// Production Clean State: Empty arrays for all business operational tables
export const INITIAL_PROPERTIES: Property[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_VIEWINGS: Viewing[] = [];
export const INITIAL_CONTRACTS: Contract[] = [];
export const INITIAL_CHECK_IN_OUTS: CheckInOut[] = [];
export const INITIAL_MAINTENANCE: MaintenanceIssue[] = [];
export const INITIAL_WORK_TASKS: WorkTask[] = [];
export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];

export const INITIAL_MONTHLY_KPI: MonthlyKPI = {
  viewings: 0,
  viewingsTarget: 20,
  ownerFollowUps: 0,
  ownerFollowUpsTarget: 40,
  newListings: 0,
  newListingsTarget: 10,
  targetSales: 100000000,
  currentSales: 0,
  kpiScore: 0,
};

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

// Helper to identify and discard legacy mock demo records
function isDemoItem(item: any): boolean {
  if (!item) return false;
  const id = String(item.id || item.propertyId || item.ticketNumber || item.contractNumber || item.contractId || '');
  if (
    id.startsWith('prop-') ||
    id.startsWith('VL-10') ||
    id.startsWith('CD-20') ||
    id.startsWith('TH-30') ||
    id.startsWith('LD-40') ||
    id.startsWith('CM-50') ||
    id.startsWith('cust-') ||
    id.startsWith('vw-') ||
    id.startsWith('ctr-') ||
    id.startsWith('chk-') ||
    id.startsWith('mnt-') ||
    id.startsWith('TK-20') ||
    id.startsWith('CT-20') ||
    id.startsWith('tsk-') ||
    id.startsWith('cl-fu-') ||
    id.startsWith('act-') ||
    id.includes('RENT-2026-0923') ||
    id.includes('MNT-2026-')
  ) {
    return true;
  }
  return false;
}

export function getInitialDatabase(): AppDatabase {
  if (typeof window === 'undefined') {
    return {
      users: INITIAL_USERS,
      currentUser: INITIAL_USERS[0],
      properties: INITIAL_PROPERTIES,
      customers: INITIAL_CUSTOMERS,
      viewings: INITIAL_VIEWINGS,
      contracts: INITIAL_CONTRACTS,
      checkInOuts: INITIAL_CHECK_IN_OUTS,
      maintenanceIssues: INITIAL_MAINTENANCE,
      workTasks: INITIAL_WORK_TASKS,
      tasks: INITIAL_WORK_TASKS,
      activityLogs: INITIAL_ACTIVITY_LOGS,
      records: INITIAL_ACTIVITY_LOGS,
      monthlyKPI: INITIAL_MONTHLY_KPI,
      notifications: INITIAL_NOTIFICATIONS,
      language: 'th',
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);

      // Clean out any legacy mock demo records
      const cleanProperties = (parsed.properties || []).filter((p: any) => !isDemoItem(p));
      const cleanCustomers = (parsed.customers || []).filter((c: any) => !isDemoItem(c));
      const cleanViewings = (parsed.viewings || []).filter((v: any) => !isDemoItem(v));
      const cleanContracts = (parsed.contracts || []).filter((c: any) => !isDemoItem(c));
      const cleanCheckIns = (parsed.checkInOuts || []).filter((c: any) => !isDemoItem(c));
      const cleanMaintenance = (parsed.maintenanceIssues || []).filter((m: any) => !isDemoItem(m));
      const cleanTasks = (parsed.tasks || parsed.workTasks || []).filter((t: any) => !isDemoItem(t));
      const cleanActivity = (parsed.activityLogs || parsed.records || []).filter((a: any) => !isDemoItem(a));

      return {
        users: parsed.users && parsed.users.length > 0 ? parsed.users : INITIAL_USERS,
        currentUser: parsed.currentUser || INITIAL_USERS[0],
        properties: cleanProperties,
        customers: cleanCustomers,
        viewings: cleanViewings,
        contracts: cleanContracts,
        checkInOuts: cleanCheckIns,
        maintenanceIssues: cleanMaintenance,
        workTasks: cleanTasks,
        tasks: cleanTasks,
        activityLogs: cleanActivity,
        records: cleanActivity,
        monthlyKPI: parsed.monthlyKPI || INITIAL_MONTHLY_KPI,
        notifications: (parsed.notifications || []).filter((n: any) => !isDemoItem(n)),
        language: parsed.language || 'th',
      };
    }
  } catch (err) {
    console.error('Failed to load from storage, using clean initial state:', err);
  }

  return {
    users: INITIAL_USERS,
    currentUser: INITIAL_USERS[0],
    properties: INITIAL_PROPERTIES,
    customers: INITIAL_CUSTOMERS,
    viewings: INITIAL_VIEWINGS,
    contracts: INITIAL_CONTRACTS,
    checkInOuts: INITIAL_CHECK_IN_OUTS,
    maintenanceIssues: INITIAL_MAINTENANCE,
    workTasks: INITIAL_WORK_TASKS,
    tasks: INITIAL_WORK_TASKS,
    activityLogs: INITIAL_ACTIVITY_LOGS,
    records: INITIAL_ACTIVITY_LOGS,
    monthlyKPI: INITIAL_MONTHLY_KPI,
    notifications: INITIAL_NOTIFICATIONS,
    language: 'th',
  };
}

export function saveDatabase(data: AppDatabase): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export function resetDatabase(): AppDatabase {
  const cleanState: AppDatabase = {
    users: INITIAL_USERS,
    currentUser: INITIAL_USERS[0],
    properties: [],
    customers: [],
    viewings: [],
    contracts: [],
    checkInOuts: [],
    maintenanceIssues: [],
    workTasks: [],
    tasks: [],
    activityLogs: [],
    records: [],
    monthlyKPI: INITIAL_MONTHLY_KPI,
    notifications: [],
    language: 'th',
  };
  saveDatabase(cleanState);
  return cleanState;
}

export const resetToSeedDatabase = resetDatabase;
