import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { User, PropertyCategory, PropertyStatus } from '../types';
import { PHUKET_ZONES } from './propertyConstants';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  RefreshCw,
  Download,
  Copy,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Fingerprint,
  FileText,
  Key,
  Clock,
  ChevronDown,
  Check,
  Filter,
  ListChecks,
  Image as ImageIcon,
  Layers,
  Eye,
  Trash2,
} from 'lucide-react';

const VALID_CATEGORIES = [
  'Villa',
  'Condo',
  'House',
  'Townhouse',
  'Commercial',
  'Land',
  'Apartment',
  'Penthouse',
];

const PHUKET_ZONE_MAPPING: Record<string, string[]> = {
  'Zone 1': ['Nai Thon', 'Nai Yang', 'Mai Khao', 'Thalang', 'Pa Klok'],
  'Zone 2': ['Bang Tao', 'Laguna', 'Layan', 'Cherng Talay', 'Surin'],
  'Zone 3': ['Kamala', 'Patong', 'Kalim', 'Kathu'],
  'Zone 4': ['Karon', 'Kata', 'Rawai', 'Nai Harn', 'Chalong', 'Sai Yuan'],
  'Zone 5': ['Phuket Town', 'Koh Kaew', 'Rassada', 'Wichit', 'Cape Panwa', 'Ao Po'],
};

interface BulkImportModalProps {
  currentUser: User;
  onClose: () => void;
  onImportCompleted: () => void;
  onViewHistory?: () => void;
  onFilterProperty?: (propertyId: string) => void;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function BulkImportModal({
  currentUser,
  onClose,
  onImportCompleted,
  onViewHistory,
  onFilterProperty,
}: BulkImportModalProps) {
  // Navigation: Step 1 to 6
  const [step, setStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);

  // Security & Parsing
  const [securityValidating, setSecurityValidating] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityCheck, setSecurityCheck] = useState<any | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Column Mapping
  const [canonicalFields, setCanonicalFields] = useState<any[]>([]);
  const [customMapping, setCustomMapping] = useState<Record<string, string>>({});
  const [mappingAnalyzing, setMappingAnalyzing] = useState(false);

  // Validation
  const [validRows, setValidRows] = useState<any[]>([]);
  const [invalidRows, setInvalidRows] = useState<{ row: number; data: any; errors: string[] }[]>([]);
  const [dupInFileCount, setDupInFileCount] = useState<number>(0);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid' | 'duplicates'>('all');

  // Dry Run & Strategy
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update' | 'new_id'>('skip');
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunError, setDryRunError] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<any | null>(null);
  const [tokenTimeLeft, setTokenTimeLeft] = useState<number>(900); // 15 mins countdown

  // Live Import Confirmation & Gate
  const [showLiveConfirmModal, setShowLiveConfirmModal] = useState(false);
  const [confirmAgreement, setConfirmAgreement] = useState(false);
  const [liveImportLoading, setLiveImportLoading] = useState(false);
  const [liveImportResult, setLiveImportResult] = useState<any | null>(null);
  const [liveImportError, setLiveImportError] = useState<string | null>(null);

  // UI state
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedImportId, setCopiedImportId] = useState(false);
  const [affectedSearch, setAffectedSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // B21 Image Matching States & Handlers
  const [uploadedImages, setUploadedImages] = useState<
    Array<{ file: File; fileName: string; fileSize: number; mimeType: string; dataUrl?: string }>
  >([]);
  const [imageMatchingSummary, setImageMatchingSummary] = useState<any | null>(null);
  const [imageMatchingLoading, setImageMatchingLoading] = useState(false);
  const [imageFilter, setImageFilter] = useState<'all' | 'Matched' | 'Unmatched' | 'Duplicate' | 'Invalid'>('all');
  const [previewTab, setPreviewTab] = useState<'excel' | 'images'>('excel');
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageFilesSelected = async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    const newUploaded: Array<{ file: File; fileName: string; fileSize: number; mimeType: string; dataUrl?: string }> = [];

    for (const f of fileArr) {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      let dataUrl: string | undefined;
      if (validExtensions.includes(ext) && f.size < 3 * 1024 * 1024) {
        try {
          dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(f);
          });
        } catch {
          // ignore preview error
        }
      }

      newUploaded.push({
        file: f,
        fileName: f.name,
        fileSize: f.size,
        mimeType: f.type || 'image/jpeg',
        dataUrl,
      });
    }

    setUploadedImages((prev) => [...prev, ...newUploaded]);
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearImages = () => {
    setUploadedImages([]);
    setImageMatchingSummary(null);
  };

  // RBAC Authorization Gate
  const isAuthorizedRole = ['Super Admin', 'Admin', 'Branch / Sales Manager', 'Director', 'System Admin'].some(
    (r) => r.toLowerCase() === (currentUser.role || '').toLowerCase()
  );

  // Token countdown timer
  useEffect(() => {
    if (!dryRunResult?.tokenExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((dryRunResult.tokenExpiresAt - Date.now()) / 1000));
      setTokenTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [dryRunResult?.tokenExpiresAt]);

  // File Download Template
  const handleDownloadTemplate = () => {
    window.location.href = '/api/template/download';
  };

  // Process File: Security check + Client parse + Column Mapping
  const processFile = async (selectedFile: File) => {
    setSecurityError(null);
    setSecurityCheck(null);
    setDryRunResult(null);
    setLiveImportResult(null);
    setLiveImportError(null);

    // 1. Client-side sanity checks
    if (selectedFile.size > 15 * 1024 * 1024) {
      setSecurityError(`File size (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 15 MB.`);
      return;
    }

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      setSecurityError('Invalid file format. Only CSV (.csv) and Excel (.xlsx, .xls) files are supported.');
      return;
    }

    setFile(selectedFile);
    setSecurityValidating(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const base64Content = arrayBufferToBase64(buffer);

      // 2. Call backend security validation
      const valRes = await fetch('/api/properties/validate-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          base64Content,
          mimeType: selectedFile.type,
        }),
      });

      const valData = await valRes.json();
      if (!valRes.ok || !valData.success) {
        setSecurityError(valData.error || 'File security inspection failed.');
        setSecurityValidating(false);
        return;
      }

      setSecurityCheck(valData.securityCheck);

      // 3. Client parse via XLSX
      const isCsv = selectedFile.name.toLowerCase().endsWith('.csv');
      let workbook: XLSX.WorkBook;
      if (isCsv) {
        const text = new TextDecoder('utf-8').decode(buffer).replace(/^\uFEFF/, '');
        workbook = XLSX.read(text, { type: 'string', raw: false });
      } else {
        workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false });
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!json || json.length === 0) {
        setSecurityError('Uploaded file contains no data rows.');
        setSecurityValidating(false);
        return;
      }

      const keys = Object.keys(json[0] || {});
      setHeaders(keys);
      setRawRows(json);

      // 4. Request smart column mapping analysis from server
      setMappingAnalyzing(true);
      const mapRes = await fetch('/api/properties/import-mapping-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers: keys }),
      });

      if (mapRes.ok) {
        const mapData = await mapRes.json();
        setCanonicalFields(mapData.canonicalFields || []);
        const initMap: Record<string, string> = {};
        if (mapData.mappedFields) {
          for (const [sCol, tField] of Object.entries(mapData.mappedFields)) {
            initMap[sCol] = tField as string;
          }
        }
        setCustomMapping(initMap);
      }
    } catch (err: any) {
      console.error('File processing error:', err);
      setSecurityError(err.message || 'Failed to inspect and parse file.');
    } finally {
      setSecurityValidating(false);
      setMappingAnalyzing(false);
    }
  };

  // Run validation on rawRows using customMapping
  const executeValidation = (rows: any[], mapping: Record<string, string>) => {
    const valid: any[] = [];
    const invalid: { row: number; data: any; errors: string[] }[] = [];
    const seenIds = new Set<string>();
    let dupCount = 0;

    rows.forEach((r, idx) => {
      const rowNum = idx + 2;
      const errors: string[] = [];

      let propId = '';
      let category = '';
      let zone = '';
      let area = '';
      let rentPrice = '';
      let salePrice = '';

      for (const [sCol, tField] of Object.entries(mapping)) {
        if (!tField || tField === '__skip__') continue;
        const val = String(r[sCol] ?? '').trim();
        if (tField === 'propertyId') propId = val;
        else if (tField === 'category') category = val;
        else if (tField === 'zone') zone = val;
        else if (tField === 'area') area = val;
        else if (tField === 'rentPrice') rentPrice = val;
        else if (tField === 'price') salePrice = val;
      }

      // Fallbacks
      if (!propId) propId = String(r['Property ID'] || r.propertyId || r.PropertyID || '').trim();
      if (!category) category = String(r['Category'] || r.category || 'Villa').trim();
      if (!zone) zone = String(r['Zone'] || r.zone || '').trim();
      if (!area) area = String(r['Area'] || r.area || '').trim();

      // Check Property ID
      if (!propId) {
        errors.push('Missing Property ID');
      } else {
        const canonicalId = propId.toUpperCase();
        if (seenIds.has(canonicalId)) {
          dupCount++;
          errors.push(`Duplicate Property ID "${propId}" inside uploaded file`);
        } else {
          seenIds.add(canonicalId);
        }
      }

      // Category check
      if (category && !VALID_CATEGORIES.some((c) => c.toLowerCase() === category.toLowerCase())) {
        errors.push(`Invalid Category "${category}". Allowed: ${VALID_CATEGORIES.join(', ')}`);
      }

      // Zone & Area Check
      if (zone && area && PHUKET_ZONE_MAPPING[zone]) {
        const allowed = PHUKET_ZONE_MAPPING[zone];
        const isMatch = allowed.some(
          (a) => a.toLowerCase() === area.toLowerCase() || area.toLowerCase().includes(a.toLowerCase())
        );
        if (!isMatch) {
          errors.push(`Area "${area}" does not belong to ${zone}. Allowed: ${allowed.join(', ')}`);
        }
      }

      // Numeric check
      if (rentPrice) {
        const cleanNum = rentPrice.replace(/,/g, '');
        if (isNaN(Number(cleanNum)) || Number(cleanNum) < 0) {
          errors.push(`Invalid Rent Price "${rentPrice}"`);
        }
      }
      if (salePrice) {
        const cleanNum = salePrice.replace(/,/g, '');
        if (isNaN(Number(cleanNum)) || Number(cleanNum) < 0) {
          errors.push(`Invalid Sale Price "${salePrice}"`);
        }
      }

      if (errors.length > 0) {
        invalid.push({ row: rowNum, data: r, errors });
      } else {
        valid.push(r);
      }
    });

    setValidRows(valid);
    setInvalidRows(invalid);
    setDupInFileCount(dupCount);
  };

  // Run Backend Dry Run Simulation (100% Read-Only, 0 DB mutations)
  const runBackendDryRun = async (mode: 'skip' | 'update' | 'new_id') => {
    if (rawRows.length === 0) return;
    setDryRunLoading(true);
    setDryRunError(null);

    try {
      const res = await fetch('/api/properties/import-dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawRows,
          options: {
            duplicateMode: mode,
            fileName: file?.name || 'import.xlsx',
            userName: currentUser.name,
            userId: currentUser.id,
            userRole: currentUser.role,
            customMapping,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDryRunResult(data);
        if (data.tokenExpiresAt) {
          const rem = Math.max(0, Math.floor((data.tokenExpiresAt - Date.now()) / 1000));
          setTokenTimeLeft(rem);
        }

        // B21 Image Matching execution alongside dry run
        if (uploadedImages.length > 0) {
          setImageMatchingLoading(true);
          try {
            const propCodes = rawRows
              .map((r) => r['Property ID'] || r.propertyId || r.PropertyId || r.property_id || r.code)
              .filter(Boolean);

            const imgMatchRes = await fetch('/api/properties/match-images', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                images: uploadedImages.map((img) => ({
                  fileName: img.fileName,
                  fileSize: img.fileSize,
                  mimeType: img.mimeType,
                  dataUrl: img.dataUrl,
                })),
                propertyCodes: propCodes,
              }),
            });

            const imgMatchData = await imgMatchRes.json();
            if (imgMatchRes.ok && imgMatchData.success) {
              setImageMatchingSummary(imgMatchData);
            }
          } catch (imgErr) {
            console.warn('Image matching error:', imgErr);
          } finally {
            setImageMatchingLoading(false);
          }
        }
      } else {
        setDryRunError(data.error || 'Dry run simulation failed');
      }
    } catch (err: any) {
      console.error('Dry run error:', err);
      setDryRunError(err.message || 'Dry-run network request failed');
    } finally {
      setDryRunLoading(false);
    }
  };

  // Export validation errors to Excel
  const handleDownloadErrors = () => {
    if (invalidRows.length === 0) return;
    const errorData = invalidRows.map((item) => ({
      __ROW_NUMBER: item.row,
      __VALIDATION_ERRORS: item.errors.join('; '),
      ...item.data,
    }));
    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Validation_Errors');
    XLSX.writeFile(wb, `import_errors_${Date.now()}.xlsx`);
  };

  // B14 / B15 / B21 Safe Live Import Confirmation
  const handleConfirmLiveImport = async () => {
    if (!dryRunResult?.importToken) {
      setLiveImportError('Import token is missing. Please run Dry-Run simulation first.');
      return;
    }

    setLiveImportLoading(true);
    setLiveImportError(null);

    try {
      const res = await fetch('/api/properties/import-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importToken: dryRunResult.importToken,
          confirmRealImport: true,
          fileFingerprint: dryRunResult.fileFingerprint,
          duplicateMode,
          fileName: file?.name || 'bulk_import.xlsx',
          user: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
          },
          matchedImages: imageMatchingSummary?.matchedByProperty,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLiveImportResult(data);
        setShowLiveConfirmModal(false);
        setStep(6); // Step 6: Final Results Dashboard
      } else {
        setLiveImportError(data.error || 'Live import execution failed');
      }
    } catch (err: any) {
      console.error('Live import error:', err);
      setLiveImportError(err.message || 'Network error during live import');
    } finally {
      setLiveImportLoading(false);
    }
  };

  // Check if Property ID is mapped
  const isPropertyIdMapped = Object.values(customMapping).includes('propertyId') ||
    headers.some((h) => ['property id', 'property_id', 'id', 'รหัสทรัพย์', 'รหัส'].includes(h.toLowerCase().trim()));

  // Filter rows for Step 3 preview
  const displayRows = previewFilter === 'all'
    ? rawRows
    : previewFilter === 'valid'
    ? validRows
    : previewFilter === 'invalid'
    ? invalidRows.map((i) => i.data)
    : invalidRows.filter((i) => i.errors.some((e) => e.includes('Duplicate'))).map((i) => i.data);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  PEAK REAL ESTATE — Production Import Center
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-700/60 text-emerald-300">
                  B15 Workflow
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Safe Live Import: Upload → Security Audit → Column Mapping → Phuket Rules → Dry-Run Simulation → Safety Gate → Live Commit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP PROGRESS TRACKER */}
        <div className="px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[620px] text-xs">
            {[
              { num: 1, label: 'Upload & Security' },
              { num: 2, label: 'Column Mapping' },
              { num: 3, label: 'Rules & Validation' },
              { num: 4, label: 'Simulation & Diffs' },
              { num: 5, label: 'Live Commit' },
            ].map((s, idx) => {
              const isActive = (step === s.num) || (step === 6 && s.num === 5);
              const isPast = step > s.num || (step === 6 && s.num <= 5);
              return (
                <div key={s.num} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isActive
                        ? 'bg-red-600 text-white ring-2 ring-red-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span
                    className={`font-medium ${
                      isActive ? 'text-white font-bold' : isPast ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                  {idx < 4 && <div className="w-8 h-0.5 bg-slate-800 ml-2" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">

          {/* ========================================================= */}
          {/* STEP 1: UPLOAD & SECURITY INSPECTION                     */}
          {/* ========================================================= */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-400">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Official Real Estate Template</h4>
                    <p className="text-[11px] text-slate-400">
                      ดาวน์โหลดไฟล์เทมเพลตมาตรฐาน (.xlsx) ที่มีหัวคอลัมน์ครบถ้วนตามฐานข้อมูลของ PEAK
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .XLSX Template</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-red-500/80 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-950/40 hover:bg-slate-900/40 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-red-500 group-hover:border-red-500/50 transition-colors">
                  {securityValidating ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white">
                  {securityValidating ? 'Inspecting File Security & Structure...' : 'Choose or Drag & Drop Property File'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: Excel (.xlsx, .xls) and CSV (.csv) — Maximum file size: 15 MB (Up to 5,000 rows)
                </p>
              </div>

              {/* Security Error Alert */}
              {securityError && (
                <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-white">Security Inspection Blocked File</div>
                    <div>{securityError}</div>
                  </div>
                </div>
              )}

              {/* Security Verified Badge */}
              {securityCheck && !securityError && file && (
                <div className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span>File Security & Structure Audit: VERIFIED (PASS)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-900/60 text-emerald-200 font-mono">
                      Safe File
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Clean File Name:</span>
                      <span className="text-white font-medium truncate block">{securityCheck.cleanFileName || file.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">File Size:</span>
                      <span className="text-white font-medium">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Detected Format:</span>
                      <span className="text-emerald-400 font-bold uppercase">{securityCheck.detectedType || 'Spreadsheet'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Rows Detected:</span>
                      <span className="text-white font-bold">{rawRows.length} Rows</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-emerald-300/80 space-y-1 pt-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Magic Bytes & MIME verified against executable injection</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Path traversal protected & formula injection sanitized</span>
                    </div>
                  </div>
                </div>
              )}

              {/* B21 Property Image Batch Upload Section */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-red-950/50 border border-red-800/50 text-red-400">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Property Images Batch Upload (B21 Image Matching)</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-red-950/80 border border-red-800 text-red-300 font-mono">
                          Optional
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        อัปโหลดรูปภาพหลายไฟล์พร้อมกันเพื่อจับคู่กับ Property Code อัตโนมัติ (เช่น PH001.jpg, PH001_01.jpg)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {uploadedImages.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearImages}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear All ({uploadedImages.length})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5 text-red-400" />
                      <span>Select Image Files</span>
                    </button>
                  </div>
                </div>

                {/* Dropzone for images */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleImageFilesSelected(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => imageInputRef.current?.click()}
                  className="border border-dashed border-slate-800 hover:border-red-500/60 rounded-lg p-4 text-center cursor-pointer transition-colors bg-slate-900/30 hover:bg-slate-900/60 group"
                >
                  <input
                    ref={imageInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleImageFilesSelected(e.target.files);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 group-hover:text-slate-200">
                    <ImageIcon className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
                    <span>Drop image files here or click to browse</span>
                    <span className="text-[10px] text-slate-500">(JPG, JPEG, PNG, WEBP)</span>
                  </div>
                </div>

                {/* Uploaded Images Preview Strip */}
                {uploadedImages.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Selected Images: <strong className="text-white">{uploadedImages.length} files</strong></span>
                      <span>Total size: <strong className="text-slate-300">{(uploadedImages.reduce((acc, i) => acc + i.fileSize, 0) / (1024 * 1024)).toFixed(2)} MB</strong></span>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-slate-900/50 rounded-lg border border-slate-800/80">
                      {uploadedImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 group"
                        >
                          {img.dataUrl ? (
                            <img
                              src={img.dataUrl}
                              alt={img.fileName}
                              className="w-6 h-6 object-cover rounded bg-slate-800 shrink-0"
                            />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                          <span className="font-mono text-[11px] truncate max-w-[130px]" title={img.fileName}>
                            {img.fileName}
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {(img.fileSize / 1024).toFixed(0)}KB
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(idx);
                            }}
                            className="text-slate-500 hover:text-rose-400 transition-colors ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: SMART COLUMN MAPPING REVIEW                      */}
          {/* ========================================================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Smart Column Mapping & Field Association</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                      {Object.keys(customMapping).filter((k) => customMapping[k] && customMapping[k] !== '__skip__').length} / {headers.length} Mapped
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ตรวจสอบการจับคู่ชื่อคอลัมน์ในไฟล์กับฟิลด์ของระบบ คุณสามารถปรับเปลี่ยนหรือข้ามคอลัมน์ที่ไม่ต้องการนำเข้าได้
                  </p>
                </div>
                {!isPropertyIdMapped && (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300 text-xs font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Property ID is Required</span>
                  </div>
                )}
              </div>

              {/* Column Mapping Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="max-h-[360px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
                      <tr>
                        <th className="p-3">Spreadsheet Column (Source)</th>
                        <th className="p-3">Sample Value (Row 1)</th>
                        <th className="p-3">Confidence</th>
                        <th className="p-3">Target Database Field</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {headers.map((hdr) => {
                        const targetField = customMapping[hdr] || '';
                        const sampleVal = rawRows[0] ? String(rawRows[0][hdr] ?? '') : '-';
                        const isMapped = targetField && targetField !== '__skip__';
                        const isRequired = targetField === 'propertyId';

                        return (
                          <tr key={hdr} className="hover:bg-slate-900/50">
                            <td className="p-3 font-semibold text-white">
                              <span>{hdr}</span>
                            </td>
                            <td className="p-3 text-slate-400 max-w-[180px] truncate">
                              {sampleVal || <span className="text-slate-600 italic">(empty)</span>}
                            </td>
                            <td className="p-3">
                              {isMapped ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                                  Mapped
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                                  Unmapped
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <select
                                value={targetField}
                                onChange={(e) => {
                                  setCustomMapping((prev) => ({
                                    ...prev,
                                    [hdr]: e.target.value,
                                  }));
                                }}
                                className={`w-full max-w-[240px] px-2.5 py-1.5 rounded bg-slate-900 border text-xs focus:outline-none focus:ring-1 ${
                                  isRequired
                                    ? 'border-emerald-600 text-emerald-300 focus:ring-emerald-500 font-bold'
                                    : isMapped
                                    ? 'border-slate-700 text-slate-200 focus:ring-slate-500'
                                    : 'border-slate-800 text-slate-500'
                                }`}
                              >
                                <option value="__skip__">[ Skip / Do Not Import ]</option>
                                <optgroup label="Core Identifiers & Titles">
                                  <option value="propertyId">Property ID (รหัสทรัพย์) *Required</option>
                                  <option value="title">Title / Project Name (ชื่อทรัพย์)</option>
                                  <option value="category">Category (ประเภททรัพย์ เช่น Villa/Condo)</option>
                                  <option value="propertyLabel">Property Label (ป้ายกำกับ)</option>
                                  <option value="status">Status (สถานะ เช่น Available)</option>
                                </optgroup>
                                <optgroup label="Phuket Location & Specs">
                                  <option value="zone">Zone (โซน เช่น Zone 2)</option>
                                  <option value="area">Area (พื้นที่ เช่น Rawai)</option>
                                  <option value="address">Address (ที่อยู่)</option>
                                  <option value="bedrooms">Bedrooms (ห้องนอน)</option>
                                  <option value="bathrooms">Bathrooms (ห้องน้ำ)</option>
                                  <option value="usableArea">Usable Area (พื้นที่ใช้สอย ตร.ม.)</option>
                                  <option value="landArea">Land Area (ขนาดที่ดิน)</option>
                                  <option value="floor">Floor (ชั้น)</option>
                                </optgroup>
                                <optgroup label="Pricing & Commercials">
                                  <option value="rentPrice">Rent Price (ราคาเช่า / เดือน)</option>
                                  <option value="price">Sale Price (ราคาขาย)</option>
                                  <option value="commonFee">Common Fee (ค่าส่วนกลาง)</option>
                                  <option value="commission">Commission %</option>
                                </optgroup>
                                <optgroup label="Amenities & Ownership">
                                  <option value="furniture">Furniture (เฟอร์นิเจอร์)</option>
                                  <option value="hasPool">Swimming Pool (สระว่ายน้ำ)</option>
                                  <option value="petFriendly">Pet Friendly (เลี้ยงสัตว์ได้)</option>
                                  <option value="agentName">Responsible Agent (เอเจนต์ผู้รับผิดชอบ)</option>
                                  <option value="agencyType">Agency Type (ประเภทเอเจนซี่)</option>
                                  <option value="ownerName">Owner Name (ชื่อเจ้าของ)</option>
                                  <option value="ownerPhone">Owner Phone (เบอร์ติดต่อเจ้าของ)</option>
                                  <option value="comments">Comments / Notes (บันทึกเพิ่มเติม)</option>
                                </optgroup>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: PHUKET RULES & DATA QUALITY VALIDATION           */}
          {/* ========================================================= */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Total Rows:</span>
                  <span className="text-xl font-bold text-white">{rawRows.length}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
                  <span className="text-[10px] text-emerald-400 block font-medium">Ready for Import:</span>
                  <span className="text-xl font-bold text-emerald-400">{validRows.length}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60">
                  <span className="text-[10px] text-rose-400 block font-medium">Validation Errors:</span>
                  <span className="text-xl font-bold text-rose-400">{invalidRows.length}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60">
                  <span className="text-[10px] text-amber-400 block font-medium">In-File Duplicates:</span>
                  <span className="text-xl font-bold text-amber-400">{dupInFileCount}</span>
                </div>
              </div>

              {/* Filter Tabs & Error Report Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <button
                    onClick={() => setPreviewFilter('all')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      previewFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({rawRows.length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      previewFilter === 'valid' ? 'bg-emerald-700 text-white' : 'text-emerald-400 hover:text-white'
                    }`}
                  >
                    Valid Only ({validRows.length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('invalid')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      previewFilter === 'invalid' ? 'bg-rose-700 text-white' : 'text-rose-400 hover:text-white'
                    }`}
                  >
                    Errors Only ({invalidRows.length})
                  </button>
                  {dupInFileCount > 0 && (
                    <button
                      onClick={() => setPreviewFilter('duplicates')}
                      className={`px-3 py-1 rounded-md font-medium transition-colors ${
                        previewFilter === 'duplicates' ? 'bg-amber-700 text-white' : 'text-amber-400 hover:text-white'
                      }`}
                    >
                      Duplicates ({dupInFileCount})
                    </button>
                  )}
                </div>

                {invalidRows.length > 0 && (
                  <button
                    onClick={handleDownloadErrors}
                    className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 text-xs font-semibold hover:bg-rose-900 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-rose-400" />
                    <span>Download Error Report (.xlsx)</span>
                  </button>
                )}
              </div>

              {/* Data Preview Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="max-h-[320px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
                      <tr>
                        <th className="p-2.5 w-14">Row</th>
                        <th className="p-2.5">Property ID</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Title / Project</th>
                        <th className="p-2.5">Zone & Area</th>
                        <th className="p-2.5">Status / Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {displayRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-500">
                            No rows matching selected filter.
                          </td>
                        </tr>
                      ) : (
                        displayRows.slice(0, 100).map((r, i) => {
                          const originalIndex = rawRows.indexOf(r);
                          const rowNum = originalIndex !== -1 ? originalIndex + 2 : i + 2;
                          const errorEntry = invalidRows.find((inv) => inv.row === rowNum);
                          const isInvalid = !!errorEntry;

                          let idVal = '';
                          let titleVal = '';
                          let catVal = '';
                          let zoneVal = '';
                          let areaVal = '';

                          for (const [sCol, tField] of Object.entries(customMapping)) {
                            if (tField === 'propertyId') idVal = String(r[sCol] ?? '');
                            else if (tField === 'title') titleVal = String(r[sCol] ?? '');
                            else if (tField === 'category') catVal = String(r[sCol] ?? '');
                            else if (tField === 'zone') zoneVal = String(r[sCol] ?? '');
                            else if (tField === 'area') areaVal = String(r[sCol] ?? '');
                          }

                          if (!idVal) idVal = String(r['Property ID'] || r.propertyId || '-');
                          if (!titleVal) titleVal = String(r['Title'] || r.title || '-');
                          if (!catVal) catVal = String(r['Category'] || r.category || 'Villa');
                          if (!zoneVal) zoneVal = String(r['Zone'] || r.zone || '-');
                          if (!areaVal) areaVal = String(r['Area'] || r.area || '-');

                          return (
                            <tr key={i} className={isInvalid ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'hover:bg-slate-900/40'}>
                              <td className="p-2.5 text-slate-500 font-mono text-[11px]">{rowNum}</td>
                              <td className="p-2.5 font-mono font-bold text-white">{idVal}</td>
                              <td className="p-2.5">{catVal}</td>
                              <td className="p-2.5 max-w-[180px] truncate text-slate-200">{titleVal}</td>
                              <td className="p-2.5 text-slate-400">
                                {zoneVal} {areaVal !== '-' ? `• ${areaVal}` : ''}
                              </td>
                              <td className="p-2.5">
                                {isInvalid ? (
                                  <div className="space-y-0.5">
                                    {errorEntry.errors.map((e, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-rose-950 border border-rose-800 text-rose-300 mr-1 mb-0.5"
                                      >
                                        {e}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 border border-emerald-800 text-emerald-300">
                                    Ready to Import
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: DUPLICATE STRATEGY & DRY-RUN SIMULATION          */}
          {/* ========================================================= */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Duplicate Mode Selector */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider text-slate-400">
                  Duplicate Handling Strategy (กลยุทธ์จัดการข้อมูลซ้ำในฐานข้อมูล)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'skip',
                      title: 'Skip Duplicates',
                      desc: 'ข้ามรายการที่มีรหัสตรงกับในฐานข้อมูล (คงข้อมูลเดิมไว้ 100%)',
                    },
                    {
                      id: 'update',
                      title: 'Update Existing',
                      desc: 'อัปเดตข้อมูลทับรายการเดิมด้วยฟิลด์ใหม่จากไฟล์',
                    },
                    {
                      id: 'new_id',
                      title: 'Create as New ID',
                      desc: 'สร้างเป็นรายการใหม่โดยต่อท้ายรหัสด้วย -N1, -N2',
                    },
                  ].map((m) => (
                    <label
                      key={m.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                        duplicateMode === m.id
                          ? 'border-red-600 bg-red-950/20 text-white'
                          : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{m.title}</span>
                          <input
                            type="radio"
                            name="dupMode"
                            checked={duplicateMode === m.id}
                            onChange={() => {
                              setDuplicateMode(m.id as any);
                              runBackendDryRun(m.id as any);
                            }}
                            className="text-red-600 focus:ring-red-500 bg-slate-900 border-slate-700"
                          />
                        </div>
                        <p className="text-[11px] text-slate-400">{m.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dry-Run Loading or Result */}
              {dryRunLoading ? (
                <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
                  <div className="text-sm font-bold text-white">Running 100% Read-Only Dry-Run Simulation...</div>
                  <p className="text-xs text-slate-400">
                    ระบบกำลังตรวจสอบความสอดคล้องกับฐานข้อมูล PostgreSQL โดยไม่มีการเขียนข้อมูลจริง
                  </p>
                </div>
              ) : dryRunResult ? (
                <div className="space-y-4">
                  {/* Token & Security Box */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-400">Active Import Token:</span>
                        <span className="font-mono text-emerald-400 font-bold">{dryRunResult.importToken}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(dryRunResult.importToken);
                            setCopiedToken(true);
                            setTimeout(() => setCopiedToken(false), 2000);
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Copy Token"
                        >
                          {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-slate-400">Token TTL:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {Math.floor(tokenTimeLeft / 60)}:{(tokenTimeLeft % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-400 truncate">
                        <Fingerprint className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>File SHA-256:</span>
                        <span className="font-mono text-slate-300 truncate">{dryRunResult.fileFingerprint}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Database State:</span>
                        <span className="text-emerald-300 font-medium">Verified & Synchronized</span>
                      </div>
                    </div>
                  </div>

                  {/* B21 Excel Import & Image Matching Counters */}
                  <div className="space-y-3">
                    {/* Excel Properties Summary */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>1. Excel / CSV Properties Analysis</span>
                        <span className="text-slate-500 font-normal">Total: {dryRunResult.summary.totalRows} rows</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                          <div className="text-[10px] font-bold text-emerald-400 uppercase">NEW (To Insert)</div>
                          <div className="text-xl font-bold text-emerald-400">{dryRunResult.summary.newCount}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/60">
                          <div className="text-[10px] font-bold text-blue-400 uppercase">UPDATED (Diffs)</div>
                          <div className="text-xl font-bold text-blue-400">{dryRunResult.summary.updatedCount}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60">
                          <div className="text-[10px] font-bold text-amber-400 uppercase">UNCHANGED</div>
                          <div className="text-xl font-bold text-amber-400">
                            {dryRunResult.summary.unchangedCount !== undefined
                              ? dryRunResult.summary.unchangedCount
                              : dryRunResult.summary.skippedCount}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60">
                          <div className="text-[10px] font-bold text-rose-400 uppercase">ERROR</div>
                          <div className="text-xl font-bold text-rose-400">
                            {dryRunResult.summary.errorCount !== undefined
                              ? dryRunResult.summary.errorCount
                              : (dryRunResult.summary.invalidCount + dryRunResult.summary.duplicateInFileCount)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Image Matching Summary (B21) */}
                    {(imageMatchingSummary || uploadedImages.length > 0) && (
                      <div className="pt-2 border-t border-slate-800/80">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-red-400" />
                            <span>2. Image Matching Analysis</span>
                          </span>
                          <span className="text-slate-500 font-normal">
                            Total: {imageMatchingSummary?.totalImages ?? uploadedImages.length} images
                          </span>
                        </div>
                        {imageMatchingLoading ? (
                          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-red-400" />
                            <span>Analyzing and matching image filenames to Property Codes...</span>
                          </div>
                        ) : imageMatchingSummary ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                              <div className="text-[10px] font-bold text-emerald-400 uppercase">MATCHED</div>
                              <div className="text-xl font-bold text-emerald-400">{imageMatchingSummary.matchedCount}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60">
                              <div className="text-[10px] font-bold text-amber-400 uppercase">UNMATCHED</div>
                              <div className="text-xl font-bold text-amber-400">{imageMatchingSummary.unmatchedCount}</div>
                              <div className="text-[9px] text-amber-500 font-mono mt-0.5">Strict: No Guessing</div>
                            </div>
                            <div className="p-3 rounded-lg bg-orange-950/40 border border-orange-800/60">
                              <div className="text-[10px] font-bold text-orange-400 uppercase">DUPLICATE</div>
                              <div className="text-xl font-bold text-orange-400">{imageMatchingSummary.duplicateCount}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60">
                              <div className="text-[10px] font-bold text-rose-400 uppercase">INVALID</div>
                              <div className="text-xl font-bold text-rose-400">{imageMatchingSummary.invalidCount}</div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Preview Tabs Switcher */}
                  <div className="flex items-center gap-2 border-b border-slate-800 pt-2">
                    <button
                      onClick={() => setPreviewTab('excel')}
                      className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                        previewTab === 'excel'
                          ? 'border-red-500 text-white bg-slate-900/60'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Property Diff & Verification ({dryRunResult.previewRows?.length || dryRunResult.summary.totalRows})</span>
                    </button>
                    {(imageMatchingSummary || uploadedImages.length > 0) && (
                      <button
                        onClick={() => setPreviewTab('images')}
                        className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                          previewTab === 'images'
                            ? 'border-red-500 text-white bg-slate-900/60'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>
                          Image Matching Gallery ({imageMatchingSummary?.totalImages ?? uploadedImages.length})
                        </span>
                      </button>
                    )}
                  </div>

                  {/* TAB 1: EXCEL DIFF & PROPERTY DETAILS */}
                  {previewTab === 'excel' && (
                    <div className="space-y-3">
                      {/* Live Diffs Viewer (If updating existing properties) */}
                      {dryRunResult.diffs && dryRunResult.diffs.length > 0 && (
                        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 space-y-2 p-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                              <span>Field Modification Diffs ({dryRunResult.diffs.length} Properties to Update)</span>
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              PostgreSQL Transaction Protected
                            </span>
                          </div>
                          <div className="max-h-[160px] overflow-y-auto divide-y divide-slate-800/60 text-xs">
                            {dryRunResult.diffs.map((diff: any, idx: number) => (
                              <div key={idx} className="py-2 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-blue-400">{diff.propertyId}</span>
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-950 border border-blue-800 text-blue-300">
                                    Preserve ID
                                  </span>
                                </div>
                                <div className="pl-3 space-y-0.5 text-[11px]">
                                  {diff.changes.map((c: any, cIdx: number) => (
                                    <div key={cIdx} className="text-slate-300">
                                      <span className="text-slate-500 font-medium">{c.label}:</span>{' '}
                                      <span className="text-rose-400 line-through mr-1">{String(c.oldVal || '-')}</span>
                                      <span className="text-slate-500">→</span>{' '}
                                      <span className="text-emerald-400 font-bold ml-1">{String(c.newVal || '-')}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Preview Rows Table with B21 Status */}
                      {dryRunResult.previewRows && dryRunResult.previewRows.length > 0 && (
                        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                          <div className="max-h-[220px] overflow-y-auto">
                            <table className="w-full text-left text-xs text-slate-300">
                              <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
                                <tr>
                                  <th className="p-2.5 w-14">Row</th>
                                  <th className="p-2.5">Property Code</th>
                                  <th className="p-2.5">Title</th>
                                  <th className="p-2.5">Classification</th>
                                  <th className="p-2.5">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {dryRunResult.previewRows.map((row: any, idx: number) => {
                                  const status = row.b21Status || (row.action === 'NEW' ? 'NEW' : row.action === 'UPDATE' ? 'UPDATED' : 'UNCHANGED');
                                  const badgeClass =
                                    status === 'NEW'
                                      ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                                      : status === 'UPDATED'
                                      ? 'bg-blue-950 border-blue-800 text-blue-300'
                                      : status === 'ERROR'
                                      ? 'bg-rose-950 border-rose-800 text-rose-300'
                                      : 'bg-amber-950 border-amber-800 text-amber-300';

                                  return (
                                    <tr key={idx} className="hover:bg-slate-900/40">
                                      <td className="p-2.5 text-slate-500 font-mono">{row.rowNumber}</td>
                                      <td className="p-2.5 font-mono font-bold text-white">{row.targetId}</td>
                                      <td className="p-2.5 text-slate-300 max-w-[200px] truncate">{row.title}</td>
                                      <td className="p-2.5">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${badgeClass}`}>
                                          {status}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-slate-400 text-[11px]">{row.reason}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: IMAGE MATCHING GALLERY (B21) */}
                  {previewTab === 'images' && imageMatchingSummary && (
                    <div className="space-y-3">
                      {/* Filter buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {(['all', 'Matched', 'Unmatched', 'Duplicate', 'Invalid'] as const).map((filter) => {
                          const count =
                            filter === 'all'
                              ? imageMatchingSummary.totalImages
                              : filter === 'Matched'
                              ? imageMatchingSummary.matchedCount
                              : filter === 'Unmatched'
                              ? imageMatchingSummary.unmatchedCount
                              : filter === 'Duplicate'
                              ? imageMatchingSummary.duplicateCount
                              : imageMatchingSummary.invalidCount;

                          return (
                            <button
                              key={filter}
                              onClick={() => setImageFilter(filter)}
                              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                imageFilter === filter
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              {filter === 'all' ? 'All Images' : filter} ({count})
                            </button>
                          );
                        })}
                      </div>

                      {/* Image Items Grid */}
                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
                          {imageMatchingSummary.items
                            .filter((item: any) => imageFilter === 'all' || item.status === imageFilter)
                            .map((item: any) => {
                              const badgeClass =
                                item.status === 'Matched'
                                  ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                                  : item.status === 'Unmatched'
                                  ? 'bg-amber-950 border-amber-800 text-amber-300'
                                  : item.status === 'Duplicate'
                                  ? 'bg-orange-950 border-orange-800 text-orange-300'
                                  : 'bg-rose-950 border-rose-800 text-rose-300';

                              return (
                                <div
                                  key={item.id}
                                  className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2 flex flex-col justify-between"
                                >
                                  <div className="flex items-start gap-2.5">
                                    {item.dataUrl ? (
                                      <img
                                        src={item.dataUrl}
                                        alt={item.fileName}
                                        className="w-12 h-12 rounded object-cover bg-slate-800 shrink-0 border border-slate-700"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                                        <ImageIcon className="w-6 h-6" />
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-mono text-white truncate" title={item.fileName}>
                                        {item.fileName}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        {(item.fileSize / 1024).toFixed(0)} KB • {item.mimeType}
                                      </div>
                                      <span
                                        className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold border font-mono ${badgeClass}`}
                                      >
                                        {item.status}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="pt-1 border-t border-slate-800/80 text-[10px]">
                                    {item.status === 'Matched' ? (
                                      <div className="text-emerald-400 font-mono flex items-center justify-between">
                                        <span>Target Property:</span>
                                        <strong className="text-white">{item.matchedPropertyId}</strong>
                                      </div>
                                    ) : (
                                      <div className="text-slate-400">{item.reason}</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* RBAC Simulation Barrier */}
              {!isAuthorizedRole && (
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-300 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Simulation Mode (Read-Only)</span>
                  </div>
                  <p className="text-amber-200/80 text-[11px]">
                    บัญชีของคุณมีบทบาท <strong>{currentUser.role}</strong> ซึ่งอนุญาตเฉพาะการทำ Dry-Run จำลองข้อมูลเท่านั้น
                    การนำเข้าสู่ฐานข้อมูลจริงต้องดำเนินการโดย Super Admin, Admin หรือ Sales Manager
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 6: LIVE IMPORT RESULTS DASHBOARD                     */}
          {/* ========================================================= */}
          {step === 6 && liveImportResult && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-6 rounded-xl bg-emerald-950/30 border-2 border-emerald-600/70 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-900/60 border border-emerald-500 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">Safe Live Import Completed Successfully!</h3>
                <p className="text-xs text-emerald-300/90 max-w-lg mx-auto">
                  บันทึกข้อมูลเข้าสู่ฐานข้อมูล PostgreSQL ของ PEAK REAL ESTATE เรียบร้อยแล้วภายใต้ Atomic Transaction ปลอดภัย 100%
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
                  <div className="px-3 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300 flex items-center gap-1.5">
                    <span className="text-slate-500">Import ID:</span>
                    <span className="text-emerald-400 font-bold">{liveImportResult.importId}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(liveImportResult.importId);
                        setCopiedImportId(true);
                        setTimeout(() => setCopiedImportId(false), 2000);
                      }}
                      className="text-slate-400 hover:text-white ml-1"
                    >
                      {copiedImportId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="px-3 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    <span className="text-slate-500">Duration:</span>{' '}
                    <span className="text-white font-bold">{liveImportResult.durationMs} ms</span>
                  </div>
                </div>
              </div>

              {/* KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Total Processed</div>
                  <div className="text-lg font-bold text-white">{liveImportResult.summary.totalRows}</div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                  <div className="text-[10px] text-emerald-400">New Created</div>
                  <div className="text-lg font-bold text-emerald-400">{liveImportResult.summary.newCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/60">
                  <div className="text-[10px] text-blue-400">Updated</div>
                  <div className="text-lg font-bold text-blue-400">{liveImportResult.summary.updatedCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
                  <div className="text-[10px] text-slate-400">Skipped</div>
                  <div className="text-lg font-bold text-slate-300">{liveImportResult.summary.skippedCount}</div>
                </div>
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60">
                  <div className="text-[10px] text-rose-400">Errors</div>
                  <div className="text-lg font-bold text-rose-400">{liveImportResult.summary.errorCount}</div>
                </div>
              </div>

              {/* Affected Properties List */}
              {liveImportResult.affectedPropertyIds && liveImportResult.affectedPropertyIds.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      Affected Properties ({liveImportResult.affectedPropertyIds.length})
                    </span>
                    <span className="text-[11px] text-slate-400">คลิกที่รหัสทรัพย์เพื่อกรองค้นหาในระบบ</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pt-1">
                    {liveImportResult.affectedPropertyIds.map((pId: string) => (
                      <button
                        key={pId}
                        onClick={() => {
                          if (onFilterProperty) onFilterProperty(pId);
                          onClose();
                          onImportCompleted();
                        }}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 font-mono text-xs transition-colors hover:border-emerald-500"
                      >
                        {pId}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          {/* Left button */}
          <div>
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Back to Upload
              </button>
            )}
            {step === 3 && (
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Back to Column Mapping
              </button>
            )}
            {step === 4 && (
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Back to Validation
              </button>
            )}
          </div>

          {/* Right button */}
          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                disabled={!file || securityValidating || !!securityError}
                onClick={() => {
                  setStep(2);
                }}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950 disabled:opacity-50 transition-colors"
              >
                <span>Proceed to Column Mapping</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                disabled={!isPropertyIdMapped}
                onClick={() => {
                  executeValidation(rawRows, customMapping);
                  setStep(3);
                }}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950 disabled:opacity-50 transition-colors"
              >
                <span>Validate Phuket Rules & Quality</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={() => {
                  setStep(4);
                  runBackendDryRun(duplicateMode);
                }}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-colors"
              >
                <span>Proceed to Dry-Run Simulation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 4 && isAuthorizedRole && (
              <button
                disabled={!dryRunResult || dryRunLoading || (dryRunResult.summary.newCount === 0 && dryRunResult.summary.updatedCount === 0)}
                onClick={() => {
                  setConfirmAgreement(false);
                  setLiveImportError(null);
                  setShowLiveConfirmModal(true);
                }}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-red-600 to-emerald-600 hover:from-red-500 hover:to-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-red-950/40 disabled:opacity-50 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Proceed to Production Confirmation</span>
              </button>
            )}

            {step === 6 && (
              <>
                {onViewHistory && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewHistory();
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    View in Import History
                  </button>
                )}
                <button
                  onClick={() => {
                    onClose();
                    onImportCompleted();
                  }}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-md shadow-emerald-950"
                >
                  Close & Refresh Data Center
                </button>
              </>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* B14 / B15 HIGH SECURITY CONFIRMATION GATE MODAL           */}
        {/* ========================================================= */}
        {showLiveConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
            <div className="bg-slate-900 border-2 border-red-600/70 rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500 flex items-center justify-center text-red-500 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Production Database Mutation Confirmation
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    B15 Safe Live Import Safety Gate — ยืนยันการบันทึกข้อมูลจริง
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <p>
                  คุณกำลังจะเขียนข้อมูลจริงลงในฐานข้อมูล PostgreSQL ของ <strong>PEAK REAL ESTATE</strong>:
                </p>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">File Name:</span>
                    <span className="text-white font-medium">{file?.name || 'import.xlsx'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Database:</span>
                    <span className="text-emerald-400 font-mono font-medium">PostgreSQL (Drizzle ORM)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duplicate Mode:</span>
                    <span className="text-amber-400 font-semibold uppercase">{duplicateMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">New Properties to Create:</span>
                    <span className="text-emerald-400 font-bold">{dryRunResult?.summary?.newCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Existing Properties to Update:</span>
                    <span className="text-blue-400 font-bold">{dryRunResult?.summary?.updatedCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Unchanged Properties:</span>
                    <span className="text-amber-400 font-bold">
                      {dryRunResult?.summary?.unchangedCount ?? dryRunResult?.summary?.skippedCount ?? 0}
                    </span>
                  </div>
                  {imageMatchingSummary && imageMatchingSummary.matchedCount > 0 && (
                    <div className="flex justify-between border-t border-slate-800/80 pt-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-red-400" />
                        <span>Matched Images to Attach:</span>
                      </span>
                      <span className="text-emerald-400 font-bold font-mono">
                        +{imageMatchingSummary.matchedCount} photos
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-800/80 pt-1">
                    <span className="text-slate-400">Active Import Token:</span>
                    <span className="text-slate-300 font-mono text-[10px]">{dryRunResult?.importToken}</span>
                  </div>
                </div>

                <div className="bg-emerald-950/20 p-2.5 rounded border border-emerald-900/40 text-[11px] text-emerald-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>B21 Production Safety & Transaction Guarantee</span>
                  </div>
                  <ul className="text-emerald-400/80 list-disc list-inside space-y-0.5 text-[10px]">
                    <li>PostgreSQL Atomic Transaction: Rollback ทั้งหมดทันทีหากเกิดข้อผิดพลาด</li>
                    <li>Preserve Property ID เดิม ไม่สร้างรหัสซ้ำ และไม่มีการ Hard Delete ข้อมูลใดๆ</li>
                    <li>Strict Image Matching: แนบรูปภาพเฉพาะไฟล์ที่จับคู่กับ Property Code ตรงกันเท่านั้น</li>
                    <li>Audit Log: บันทึกประวัติการแก้ไขและนำเข้ารูปภาพทุกรายการโดยละเอียด</li>
                  </ul>
                </div>

                {liveImportError && (
                  <div className="p-2.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                    <strong>Error:</strong> {liveImportError}
                  </div>
                )}

                <label className="flex items-start gap-2 pt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmAgreement}
                    onChange={(e) => setConfirmAgreement(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-800 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-[11px] text-slate-300">
                    ข้าพเจ้าได้ตรวจสอบผลการจำลอง Dry-Run และรายละเอียดฟิลด์อย่างถี่ถ้วนแล้ว ขอยืนยันให้ระบบทำการบันทึกข้อมูลเข้าสู่ฐานข้อมูลจริง (Live Import)
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800 text-xs">
                <button
                  disabled={liveImportLoading}
                  onClick={() => setShowLiveConfirmModal(false)}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={!confirmAgreement || liveImportLoading}
                  onClick={handleConfirmLiveImport}
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-red-950 disabled:opacity-50 transition-colors"
                >
                  {liveImportLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Executing Live Transaction...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Confirm & Execute Live Import</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
