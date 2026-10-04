import React, { useState, useMemo, useEffect } from 'react';
import { Property, PropertyCategory, PropertyStatus, User } from '../types';
import { translations, Language } from '../lib/i18n';
import { PropertyFormModal } from './PropertyFormModal';
import { PropertyDetailModal } from './PropertyDetailModal';
import {
  PHUKET_ZONES,
  HOUSE_VIEWS,
  PROPERTY_STATUS_TABS,
} from './propertyConstants';
import {
  hasPermission,
  canUserEditProperty,
  canUserArchiveProperty,
  canUserRestoreProperty,
} from '../lib/permissions';
import {
  Building2,
  Search,
  Filter,
  RotateCcw,
  Download,
  Trash2,
  Archive,
  ArchiveRestore,
  Undo2,
  Send,
  UserCheck,
  RefreshCw,
  Star,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Check,
  X,
  Plus,
  ArrowUpDown,
  SlidersHorizontal,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  Phone,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Sparkles,
  Database,
  Layers,
} from 'lucide-react';

interface PropertyManagementProps {
  properties: Property[];
  onSaveProperty: (property: Property) => void;
  onDeleteProperty: (propertyId: string) => void;
  onRestoreProperty?: (propertyId: string) => void;
  language: Language;
  currentUser: User;
  users?: User[];
  initialFilter?: string;
  onNavigate?: (tab: string) => void;
}

export function PropertyManagement({
  properties,
  onSaveProperty,
  onDeleteProperty,
  onRestoreProperty,
  language,
  currentUser,
  users = [],
  initialFilter,
  onNavigate,
}: PropertyManagementProps) {
  const t = translations[language];

  // Selected Active Tab from Categories/Status Bar (Section 58)
  const [activeTabKey, setActiveTabKey] = useState<string>('all');

  // Filter Bar Expand/Collapse
  const [filterExpanded, setFilterExpanded] = useState(true);

  // Advanced Filters (Section 56 & 57)
  const [filterPropertyNo, setFilterPropertyNo] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLabel, setFilterLabel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRoomType, setFilterRoomType] = useState('all');
  const [filterHousePool, setFilterHousePool] = useState('all');
  const [filterPet, setFilterPet] = useState('all');
  const [filterProjectName, setFilterProjectName] = useState('');
  const [filterLandlordPhone, setFilterLandlordPhone] = useState('');
  const [filterRoomNo, setFilterRoomNo] = useState('');
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterAgencyType, setFilterAgencyType] = useState('all');
  const [filterWebsiteStatus, setFilterWebsiteStatus] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  const [filterHouseView, setFilterHouseView] = useState('all');
  const [filterHasVideo, setFilterHasVideo] = useState('all');
  const [filterHouseNo, setFilterHouseNo] = useState('');
  const [filterFollowupStart, setFilterFollowupStart] = useState('');
  const [filterFollowupEnd, setFilterFollowupEnd] = useState('');
  const [filterRentToStart, setFilterRentToStart] = useState('');
  const [filterRentToEnd, setFilterRentToEnd] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

  // Handle initialFilter from routing (e.g. projects, category, status)
  useEffect(() => {
    if (initialFilter) {
      if (initialFilter === 'projects') {
        setActiveTabKey('all');
        setFilterCategory('all');
      } else if (initialFilter.startsWith('project:')) {
        setFilterProjectName(initialFilter.replace('project:', ''));
      } else if (initialFilter.startsWith('status:')) {
        setFilterStatus(initialFilter.replace('status:', ''));
      } else if (initialFilter.startsWith('category:')) {
        setFilterCategory(initialFilter.replace('category:', ''));
      }
    }
  }, [initialFilter]);

  // Extract distinct master project names from property records
  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    properties.forEach((p) => {
      const name = p.projectName || p.projectNameTh || (p as any).projectEn;
      if (name && name.trim()) set.add(name.trim());
    });
    return Array.from(set);
  }, [properties]);

  // Checkbox Selection for Bulk Actions (Section 69)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);

  // Sorting
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination (Section 70)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Column Management (Section 72)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    cover: true,
    followup: true,
    comments: true,
    price: true,
    city: true,
    area: true,
    district: true,
    category: true,
    status: true,
    approval: true,
    photos: true,
    agent: true,
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Detail Modal (Section 47, 60, 62)
  const [detailModalProperty, setDetailModalProperty] = useState<Property | null>(null);
  const [detailModalInitialTab, setDetailModalInitialTab] = useState<'basic' | 'followup'>('basic');

  // Bulk Assign Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState('');

  // Bulk Delete Confirmation Modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Comment Quick-Edit Modal
  const [editingCommentProperty, setEditingCommentProperty] = useState<Property | null>(null);
  const [commentText, setCommentText] = useState('');

  // Image Lightbox Preview
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reset All Filters
  const handleResetFilters = () => {
    setFilterPropertyNo('');
    setFilterCategory('all');
    setFilterLabel('all');
    setFilterStatus('all');
    setFilterRoomType('all');
    setFilterHousePool('all');
    setFilterPet('all');
    setFilterProjectName('');
    setFilterLandlordPhone('');
    setFilterRoomNo('');
    setFilterAgent('all');
    setFilterAgencyType('all');
    setFilterWebsiteStatus('all');
    setFilterCity('all');
    setFilterZone('all');
    setFilterArea('all');
    setFilterHouseView('all');
    setFilterHasVideo('all');
    setFilterHouseNo('');
    setFilterFollowupStart('');
    setFilterFollowupEnd('');
    setFilterRentToStart('');
    setFilterRentToEnd('');
    setFilterPriceMin('');
    setFilterPriceMax('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Refresh Action
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // Dynamic live counts for Category/Status tabs (Section 58)
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: properties.length,
      land: 0,
      commercial: 0,
      hotel: 0,
      condo: 0,
      villa: 0,
      house: 0,
      expire_soon: 0,
      need_update: 0,
      sold: 0,
      new_register: 0,
      black_list: 0,
      occupancy_audit: 0,
    };

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    properties.forEach((p) => {
      // Categories
      if (p.category === 'Land') counts.land++;
      if (p.category === 'Commercial') counts.commercial++;
      if (p.category === 'Hotel' as any) counts.hotel++;
      if (p.category === 'Condo') counts.condo++;
      if (p.category === 'Villa') counts.villa++;
      if (p.category === 'House') counts.house++;

      // Sold
      if (p.status === 'Sold') counts.sold++;

      // Black List
      if (p.isBlackList) counts.black_list++;

      // Expire Soon (Rent To within 30 days)
      if (p.rentTo) {
        const rentToDate = new Date(p.rentTo);
        if (rentToDate >= now && rentToDate <= thirtyDaysFromNow) {
          counts.expire_soon++;
        }
      }

      // Need Update (no follow-up or older than 14 days)
      if (!p.lastFollowUpDate) {
        counts.need_update++;
      } else {
        const fDate = new Date(p.lastFollowUpDate);
        if (fDate < thirtyDaysAgo) counts.need_update++;
      }

      // New Register (created in last 30 days)
      if (p.createdAt) {
        const cDate = new Date(p.createdAt);
        if (cDate >= thirtyDaysAgo) counts.new_register++;
      }

      // Occupancy Audit (Rented status)
      if (p.status === 'Rented') counts.occupancy_audit++;
    });

    return counts;
  }, [properties]);

  // Available Areas based on selected Zone
  const availableAreas = useMemo(() => {
    if (filterZone === 'all') {
      return PHUKET_ZONES.flatMap((z) => z.areas);
    }
    const zoneObj = PHUKET_ZONES.find((z) => z.zone === filterZone);
    return zoneObj ? zoneObj.areas : [];
  }, [filterZone]);

  // Main Filtering Logic
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      // 1. Tab Bar Filter
      if (activeTabKey !== 'all') {
        const tab = PROPERTY_STATUS_TABS.find((t) => t.key === activeTabKey);
        if (tab?.category && p.category !== tab.category) return false;
        if (tab?.status && p.status !== tab.status) return false;
        if (tab?.filter === 'black_list' && !p.isBlackList) return false;
        if (tab?.filter === 'occupancy_audit' && p.status !== 'Rented') return false;
        if (tab?.filter === 'need_update') {
          if (p.lastFollowUpDate) {
            const fDate = new Date(p.lastFollowUpDate);
            const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            if (fDate >= fourteenDaysAgo) return false;
          }
        }
        if (tab?.filter === 'expire_soon') {
          if (!p.rentTo) return false;
          const rDate = new Date(p.rentTo);
          const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          if (rDate < new Date() || rDate > thirtyDaysFromNow) return false;
        }
        if (tab?.filter === 'new_register') {
          const cDate = new Date(p.createdAt);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          if (cDate < thirtyDaysAgo) return false;
        }
      }

      // 2. Search Query (Across multiple fields)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          (p.propertyId && p.propertyId.toLowerCase().includes(q)) ||
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.titleTh && p.titleTh.toLowerCase().includes(q)) ||
          (p.projectName && p.projectName.toLowerCase().includes(q)) ||
          (p.ownerName && p.ownerName.toLowerCase().includes(q)) ||
          (p.agentName && p.agentName.toLowerCase().includes(q)) ||
          (p.roomNo && p.roomNo.toLowerCase().includes(q)) ||
          (p.houseNo && p.houseNo.toLowerCase().includes(q)) ||
          (p.district && p.district.toLowerCase().includes(q)) ||
          (p.area && p.area.toLowerCase().includes(q));

        if (!matchSearch) return false;
      }

      // 3. Property No
      if (filterPropertyNo.trim()) {
        if (!p.propertyId || !p.propertyId.toLowerCase().includes(filterPropertyNo.trim().toLowerCase())) {
          return false;
        }
      }

      // 4. Category
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;

      // 5. Label
      if (filterLabel !== 'all' && p.propertyLabel !== filterLabel) return false;

      // 6. Status
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;

      // 7. Room Type
      if (filterRoomType !== 'all') {
        if (filterRoomType === 'Studio' && p.bedrooms !== 0) return false;
        if (filterRoomType === '1B' && p.bedrooms !== 1) return false;
        if (filterRoomType === '2B' && p.bedrooms !== 2) return false;
        if (filterRoomType === '3B' && p.bedrooms !== 3) return false;
        if (filterRoomType === '4B+' && p.bedrooms < 4) return false;
      }

      // 8. Pool
      if (filterHousePool !== 'all') {
        if (filterHousePool === 'No Pool' && p.hasPool) return false;
        if (filterHousePool === 'Private Pool' && (!p.hasPool || p.hasHousePool === 'Shared Pool')) return false;
        if (filterHousePool === 'Shared Pool' && p.hasHousePool !== 'Shared Pool') return false;
      }

      // 9. Pet
      if (filterPet !== 'all') {
        if (filterPet === 'Allowed' && !p.petFriendly) return false;
        if (filterPet === 'Not Allowed' && p.petFriendly) return false;
      }

      // 10. Project Name
      if (filterProjectName.trim()) {
        const pn = filterProjectName.toLowerCase();
        if (!p.projectName?.toLowerCase().includes(pn) && !p.projectNameTh?.toLowerCase().includes(pn)) {
          return false;
        }
      }

      // 11. Landlord Phone
      if (filterLandlordPhone.trim()) {
        const ph = filterLandlordPhone.replace(/\D/g, '');
        const pPhone = (p.ownerPhone || '').replace(/\D/g, '');
        const pPhone3 = (p.landlordPhone3 || '').replace(/\D/g, '');
        if (!pPhone.includes(ph) && !pPhone3.includes(ph)) return false;
      }

      // 12. Room No
      if (filterRoomNo.trim()) {
        if (!p.roomNo?.toLowerCase().includes(filterRoomNo.trim().toLowerCase())) return false;
      }

      // 13. Agent
      if (filterAgent !== 'all' && p.agentId !== filterAgent && p.agentName !== filterAgent) return false;

      // 14. Agency Type
      if (filterAgencyType !== 'all' && p.agencyType !== filterAgencyType) return false;

      // 15. Website Status
      if (filterWebsiteStatus !== 'all') {
        if (filterWebsiteStatus === 'Published' && !p.isPublished) return false;
        if (filterWebsiteStatus === 'Unpublished' && p.isPublished) return false;
      }

      // 16. City
      if (filterCity !== 'all' && p.city !== filterCity) return false;

      // 17. Zone & Area
      if (filterZone !== 'all' && p.zone !== filterZone) return false;
      if (filterArea !== 'all') {
        if (!p.area?.toLowerCase().includes(filterArea.toLowerCase())) return false;
      }

      // 18. House View
      if (filterHouseView !== 'all') {
        if (!p.views?.includes(filterHouseView)) return false;
      }

      // 19. Has Video
      if (filterHasVideo !== 'all') {
        const hasV = p.videos && p.videos.length > 0;
        if (filterHasVideo === 'Yes' && !hasV) return false;
        if (filterHasVideo === 'No' && hasV) return false;
      }

      // 20. House No
      if (filterHouseNo.trim()) {
        if (!p.houseNo?.toLowerCase().includes(filterHouseNo.trim().toLowerCase())) return false;
      }

      // 21. Followup Date Range
      if (filterFollowupStart && p.lastFollowUpDate && p.lastFollowUpDate < filterFollowupStart) return false;
      if (filterFollowupEnd && p.lastFollowUpDate && p.lastFollowUpDate > filterFollowupEnd) return false;

      // 22. Rent To Date Range
      if (filterRentToStart && p.rentTo && p.rentTo < filterRentToStart) return false;
      if (filterRentToEnd && p.rentTo && p.rentTo > filterRentToEnd) return false;

      // 23. Price Min & Max (Checks Rent Price or Sale Price)
      const effectivePrice = p.rentPrice || p.price || 0;
      if (filterPriceMin && effectivePrice < Number(filterPriceMin)) return false;
      if (filterPriceMax && effectivePrice > Number(filterPriceMax)) return false;

      return true;
    });
  }, [
    properties,
    activeTabKey,
    searchQuery,
    filterPropertyNo,
    filterCategory,
    filterLabel,
    filterStatus,
    filterRoomType,
    filterHousePool,
    filterPet,
    filterProjectName,
    filterLandlordPhone,
    filterRoomNo,
    filterAgent,
    filterAgencyType,
    filterWebsiteStatus,
    filterCity,
    filterZone,
    filterArea,
    filterHouseView,
    filterHasVideo,
    filterHouseNo,
    filterFollowupStart,
    filterFollowupEnd,
    filterRentToStart,
    filterRentToEnd,
    filterPriceMin,
    filterPriceMax,
  ]);

  // Sorting
  const sortedProperties = useMemo(() => {
    return [...filteredProperties].sort((a, b) => {
      let valA: any = (a as any)[sortField];
      let valB: any = (b as any)[sortField];

      if (sortField === 'rentPrice') {
        valA = a.rentPrice || 0;
        valB = b.rentPrice || 0;
      } else if (sortField === 'price') {
        valA = a.price || 0;
        valB = b.price || 0;
      } else if (sortField === 'lastFollowUpDate') {
        valA = a.lastFollowUpDate || '';
        valB = b.lastFollowUpDate || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProperties, sortField, sortDirection]);

  // Pagination
  const totalRecords = sortedProperties.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / itemsPerPage));
  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedProperties.slice(start, start + itemsPerPage);
  }, [sortedProperties, currentPage, itemsPerPage]);

  // Handle Sort Toggle
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Checkbox Selection
  const allCurrentPageSelected =
    paginatedProperties.length > 0 &&
    paginatedProperties.every((p) => selectedPropertyIds.includes(p.id));

  const handleSelectAllCurrentPage = () => {
    if (allCurrentPageSelected) {
      const pageIds = new Set(paginatedProperties.map((p) => p.id));
      setSelectedPropertyIds(selectedPropertyIds.filter((id) => !pageIds.has(id)));
    } else {
      const newIds = new Set([...selectedPropertyIds, ...paginatedProperties.map((p) => p.id)]);
      setSelectedPropertyIds(Array.from(newIds));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    if (selectedPropertyIds.includes(id)) {
      setSelectedPropertyIds(selectedPropertyIds.filter((item) => item !== id));
    } else {
      setSelectedPropertyIds([...selectedPropertyIds, id]);
    }
  };

  // Toggle Favorite Star
  const handleToggleFavorite = (p: Property) => {
    onSaveProperty({
      ...p,
      isFavorite: !p.isFavorite,
    });
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    selectedPropertyIds.forEach((id) => {
      onDeleteProperty(id);
    });
    setSelectedPropertyIds([]);
    setDeleteConfirmOpen(false);
  };

  // Bulk Re-Request Approval
  const handleBulkReRequestApproval = () => {
    selectedPropertyIds.forEach((id) => {
      const prop = properties.find((p) => p.id === id);
      if (prop) {
        onSaveProperty({
          ...prop,
          approvalStatus: 'Pending',
        });
      }
    });
    setSelectedPropertyIds([]);
  };

  // Bulk Assign Agent
  const handleBulkAssign = () => {
    const targetAgent = users.find((u) => u.id === targetAgentId);
    if (!targetAgent) return;

    selectedPropertyIds.forEach((id) => {
      const prop = properties.find((p) => p.id === id);
      if (prop) {
        onSaveProperty({
          ...prop,
          agentId: targetAgent.id,
          agentName: targetAgent.name,
        });
      }
    });
    setSelectedPropertyIds([]);
    setAssignModalOpen(false);
  };

  // Export CSV Report (Section 55 & 69)
  const handleExportReport = () => {
    const dataToExport = selectedPropertyIds.length > 0
      ? properties.filter((p) => selectedPropertyIds.includes(p.id))
      : sortedProperties;

    const headers = [
      'Property ID',
      'Title',
      'Category',
      'Status',
      'Approval',
      'Rent Price',
      'Sale Price',
      'City',
      'Area',
      'District',
      'Bedrooms',
      'Bathrooms',
      'Usable Area (sqm)',
      'Owner Name',
      'Owner Phone',
      'Agent',
      'Last Followup',
      'Comments',
    ];

    const rows = dataToExport.map((p) => [
      p.propertyId,
      `"${p.title.replace(/"/g, '""')}"`,
      p.category,
      p.status,
      p.approvalStatus || 'Pass',
      p.rentPrice || 0,
      p.price || 0,
      p.city,
      p.area || '',
      p.district,
      p.bedrooms,
      p.bathrooms,
      p.usableArea,
      `"${p.ownerName}"`,
      p.ownerPhone,
      p.agentName,
      p.lastFollowUpDate || 'No follow-up',
      `"${(p.comments || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `peak_properties_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Comment Save
  const handleSaveComment = () => {
    if (editingCommentProperty) {
      onSaveProperty({
        ...editingCommentProperty,
        comments: commentText.trim(),
      });
      setEditingCommentProperty(null);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: PropertyStatus) => {
    switch (status) {
      case 'Available':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[11px] border border-blue-200">
            Available
          </span>
        );
      case 'Rented':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[11px] border border-amber-200">
            Rented
          </span>
        );
      case 'Sold':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-300">
            Sold
          </span>
        );
      case 'Reserved':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold text-[11px] border border-purple-200">
            Reserved
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px]">
            {status}
          </span>
        );
    }
  };

  // Approval Badge Helper
  const renderApprovalBadge = (approval?: 'Pass' | 'Pending' | 'Rejected') => {
    const app = approval || 'Pass';
    switch (app) {
      case 'Pass':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
            Pass
          </span>
        );
      case 'Pending':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[11px] border border-amber-200">
            Pending
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-semibold text-[11px] border border-red-200">
            Rejected
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 max-w-full mx-auto pb-12 text-slate-800 text-xs">
      {/* 1. TOP ACTION BAR (Section 55 & Screenshot 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-900 text-white shadow-xs">
            <Building2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-serif text-slate-900 tracking-tight flex items-center gap-2">
              <span>Property</span>
              <span className="text-xs font-mono font-normal text-slate-400">
                ({properties.length} Total Listings)
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">
              {language === 'th'
                ? 'ระบบจัดการรายการอสังหาริมทรัพย์และสถานะการติดต่อ Follow-up ครบวงจร'
                : 'Centralized Portfolio Listings, Approvals & Landlord Follow-up Operations'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Report, Delete, Re-Request Approval, Assign, Refresh, + Add Property */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Enter Property Data Center Button */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('datacenter')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors border border-slate-700"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Property Data Center</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono">Cloud DB</span>
            </button>
          )}

          {/* Add New Property Button */}
          <button
            type="button"
            onClick={() => {
              setEditingProperty(null);
              setFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Property</span>
          </button>

          {/* Report Button */}
          <button
            type="button"
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-xs"
            title="Download CSV report of filtered or selected properties"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Report</span>
          </button>

          {/* Delete Button (with Bulk Delete) */}
          <button
            type="button"
            disabled={selectedPropertyIds.length === 0}
            onClick={() => setDeleteConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-700 text-slate-700 font-semibold text-xs transition-colors shadow-xs disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-700"
            title="Delete selected properties"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Delete {selectedPropertyIds.length > 0 && `(${selectedPropertyIds.length})`}</span>
          </button>

          {/* Re-Request Approval Button */}
          <button
            type="button"
            disabled={selectedPropertyIds.length === 0}
            onClick={handleBulkReRequestApproval}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-xs disabled:opacity-40"
            title="Re-request approval for selected properties"
          >
            <Send className="w-3.5 h-3.5 text-blue-600" />
            <span>Re-Request Approval</span>
          </button>

          {/* Assign Button */}
          <button
            type="button"
            disabled={selectedPropertyIds.length === 0}
            onClick={() => setAssignModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-xs disabled:opacity-40"
            title="Assign selected properties to an agent"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Assign</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-xs ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Refresh listings from database"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. ADVANCED FILTER BAR (Section 56 & Screenshot 1) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter Toggle Header with Reset & Search */}
        <div className="p-3.5 px-5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setFilterExpanded(!filterExpanded)}
              className="flex items-center gap-1.5 font-bold text-xs text-blue-600 hover:text-blue-700"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 font-semibold text-xs text-slate-600 hover:text-red-600"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              className="flex items-center gap-1.5 px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid (Matching Screenshot 1) */}
        {filterExpanded && (
          <div className="p-4 sm:p-5 space-y-3 animate-in fade-in duration-150">
            {/* Row 1: Property No, Category, Label, Status, Room Type, House Pool, Pet */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <div>
                <input
                  type="text"
                  placeholder="Property No"
                  value={filterPropertyNo}
                  onChange={(e) => {
                    setFilterPropertyNo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">Category: All</option>
                  <option value="Villa">Villa</option>
                  <option value="House">House</option>
                  <option value="Condo">Condominium</option>
                  <option value="Land">Land</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Warehouse">Warehouse</option>
                  <option value="Office">Office</option>
                </select>
              </div>

              <div>
                <select
                  value={filterLabel}
                  onChange={(e) => {
                    setFilterLabel(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">Label: All</option>
                  <option value="Rent">Rent</option>
                  <option value="Sale">Sale</option>
                  <option value="Rent and Sale">Rent and Sale</option>
                </select>
              </div>

              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">Status: All</option>
                  <option value="Available">Available</option>
                  <option value="Rented">Rented</option>
                  <option value="Sold">Sold</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div>
                <select
                  value={filterRoomType}
                  onChange={(e) => {
                    setFilterRoomType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">Room Type: All</option>
                  <option value="Studio">Studio</option>
                  <option value="1B">1 Bed</option>
                  <option value="2B">2 Beds</option>
                  <option value="3B">3 Beds</option>
                  <option value="4B+">4+ Beds</option>
                </select>
              </div>

              <div>
                <select
                  value={filterHousePool}
                  onChange={(e) => {
                    setFilterHousePool(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">House Pool: All</option>
                  <option value="Private Pool">Private Pool</option>
                  <option value="Shared Pool">Shared Pool</option>
                  <option value="No Pool">No Pool</option>
                </select>
              </div>

              <div>
                <select
                  value={filterPet}
                  onChange={(e) => {
                    setFilterPet(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">Pet: All</option>
                  <option value="Allowed">Pets Allowed</option>
                  <option value="Not Allowed">Pets Not Allowed</option>
                </select>
              </div>
            </div>

            {/* Row 2: Project Name, Landlord Phone, Room No, Agent, Agency Type, Website Status, City */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <div>
                <input
                  type="text"
                  placeholder="Project Name"
                  value={filterProjectName}
                  onChange={(e) => {
                    setFilterProjectName(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Landlord Phone"
                  value={filterLandlordPhone}
                  onChange={(e) => {
                    setFilterLandlordPhone(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Room No"
                  value={filterRoomNo}
                  onChange={(e) => {
                    setFilterRoomNo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <select
                  value={filterAgent}
                  onChange={(e) => {
                    setFilterAgent(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">Agent: All</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterAgencyType}
                  onChange={(e) => {
                    setFilterAgencyType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">Agency Type: All</option>
                  <option value="Representative">Representative</option>
                  <option value="Exclusive">Exclusive</option>
                  <option value="Co-broke">Co-broke</option>
                  <option value="Direct">Direct</option>
                </select>
              </div>

              <div>
                <select
                  value={filterWebsiteStatus}
                  onChange={(e) => {
                    setFilterWebsiteStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">Website Status: All</option>
                  <option value="Published">Published</option>
                  <option value="Unpublished">Unpublished</option>
                </select>
              </div>

              <div>
                <select
                  value={filterCity}
                  onChange={(e) => {
                    setFilterCity(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">City: All</option>
                  <option value="Phuket">Phuket</option>
                  <option value="Phang Nga">Phang Nga</option>
                  <option value="Krabi">Krabi</option>
                </select>
              </div>
            </div>

            {/* Row 3: Zone, Area, House View, Has Video, House No, Followup date range, Rent To date range, Price Min/Max */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {/* Zone Filter (Section 57) */}
              <div>
                <select
                  value={filterZone}
                  onChange={(e) => {
                    setFilterZone(e.target.value);
                    setFilterArea('all');
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">Zone: All</option>
                  {PHUKET_ZONES.map((z) => (
                    <option key={z.zone} value={z.zone}>
                      {z.zone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area Filter (Section 57 Cascading) */}
              <div>
                <select
                  value={filterArea}
                  onChange={(e) => {
                    setFilterArea(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">Area: All</option>
                  {availableAreas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterHouseView}
                  onChange={(e) => {
                    setFilterHouseView(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">House View: All</option>
                  {HOUSE_VIEWS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterHasVideo}
                  onChange={(e) => {
                    setFilterHasVideo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700"
                >
                  <option value="all">Has Video: All</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="House No"
                  value={filterHouseNo}
                  onChange={(e) => {
                    setFilterHouseNo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Followup Date */}
              <div>
                <input
                  type="date"
                  title="Followup Date from"
                  value={filterFollowupStart}
                  onChange={(e) => {
                    setFilterFollowupStart(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1 rounded-xl border border-slate-200 bg-white text-[11px]"
                />
              </div>

              {/* Rent To Date */}
              <div>
                <input
                  type="date"
                  title="Rent To Date"
                  value={filterRentToStart}
                  onChange={(e) => {
                    setFilterRentToStart(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-2 py-1 rounded-xl border border-slate-200 bg-white text-[11px]"
                />
              </div>

              {/* Price Min / Max */}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Min"
                  value={filterPriceMin}
                  onChange={(e) => {
                    setFilterPriceMin(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-1/2 px-1.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-center"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filterPriceMax}
                  onChange={(e) => {
                    setFilterPriceMax(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-1/2 px-1.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-center"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. CATEGORY / STATUS TABS BAR (Section 58 & Screenshot 1) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center space-x-1 min-w-max">
          {PROPERTY_STATUS_TABS.map((tab) => {
            const count = tabCounts[tab.key] || 0;
            const isActive = activeTabKey === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTabKey(tab.key);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`ml-1 text-[11px] ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3.1 PROJECT QUICK FILTER CHIPS (Prime Global Asset Enterprise style) */}
      {uniqueProjects.length > 0 && (
        <div className="bg-[#0A0C10] border border-slate-800 rounded-2xl p-2.5 text-white flex items-center gap-2 overflow-x-auto scrollbar-thin shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 shrink-0 pr-3 border-r border-slate-800">
            <Layers className="w-4 h-4 text-red-500" />
            <span>{language === 'th' ? 'โครงการหลัก' : 'Master Projects'}:</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilterProjectName('');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              !filterProjectName
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {language === 'th' ? 'ทั้งหมด (All Projects)' : 'All Projects'}
          </button>
          {uniqueProjects.map((proj) => {
            const isSelected = filterProjectName.toLowerCase() === proj.toLowerCase();
            return (
              <button
                key={proj}
                type="button"
                onClick={() => {
                  setFilterProjectName(isSelected ? '' : proj);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {proj}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. TABLE TOOLBAR (Bulk Actions + Column Visibility + Search) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          {selectedPropertyIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl text-xs text-blue-900 font-semibold animate-in fade-in">
              <span>{selectedPropertyIds.length} properties selected</span>
              <button
                type="button"
                onClick={() => setSelectedPropertyIds([])}
                className="text-blue-600 hover:underline text-[11px]"
              >
                Deselect all
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search keyword..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs w-48 focus:w-64 transition-all focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Column Toggle Dropdown (Section 72) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              title="Manage Columns"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Columns</span>
            </button>

            {showColumnDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 z-30 space-y-1.5 animate-in fade-in">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Visible Columns
                </span>
                {Object.keys(visibleColumns).map((colKey) => (
                  <label key={colKey} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns[colKey]}
                      onChange={(e) =>
                        setVisibleColumns({ ...visibleColumns, [colKey]: e.target.checked })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="capitalize">{colKey}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. PROPERTY DATA TABLE (Sections 59-68 & Screenshot 1) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider select-none">
                {/* Checkbox Column */}
                <th className="p-3.5 pl-4 w-10">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={handleSelectAllCurrentPage}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>

                {/* Property ID Column */}
                <th
                  onClick={() => handleSort('propertyId')}
                  className="p-3.5 cursor-pointer hover:text-blue-600 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Property</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Cover Thumbnail */}
                {visibleColumns.cover && <th className="p-3.5 whitespace-nowrap">Cover</th>}

                {/* FollowUp (Section 62) */}
                {visibleColumns.followup && (
                  <th
                    onClick={() => handleSort('lastFollowUpDate')}
                    className="p-3.5 cursor-pointer hover:text-blue-600 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>FollowUp</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Comments (Section 63) */}
                {visibleColumns.comments && <th className="p-3.5 whitespace-nowrap">Comments</th>}

                {/* Price (Section 64) */}
                {visibleColumns.price && (
                  <th
                    onClick={() => handleSort('rentPrice')}
                    className="p-3.5 cursor-pointer hover:text-blue-600 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Rent Price / Sale Price</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Location: City, Area, District (Section 65) */}
                {visibleColumns.city && <th className="p-3.5 whitespace-nowrap">City</th>}
                {visibleColumns.area && <th className="p-3.5 whitespace-nowrap">Area</th>}
                {visibleColumns.district && <th className="p-3.5 whitespace-nowrap">District</th>}

                {/* Category (Section 66) */}
                {visibleColumns.category && (
                  <th
                    onClick={() => handleSort('category')}
                    className="p-3.5 cursor-pointer hover:text-blue-600 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Category</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Status (Section 67) */}
                {visibleColumns.status && (
                  <th
                    onClick={() => handleSort('status')}
                    className="p-3.5 cursor-pointer hover:text-blue-600 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Approval (Section 68) */}
                {visibleColumns.approval && (
                  <th
                    onClick={() => handleSort('approvalStatus')}
                    className="p-3.5 cursor-pointer hover:text-blue-600 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>Approval</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Photos */}
                {visibleColumns.photos && <th className="p-3.5 whitespace-nowrap">Photos</th>}

                {/* Agent */}
                {visibleColumns.agent && <th className="p-3.5 whitespace-nowrap">Agent</th>}

                {/* Actions */}
                <th className="p-3.5 pr-4 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedProperties.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-slate-400 bg-slate-50/50">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-700">No properties found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try changing your filters or search criteria, or click Reset.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedProperties.map((prop) => {
                  const isChecked = selectedPropertyIds.includes(prop.id);
                  const coverImage = prop.images && prop.images.length > 0
                    ? prop.images.find((img) => img.isCover)?.url || prop.images[0].url
                    : null;

                  return (
                    <tr
                      key={prop.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 pl-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(prop.id)}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Property ID + Favorite Star (Section 60) */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(prop)}
                            className="text-slate-300 hover:text-amber-400 transition-colors"
                            title="Favorite"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                prop.isFavorite ? 'text-amber-400 fill-amber-400' : ''
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDetailModalProperty(prop);
                              setDetailModalInitialTab('basic');
                            }}
                            className="font-bold text-blue-600 hover:underline font-mono text-xs"
                          >
                            {prop.propertyId}
                          </button>
                          {prop.isBlackList && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-100 text-red-700 font-bold border border-red-200">
                              BL
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cover Photo Thumbnail (Section 61) */}
                      {visibleColumns.cover && (
                        <td className="p-3.5 whitespace-nowrap">
                          {coverImage ? (
                            <button
                              type="button"
                              onClick={() => setLightboxImageUrl(coverImage)}
                              className="w-14 h-10 rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity bg-slate-100 shrink-0 block"
                            >
                              <img
                                src={coverImage}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </button>
                          ) : (
                            <div className="w-14 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                      )}

                      {/* FollowUp Date (Section 62: Clickable to open Property Detail -> Followup) */}
                      {visibleColumns.followup && (
                        <td className="p-3.5 whitespace-nowrap">
                          {prop.lastFollowUpDate ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDetailModalProperty(prop);
                                setDetailModalInitialTab('followup');
                              }}
                              className="font-mono text-blue-600 hover:underline text-xs"
                            >
                              {prop.lastFollowUpDate}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDetailModalProperty(prop);
                                setDetailModalInitialTab('followup');
                              }}
                              className="text-slate-400 hover:text-blue-600 text-xs italic"
                            >
                              No follow-up
                            </button>
                          )}
                        </td>
                      )}

                      {/* Comments (Section 63: Inline edit pen icon) */}
                      {visibleColumns.comments && (
                        <td className="p-3.5 max-w-[200px] truncate">
                          <div className="flex items-center gap-1.5 group">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentProperty(prop);
                                setCommentText(prop.comments || '');
                              }}
                              className="text-blue-600 hover:text-blue-700 p-0.5 rounded transition-colors"
                              title="Edit comment"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-slate-700 text-xs truncate">
                              {prop.comments || '-'}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Price (Section 64: Dual Rent & Sale format) */}
                      {visibleColumns.price && (
                        <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                          <div className="space-y-0.5">
                            <div className="text-blue-700 font-semibold">
                              {prop.rentPrice
                                ? `THB ${prop.rentPrice.toLocaleString()}.00 / Rent`
                                : 'THB 0.00 / Rent'}
                            </div>
                            <div className="text-slate-500">
                              {prop.price
                                ? `THB ${prop.price.toLocaleString()} / Sale`
                                : 'THB 0.00 / Sale'}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Location: City, Area, District (Section 65) */}
                      {visibleColumns.city && (
                        <td className="p-3.5 whitespace-nowrap text-slate-700">{prop.city}</td>
                      )}
                      {visibleColumns.area && (
                        <td className="p-3.5 whitespace-nowrap font-medium text-slate-900">
                          {prop.area || '-'}
                        </td>
                      )}
                      {visibleColumns.district && (
                        <td className="p-3.5 whitespace-nowrap text-slate-600">
                          {prop.district}
                        </td>
                      )}

                      {/* Category (Section 66) */}
                      {visibleColumns.category && (
                        <td className="p-3.5 whitespace-nowrap text-slate-700">{prop.category}</td>
                      )}

                      {/* Status (Section 67: Colored Badge) */}
                      {visibleColumns.status && (
                        <td className="p-3.5 whitespace-nowrap">
                          {renderStatusBadge(prop.status)}
                        </td>
                      )}

                      {/* Approval (Section 68: Pass / Pending / Rejected) */}
                      {visibleColumns.approval && (
                        <td className="p-3.5 whitespace-nowrap">
                          {renderApprovalBadge(prop.approvalStatus)}
                        </td>
                      )}

                      {/* Photos Count */}
                      {visibleColumns.photos && (
                        <td className="p-3.5 whitespace-nowrap font-mono text-slate-500">
                          {prop.images?.length || 0}
                        </td>
                      )}

                      {/* Agent */}
                      {visibleColumns.agent && (
                        <td className="p-3.5 whitespace-nowrap font-semibold text-slate-700">
                          {prop.agentName || '-'}
                        </td>
                      )}

                      {/* Action */}
                      <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProperty(prop);
                              setFormModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                            title="Edit Property"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDetailModalProperty(prop);
                              setDetailModalInitialTab('basic');
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-blue-600"
                            title="View Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. PAGINATION CONTROLS (Section 70 & Screenshot 1) */}
        <div className="p-3 px-5 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-slate-800">☰ {totalRecords}</span>
            <span>
              Showing {totalRecords > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
              {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* First Page */}
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Page Number Pills */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: Math.min(7, totalPages) }, (_, idx) => {
                let pNum = idx + 1;
                if (totalPages > 7 && currentPage > 4) {
                  pNum = currentPage - 3 + idx;
                  if (pNum > totalPages) pNum = totalPages - (6 - idx);
                }
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                      currentPage === pNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>

            {/* Rows Per Page Dropdown */}
            <div className="ml-3 flex items-center gap-1.5">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-mono text-xs text-slate-800"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 7. MODAL: ADD / EDIT PROPERTY (Section 79) */}
      {formModalOpen && (
        <PropertyFormModal
          property={editingProperty}
          currentUser={currentUser}
          users={users}
          language={language}
          onSave={(savedProp) => {
            onSaveProperty(savedProp);
            // Ensure newly added/saved property is visible immediately on the table
            setActiveTabKey('all');
            setSearchQuery('');
            setCurrentPage(1);
            setEditingProperty(null);
            setFormModalOpen(false);
          }}
          onClose={() => setFormModalOpen(false)}
        />
      )}

      {/* 8. MODAL: PROPERTY DETAIL WITH FOLLOW-UP (Sections 35-53, 60, 62 & Screenshot 2) */}
      {detailModalProperty && (
        <PropertyDetailModal
          property={detailModalProperty}
          currentUser={currentUser}
          language={language}
          initialTab={detailModalInitialTab}
          onUpdateProperty={(updatedProp) => {
            onSaveProperty(updatedProp);
            setDetailModalProperty(updatedProp);
          }}
          onClose={() => setDetailModalProperty(null)}
        />
      )}

      {/* 9. MODAL: BULK DELETE CONFIRMATION */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 rounded-xl bg-red-50">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Bulk Delete</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to delete {selectedPropertyIds.length} properties?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              This action will permanently remove the selected listings from the database. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-xs text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 font-semibold text-xs text-white shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. MODAL: BULK ASSIGN AGENT */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="p-2.5 rounded-xl bg-blue-50">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Assign Properties</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign {selectedPropertyIds.length} selected properties to an agent
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Select Target Agent</label>
              <select
                value={targetAgentId}
                onChange={(e) => setTargetAgentId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
              >
                <option value="">Please select agent...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) - {u.branch}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-xs text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetAgentId}
                onClick={handleBulkAssign}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-xs disabled:opacity-40"
              >
                Assign Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. MODAL: EDIT COMMENT */}
      {editingCommentProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>Edit Comment ({editingCommentProperty.propertyId})</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCommentProperty(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="e.g. ย้ายจากรหัสเก่า PKT279 หรือบันทึกข้อความสำหรับทีมงาน"
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-blue-500 text-slate-900"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCommentProperty(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveComment}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-xs"
              >
                Save Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. IMAGE LIGHTBOX */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
          onClick={() => setLightboxImageUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-800">
            <img src={lightboxImageUrl} alt="" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
