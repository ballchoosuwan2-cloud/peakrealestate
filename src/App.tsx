import React, { useState, useEffect, useCallback } from 'react';
import {
  DatabaseSchema,
  Property,
  Customer,
  Viewing,
  Contract,
  CheckInOut,
  MaintenanceIssue,
  WorkTask,
  User,
  ActivityRecord,
  UserRole,
} from './types';
import { getInitialDatabase, saveDatabase, resetToSeedDatabase, STORAGE_KEY } from './lib/storage';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Language, translations } from './lib/i18n';

// Layout Components
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { FloatingActionButton } from './components/FloatingActionButton';

// Views
import { DashboardView } from './components/DashboardView';
import { PropertyDataCenter } from './components/PropertyDataCenter';
import { PropertyManagement } from './components/PropertyManagement';
import { CustomersView } from './components/CustomersView';
import { ViewingView } from './components/ViewingView';
import { ContractsView } from './components/ContractsView';
import { CheckInOutView } from './components/CheckInOutView';
import { MaintenanceView } from './components/MaintenanceView';
import { MaintenanceManagementView } from './components/MaintenanceManagementView';
import { WorkView } from './components/WorkView';
import { ReportsView } from './components/ReportsView';
import { RecordsView } from './components/RecordsView';
import { UsersManagementView } from './components/UsersManagementView';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PaymentManagementView } from './components/PaymentManagementView';
import { AddAllView } from './components/AddAllView';
import { LoginView } from './components/LoginView';

export default function App() {
  // Database state initialized from LocalStorage
  const [db, setDb] = useState<DatabaseSchema>(() => getInitialDatabase());
  const [language, setLanguage] = useState<Language>('th');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [tabFilter, setTabFilter] = useState<string | undefined>(undefined);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Authentication State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token') || null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Current logged in user (default to Administrator)
  const [currentUserId, setCurrentUserId] = useState<string>(
    () => db.users[0]?.id || 'user-admin-1'
  );

  const currentUser: User =
    db.users.find((u) => u.id === currentUserId) || db.currentUser || db.users[0] || {
      id: 'user-admin-1',
      name: 'Administrator',
      email: 'admin@peakrealestate.com',
      username: 'administrator',
      role: 'Administrator',
      branch: 'Headquarters (Phuket)',
      phone: '081-899-7701',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
      title: 'Managing Director & Lead Broker',
    };

  // Verify active session on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token');
      if (!token) {
        setIsAuthenticated(false);
        setIsAuthChecking(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setIsAuthenticated(true);
            setAuthToken(token);
            setCurrentUserId(data.user.id);
            setDb((prev) => ({
              ...prev,
              currentUser: {
                id: data.user.id,
                name: data.user.name,
                email: data.user.email,
                username: data.user.username,
                role: data.user.role === 'Admin' ? 'Administrator' : data.user.role,
                branch: data.user.branch || 'Headquarters (Phuket)',
                phone: data.user.phone || '',
                avatar: data.user.avatar || '',
                title: data.user.title || data.user.role,
                monthlyTarget: Number(data.user.monthlyTarget) || 20000000,
                monthlyCommission: Number(data.user.monthlyCommission) || 500000,
                targetDeals: data.user.targetDeals || 5,
                completedDeals: data.user.completedDeals || 0,
                status: data.user.status || 'Active',
                isActive: data.user.isActive !== false,
                permissions: data.user.permissions || ['View', 'Create', 'Edit'],
              },
            }));
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsAuthChecking(false);
      }
    };
    verifyAuth();
  }, []);

  const handleLoginSuccess = (user: any, token: string) => {
    setIsAuthenticated(true);
    setAuthToken(token);
    setCurrentUserId(user.id);
    const mappedUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role === 'Admin' ? 'Administrator' : user.role,
      branch: user.branch || 'Headquarters (Phuket)',
      phone: user.phone || '',
      avatar: user.avatar || '',
      title: user.title || user.role,
      monthlyTarget: Number(user.monthlyTarget) || 20000000,
      monthlyCommission: Number(user.monthlyCommission) || 500000,
      targetDeals: user.targetDeals || 5,
      completedDeals: user.completedDeals || 0,
      status: user.status || 'Active',
      isActive: user.isActive !== false,
      permissions: user.permissions || ['View', 'Create', 'Edit'],
    };
    setDb((prev) => ({
      ...prev,
      currentUser: mappedUser,
    }));
  };

  const handleLogout = async () => {
    const token = authToken || localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {}
    }
    localStorage.removeItem('peak_auth_token');
    sessionStorage.removeItem('peak_auth_token');
    setAuthToken(null);
    setIsAuthenticated(false);
  };

  // Sync to LocalStorage whenever db updates
  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  // Fetch real users from PostgreSQL backend on mount
  const refreshUsersFromBackend = useCallback(async () => {
    try {
      const res = await fetch('/api/users?pageSize=100');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mappedUsers: User[] = json.data.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            username: u.username || (u.email ? u.email.split('@')[0] : 'user'),
            role: u.role,
            branch: u.branch || 'Phuket Head Office',
            department: u.department || 'Sales',
            phone: u.phone || '',
            avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            title: u.title || (u.role === 'Agent' ? 'Real Estate Agent' : `${u.role} Officer`),
            monthlyTarget: Number(u.monthlyTarget) || 20000000,
            monthlyCommission: Number(u.monthlyCommission) || 500000,
            targetDeals: u.targetDeals || 5,
            completedDeals: u.completedDeals || 0,
            status: u.status || (u.isActive !== false ? 'Active' : 'Inactive'),
            isActive: u.isActive !== undefined ? u.isActive : u.status !== 'Inactive',
            permissions: u.permissions || (u.role === 'Agent' ? ['View', 'Create', 'Edit'] : ['View', 'Create', 'Edit', 'Archive', 'Restore']),
            lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
          }));
          setDb((prev) => ({
            ...prev,
            users: mappedUsers,
          }));
        }
      }
    } catch (e) {
      console.warn('Could not sync users from backend, fallback to local', e);
    }
  }, []);

  const refreshContractsFromBackend = useCallback(async () => {
    try {
      const res = await fetch('/api/contracts?isArchived=all');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mappedContracts: Contract[] = json.data.map((c: any) => ({
            id: c.id,
            contractId: c.contractId,
            contractNo: c.contractId,
            contractNumber: c.contractId,
            contractType: c.contractType,
            type: c.contractType,
            status: c.status,
            signDate: c.signDate,
            rentalStart: c.rentalStart,
            rentalEnd: c.rentalEnd,
            rentalTime: c.rentalTime,
            withPet: c.withPet,
            propertyId: c.propertyId,
            propertyCustomId: c.propertyId,
            propertyTitle: c.projectEn || c.projectTh || c.propertyId,
            agent: c.agent,
            agentPhone: c.agentPhone,
            houseNo: c.houseNo,
            projectEn: c.projectEn,
            projectTh: c.projectTh,
            nation: c.nation,
            province: c.province,
            district: c.district,
            subDistrict: c.subDistrict,
            roadEn: c.roadEn,
            roadTh: c.roadTh,
            soiEn: c.soiEn,
            soiTh: c.soiTh,
            mooEn: c.mooEn,
            mooTh: c.mooTh,
            postalCode: c.postalCode,
            houseRegistrationFile: c.houseRegistrationFile,
            ownerName: c.ownerName,
            partyAName: c.ownerName,
            landlordCertificateType: c.landlordCertificateType,
            landlordIdNo: c.landlordIdNo,
            landlordNationality: c.landlordNationality,
            landlordBank: c.landlordBank,
            landlordAccountName: c.landlordAccountName,
            landlordAccountNo: c.landlordAccountNo,
            landlordAddressHouseNo: c.landlordAddressHouseNo,
            landlordAddressProject: c.landlordAddressProject,
            landlordAddressNation: c.landlordAddressNation,
            landlordAddressProvince: c.landlordAddressProvince,
            landlordAddressDistrict: c.landlordAddressDistrict,
            landlordAddressSubDistrict: c.landlordAddressSubDistrict,
            landlordAddressRoad: c.landlordAddressRoad,
            landlordAddressSoi: c.landlordAddressSoi,
            landlordAddressMoo: c.landlordAddressMoo,
            landlordAddressPostalCode: c.landlordAddressPostalCode,
            ownerThaiIdFile: c.ownerThaiIdFile,
            tenantId: c.tenantId,
            tenantName: c.tenantName,
            partyBName: c.tenantName,
            tenantPhone: c.tenantPhone,
            tenantNationality: c.tenantNationality,
            tenantCertificateType: c.tenantCertificateType,
            tenantIdNo: c.tenantIdNo,
            tenantPassportFile: c.tenantPassportFile,
            moreTenants: c.moreTenants,
            monthlyRent: Number(c.monthlyRent) || 0,
            price: Number(c.monthlyRent) || 0,
            paymentTerm: c.paymentTerm,
            monthlyRentBahtEn: c.monthlyRentBahtEn,
            monthlyRentBahtTh: c.monthlyRentBahtTh,
            paymentDate: c.paymentDate,
            penaltyAmount: c.penaltyAmount,
            priceComments: c.priceComments,
            totalPrice: Number(c.totalPrice) || 0,
            totalPriceBahtEn: c.totalPriceBahtEn,
            totalPriceBahtTh: c.totalPriceBahtTh,
            deposit: Number(c.deposit) || 0,
            depositAmount: Number(c.deposit) || 0,
            depositBahtEn: c.depositBahtEn,
            depositBahtTh: c.depositBahtTh,
            advanceRental: Number(c.advanceRental) || 0,
            advanceRentalBahtEn: c.advanceRentalBahtEn,
            advanceRentalBahtTh: c.advanceRentalBahtTh,
            commissionFromOwner: Number(c.commissionFromOwner) || 0,
            commissionBahtEn: c.commissionBahtEn,
            commissionBahtTh: c.commissionBahtTh,
            salesId: c.salesId,
            salesName: c.salesName,
            salesPhone: c.salesPhone,
            salesCommission: c.salesCommission,
            comments: c.comments,
            notes: c.comments,
            attachments: c.attachments,
            generatedWordFiles: c.generatedWordFiles,
            currentWordFileUrl: c.currentWordFileUrl,
            isArchived: c.isArchived,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          }));

          setDb((prev) => ({
            ...prev,
            contracts: mappedContracts,
          }));
        }
      }
    } catch (err) {
      console.warn('Could not sync contracts from backend, fallback to local', err);
    }
  }, []);

  const refreshViewingsFromBackend = useCallback(async () => {
    try {
      const res = await fetch('/api/viewings?isArchived=false');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: Viewing[] = json.data.map((v: any) => ({
            id: v.id,
            viewingCode: v.viewingCode,
            customerId: v.customerId,
            customerName: v.customerName,
            customerPhone: v.customerPhone || '',
            propertyId: v.propertyId,
            propertyCustomId: v.propertyCustomId || '',
            propertyTitle: v.propertyTitle || '',
            agentId: v.agentId,
            agentName: v.agentName,
            dateTime: v.dateTime,
            location: v.location || '',
            status: v.status,
            feedback: v.feedback || '',
            interestScore: v.interestScore || 4,
            clientInterest: v.clientInterest || 'Warm',
            notes: v.notes || '',
            createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : new Date().toISOString(),
          }));
          setDb((prev) => ({
            ...prev,
            viewings: mapped,
          }));
        }
      }
    } catch (err) {
      console.warn('Could not sync viewings from backend, fallback to local', err);
    }
  }, []);

  const refreshClientsFromBackend = useCallback(async () => {
    try {
      const res = await fetch('/api/clients?isArchived=false');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: Customer[] = json.data.map((c: any) => ({
            id: c.id,
            customerCode: c.clientCode || c.customerCode,
            clientCode: c.clientCode,
            name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Client',
            firstName: c.firstName,
            lastName: c.lastName,
            companyName: c.companyName,
            phone: c.phone || '',
            email: c.email || '',
            nationality: c.nationality,
            idNumber: c.idNumber,
            type: c.clientType || c.type || 'Buyer',
            clientType: c.clientType || c.type || 'Buyer',
            intent: c.intent || 'Buy',
            leadStatus: c.status || 'New',
            status: c.status || 'New',
            propertyType: c.propertyType,
            budgetMin: Number(c.budgetMin) || 0,
            budgetMax: Number(c.budgetMax) || 0,
            preferredLocation: c.preferredLocation || '',
            assignedAgentId: c.assignedAgentId,
            assignedAgentName: c.assignedAgentName,
            notes: c.notes || '',
            timeline: c.timeline || [],
            nextFollowUpDate: c.nextFollowUpDate || undefined,
            createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
          }));
          setDb((prev) => ({
            ...prev,
            customers: mapped,
          }));
        }
      }
    } catch (err) {
      console.warn('Could not sync clients from backend, fallback to local', err);
    }
  }, []);

  useEffect(() => {
    refreshUsersFromBackend();
    refreshContractsFromBackend();
    refreshViewingsFromBackend();
    refreshClientsFromBackend();
  }, [refreshUsersFromBackend, refreshContractsFromBackend, refreshViewingsFromBackend, refreshClientsFromBackend]);

  // Activity Log Helper
  const logActivity = (
    module: ActivityRecord['module'],
    action: string,
    description: string,
    targetId?: string
  ) => {
    const newRecord: ActivityRecord = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      module,
      action,
      targetId,
      description,
    };

    setDb((prev) => ({
      ...prev,
      records: [newRecord, ...prev.records],
    }));
  };

  // Switch User Handler
  const handleSwitchUser = (user: User) => {
    setCurrentUserId(user.id);
    logActivity('Users', 'SWITCH_USER', `Switched active session to ${user.name} (${user.role})`);
  };

  const handleRoleChange = (role: UserRole) => {
    // Find first user with that role or update currentUser's role
    const matchedUser = db.users.find((u) => u.role === role);
    if (matchedUser) {
      setCurrentUserId(matchedUser.id);
      logActivity('Users', 'ROLE_SWITCH', `Switched user to ${matchedUser.name} (${role})`);
    } else {
      setDb((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === currentUser.id ? { ...u, role } : u
        ),
      }));
    }
  };

  // Navigation Helper
  const handleNavigate = (tab: string, filter?: string) => {
    setCurrentTab(tab);
    setTabFilter(filter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // RESET DATABASE
  const handleResetDatabase = () => {
    const freshDb = resetToSeedDatabase();
    setDb(freshDb);
    setCurrentUserId(freshDb.users[0]?.id || 'usr-1');
    setCurrentTab('dashboard');
  };

  // RESTORE DATABASE
  const handleRestoreDatabase = (restoredDb: any) => {
    setDb(restoredDb);
    saveDatabase(restoredDb);
    if (restoredDb.users && restoredDb.users.length > 0) {
      setCurrentUserId(restoredDb.currentUser?.id || restoredDb.users[0].id);
    }
  };

  // --- CRUD Handlers ---

  // 1. Properties
  const handleSaveProperty = (prop: Property) => {
    setDb((prev) => {
      const exists = prev.properties.some((p) => p.id === prop.id);
      const updated = exists
        ? prev.properties.map((p) => (p.id === prop.id ? prop : p))
        : [prop, ...prev.properties];

      // Immediately synchronize to LocalStorage to prevent data loss on refresh/navigation
      try {
        localStorage.setItem('peak_real_estate_properties', JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, properties: updated }));
      } catch (err) {
        console.error('Synchronous property save error:', err);
      }

      return { ...prev, properties: updated };
    });
    logActivity(
      'Properties',
      'SAVE_PROPERTY',
      `Saved property ${prop.title} [${prop.propertyId}]`,
      prop.id
    );
  };

  const handleDeleteProperty = (id: string) => {
    // Soft Delete / Archive: Never hard delete data
    const prop = db.properties.find((p) => p.id === id);
    setDb((prev) => {
      const updated = prev.properties.map((p) => (p.id === id ? { ...p, isArchived: true } : p));
      try {
        localStorage.setItem('peak_real_estate_properties', JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, properties: updated }));
      } catch (err) {
        console.error('Synchronous property archive error:', err);
      }
      return {
        ...prev,
        properties: updated,
      };
    });
    logActivity(
      'Properties',
      'ARCHIVE_PROPERTY',
      `Archived property ${prop?.title || id}`,
      id
    );
  };

  const handleRestoreProperty = (id: string) => {
    const prop = db.properties.find((p) => p.id === id);
    setDb((prev) => {
      const updated = prev.properties.map((p) => (p.id === id ? { ...p, isArchived: false } : p));
      try {
        localStorage.setItem('peak_real_estate_properties', JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, properties: updated }));
      } catch (err) {
        console.error('Synchronous property restore error:', err);
      }
      return {
        ...prev,
        properties: updated,
      };
    });
    logActivity(
      'Properties',
      'RESTORE_PROPERTY',
      `Restored property ${prop?.title || id}`,
      id
    );
  };

  // 2. Customers
  const handleSaveCustomer = async (cust: Customer) => {
    setDb((prev) => {
      const exists = prev.customers.some((c) => c.id === cust.id);
      const updated = exists
        ? prev.customers.map((c) => (c.id === cust.id ? cust : c))
        : [cust, ...prev.customers];
      return { ...prev, customers: updated };
    });
    logActivity('Customers', 'SAVE_CUSTOMER', `Saved customer ${cust.name}`, cust.id);
    await refreshClientsFromBackend();
  };

  const handleDeleteCustomer = async (id: string) => {
    const cust = db.customers.find((c) => c.id === id);
    setDb((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
    }));
    logActivity('Customers', 'DELETE_CUSTOMER', `Archived customer ${cust?.name || id}`, id);
    await refreshClientsFromBackend();
  };

  // 3. Viewings
  const handleSaveViewing = async (vw: Viewing) => {
    // Optimistic local update
    const isEdit = db.viewings.some((v) => v.id === vw.id);
    setDb((prev) => {
      const exists = prev.viewings.some((v) => v.id === vw.id);
      const updated = exists
        ? prev.viewings.map((v) => (v.id === vw.id ? vw : v))
        : [vw, ...prev.viewings];
      return { ...prev, viewings: updated };
    });

    logActivity(
      'Viewings',
      isEdit ? 'UPDATE_VIEWING' : 'CREATE_VIEWING',
      `Saved viewing with ${vw.customerName} for ${vw.propertyTitle}`,
      vw.id
    );

    try {
      const endpoint = isEdit ? `/api/viewings/${vw.id}` : '/api/viewings';
      const method = isEdit ? 'PUT' : 'POST';
      await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-name': currentUser.name,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify(vw),
      });
    } catch (e) {
      console.warn('Viewing backend sync error:', e);
    }
  };

  const handleDeleteViewing = async (id: string) => {
    setDb((prev) => ({
      ...prev,
      viewings: prev.viewings.filter((v) => v.id !== id),
    }));
    logActivity('Viewings', 'DELETE_VIEWING', `Deleted viewing appointment`, id);

    try {
      await fetch(`/api/viewings/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-user-name': currentUser.name,
          'x-user-id': currentUser.id,
        },
      });
    } catch (e) {
      console.warn('Viewing backend delete error:', e);
    }
  };

  // 4. Contracts
  const handleSaveContract = async (cnt: Contract) => {
    setDb((prev) => {
      const exists = prev.contracts.some((c) => c.id === cnt.id);
      const updated = exists
        ? prev.contracts.map((c) => (c.id === cnt.id ? cnt : c))
        : [cnt, ...prev.contracts];
      return { ...prev, contracts: updated };
    });
    logActivity(
      'Contracts',
      'SAVE_CONTRACT',
      `Saved contract #${cnt.contractId || cnt.contractNumber || cnt.contractNo} (${cnt.propertyTitle || cnt.projectEn || cnt.propertyId})`,
      cnt.id
    );
    await refreshContractsFromBackend();
  };

  const handleDeleteContract = async (id: string) => {
    const c = db.contracts.find((x) => x.id === id);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(`Error archiving contract: ${errJson.error || res.statusText}`);
        return;
      }
    } catch (err: any) {
      console.error('Delete contract error:', err);
    }

    setDb((prev) => ({
      ...prev,
      contracts: prev.contracts.filter((x) => x.id !== id),
    }));
    logActivity('Contracts', 'DELETE_CONTRACT', `Archived contract #${c?.contractId || c?.contractNumber || id}`, id);
    await refreshContractsFromBackend();
  };

  // 5. Check-in / Check-out
  const handleSaveCheckInOut = (rec: CheckInOut) => {
    setDb((prev) => {
      const exists = prev.checkInOuts.some((c) => c.id === rec.id);
      const updated = exists
        ? prev.checkInOuts.map((c) => (c.id === rec.id ? rec : c))
        : [rec, ...prev.checkInOuts];
      return { ...prev, checkInOuts: updated };
    });
    logActivity(
      'CheckInOut',
      'SAVE_HANDOVER',
      `${rec.type} inspection record #${rec.recordNumber} saved for ${rec.propertyTitle}`,
      rec.id
    );
  };

  const handleDeleteCheckInOut = (id: string) => {
    setDb((prev) => ({
      ...prev,
      checkInOuts: prev.checkInOuts.filter((c) => c.id !== id),
    }));
    logActivity('CheckInOut', 'DELETE_HANDOVER', `Deleted inspection record`, id);
  };

  // 6. Maintenance
  const handleSaveMaintenance = (iss: MaintenanceIssue) => {
    setDb((prev) => {
      const exists = prev.maintenanceIssues.some((i) => i.id === iss.id);
      const updated = exists
        ? prev.maintenanceIssues.map((i) => (i.id === iss.id ? iss : i))
        : [iss, ...prev.maintenanceIssues];
      return { ...prev, maintenanceIssues: updated };
    });
    logActivity(
      'Maintenance',
      'SAVE_MAINTENANCE',
      `Maintenance ticket #${iss.ticketNumber}: ${iss.title} (${iss.status})`,
      iss.id
    );
  };

  const handleDeleteMaintenance = (id: string) => {
    setDb((prev) => ({
      ...prev,
      maintenanceIssues: prev.maintenanceIssues.filter((i) => i.id !== id),
    }));
    logActivity('Maintenance', 'DELETE_MAINTENANCE', `Deleted maintenance ticket`, id);
  };

  // 7. Work Tasks
  const handleToggleTask = (id: string) => {
    setDb((prev) => {
      const currentTasks = prev.tasks || prev.workTasks || [];
      const updated = currentTasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: (t.status === 'Completed' ? 'Pending' : 'Completed') as 'Pending' | 'Completed',
              completedAt: t.status !== 'Completed' ? new Date().toISOString() : undefined,
            }
          : t
      );
      return {
        ...prev,
        tasks: updated,
        workTasks: updated,
      };
    });
  };

  const handleAddTask = (task: WorkTask) => {
    setDb((prev) => {
      const currentTasks = prev.tasks || prev.workTasks || [];
      const updated = [task, ...currentTasks];
      return {
        ...prev,
        tasks: updated,
        workTasks: updated,
      };
    });
    logActivity('Work', 'ADD_TASK', `Added work task: ${task.title}`, task.id);
  };

  // 8. Users
  const handleSaveUser = async (u: User) => {
    // Optimistic local update
    setDb((prev) => {
      const exists = prev.users.some((x) => x.id === u.id);
      const updated = exists
        ? prev.users.map((x) => (x.id === u.id ? { ...x, ...u } : x))
        : [{ ...u }, ...prev.users];
      return {
        ...prev,
        users: updated,
        currentUser: prev.currentUser?.id === u.id ? { ...prev.currentUser, ...u } : prev.currentUser,
      };
    });

    try {
      const exists = db.users.some((x) => x.id === u.id);
      const endpoint = exists ? `/api/users/${u.id}` : '/api/users';
      const method = exists ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
        body: JSON.stringify({
          ...u,
          currentUser,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn(`User backend sync warning: ${errJson.error || res.statusText}`);
      }

      await refreshUsersFromBackend();
      logActivity('Users', 'SAVE_USER', `Saved user ${u.name} (${u.role}) on PostgreSQL`, u.id);
    } catch (err: any) {
      console.error('Failed to save user to backend:', err);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
        body: JSON.stringify({ currentUser }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(`Error deactivating user: ${errJson.error || res.statusText}`);
        return;
      }

      await refreshUsersFromBackend();
      logActivity('Users', 'DELETE_USER', `Deactivated user ID ${id} (Soft delete)`, id);
    } catch (err: any) {
      console.error('Failed to deactivate user on backend:', err);
      setDb((prev) => ({
        ...prev,
        users: prev.users.map((x) => (x.id === id ? { ...x, isActive: false, status: 'Inactive' } : x)),
      }));
    }
  };

  const handleToggleUserStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
        body: JSON.stringify({ currentUser }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(`Error toggling user status: ${errJson.error || res.statusText}`);
        return;
      }

      await refreshUsersFromBackend();
      logActivity('Users', 'TOGGLE_STATUS', `Toggled user status for ID ${id}`, id);
    } catch (err: any) {
      console.error('Failed to toggle user status on backend:', err);
    }
  };

  const expiringContractsCount = (db.contracts || []).filter((c) => c.status === 'Expiring Soon').length;
  const urgentIssuesCount = (db.maintenanceIssues || []).filter((i) => i.priority === 'Urgent').length;
  const pendingTasksCount = (db.tasks || db.workTasks || []).filter((t) => t.status !== 'Completed').length;
  const totalNotifications = expiringContractsCount + urgentIssuesCount;

  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full bg-[#07090D] flex flex-col items-center justify-center text-white font-sans">
        <div className="w-12 h-12 border-3 border-red-600/30 border-t-red-600 rounded-full animate-spin mb-4" />
        <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
          Verifying PEAK Credentials...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginView
        language={language}
        onLanguageToggle={() => setLanguage((l) => (l === 'th' ? 'en' : 'th'))}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1D23] flex flex-col antialiased">
      {/* Top Navigation Bar */}
      <Header
        currentUser={currentUser}
        users={db.users}
        language={language}
        onLanguageToggle={() => setLanguage(language === 'th' ? 'en' : 'th')}
        onRoleChange={handleRoleChange}
        notificationCount={totalNotifications}
        onOpenNotifications={() => handleNavigate('work')}
        onOpenProfile={() => handleNavigate('my')}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />

      {/* Main Container with Sidebar and Content */}
      <div className="flex-1 flex w-full min-w-0">
        {/* Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          language={language}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          badgeCounts={{
            work: pendingTasksCount,
            contracts: expiringContractsCount,
            maintenance: urgentIssuesCount,
          }}
        />

        {/* Dynamic Content Area */}
        <main className="flex-1 min-w-0 w-full p-3.5 sm:p-6 lg:p-8 transition-all duration-300 pb-28 md:pb-12">
          {/* 1. Dashboard */}
          {currentTab === 'dashboard' && (
            <DashboardView
              properties={db.properties}
              contracts={db.contracts}
              viewings={db.viewings}
              checkInOuts={db.checkInOuts}
              maintenanceIssues={db.maintenanceIssues}
              tasks={db.tasks || db.workTasks || []}
              workTasks={db.workTasks || db.tasks || []}
              kpi={db.monthlyKPI}
              currentUser={currentUser}
              language={language}
              onNavigate={handleNavigate}
              onToggleTask={handleToggleTask}
            />
          )}

          {/* 1. Add All — Import / Excel / Multi-File Merge / Bulk Media */}
          {(currentTab === 'add-all' || currentTab === 'addall' || currentTab === 'import') && (
            <AddAllView
              currentUser={currentUser}
              properties={db.properties}
              language={language}
              onNavigate={handleNavigate}
              onPropertiesUpdated={() => {
                // Refresh properties if updated
              }}
            />
          )}

          {/* 2. Finance & Payment */}
          {(currentTab === 'finance' || currentTab === 'payments') && (
            <PaymentManagementView
              currentUser={currentUser}
              language={language}
              contracts={db.contracts}
              properties={db.properties}
              onOpenContract={(contractId) => handleNavigate('contracts', contractId)}
            />
          )}

          {/* Real Property Data Center (Cloud SQL PostgreSQL) */}
          {currentTab === 'datacenter' && (
            <PropertyDataCenter
              currentUser={currentUser}
              users={db.users}
              language={language}
              onNavigate={handleNavigate}
            />
          )}

          {/* 2. Property & Project Management */}
          {(currentTab === 'properties' || currentTab === 'projects') && (
            <PropertyManagement
              properties={db.properties}
              currentUser={currentUser}
              users={db.users}
              language={language}
              onSaveProperty={handleSaveProperty}
              onDeleteProperty={handleDeleteProperty}
              onRestoreProperty={handleRestoreProperty}
              initialFilter={currentTab === 'projects' ? 'projects' : tabFilter}
              onNavigate={handleNavigate}
            />
          )}

          {/* 3. Customers CRM */}
          {currentTab === 'customers' && (
            <CustomersView
              customers={db.customers}
              properties={db.properties}
              contracts={db.contracts}
              viewings={db.viewings}
              users={db.users}
              currentUser={currentUser}
              language={language}
              onSaveCustomer={handleSaveCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {/* 4. Viewing Appointments */}
          {currentTab === 'viewing' && (
            <ViewingView
              viewings={db.viewings}
              properties={db.properties}
              customers={db.customers}
              users={db.users}
              currentUser={currentUser}
              language={language}
              onSaveViewing={handleSaveViewing}
              onDeleteViewing={handleDeleteViewing}
            />
          )}

          {/* 5. Contracts */}
          {currentTab === 'contracts' && (
            <ContractsView
              contracts={db.contracts}
              properties={db.properties}
              customers={db.customers}
              users={db.users}
              currentUser={currentUser}
              language={language}
              onSaveContract={handleSaveContract}
              onDeleteContract={handleDeleteContract}
              initialFilter={tabFilter}
            />
          )}

          {/* 6. Check-in / Check-out */}
          {currentTab === 'checkinout' && (
            <CheckInOutView
              records={db.checkInOuts}
              properties={db.properties}
              customers={db.customers}
              users={db.users}
              currentUser={currentUser}
              language={language}
              onSaveRecord={handleSaveCheckInOut}
              onDeleteRecord={handleDeleteCheckInOut}
              initialFilter={tabFilter}
            />
          )}

          {/* 7. Maintenance & Operations */}
          {(currentTab === 'maintenance' ||
            currentTab === 'operations' ||
            currentTab.startsWith('operations-')) && (
            <MaintenanceManagementView
              currentUser={currentUser}
              language={language}
              properties={db.properties}
              customers={db.customers}
              users={db.users}
              activeSubTab={
                currentTab === 'operations-vendors'
                  ? 'vendors'
                  : currentTab === 'operations-preventive'
                  ? 'preventive'
                  : currentTab === 'operations-reports'
                  ? 'reports'
                  : 'maintenance'
              }
              onNavigate={handleNavigate}
            />
          )}

          {/* 8. Work / Agenda */}
          {currentTab === 'work' && (
            <WorkView
              tasks={db.tasks}
              viewings={db.viewings}
              contracts={db.contracts}
              issues={db.maintenanceIssues}
              currentUser={currentUser}
              users={db.users}
              language={language}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onNavigate={handleNavigate}
            />
          )}

          {/* 9. Reports & BI */}
          {currentTab === 'reports' && (
            <ReportsView
              properties={db.properties}
              contracts={db.contracts}
              viewings={db.viewings}
              users={db.users}
              language={language}
              currentUser={currentUser}
              onNavigate={handleNavigate}
            />
          )}

          {/* 10. Records & Activity Log */}
          {currentTab === 'records' && (
            <RecordsView
              records={db.records}
              users={db.users}
              language={language}
            />
          )}

          {/* 3. User Management */}
          {(currentTab === 'users' || currentTab === 'user-management') && (
            <UsersManagementView
              users={db.users}
              currentUser={currentUser}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
              onSwitchUser={handleSwitchUser}
              onToggleStatus={handleToggleUserStatus}
              language={language}
            />
          )}

          {/* 12. My / Profile */}
          {(currentTab === 'my' || currentTab === 'profile' || currentTab === 'my-profile') && (
            <ProfileView
              currentUser={currentUser}
              kpi={db.monthlyKPI}
              contracts={db.contracts}
              language={language}
              onUpdateUser={handleSaveUser}
              onLogout={handleLogout}
            />
          )}

          {/* 4. System Settings */}
          {(currentTab === 'settings' || currentTab === 'system-settings') && (
            <SettingsView
              language={language}
              onResetDatabase={handleResetDatabase}
              database={db as any}
              onRestoreDatabase={handleRestoreDatabase}
              currentUser={currentUser}
              onNavigate={handleNavigate}
            />
          )}
        </main>
      </div>

      {/* Floating Action Button for Quick Entity Creation */}
      <FloatingActionButton
        onQuickAction={(action) => {
          switch (action) {
            case 'property':
              handleNavigate('properties');
              break;
            case 'customer':
              handleNavigate('customers');
              break;
            case 'viewing':
              handleNavigate('viewing');
              break;
            case 'contract':
              handleNavigate('contracts');
              break;
            case 'maintenance':
              handleNavigate('maintenance');
              break;
          }
        }}
        language={language}
      />

      {/* Mobile Bottom Navigation with "More" Drawer */}
      <BottomNav
        currentTab={currentTab}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        language={language}
        badgeCounts={{
          work: pendingTasksCount,
          contracts: expiringContractsCount,
          maintenance: urgentIssuesCount,
        }}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator language={language} />
    </div>
  );
}
