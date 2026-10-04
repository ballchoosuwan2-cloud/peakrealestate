import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  FileSpreadsheet,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Layers,
  Clock,
  User,
  ShieldCheck,
  ShieldAlert,
  Download,
  Filter,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowRight,
  Sparkles,
  Database,
  Tag,
  Key,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';

export interface AuditLogsModalProps {
  initialTab?: 'audit' | 'imports' | 'data-quality';
  initialImportId?: string;
  onClose: () => void;
  onSelectProperty?: (propertyId: string) => void;
  onFilterByImport?: (importId: string, propertyIds?: string[]) => void;
}

export function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Formula injection defense
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function AuditLogsModal({
  initialTab = 'imports',
  initialImportId,
  onClose,
  onSelectProperty,
  onFilterByImport,
}: AuditLogsModalProps) {
  const [tab, setTab] = useState<'imports' | 'data-quality' | 'audit'>(initialTab);

  // --- TAB 1: IMPORT HISTORY STATE ---
  const [importRecords, setImportRecords] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [importStatusFilter, setImportStatusFilter] = useState('All');
  const [importModeFilter, setImportModeFilter] = useState('All');
  const [importOperatorFilter, setImportOperatorFilter] = useState('All');
  const [importDateRange, setImportDateRange] = useState('all');
  const [importStartDate, setImportStartDate] = useState('');
  const [importEndDate, setImportEndDate] = useState('');
  const [importSortBy, setImportSortBy] = useState('createdAt');
  const [importSortOrder, setImportSortOrder] = useState<'asc' | 'desc'>('desc');
  const [importPage, setImportPage] = useState(1);
  const [importPageSize, setImportPageSize] = useState(25);
  const [importPagination, setImportPagination] = useState({ page: 1, pageSize: 25, totalCount: 0, totalPages: 1 });

  // Detail Drill-Down Modal State
  const [drillDownImportId, setDrillDownImportId] = useState<string | null>(initialImportId || null);
  const [drillDownData, setDrillDownData] = useState<any | null>(null);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [drillDownRowTab, setDrillDownRowTab] = useState<'all' | 'insert' | 'update' | 'skip' | 'fail'>('all');
  const [drillDownSearch, setDrillDownSearch] = useState('');

  // --- TAB 2: DATA QUALITY STATE ---
  const [qualitySummary, setQualitySummary] = useState<any | null>(null);
  const [qualityIssues, setQualityIssues] = useState<any[]>([]);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualitySearch, setQualitySearch] = useState('');
  const [qualitySeverityFilter, setQualitySeverityFilter] = useState<'All' | 'Error' | 'Warning'>('All');
  const [qualityFieldFilter, setQualityFieldFilter] = useState('All');
  const [qualityPage, setQualityPage] = useState(1);
  const [qualityPageSize, setQualityPageSize] = useState(25);
  const [qualityPagination, setQualityPagination] = useState({ page: 1, pageSize: 25, totalCount: 0, totalPages: 1 });

  // --- TAB 3: AUDIT LOGS STATE ---
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('All');
  const [auditOperatorFilter, setAuditOperatorFilter] = useState('All');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(25);
  const [auditPagination, setAuditPagination] = useState({ page: 1, pageSize: 25, totalCount: 0, totalPages: 1 });

  // Copy indicator state
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // --- DATA FETCHERS ---

  // 1. Fetch Import History
  const fetchImportHistory = async () => {
    setImportLoading(true);
    try {
      const params = new URLSearchParams({
        format: 'paginated',
        page: importPage.toString(),
        pageSize: importPageSize.toString(),
        sortBy: importSortBy,
        sortOrder: importSortOrder,
      });

      if (importSearch.trim()) params.append('search', importSearch.trim());
      if (importStatusFilter !== 'All') params.append('status', importStatusFilter);
      if (importModeFilter !== 'All') params.append('mode', importModeFilter);
      if (importOperatorFilter !== 'All') params.append('operator', importOperatorFilter);
      if (importDateRange !== 'all') params.append('dateRange', importDateRange);
      if (importDateRange === 'custom') {
        if (importStartDate) params.append('startDate', importStartDate);
        if (importEndDate) params.append('endDate', importEndDate);
      }

      const res = await fetch(`/api/import-history?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.pagination) {
          setImportRecords(json.data);
          setImportPagination(json.pagination);
        } else if (Array.isArray(json)) {
          setImportRecords(json);
          setImportPagination({
            page: 1,
            pageSize: json.length,
            totalCount: json.length,
            totalPages: 1,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load import history:', err);
    } finally {
      setImportLoading(false);
    }
  };

  // 2. Fetch Drill-Down Detail
  const fetchImportDetail = async (importId: string) => {
    setDrillDownLoading(true);
    try {
      const res = await fetch(`/api/import-history/${encodeURIComponent(importId)}`);
      if (res.ok) {
        const data = await res.json();
        setDrillDownData(data);
      } else {
        setDrillDownData(null);
      }
    } catch (err) {
      console.error(`Failed to load import detail for ${importId}:`, err);
      setDrillDownData(null);
    } finally {
      setDrillDownLoading(false);
    }
  };

  // 3. Fetch Data Quality
  const fetchDataQuality = async () => {
    setQualityLoading(true);
    try {
      const params = new URLSearchParams({
        page: qualityPage.toString(),
        pageSize: qualityPageSize.toString(),
      });

      if (qualitySeverityFilter !== 'All') params.append('severity', qualitySeverityFilter);
      if (qualityFieldFilter !== 'All') params.append('field', qualityFieldFilter);
      if (qualitySearch.trim()) params.append('search', qualitySearch.trim());

      const res = await fetch(`/api/data-quality?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQualitySummary(data.summary);
          setQualityIssues(data.issues || []);
          if (data.pagination) setQualityPagination(data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to load data quality:', err);
    } finally {
      setQualityLoading(false);
    }
  };

  // 4. Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({
        format: 'paginated',
        page: auditPage.toString(),
        pageSize: auditPageSize.toString(),
      });

      if (auditSearch.trim()) params.append('search', auditSearch.trim());
      if (auditActionFilter !== 'All') params.append('action', auditActionFilter);
      if (auditOperatorFilter !== 'All') params.append('userName', auditOperatorFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.pagination) {
          setAuditLogs(json.data);
          setAuditPagination(json.pagination);
        } else if (Array.isArray(json)) {
          setAuditLogs(json);
          setAuditPagination({
            page: 1,
            pageSize: json.length,
            totalCount: json.length,
            totalPages: 1,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  // Trigger loads on tab change
  useEffect(() => {
    if (tab === 'imports') fetchImportHistory();
    if (tab === 'data-quality') fetchDataQuality();
    if (tab === 'audit') fetchAuditLogs();
  }, [tab]);

  // Trigger import re-fetch on filter/page change
  useEffect(() => {
    if (tab === 'imports') fetchImportHistory();
  }, [
    importPage,
    importPageSize,
    importSortBy,
    importSortOrder,
    importStatusFilter,
    importModeFilter,
    importOperatorFilter,
    importDateRange,
  ]);

  // Trigger quality re-fetch on filter/page change
  useEffect(() => {
    if (tab === 'data-quality') fetchDataQuality();
  }, [qualityPage, qualityPageSize, qualitySeverityFilter, qualityFieldFilter]);

  // Trigger audit re-fetch on page change
  useEffect(() => {
    if (tab === 'audit') fetchAuditLogs();
  }, [auditPage, auditPageSize, auditActionFilter, auditOperatorFilter]);

  // Trigger drill-down fetch
  useEffect(() => {
    if (drillDownImportId) {
      fetchImportDetail(drillDownImportId);
    } else {
      setDrillDownData(null);
    }
  }, [drillDownImportId]);

  // --- IMPORT OVERVIEW KPIS ---
  const importKPIs = useMemo(() => {
    const totalImports = importPagination.totalCount || importRecords.length;
    let successful = 0;
    let partial = 0;
    let failed = 0;
    let totalRows = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const r of importRecords) {
      if (r.status === 'Completed') successful++;
      else if (r.status === 'Partial') partial++;
      else failed++;

      totalRows += Number(r.totalRows || 0);
      totalNew += Number(r.newCount || 0);
      totalUpdated += Number(r.updatedCount || 0);
      totalSkipped += Number(r.skippedCount || 0);
      totalErrors += Number(r.errorCount || 0);
    }

    const successRate = totalRows > 0 ? Math.round(((totalRows - totalErrors) / totalRows) * 100) : 100;

    return {
      totalImports,
      successful,
      partial,
      failed,
      totalRows,
      totalNew,
      totalUpdated,
      totalSkipped,
      totalErrors,
      successRate,
    };
  }, [importRecords, importPagination]);

  // Operator options derived from records
  const operatorOptions = useMemo(() => {
    const ops = new Set<string>();
    importRecords.forEach((r) => {
      if (r.userName) ops.add(r.userName);
    });
    return Array.from(ops);
  }, [importRecords]);

  // Export Import History CSV
  const handleExportImportHistoryCsv = () => {
    const url = `/api/import-history?export=csv&search=${encodeURIComponent(importSearch)}&status=${encodeURIComponent(importStatusFilter)}&mode=${encodeURIComponent(importModeFilter)}`;
    window.open(url, '_blank');
  };

  // Export Data Quality Report CSV
  const handleExportQualityReportCsv = () => {
    if (!qualityIssues || qualityIssues.length === 0) return;
    const headers = ['Property ID', 'Field', 'Issue Type', 'Current Value', 'Severity', 'Message'];
    const rows = qualityIssues.map((i) => [
      escapeCsvCell(i.propertyId),
      escapeCsvCell(i.field),
      escapeCsvCell(i.issueType),
      escapeCsvCell(i.currentValue),
      escapeCsvCell(i.severity),
      escapeCsvCell(i.message),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `peak_data_quality_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Drill Down Detail CSV
  const handleExportDrillDownCsv = () => {
    if (!drillDownData) return;
    const headers = ['Row #', 'Property ID', 'Action', 'Status', 'Errors', 'Warnings', 'Diffs'];
    const rows = (drillDownData.rows || []).map((r: any) => [
      escapeCsvCell(r.row),
      escapeCsvCell(r.propertyId),
      escapeCsvCell(r.action),
      escapeCsvCell(r.status),
      escapeCsvCell((r.errors || []).join('; ')),
      escapeCsvCell((r.warnings || []).join('; ')),
      escapeCsvCell((r.changes || []).map((c: any) => `${c.field}: ${c.oldValue} -> ${c.newValue}`).join('; ')),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${drillDownData.importId}_execution_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered drill-down rows
  const filteredDrillDownRows = useMemo(() => {
    if (!drillDownData || !drillDownData.rows) return [];
    let list = drillDownData.rows;

    if (drillDownRowTab !== 'all') {
      list = list.filter((r: any) => {
        if (drillDownRowTab === 'insert') return r.action === 'INSERT';
        if (drillDownRowTab === 'update') return r.action === 'UPDATE';
        if (drillDownRowTab === 'skip') return r.action === 'SKIP';
        if (drillDownRowTab === 'fail') return r.status === 'Error' || r.action === 'FAIL';
        return true;
      });
    }

    if (drillDownSearch.trim()) {
      const q = drillDownSearch.trim().toLowerCase();
      list = list.filter(
        (r: any) =>
          String(r.propertyId || '').toLowerCase().includes(q) ||
          String(r.row || '').includes(q) ||
          (r.errors || []).some((e: string) => e.toLowerCase().includes(q))
      );
    }

    return list;
  }, [drillDownData, drillDownRowTab, drillDownSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        
        {/* TOP BRAND HEADER */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Import Management & Data Quality Center
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-950/80 text-red-400 border border-red-800/80">
                  B16 Verified
                </span>
              </div>
              <p className="text-xs text-slate-400">
                PEAK REAL ESTATE Property Operations, Audit Trail & Integrity Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (tab === 'imports') fetchImportHistory();
                if (tab === 'data-quality') fetchDataQuality();
                if (tab === 'audit') fetchAuditLogs();
              }}
              disabled={importLoading || qualityLoading || auditLoading}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Refresh Current View"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${importLoading || qualityLoading || auditLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Close Center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRIMARY NAVIGATION TABS */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto py-2.5">
            <button
              onClick={() => setTab('imports')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                tab === 'imports'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Import History & Monitoring</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
                {importPagination.totalCount || importRecords.length}
              </span>
            </button>

            <button
              onClick={() => setTab('data-quality')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                tab === 'data-quality'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Data Quality Center</span>
              {qualitySummary && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] border ${
                  qualitySummary.errors > 0 ? 'bg-red-950 text-red-300 border-red-800' : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}>
                  {qualitySummary.errors + qualitySummary.warnings} issues
                </span>
              )}
            </button>

            <button
              onClick={() => setTab('audit')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                tab === 'audit'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <History className="w-4 h-4 text-slate-400" />
              <span>Audit Trail</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
                {auditPagination.totalCount || auditLogs.length}
              </span>
            </button>
          </div>

          {/* Quick context info */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>PostgreSQL Active</span>
          </div>
        </div>

        {/* MAIN BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {/* ========================================================================= */}
          {/* TAB 1: IMPORT HISTORY & MONITORING */}
          {/* ========================================================================= */}
          {tab === 'imports' && (
            <div className="space-y-5">
              
              {/* 1. OVERVIEW KPIS */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Imports</div>
                  <div className="mt-1 text-2xl font-bold text-white">{importKPIs.totalImports}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500 flex items-center gap-1">
                    <span className="text-emerald-400">{importKPIs.successful} completed</span>
                    {importKPIs.failed > 0 && <span className="text-red-400">• {importKPIs.failed} failed</span>}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Rows Processed</div>
                  <div className="mt-1 text-2xl font-bold text-slate-200">{importKPIs.totalRows}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    Success Rate: <span className="font-semibold text-emerald-400">{importKPIs.successRate}%</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Created (New)</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-300">+{importKPIs.totalNew}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">Atomic INSERTs</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[11px] font-medium text-blue-400 uppercase tracking-wider">Updated</div>
                  <div className="mt-1 text-2xl font-bold text-blue-300">{importKPIs.totalUpdated}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">Merged Existing</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">Skipped / Failed</div>
                  <div className="mt-1 text-2xl font-bold text-rose-300">
                    {importKPIs.totalSkipped} / {importKPIs.totalErrors}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">Safety Guarded</div>
                </div>
              </div>

              {/* 2. SEARCH, FILTER & SORT CONTROLS */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search Import ID, filename, operator..."
                      value={importSearch}
                      onChange={(e) => {
                        setImportSearch(e.target.value);
                        setImportPage(1);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && fetchImportHistory()}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-600"
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={importStatusFilter}
                    onChange={(e) => {
                      setImportStatusFilter(e.target.value);
                      setImportPage(1);
                    }}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Completed">Completed</option>
                    <option value="Partial">Partial</option>
                    <option value="Failed">Failed</option>
                  </select>

                  {/* Mode Filter */}
                  <select
                    value={importModeFilter}
                    onChange={(e) => {
                      setImportModeFilter(e.target.value);
                      setImportPage(1);
                    }}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600"
                  >
                    <option value="All">All Modes</option>
                    <option value="skip">Mode: Skip</option>
                    <option value="update">Mode: Update</option>
                    <option value="new_id">Mode: New ID</option>
                  </select>

                  {/* Date Range */}
                  <select
                    value={importDateRange}
                    onChange={(e) => {
                      setImportDateRange(e.target.value);
                      setImportPage(1);
                    }}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="custom">Custom Date Range</option>
                  </select>

                  {/* Operator Filter */}
                  {operatorOptions.length > 0 && (
                    <select
                      value={importOperatorFilter}
                      onChange={(e) => {
                        setImportOperatorFilter(e.target.value);
                        setImportPage(1);
                      }}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600"
                    >
                      <option value="All">All Operators</option>
                      {operatorOptions.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Sorting */}
                  <select
                    value={`${importSortBy}:${importSortOrder}`}
                    onChange={(e) => {
                      const [by, ord] = e.target.value.split(':');
                      setImportSortBy(by);
                      setImportSortOrder(ord as any);
                    }}
                    className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600"
                  >
                    <option value="createdAt:desc">Latest First</option>
                    <option value="createdAt:asc">Oldest First</option>
                    <option value="totalRows:desc">Most Rows</option>
                    <option value="errorCount:desc">Most Failed</option>
                    <option value="updatedCount:desc">Most Updated</option>
                  </select>

                  {/* Export CSV Button */}
                  <button
                    onClick={handleExportImportHistoryCsv}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
                    title="Export Import History with Formula Injection Protection"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export CSV</span>
                  </button>
                </div>

                {/* Custom Date Range Pickers if selected */}
                {importDateRange === 'custom' && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-3 text-xs">
                    <span className="text-slate-400">Date Range:</span>
                    <input
                      type="date"
                      value={importStartDate}
                      onChange={(e) => setImportStartDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs"
                    />
                    <span className="text-slate-500">to</span>
                    <input
                      type="date"
                      value={importEndDate}
                      onChange={(e) => setImportEndDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs"
                    />
                    <button
                      onClick={() => fetchImportHistory()}
                      className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-medium text-xs"
                    >
                      Apply Dates
                    </button>
                  </div>
                )}
              </div>

              {/* 3. IMPORT MONITORING TABLE */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-[11px] uppercase font-medium text-slate-400 tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Import ID</th>
                        <th className="py-3 px-4">File Name</th>
                        <th className="py-3 px-4">Operator</th>
                        <th className="py-3 px-4">Mode</th>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-3 text-right">Rows</th>
                        <th className="py-3 px-3 text-right">New</th>
                        <th className="py-3 px-3 text-right">Updated</th>
                        <th className="py-3 px-3 text-right">Skipped</th>
                        <th className="py-3 px-3 text-right">Failed</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {importLoading ? (
                        <tr>
                          <td colSpan={12} className="py-12 text-center text-slate-400">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
                            Loading Import History records...
                          </td>
                        </tr>
                      ) : importRecords.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-12 text-center text-slate-400">
                            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                            No import history records found matching criteria.
                          </td>
                        </tr>
                      ) : (
                        importRecords.map((item) => {
                          const isCompleted = item.status === 'Completed';
                          const isPartial = item.status === 'Partial';
                          const isFailed = item.status === 'Failed';

                          return (
                            <tr
                              key={item.importId || item.id}
                              className="hover:bg-slate-850/60 transition-colors group"
                            >
                              {/* Import ID */}
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => setDrillDownImportId(item.importId)}
                                  className="font-mono text-[11px] font-semibold text-red-400 hover:text-red-300 underline decoration-red-500/40 underline-offset-2 flex items-center gap-1"
                                  title="Click to view full detail drill-down"
                                >
                                  <span>{item.importId}</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              </td>

                              {/* File Name */}
                              <td className="py-3 px-4">
                                <div className="font-medium text-slate-200 truncate max-w-[170px]" title={item.fileName}>
                                  {item.fileName || 'spreadsheet_upload.xlsx'}
                                </div>
                              </td>

                              {/* Operator */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5 text-slate-300">
                                  <User className="w-3 h-3 text-slate-500" />
                                  <span className="truncate max-w-[120px]">{item.userName || 'Admin'}</span>
                                </div>
                              </td>

                              {/* Mode */}
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                  {item.mode || item.duplicateMode || 'skip'}
                                </span>
                              </td>

                              {/* Date & Time */}
                              <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                                {item.createdAt ? new Date(item.createdAt).toLocaleString('th-TH') : '—'}
                              </td>

                              {/* Total Rows */}
                              <td className="py-3 px-3 text-right font-semibold text-slate-200">
                                {item.totalRows || 0}
                              </td>

                              {/* Inserted (New) */}
                              <td className="py-3 px-3 text-right font-semibold text-emerald-400">
                                {item.newCount > 0 ? `+${item.newCount}` : '0'}
                              </td>

                              {/* Updated */}
                              <td className="py-3 px-3 text-right font-semibold text-blue-400">
                                {item.updatedCount || 0}
                              </td>

                              {/* Skipped */}
                              <td className="py-3 px-3 text-right text-slate-400">
                                {item.skippedCount || 0}
                              </td>

                              {/* Failed */}
                              <td className="py-3 px-3 text-right font-semibold text-rose-400">
                                {item.errorCount || 0}
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                    isCompleted
                                      ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                                      : isPartial
                                      ? 'bg-amber-950/70 border-amber-700 text-amber-300'
                                      : 'bg-rose-950/70 border-rose-700 text-rose-300'
                                  }`}
                                >
                                  {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                                  {isPartial && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                                  {isFailed && <AlertCircle className="w-3 h-3 text-rose-400" />}
                                  <span>{item.status || 'Completed'}</span>
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setDrillDownImportId(item.importId)}
                                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                    title="View Full Import Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      setTab('audit');
                                      setAuditSearch(item.importId);
                                    }}
                                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                    title="View Related Audit Logs"
                                  >
                                    <History className="w-3.5 h-3.5 text-slate-400" />
                                  </button>

                                  {onFilterByImport && (
                                    <button
                                      onClick={() => onFilterByImport(item.importId, item.affectedPropertyIds)}
                                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                      title="Filter Property Center to this Import"
                                    >
                                      <Filter className="w-3.5 h-3.5 text-red-400" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <select
                      value={importPageSize}
                      onChange={(e) => {
                        setImportPageSize(Number(e.target.value));
                        setImportPage(1);
                      }}
                      className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>
                      Total: <strong className="text-white">{importPagination.totalCount}</strong> imports
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setImportPage((p) => Math.max(1, p - 1))}
                      disabled={importPage <= 1}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>
                      Page <strong className="text-white">{importPage}</strong> of{' '}
                      <strong className="text-white">{importPagination.totalPages}</strong>
                    </span>
                    <button
                      onClick={() => setImportPage((p) => Math.min(importPagination.totalPages, p + 1))}
                      disabled={importPage >= importPagination.totalPages}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: DATA QUALITY CENTER */}
          {/* ========================================================================= */}
          {tab === 'data-quality' && (
            <div className="space-y-5">
              
              {/* 1. DATA QUALITY KPIS */}
              {qualitySummary && (
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Properties</div>
                    <div className="mt-1 text-2xl font-bold text-white">{qualitySummary.totalProperties}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">Total in Database</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Clean & Valid</div>
                    <div className="mt-1 text-2xl font-bold text-emerald-300">{qualitySummary.valid}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {qualitySummary.totalProperties > 0
                        ? `${Math.round((qualitySummary.valid / qualitySummary.totalProperties) * 100)}% Pass Rate`
                        : '100%'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">Warnings</div>
                    <div className="mt-1 text-2xl font-bold text-amber-300">{qualitySummary.warnings}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">Minor anomalies</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">Errors</div>
                    <div className="mt-1 text-2xl font-bold text-rose-300">{qualitySummary.errors}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">Action required</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[11px] font-medium text-purple-400 uppercase tracking-wider">Duplicates</div>
                    <div className="mt-1 text-2xl font-bold text-purple-300">{qualitySummary.potentialDuplicates}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">Matching titles / IDs</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-[11px] font-medium text-orange-400 uppercase tracking-wider">Missing Fields</div>
                    <div className="mt-1 text-2xl font-bold text-orange-300">{qualitySummary.missingImportantFields}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">Price/Area/Contact</div>
                  </div>
                </div>
              )}

              {/* 2. QUALITY ISSUE CATEGORIES SUMMARY BAR */}
              {qualitySummary && qualitySummary.fieldBreakdown && Object.keys(qualitySummary.fieldBreakdown).length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    <span>Issue Breakdown:</span>
                  </span>
                  {Object.entries(qualitySummary.fieldBreakdown).map(([field, count]) => (
                    <button
                      key={field}
                      onClick={() => {
                        setQualityFieldFilter(qualityFieldFilter === field ? 'All' : field);
                        setQualityPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                        qualityFieldFilter.toLowerCase() === field.toLowerCase()
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="capitalize">{field}:</span>
                      <span className="font-bold text-amber-300">{count as number}</span>
                    </button>
                  ))}
                  {qualityFieldFilter !== 'All' && (
                    <button
                      onClick={() => setQualityFieldFilter('All')}
                      className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white underline ml-2"
                    >
                      Clear Field Filter
                    </button>
                  )}
                </div>
              )}

              {/* 3. SEARCH & CONTROLS */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[260px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search property ID, field, message, or issue type..."
                    value={qualitySearch}
                    onChange={(e) => {
                      setQualitySearch(e.target.value);
                      setQualityPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={qualitySeverityFilter}
                    onChange={(e) => {
                      setQualitySeverityFilter(e.target.value as any);
                      setQualityPage(1);
                    }}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600"
                  >
                    <option value="All">All Severities</option>
                    <option value="Error">Errors Only</option>
                    <option value="Warning">Warnings Only</option>
                  </select>

                  <button
                    onClick={handleExportQualityReportCsv}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
                    title="Export Data Quality Report CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Export Report</span>
                  </button>
                </div>
              </div>

              {/* 4. DATA QUALITY ISSUES TABLE */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-[11px] uppercase font-medium text-slate-400 tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Property ID</th>
                        <th className="py-3 px-4">Field</th>
                        <th className="py-3 px-4">Issue Type</th>
                        <th className="py-3 px-4">Current Value</th>
                        <th className="py-3 px-4 text-center">Severity</th>
                        <th className="py-3 px-4">Diagnostic Message</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {qualityLoading ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
                            Scanning database properties for anomalies...
                          </td>
                        </tr>
                      ) : qualityIssues.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                            All scanned properties passed quality and integrity checks!
                          </td>
                        </tr>
                      ) : (
                        qualityIssues.map((issue, idx) => {
                          const isError = issue.severity === 'Error';
                          return (
                            <tr key={`${issue.propertyId}-${issue.field}-${idx}`} className="hover:bg-slate-850/60 transition-colors">
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => {
                                    if (onSelectProperty) onSelectProperty(issue.propertyId);
                                  }}
                                  className="font-mono text-[11px] font-semibold text-red-400 hover:text-red-300 underline decoration-red-500/40"
                                >
                                  {issue.propertyId}
                                </button>
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-200">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 font-mono">
                                  {issue.field}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                                {issue.issueType}
                              </td>
                              <td className="py-3 px-4 text-slate-300 font-mono text-[11px] truncate max-w-[150px]">
                                {issue.currentValue || '—'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                    isError
                                      ? 'bg-rose-950/70 border-rose-700 text-rose-300'
                                      : 'bg-amber-950/70 border-amber-700 text-amber-300'
                                  }`}
                                >
                                  {isError ? <AlertCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                  <span>{issue.severity}</span>
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-300 text-xs">
                                {issue.message}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => {
                                    if (onSelectProperty) onSelectProperty(issue.propertyId);
                                  }}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs inline-flex items-center gap-1 transition-colors"
                                >
                                  <span>Inspect</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Quality Pagination Footer */}
                <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Issues per page:</span>
                    <select
                      value={qualityPageSize}
                      onChange={(e) => {
                        setQualityPageSize(Number(e.target.value));
                        setQualityPage(1);
                      }}
                      className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>
                      Total Issues: <strong className="text-white">{qualityPagination.totalCount}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQualityPage((p) => Math.max(1, p - 1))}
                      disabled={qualityPage <= 1}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>
                      Page <strong className="text-white">{qualityPage}</strong> of{' '}
                      <strong className="text-white">{qualityPagination.totalPages}</strong>
                    </span>
                    <button
                      onClick={() => setQualityPage((p) => Math.min(qualityPagination.totalPages, p + 1))}
                      disabled={qualityPage >= qualityPagination.totalPages}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: AUDIT TRAIL */}
          {/* ========================================================================= */}
          {tab === 'audit' && (
            <div className="space-y-4">
              
              {/* Controls */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search property ID, action, user, old/new value..."
                    value={auditSearch}
                    onChange={(e) => {
                      setAuditSearch(e.target.value);
                      setAuditPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-600"
                  />
                </div>

                <select
                  value={auditActionFilter}
                  onChange={(e) => {
                    setAuditActionFilter(e.target.value);
                    setAuditPage(1);
                  }}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600"
                >
                  <option value="All">All Actions</option>
                  <option value="Imported">Imported</option>
                  <option value="Updated">Updated</option>
                  <option value="Price Changed">Price Changed</option>
                  <option value="Status Changed">Status Changed</option>
                  <option value="Deleted">Deleted</option>
                </select>
              </div>

              {/* Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-[11px] uppercase font-medium text-slate-400 tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Property ID</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Operator</th>
                        <th className="py-3 px-4">Old Value</th>
                        <th className="py-3 px-4">New Value / Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {auditLoading ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
                            Loading Audit Trail logs...
                          </td>
                        </tr>
                      ) : auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            No audit logs found.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-850/60 transition-colors">
                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                              {log.createdAt ? new Date(log.createdAt).toLocaleString('th-TH') : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => {
                                  if (onSelectProperty && log.propertyId && log.propertyId !== 'BULK') {
                                    onSelectProperty(log.propertyId);
                                  }
                                }}
                                className="font-mono text-[11px] font-semibold text-red-400 hover:text-red-300"
                              >
                                {log.propertyId || '—'}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-200 border border-slate-700">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {log.userName || 'Admin'}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[180px]">
                              {log.oldValue || '—'}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-200 truncate max-w-[280px]">
                              {log.newValue || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Audit Pagination */}
                <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Total Records: <strong className="text-white">{auditPagination.totalCount}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      disabled={auditPage <= 1}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>
                      Page <strong className="text-white">{auditPage}</strong> of{' '}
                      <strong className="text-white">{auditPagination.totalPages}</strong>
                    </span>
                    <button
                      onClick={() => setAuditPage((p) => Math.min(auditPagination.totalPages, p + 1))}
                      disabled={auditPage >= auditPagination.totalPages}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* SUB-MODAL: IMPORT DETAIL DRILL-DOWN */}
        {/* ========================================================================= */}
        {drillDownImportId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
              
              {/* Drill-down Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white font-mono">{drillDownImportId}</h3>
                      {drillDownData && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            drillDownData.status === 'Completed'
                              ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                              : drillDownData.status === 'Partial'
                              ? 'bg-amber-950 border-amber-700 text-amber-300'
                              : 'bg-rose-950 border-rose-700 text-rose-300'
                          }`}
                        >
                          {drillDownData.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {drillDownData?.fileName || 'Spreadsheet Import Execution Audit'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportDrillDownCsv}
                    disabled={!drillDownData}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export Execution CSV</span>
                  </button>

                  <button
                    onClick={() => setDrillDownImportId(null)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drill-down Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {drillDownLoading ? (
                  <div className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-500" />
                    Loading granular execution record and audit trail...
                  </div>
                ) : !drillDownData ? (
                  <div className="py-16 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                    Import record not found or inaccessible.
                  </div>
                ) : (
                  <>
                    {/* Metadata Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">Operator</div>
                        <div className="text-xs font-semibold text-slate-200 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>{drillDownData.userName || 'Admin'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Role: System Operator</div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">Execution Duration</div>
                        <div className="text-xs font-semibold text-slate-200 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{drillDownData.durationMs ? `${drillDownData.durationMs} ms` : '< 500 ms'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Mode: {drillDownData.mode || 'skip'}</div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">Import Token</div>
                        <div className="text-xs font-mono font-semibold text-amber-300 mt-0.5 flex items-center gap-1">
                          <Key className="w-3 h-3 text-amber-500" />
                          <span>{drillDownData.maskedToken || '••••••••'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Single-use consumed</div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">File Fingerprint</div>
                        <div className="text-xs font-mono font-semibold text-blue-300 mt-0.5 flex items-center gap-1">
                          <Fingerprint className="w-3 h-3 text-blue-500" />
                          <span>{drillDownData.maskedFingerprint || '••••••••'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">SHA-256 Verified</div>
                      </div>
                    </div>

                    {/* Execution Summary Counters */}
                    <div className="grid grid-cols-5 gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Total Rows</div>
                        <div className="text-lg font-bold text-white">{drillDownData.totalRows || 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-400 uppercase">Inserted (New)</div>
                        <div className="text-lg font-bold text-emerald-400">+{drillDownData.newCount || 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-blue-400 uppercase">Updated</div>
                        <div className="text-lg font-bold text-blue-400">{drillDownData.updatedCount || 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Skipped</div>
                        <div className="text-lg font-bold text-slate-400">{drillDownData.skippedCount || 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-rose-400 uppercase">Errors</div>
                        <div className="text-lg font-bold text-rose-400">{drillDownData.errorCount || 0}</div>
                      </div>
                    </div>

                    {/* Row-Level Results Section */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          {(['all', 'insert', 'update', 'skip', 'fail'] as const).map((sub) => (
                            <button
                              key={sub}
                              onClick={() => setDrillDownRowTab(sub)}
                              className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                                drillDownRowTab === sub
                                  ? 'bg-slate-800 text-white border border-slate-700'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          placeholder="Filter rows by property ID or error..."
                          value={drillDownSearch}
                          onChange={(e) => setDrillDownSearch(e.target.value)}
                          className="px-3 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white placeholder:text-slate-500 w-56"
                        />
                      </div>

                      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60 max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-950 text-[10px] uppercase font-medium text-slate-400 sticky top-0 border-b border-slate-800">
                            <tr>
                              <th className="py-2 px-3">Row #</th>
                              <th className="py-2 px-3">Property ID</th>
                              <th className="py-2 px-3">Action</th>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3">Details / Changes / Errors</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {filteredDrillDownRows.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500">
                                  No rows matching selected filter.
                                </td>
                              </tr>
                            ) : (
                              filteredDrillDownRows.map((r: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-800/40">
                                  <td className="py-2 px-3 font-mono text-slate-400">{r.row || idx + 1}</td>
                                  <td className="py-2 px-3 font-mono font-semibold text-white">{r.propertyId || '—'}</td>
                                  <td className="py-2 px-3">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        r.action === 'INSERT'
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                          : r.action === 'UPDATE'
                                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                          : r.action === 'SKIP'
                                          ? 'bg-slate-900 text-slate-400 border border-slate-800'
                                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                                      }`}
                                    >
                                      {r.action}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-[11px]">
                                    {r.status === 'Success' ? (
                                      <span className="text-emerald-400">Success</span>
                                    ) : (
                                      <span className="text-rose-400 font-semibold">{r.status || 'Error'}</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-[11px] text-slate-300">
                                    {r.errors && r.errors.length > 0 && (
                                      <div className="text-rose-400 font-medium">
                                        {r.errors.join('; ')}
                                      </div>
                                    )}
                                    {r.changes && r.changes.length > 0 && (
                                      <div className="text-blue-300 font-mono text-[10px]">
                                        {r.changes.map((c: any, cidx: number) => (
                                          <div key={cidx}>
                                            {c.field}: <span className="line-through text-slate-500">{c.oldValue}</span> →{' '}
                                            <span className="text-emerald-400">{c.newValue}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {(!r.errors || r.errors.length === 0) && (!r.changes || r.changes.length === 0) && (
                                      <span className="text-slate-500">Normal processing</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Linked Audit Logs */}
                    {drillDownData.auditLogs && drillDownData.auditLogs.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-slate-400" />
                          <span>Directly Associated Audit Records ({drillDownData.auditLogs.length})</span>
                        </h4>
                        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60 max-h-44 overflow-y-auto">
                          <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-950 text-[10px] uppercase font-medium text-slate-400 border-b border-slate-800">
                              <tr>
                                <th className="py-2 px-3">Date</th>
                                <th className="py-2 px-3">Property</th>
                                <th className="py-2 px-3">Action</th>
                                <th className="py-2 px-3">Details</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {drillDownData.auditLogs.map((log: any) => (
                                <tr key={log.id} className="hover:bg-slate-800/30">
                                  <td className="py-1.5 px-3 text-slate-400 whitespace-nowrap">
                                    {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : '—'}
                                  </td>
                                  <td className="py-1.5 px-3 font-mono text-red-400">{log.propertyId}</td>
                                  <td className="py-1.5 px-3 font-medium text-slate-300">{log.action}</td>
                                  <td className="py-1.5 px-3 font-mono text-[10px] text-slate-300 truncate max-w-md">
                                    {log.newValue || log.oldValue || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Drill-down Footer Actions */}
              <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                <button
                  onClick={() => {
                    const impId = drillDownImportId;
                    setDrillDownImportId(null);
                    setTab('audit');
                    setAuditSearch(impId);
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View in Audit Trail</span>
                </button>

                {onFilterByImport && drillDownData && (
                  <button
                    onClick={() => {
                      onFilterByImport(drillDownData.importId, drillDownData.affectedPropertyIds);
                      setDrillDownImportId(null);
                      onClose();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-red-950/40 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Filter Property Data Center to Affected Records</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Alias for explicit B16 naming
export const ImportManagementCenterModal = AuditLogsModal;
