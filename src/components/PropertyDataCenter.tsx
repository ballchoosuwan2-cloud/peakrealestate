import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Property, User, PropertyCategory, PropertyStatus } from '../types';
import { Language, translations } from '../lib/i18n';
import { PropertyFormModal } from './PropertyFormModal';
import { PropertyDetailModal } from './PropertyDetailModal';
import { BulkImportModal } from './BulkImportModal';
import { AuditLogsModal } from './AuditLogsModal';
import {
  PHUKET_ZONES,
  HOUSE_VIEWS,
  PROPERTY_STATUS_TABS,
} from './propertyConstants';
import {
  Building2,
  Database,
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Edit3,
  Trash2,
  Plus,
  ArrowUpDown,
  History,
  Shield,
  HardDrive,
  Copy,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  FileDown,
  Layers,
  Sparkles,
  Phone,
  MapPin,
  CheckSquare,
  Square,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  ListChecks,
  Lock,
  Fingerprint,
  FileText,
  Key,
} from 'lucide-react';

// Phuket Zone Area Mapping for client validation
const PHUKET_ZONE_MAPPING: Record<string, string[]> = {
  'Zone 1': ['Phuket Town', 'Kathu', 'Ao Por Pier', 'Koh Kaew', 'Yamu', 'Naka'],
  'Zone 2': ['Chalong', 'Big Buddha', 'Rawai', 'Nai Harn', 'Panwa', 'Saiyuan'],
  'Zone 3': ['Kata', 'Karon', 'Patong', 'Kamala', 'Kalim'],
  'Zone 4': ['Surin', 'Bang Tao', 'Layan', 'Cherngtalay', 'Thalang', 'Pasak'],
  'Zone 5': ['Naithon', 'Mai Khao', 'Airport', 'Nai Yang'],
};

const VALID_CATEGORIES = [
  'House',
  'Condo',
  'Condominium',
  'Villa',
  'Land',
  'Commercial',
  'Hotel',
  'Warehouse',
  'Office',
];

interface PropertyDataCenterProps {
  currentUser: User;
  language: Language;
  users?: User[];
  onNavigate?: (tab: string, filter?: string) => void;
  initialImportOpen?: boolean;
}

export function PropertyDataCenter({
  currentUser,
  language,
  users = [],
  onNavigate,
  initialImportOpen = false,
}: PropertyDataCenterProps) {
  const t = translations[language];

  // --- Real Database State ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    rented: 0,
    sold: 0,
    draft: 0,
    published: 0,
    blackList: 0,
    needUpdate: 0,
    quality: {
      missingPrice: 0,
      missingArea: 0,
      missingPhotos: 0,
    },
  });

  // --- Search & Filters ---
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [labelFilter, setLabelFilter] = useState('All');
  const [zoneFilter, setZoneFilter] = useState('All');
  const [areaFilter, setAreaFilter] = useState('All');
  const [agentFilter, setAgentFilter] = useState('All');
  const [agencyTypeFilter, setAgencyTypeFilter] = useState('All');
  const [furnitureFilter, setFurnitureFilter] = useState('All');
  const [hasPoolFilter, setHasPoolFilter] = useState('All');
  const [petFilter, setPetFilter] = useState('All');
  const [publishFilter, setPublishFilter] = useState('All');
  const [qualityFilter, setQualityFilter] = useState<string | null>(null);
  const [filterExpanded, setFilterExpanded] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingProperty, setViewingProperty] = useState<any | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(initialImportOpen);

  useEffect(() => {
    if (initialImportOpen) {
      setImportModalOpen(true);
    }
  }, [initialImportOpen]);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditModalTab, setAuditModalTab] = useState<'audit' | 'imports' | 'data-quality'>('imports');
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Toast / Notification banner
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showAlert = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAlertMessage({ type, text });
    setTimeout(() => {
      setAlertMessage(null);
    }, 4500);
  };

  // --- Fetch Properties from PostgreSQL Server API ---
  const fetchProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
      });

      if (search.trim()) params.append('search', search.trim());
      if (categoryFilter !== 'All') params.append('category', categoryFilter);
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (labelFilter !== 'All') params.append('propertyLabel', labelFilter);
      if (zoneFilter !== 'All') params.append('zone', zoneFilter);
      if (areaFilter !== 'All') params.append('area', areaFilter);
      if (agentFilter !== 'All') params.append('agentName', agentFilter);
      if (agencyTypeFilter !== 'All') params.append('agencyType', agencyTypeFilter);
      if (furnitureFilter !== 'All') params.append('furniture', furnitureFilter);
      if (hasPoolFilter !== 'All') params.append('hasPool', hasPoolFilter);
      if (petFilter !== 'All') params.append('petFriendly', petFilter);
      if (publishFilter !== 'All') params.append('publishStatus', publishFilter);
      if (qualityFilter) params.append('qualityFilter', qualityFilter);

      const res = await fetch(`/api/properties?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const json = await res.json();
      setProperties(json.data || []);
      setTotalCount(json.total || 0);
      setTotalPages(json.totalPages || 1);
      if (json.stats) {
        setStats(json.stats);
      }
    } catch (err: any) {
      console.error('Fetch properties error:', err);
      setError(err.message || 'Failed to load properties from database');
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch whenever filter, page, size, or sorting changes
  useEffect(() => {
    fetchProperties();
  }, [
    page,
    pageSize,
    sortBy,
    sortOrder,
    categoryFilter,
    statusFilter,
    labelFilter,
    zoneFilter,
    areaFilter,
    agentFilter,
    agencyTypeFilter,
    furnitureFilter,
    hasPoolFilter,
    petFilter,
    publishFilter,
    qualityFilter,
  ]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchProperties();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setLabelFilter('All');
    setZoneFilter('All');
    setAreaFilter('All');
    setAgentFilter('All');
    setAgencyTypeFilter('All');
    setFurnitureFilter('All');
    setHasPoolFilter('All');
    setPetFilter('All');
    setPublishFilter('All');
    setQualityFilter(null);
    setPage(1);
  };

  // Checkbox Selection
  const allPageIds = useMemo(() => properties.map((p) => p.propertyId), [properties]);
  const isAllSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(selectedIds.filter((id) => !allPageIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...allPageIds]));
      setSelectedIds(merged);
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Bulk Status Change
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    try {
      const res = await fetch('/api/properties/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyIds: selectedIds,
          status: newStatus,
          userName: currentUser.name,
        }),
      });
      if (!res.ok) throw new Error('Bulk update failed');
      const data = await res.json();
      showAlert(`Successfully updated ${data.updatedCount} properties to "${newStatus}"!`);
      setSelectedIds([]);
      fetchProperties();
    } catch (err: any) {
      showAlert(err.message, 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} properties from the database?`)) {
      return;
    }
    setBulkProcessing(true);
    try {
      const res = await fetch('/api/properties/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyIds: selectedIds,
          userName: currentUser.name,
        }),
      });
      if (!res.ok) throw new Error('Bulk delete failed');
      const data = await res.json();
      showAlert(`Successfully deleted ${data.deletedCount} properties.`, 'info');
      setSelectedIds([]);
      fetchProperties();
    } catch (err: any) {
      showAlert(err.message, 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Single Delete
  const handleDeleteProperty = async (propertyId: string) => {
    try {
      const res = await fetch(`/api/properties/${propertyId}?userName=${encodeURIComponent(currentUser.name)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete property');
      showAlert(`Property ${propertyId} deleted.`);
      setDeleteConfirmId(null);
      fetchProperties();
    } catch (err: any) {
      showAlert(err.message, 'error');
    }
  };

  // Save / Update from Modal
  const handleSavePropertyFromModal = async (savedProperty: Property) => {
    try {
      const isExisting = editingProperty !== null;
      const endpoint = isExisting ? `/api/properties/${savedProperty.propertyId}` : '/api/properties';
      const method = isExisting ? 'PUT' : 'POST';

      const payload = {
        currentUser: { name: currentUser.name, id: currentUser.id },
        property: {
          ...savedProperty,
          rentPrice: String(savedProperty.rentPrice || '0'),
          price: String(savedProperty.price || '0'),
          usableArea: String(savedProperty.usableArea || '0'),
          landArea: String(savedProperty.landArea || '0'),
        },
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save property to database');
      }

      showAlert(isExisting ? `Property ${savedProperty.propertyId} updated.` : `New property ${savedProperty.propertyId} created.`);
      setFormModalOpen(false);
      setEditingProperty(null);
      fetchProperties();
    } catch (err: any) {
      showAlert(err.message, 'error');
    }
  };

  // Column Visibility Controls
  const [columns, setColumns] = useState({
    propertyId: true,
    photo: true,
    title: true,
    category: true,
    location: true,
    status: true,
    price: true,
    specs: true,
    agent: true,
    landlord: true,
    followUp: true,
    website: true,
    actions: true,
  });

  const toggleColumn = (key: keyof typeof columns) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Export Filtered / All
  const handleExport = (format: 'xlsx' | 'csv') => {
    const params = new URLSearchParams({
      format,
    });
    if (search.trim()) params.append('search', search.trim());
    if (categoryFilter !== 'All') params.append('category', categoryFilter);
    if (statusFilter !== 'All') params.append('status', statusFilter);
    if (zoneFilter !== 'All') params.append('zone', zoneFilter);
    if (areaFilter !== 'All') params.append('area', areaFilter);

    window.location.href = `/api/properties/export?${params.toString()}`;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0A0C10] text-slate-200 min-h-screen">
      {/* Toast Alert */}
      {alertMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-3 ${
            alertMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/60'
              : alertMessage.type === 'error'
              ? 'bg-red-950/90 text-red-200 border-red-700/60'
              : 'bg-blue-950/90 text-blue-200 border-blue-700/60'
          }`}
        >
          {alertMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{alertMessage.text}</span>
          <button onClick={() => setAlertMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Toolbar */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-white shadow-lg shadow-red-950/40">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Property Data Center</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-medium">
                    Live Cloud Database
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  ระบบบริหารจัดการฐานข้อมูลอสังหาริมทรัพย์จริง • PostgreSQL Cloud Storage • asia-southeast1
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Refresh */}
            <button
              onClick={fetchProperties}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
              title="Refresh Data from Cloud SQL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Bulk Import */}
            <button
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Import</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative group">
              <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors">
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              <div className="absolute right-0 mt-1 w-44 rounded-lg bg-slate-900 border border-slate-800 shadow-2xl py-1 hidden group-hover:block z-30">
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Export Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-400" />
                  Export CSV (.csv)
                </button>
              </div>
            </div>

            {/* Backups */}
            <button
              onClick={() => setBackupModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
              title="Database Backup & Recovery"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Backups</span>
            </button>

            {/* Import History */}
            <button
              onClick={() => {
                setAuditModalTab('imports');
                setAuditModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
              title="Import History & Audit Records"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Import History</span>
            </button>

            {/* Data Quality Center */}
            <button
              onClick={() => {
                setAuditModalTab('data-quality');
                setAuditModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-amber-300 transition-colors"
              title="Data Quality Center & Diagnostic Engine"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Data Quality</span>
            </button>

            {/* Audit Logs */}
            <button
              onClick={() => {
                setAuditModalTab('audit');
                setAuditModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
              title="Audit Logs & History"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Audit Trail</span>
            </button>

            {/* Add Property */}
            <button
              onClick={() => {
                setEditingProperty(null);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-950/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Property</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Real Database Summary KPI Cards */}
      <div className="px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
        {/* Total */}
        <div
          onClick={() => {
            setStatusFilter('All');
            setQualityFilter(null);
          }}
          className={`cursor-pointer p-3 rounded-lg border transition-all ${
            statusFilter === 'All' && !qualityFilter
              ? 'bg-slate-800/90 border-slate-600 ring-1 ring-slate-500'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total</div>
          <div className="mt-1 text-xl font-bold text-white tracking-tight">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">All Records</div>
        </div>

        {/* Available */}
        <div
          onClick={() => {
            setStatusFilter('Available');
            setQualityFilter(null);
          }}
          className={`cursor-pointer p-3 rounded-lg border transition-all ${
            statusFilter === 'Available'
              ? 'bg-emerald-950/60 border-emerald-600 ring-1 ring-emerald-500'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
          }`}
        >
          <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Available</div>
          <div className="mt-1 text-xl font-bold text-emerald-300 tracking-tight">{stats.available}</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">พร้อมขาย/เช่า</div>
        </div>

        {/* Rented */}
        <div
          onClick={() => {
            setStatusFilter('Rented');
            setQualityFilter(null);
          }}
          className={`cursor-pointer p-3 rounded-lg border transition-all ${
            statusFilter === 'Rented'
              ? 'bg-blue-950/60 border-blue-600 ring-1 ring-blue-500'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
          }`}
        >
          <div className="text-[11px] font-medium text-blue-400 uppercase tracking-wider">Rented</div>
          <div className="mt-1 text-xl font-bold text-blue-300 tracking-tight">{stats.rented}</div>
          <div className="text-[10px] text-blue-500/80 mt-0.5">ปล่อยเช่าแล้ว</div>
        </div>

        {/* Sold */}
        <div
          onClick={() => {
            setStatusFilter('Sold');
            setQualityFilter(null);
          }}
          className={`cursor-pointer p-3 rounded-lg border transition-all ${
            statusFilter === 'Sold'
              ? 'bg-purple-950/60 border-purple-600 ring-1 ring-purple-500'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
          }`}
        >
          <div className="text-[11px] font-medium text-purple-400 uppercase tracking-wider">Sold</div>
          <div className="mt-1 text-xl font-bold text-purple-300 tracking-tight">{stats.sold}</div>
          <div className="text-[10px] text-purple-500/80 mt-0.5">ปิดการขายแล้ว</div>
        </div>

        {/* Draft */}
        <div
          onClick={() => {
            setPublishFilter('Draft');
            setQualityFilter(null);
          }}
          className={`cursor-pointer p-3 rounded-lg border transition-all ${
            publishFilter === 'Draft'
              ? 'bg-amber-950/60 border-amber-600 ring-1 ring-amber-500'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
          }`}
        >
          <div className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">Draft</div>
          <div className="mt-1 text-xl font-bold text-amber-300 tracking-tight">{stats.draft}</div>
          <div className="text-[10px] text-amber-500/80 mt-0.5">แบบร่าง</div>
        </div>

        {/* Published */}
        <div
          onClick={() => {
            setPublishFilter('Published');
            setQualityFilter(null);
          }}
          className={`cursor-pointer p-3 rounded-lg border transition-all ${
            publishFilter === 'Published'
              ? 'bg-teal-950/60 border-teal-600 ring-1 ring-teal-500'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
          }`}
        >
          <div className="text-[11px] font-medium text-teal-400 uppercase tracking-wider">Published</div>
          <div className="mt-1 text-xl font-bold text-teal-300 tracking-tight">{stats.published}</div>
          <div className="text-[10px] text-teal-500/80 mt-0.5">ออนไลน์บนเว็บ</div>
        </div>

        {/* Need Update */}
        <div
          onClick={() => {
            setQualityFilter(qualityFilter === 'need_update' ? null : 'need_update');
          }}
          className={`cursor-pointer p-3 rounded-lg border transition-all ${
            qualityFilter === 'need_update'
              ? 'bg-red-950/70 border-red-600 ring-1 ring-red-500'
              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
          }`}
        >
          <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider flex items-center justify-between">
            <span>Need Update</span>
            <Clock className="w-3 h-3 text-rose-400" />
          </div>
          <div className="mt-1 text-xl font-bold text-rose-300 tracking-tight">{stats.needUpdate}</div>
          <div className="text-[10px] text-rose-500/80 mt-0.5">&gt; 30 วันไม่ได้อัพเดต</div>
        </div>

        {/* Black List */}
        <div
          onClick={() => {
            setStatusFilter('All');
            setQualityFilter(null);
          }}
          className="p-3 rounded-lg border bg-slate-900/60 border-slate-800/80"
        >
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Black List</div>
          <div className="mt-1 text-xl font-bold text-slate-300 tracking-tight">{stats.blackList}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">รายการระงับ</div>
        </div>
      </div>

      {/* 3. Data Quality Inspector Bar */}
      <div className="px-4 sm:px-6 mb-2">
        <div className="rounded-lg bg-slate-900/90 border border-slate-800/90 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-slate-200">Data Quality Monitor:</span>
            <span className="text-slate-400 hidden sm:inline">คลิกปุ่มด้านขวาเพื่อกรองตรวจสอบข้อมูลที่ต้องปรับปรุง</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setQualityFilter(qualityFilter === 'missing_price' ? null : 'missing_price')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                qualityFilter === 'missing_price'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
              }`}
            >
              <span>Missing Price:</span>
              <span className="font-bold">{stats.quality.missingPrice}</span>
            </button>

            <button
              onClick={() => setQualityFilter(qualityFilter === 'missing_area' ? null : 'missing_area')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                qualityFilter === 'missing_area'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
              }`}
            >
              <span>Missing Area:</span>
              <span className="font-bold">{stats.quality.missingArea}</span>
            </button>

            <button
              onClick={() => setQualityFilter(qualityFilter === 'missing_photos' ? null : 'missing_photos')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                qualityFilter === 'missing_photos'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
              }`}
            >
              <span>Missing Photos:</span>
              <span className="font-bold">{stats.quality.missingPhotos}</span>
            </button>

            <button
              onClick={() => {
                setAuditModalTab('data-quality');
                setAuditModalOpen(true);
              }}
              className="px-2.5 py-1 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-colors ml-1"
              title="Open full Data Quality Center and Integrity Report"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Full Diagnostic Center</span>
            </button>

            {qualityFilter && (
              <button
                onClick={() => setQualityFilter(null)}
                className="px-2 py-1 rounded bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[11px]"
              >
                <X className="w-3 h-3" /> Clear Quality Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Search & Filter Bar */}
      <div className="px-4 sm:px-6 py-2">
        <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
          {/* Main Search Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Property ID, Project, Landlord Name, Phone, Room No, Agent, City, Area, District..."
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Select */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600"
            >
              <option value="All">All Categories</option>
              {VALID_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Sold">Sold</option>
              <option value="Rented">Rented</option>
              <option value="Inactive">Inactive</option>
            </select>

            {/* Label Select */}
            <select
              value={labelFilter}
              onChange={(e) => {
                setLabelFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600"
            >
              <option value="All">All Labels</option>
              <option value="Rent">Rent</option>
              <option value="Sale">Sale</option>
              <option value="Rent and Sale">Rent and Sale</option>
            </select>

            {/* Toggle Advanced Filters */}
            <button
              onClick={() => setFilterExpanded(!filterExpanded)}
              className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                filterExpanded
                  ? 'bg-red-950/80 border-red-700 text-red-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {filterExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Reset */}
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
              title="Reset all filters"
            >
              Reset
            </button>
          </div>

          {/* Advanced Collapsible Filter Row */}
          {filterExpanded && (
            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {/* Zone Filter */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Zone (Phuket)</label>
                <select
                  value={zoneFilter}
                  onChange={(e) => {
                    setZoneFilter(e.target.value);
                    setAreaFilter('All');
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                >
                  <option value="All">All Zones</option>
                  {Object.keys(PHUKET_ZONE_MAPPING).map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area Filter */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Area / Location</label>
                <select
                  value={areaFilter}
                  onChange={(e) => {
                    setAreaFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                >
                  <option value="All">All Areas</option>
                  {zoneFilter !== 'All' && PHUKET_ZONE_MAPPING[zoneFilter]
                    ? PHUKET_ZONE_MAPPING[zoneFilter].map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))
                    : Object.values(PHUKET_ZONE_MAPPING)
                        .flat()
                        .map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                </select>
              </div>

              {/* Agent Filter */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Agent</label>
                <select
                  value={agentFilter}
                  onChange={(e) => {
                    setAgentFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                >
                  <option value="All">All Agents</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Agency Type */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Agency Type</label>
                <select
                  value={agencyTypeFilter}
                  onChange={(e) => {
                    setAgencyTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                >
                  <option value="All">All Agency Types</option>
                  <option value="Exclusive">Exclusive</option>
                  <option value="Co-Broke">Co-Broke</option>
                  <option value="Direct">Direct</option>
                  <option value="Representative">Representative</option>
                </select>
              </div>

              {/* Pool */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Swimming Pool</label>
                <select
                  value={hasPoolFilter}
                  onChange={(e) => {
                    setHasPoolFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                >
                  <option value="All">All</option>
                  <option value="true">Has Pool</option>
                  <option value="false">No Pool</option>
                </select>
              </div>

              {/* Pet Friendly */}
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">Pet Friendly</label>
                <select
                  value={petFilter}
                  onChange={(e) => {
                    setPetFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200"
                >
                  <option value="All">All</option>
                  <option value="true">Allowed</option>
                  <option value="false">Not Allowed</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Bulk Action Floating Bar */}
      {selectedIds.length > 0 && (
        <div className="mx-4 sm:mx-6 my-2 p-3 bg-red-950/80 border border-red-700/80 rounded-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-white px-2.5 py-1 rounded bg-red-600">
              {selectedIds.length} Selected
            </span>
            <span className="text-xs text-red-200">Select bulk action:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Change Dropdown */}
            <select
              disabled={bulkProcessing}
              onChange={(e) => {
                if (e.target.value) handleBulkStatusChange(e.target.value);
              }}
              defaultValue=""
              className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
            >
              <option value="" disabled>
                Set Status...
              </option>
              <option value="Available">Available</option>
              <option value="Reserved">Reserved</option>
              <option value="Sold">Sold</option>
              <option value="Rented">Rented</option>
              <option value="Inactive">Inactive</option>
            </select>

            {/* Bulk Delete */}
            <button
              disabled={bulkProcessing}
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs font-medium rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 6. Main Data Table Container */}
      <div className="flex-1 px-4 sm:px-6 py-2 flex flex-col min-w-0">
        <div className="flex-1 rounded-lg bg-slate-900/80 border border-slate-800 overflow-hidden flex flex-col">
          {/* Table Header Controls */}
          <div className="px-4 py-2.5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-white">{properties.length}</strong> of{' '}
                <strong className="text-white">{totalCount}</strong> properties
              </span>
              {loading && <span className="text-red-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Fetching DB...</span>}
            </div>

            {/* Column Visibility Menu */}
            <div className="relative group">
              <button className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>Columns</span>
              </button>
              <div className="absolute right-0 mt-1 w-48 rounded bg-slate-900 border border-slate-800 shadow-2xl p-2 hidden group-hover:block z-30 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-semibold px-1">Toggle Columns</div>
                {Object.entries(columns).map(([key, val]) => (
                  <label key={key} className="flex items-center gap-2 px-1 py-0.5 text-xs text-slate-300 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={() => toggleColumn(key as any)}
                      className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-red-600"
                    />
                    <span className="capitalize">{key}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Real Table */}
          <div className="flex-1 overflow-auto min-h-[350px]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10 select-none">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-600"
                    />
                  </th>
                  {columns.propertyId && (
                    <th
                      onClick={() => {
                        setSortBy('propertyId');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="p-3 cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>Property ID</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                  )}
                  {columns.photo && <th className="p-3 w-16">Photo</th>}
                  {columns.title && <th className="p-3 min-w-[200px]">Project / Title</th>}
                  {columns.category && <th className="p-3">Category</th>}
                  {columns.location && <th className="p-3">Zone / Area</th>}
                  {columns.status && <th className="p-3">Status</th>}
                  {columns.price && (
                    <th
                      onClick={() => {
                        setSortBy('price');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="p-3 cursor-pointer hover:text-white whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>Price (THB)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                  )}
                  {columns.specs && <th className="p-3">Specs</th>}
                  {columns.agent && <th className="p-3">Agent</th>}
                  {columns.landlord && <th className="p-3">Landlord</th>}
                  {columns.followUp && <th className="p-3">Follow-up</th>}
                  {columns.website && <th className="p-3">Web Status</th>}
                  {columns.actions && <th className="p-3 text-right sticky right-0 bg-slate-950">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {properties.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-16 text-center text-slate-500">
                      <div className="max-w-xs mx-auto space-y-2">
                        <Database className="w-10 h-10 mx-auto text-slate-600" />
                        <div className="text-sm font-semibold text-slate-300">No properties found</div>
                        <div className="text-xs text-slate-500">
                          Try clearing filters, searching different keywords, or import properties via Excel/CSV.
                        </div>
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 px-3 py-1.5 rounded bg-slate-800 text-xs text-slate-300 hover:text-white"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  properties.map((p) => {
                    const isSelected = selectedIds.includes(p.propertyId);
                    const coverPhoto = p.images?.find((img: any) => img.isCover)?.url || p.images?.[0]?.url;

                    return (
                      <tr
                        key={p.propertyId}
                        className={`hover:bg-slate-800/50 transition-colors ${
                          isSelected ? 'bg-red-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(p.propertyId)}
                            className="rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-600"
                          />
                        </td>

                        {/* Property ID */}
                        {columns.propertyId && (
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-white bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/80">
                              {p.propertyId}
                            </span>
                          </td>
                        )}

                        {/* Photo */}
                        {columns.photo && (
                          <td className="p-3">
                            <div className="w-12 h-9 rounded bg-slate-800 overflow-hidden border border-slate-700 shrink-0 relative">
                              {coverPhoto ? (
                                <img
                                  src={coverPhoto}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                                  No Pic
                                </div>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Project / Title */}
                        {columns.title && (
                          <td className="p-3">
                            <div className="font-semibold text-slate-100 max-w-xs truncate" title={p.title}>
                              {p.title || p.projectName || '—'}
                            </div>
                            {p.titleTh && (
                              <div className="text-[11px] text-slate-400 max-w-xs truncate font-normal">
                                {p.titleTh}
                              </div>
                            )}
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {p.address ? `${p.address}, ` : ''}
                              {p.district}
                            </div>
                          </td>
                        )}

                        {/* Category */}
                        {columns.category && (
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60 font-medium">
                              {p.category}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">{p.propertyLabel}</div>
                          </td>
                        )}

                        {/* Location */}
                        {columns.location && (
                          <td className="p-3 whitespace-nowrap">
                            <div className="text-slate-300 font-medium">{p.zone || '—'}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-red-500 shrink-0" />
                              <span>{p.area || p.district}</span>
                            </div>
                          </td>
                        )}

                        {/* Status */}
                        {columns.status && (
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                p.status === 'Available'
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80'
                                  : p.status === 'Reserved'
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                                  : p.status === 'Sold'
                                  ? 'bg-purple-950/80 text-purple-300 border-purple-800/80'
                                  : p.status === 'Rented'
                                  ? 'bg-blue-950/80 text-blue-300 border-blue-800/80'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                        )}

                        {/* Price */}
                        {columns.price && (
                          <td className="p-3 whitespace-nowrap">
                            {Number(p.rentPrice) > 0 && (
                              <div className="text-emerald-400 font-medium">
                                ฿{Number(p.rentPrice).toLocaleString()} /mo
                              </div>
                            )}
                            {Number(p.price) > 0 && (
                              <div className="text-slate-200 font-semibold">
                                ฿{Number(p.price).toLocaleString()}
                              </div>
                            )}
                            {Number(p.rentPrice) === 0 && Number(p.price) === 0 && (
                              <span className="text-amber-500/80 text-[11px]">Price on Ask</span>
                            )}
                          </td>
                        )}

                        {/* Specs */}
                        {columns.specs && (
                          <td className="p-3 whitespace-nowrap text-slate-300">
                            <div>
                              {p.bedrooms || 0} Bed • {p.bathrooms || 0} Bath
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {Number(p.usableArea) > 0 ? `${p.usableArea} sq.m` : 'Area not set'}
                              {p.hasPool && ' • 🏊 Pool'}
                              {p.petFriendly && ' • 🐾 Pets'}
                            </div>
                          </td>
                        )}

                        {/* Agent */}
                        {columns.agent && (
                          <td className="p-3 whitespace-nowrap">
                            <div className="text-slate-200 font-medium">{p.agentName || '—'}</div>
                            <div className="text-[10px] text-slate-400">{p.agencyType || 'Co-Broke'}</div>
                          </td>
                        )}

                        {/* Landlord */}
                        {columns.landlord && (
                          <td className="p-3 whitespace-nowrap">
                            <div className="text-slate-200">{p.ownerName || '—'}</div>
                            {p.ownerPhone && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-slate-500" />
                                <span>{p.ownerPhone}</span>
                              </div>
                            )}
                          </td>
                        )}

                        {/* Follow-up */}
                        {columns.followUp && (
                          <td className="p-3 whitespace-nowrap text-[11px]">
                            {p.lastFollowUpDate ? (
                              <div className="text-slate-300">{p.lastFollowUpDate}</div>
                            ) : (
                              <span className="text-rose-400 font-medium">No record</span>
                            )}
                            <div className="text-[10px] text-slate-500">{p.lastFollowUpStatus || '—'}</div>
                          </td>
                        )}

                        {/* Web Status */}
                        {columns.website && (
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                p.publishStatus === 'Published'
                                  ? 'bg-teal-950 text-teal-300 border border-teal-800/80'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {p.publishStatus || 'Draft'}
                            </span>
                          </td>
                        )}

                        {/* Actions */}
                        {columns.actions && (
                          <td className="p-3 text-right whitespace-nowrap sticky right-0 bg-slate-900/90 backdrop-blur">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setViewingProperty(p);
                                  setDetailModalOpen(true);
                                }}
                                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProperty(p);
                                  setFormModalOpen(true);
                                }}
                                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                title="Edit Property"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(p.propertyId)}
                                className="p-1.5 rounded hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 7. Server-side Pagination Bar */}
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <span>
                Page <strong className="text-white">{page}</strong> of{' '}
                <strong className="text-white">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-white text-base">Confirm Delete Property</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete property{' '}
              <span className="font-mono font-bold text-white">{deleteConfirmId}</span> from the PostgreSQL database?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProperty(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-950"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Form Modal (Add / Edit) */}
      {formModalOpen && (
        <PropertyFormModal
          property={editingProperty}
          currentUser={currentUser}
          language={language}
          users={users}
          onSave={handleSavePropertyFromModal}
          onClose={() => {
            setFormModalOpen(false);
            setEditingProperty(null);
          }}
        />
      )}

      {/* Property Detail Modal */}
      {detailModalOpen && viewingProperty && (
        <PropertyDetailModal
          property={viewingProperty}
          currentUser={currentUser}
          language={language}
          onUpdateProperty={(updated) => {
            handleSavePropertyFromModal(updated);
            setViewingProperty(updated);
          }}
          onClose={() => {
            setDetailModalOpen(false);
            setViewingProperty(null);
          }}
        />
      )}

      {/* Safe Live Bulk Import Modal */}
      {importModalOpen && (
        <BulkImportModal
          currentUser={currentUser}
          onClose={() => setImportModalOpen(false)}
          onImportCompleted={() => {
            setImportModalOpen(false);
            showAlert('Bulk import completed successfully!');
            fetchProperties();
          }}
          onViewHistory={() => {
            setImportModalOpen(false);
            setAuditModalTab('imports');
            setAuditModalOpen(true);
          }}
          onFilterProperty={(propId) => {
            setSearch(propId);
          }}
        />
      )}

      {/* Audit Logs & Import History Modal */}
      {auditModalOpen && (
        <AuditLogsModal
          initialTab={auditModalTab}
          onClose={() => setAuditModalOpen(false)}
          onSelectProperty={(propId) => {
            setSearch(propId);
            setAuditModalOpen(false);
          }}
          onFilterByImport={(importId, propertyIds) => {
            if (propertyIds && propertyIds.length > 0) {
              setSearch(propertyIds[0]);
            } else {
              setSearch(importId);
            }
            setAuditModalOpen(false);
          }}
        />
      )}

      {/* Database Backup & Disaster Recovery Modal */}
      {backupModalOpen && (
        <BackupRecoveryModal
          currentUser={currentUser}
          onClose={() => setBackupModalOpen(false)}
          onRestored={() => {
            showAlert('Database restored successfully from backup snapshot!');
            fetchProperties();
          }}
        />
      )}
    </div>
  );
}

// (BulkImportModal extracted to /src/components/BulkImportModal.tsx)

// (AuditLogsModal extracted to /src/components/AuditLogsModal.tsx)

// -------------------------------------------------------------
// SUB-MODAL 3: DATABASE BACKUP & DATA RECOVERY
// -------------------------------------------------------------
function BackupRecoveryModal({
  currentUser,
  onClose,
  onRestored,
}: {
  currentUser: User;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backups');
      if (res.ok) {
        setBackups(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch backups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: currentUser.name }),
      });
      if (!res.ok) throw new Error('Backup creation failed');
      await fetchBackups();
      alert('Database backup snapshot created successfully!');
    } catch (err: any) {
      alert(`Error creating backup: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (
      !window.confirm(
        'WARNING: Restoring from this backup will overwrite current properties in the database with the snapshot data. Are you sure you wish to continue?'
      )
    ) {
      return;
    }

    setRestoringId(backupId);
    try {
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId, userName: currentUser.name }),
      });
      if (!res.ok) throw new Error('Database restore failed');
      onRestored();
      onClose();
    } catch (err: any) {
      alert(`Error restoring backup: ${err.message}`);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-white">Database Backup & Disaster Recovery</h2>
              <p className="text-[11px] text-slate-400">
                สร้าง Snapshot สำรองข้อมูลอสังหาริมทรัพย์ และกู้คืนข้อมูล (Recovery) ได้ตลอดเวลา
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-300">
            Available Snapshots: <strong className="text-white">{backups.length}</strong>
          </span>
          <button
            disabled={creating}
            onClick={handleCreateBackup}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
            <span>Create New Backup Snapshot</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
              Loading backup records...
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No database backups created yet. Click "Create New Backup Snapshot" above.
            </div>
          ) : (
            <div className="space-y-2.5">
              {backups.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-white flex items-center gap-2">
                      <span>{b.fileName}</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 text-[10px]">
                        {b.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-1">
                      Records: <strong className="text-slate-200">{b.recordCount}</strong> properties • Size:{' '}
                      {Math.round((b.fileSize || 0) / 1024)} KB • Created by {b.createdByName}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <button
                    disabled={restoringId === b.backupId}
                    onClick={() => handleRestoreBackup(b.backupId)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    {restoringId === b.backupId ? 'Restoring...' : 'Restore This Snapshot'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
