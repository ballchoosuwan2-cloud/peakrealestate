/**
 * PEAK REAL ESTATE - Bulk Property Import Engine
 * Comprehensive validation, column mapping, duplicate detection, and 100% READ-ONLY Dry Run
 */

import crypto from 'crypto';
import path from 'path';
import * as XLSX from 'xlsx';
import { eq, inArray, sql, asc } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  propertiesTable,
  importHistoryTable,
  auditLogsTable,
  DbProperty,
  InsertDbProperty,
} from '../db/schema.ts';
import { PHUKET_ZONE_MAPPING, VALID_CATEGORIES } from './db-service.ts';

// -------------------------------------------------------------
// 1. CANONICAL DATABASE FIELD DEFINITIONS & SYNONYMS
// -------------------------------------------------------------
export interface FieldDefinition {
  field: keyof InsertDbProperty | string;
  label: string;
  labelTh: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'json';
  allowedValues?: string[];
  synonyms: string[];
}

export const CANONICAL_FIELDS: FieldDefinition[] = [
  {
    field: 'propertyId',
    label: 'Property ID',
    labelTh: 'รหัสทรัพย์',
    required: true,
    type: 'string',
    synonyms: [
      'property id',
      'property_id',
      'propertyid',
      'id',
      'prop id',
      'code',
      'property code',
      'รหัสทรัพย์',
      'รหัส',
      'ลำดับทรัพย์',
    ],
  },
  {
    field: 'title',
    label: 'Property Title / Project Name',
    labelTh: 'ชื่อทรัพย์ / โครงการ',
    required: true,
    type: 'string',
    synonyms: [
      'title',
      'project',
      'project name',
      'project_name',
      'name',
      'property name',
      'listing title',
      'ชื่อโครงการ',
      'ชื่อทรัพย์',
      'โครงการ',
    ],
  },
  {
    field: 'titleTh',
    label: 'Project Name (Thai)',
    labelTh: 'ชื่อโครงการภาษาไทย',
    required: false,
    type: 'string',
    synonyms: [
      'title th',
      'title_th',
      'project th',
      'project_th',
      'project name th',
      'ชื่อภาษาไทย',
      'ชื่อไทย',
      'ชื่อโครงการ (ไทย)',
    ],
  },
  {
    field: 'category',
    label: 'Category',
    labelTh: 'ประเภททรัพย์',
    required: true,
    type: 'enum',
    allowedValues: [
      'House',
      'Condo',
      'Condominium',
      'Villa',
      'Land',
      'Commercial',
      'Hotel',
      'Warehouse',
      'Office',
    ],
    synonyms: [
      'category',
      'property category',
      'type',
      'property type',
      'ประเภททรัพย์',
      'หมวดหมู่',
      'ประเภท',
    ],
  },
  {
    field: 'status',
    label: 'Status',
    labelTh: 'สถานะ',
    required: false,
    type: 'enum',
    allowedValues: ['Available', 'Reserved', 'Sold', 'Rented', 'Inactive', 'Unavailable'],
    synonyms: [
      'status',
      'property status',
      'listing status',
      'state',
      'สถานะ',
      'สถานะทรัพย์',
    ],
  },
  {
    field: 'propertyLabel',
    label: 'Property Label',
    labelTh: 'รูปแบบการขาย/เช่า',
    required: false,
    type: 'enum',
    allowedValues: ['Rent', 'Sale', 'Rent and Sale'],
    synonyms: [
      'property label',
      'label',
      'deal type',
      'listing type',
      'sale/rent',
      'rent/sale',
      'รูปแบบ',
      'เช่า/ขาย',
      'ขาย/เช่า',
    ],
  },
  {
    field: 'zone',
    label: 'Phuket Zone',
    labelTh: 'โซนภูเก็ต',
    required: false,
    type: 'string',
    synonyms: ['zone', 'phuket zone', 'location zone', 'โซน', 'โซนพื้นที่'],
  },
  {
    field: 'area',
    label: 'Area / Sub-location',
    labelTh: 'ทำเล / ย่าน',
    required: false,
    type: 'string',
    synonyms: ['area', 'sub-area', 'location', 'sub location', 'ทำเล', 'ย่าน', 'พื้นที่'],
  },
  {
    field: 'district',
    label: 'District',
    labelTh: 'อำเภอ',
    required: false,
    type: 'string',
    synonyms: ['district', 'amphoe', 'amphur', 'อำเภอ'],
  },
  {
    field: 'city',
    label: 'City',
    labelTh: 'จังหวัด',
    required: false,
    type: 'string',
    synonyms: ['city', 'province', 'changwat', 'จังหวัด'],
  },
  {
    field: 'postalCode',
    label: 'Postal Code',
    labelTh: 'รหัสไปรษณีย์',
    required: false,
    type: 'string',
    synonyms: ['postal code', 'postal_code', 'zip code', 'zipcode', 'postcode', 'รหัสไปรษณีย์'],
  },
  {
    field: 'address',
    label: 'Address',
    labelTh: 'ที่อยู่',
    required: false,
    type: 'string',
    synonyms: ['address', 'address en', 'address th', 'address_en', 'address_th', 'ที่อยู่', 'ที่ตั้ง'],
  },
  {
    field: 'rentPrice',
    label: 'Rent Price (THB/month)',
    labelTh: 'ราคาเช่า (บาท/เดือน)',
    required: false,
    type: 'number',
    synonyms: [
      'rent price',
      'rent_price',
      'rental price',
      'rent (thb)',
      'rent',
      'monthly rent',
      'ราคาเช่า',
      'ค่าเช่า',
      'ค่าเช่าต่อเดือน',
    ],
  },
  {
    field: 'price',
    label: 'Sale Price (THB)',
    labelTh: 'ราคาขาย (บาท)',
    required: false,
    type: 'number',
    synonyms: [
      'sale price',
      'price',
      'selling price',
      'sale (thb)',
      'sale',
      'purchase price',
      'ราคาขาย',
      'ราคาซื้อขาย',
      'ราคา',
    ],
  },
  {
    field: 'usableArea',
    label: 'Usable Area (sq.m)',
    labelTh: 'พื้นที่ใช้สอย (ตร.ม.)',
    required: false,
    type: 'number',
    synonyms: [
      'usable area',
      'usable_area',
      'indoor area',
      'living area',
      'sqm',
      'area (sqm)',
      'พื้นที่ใช้สอย',
      'ขนาดพื้นที่ใช้สอย',
      'ขนาดพื้นที่',
    ],
  },
  {
    field: 'buildingArea',
    label: 'Building Area (sq.m)',
    labelTh: 'พื้นที่สิ่งปลูกสร้าง (ตร.ม.)',
    required: false,
    type: 'number',
    synonyms: [
      'building area',
      'building_area',
      'built area',
      'built_area',
      'house area',
      'พื้นที่อาคาร',
      'ขนาดตัวบ้าน',
      'พื้นที่สิ่งปลูกสร้าง',
    ],
  },
  {
    field: 'landArea',
    label: 'Land Area (sq.m)',
    labelTh: 'ขนาดที่ดิน (ตร.ม.)',
    required: false,
    type: 'number',
    synonyms: [
      'land',
      'land area',
      'land_area',
      'plot size',
      'land size',
      'ขนาดที่ดิน',
      'เนื้อที่',
      'ที่ดิน',
      'ขนาดแปลงที่ดิน',
    ],
  },
  {
    field: 'bedrooms',
    label: 'Bedrooms',
    labelTh: 'จำนวนห้องนอน',
    required: false,
    type: 'number',
    synonyms: ['bedroom', 'bedrooms', 'bed', 'beds', 'ห้องนอน', 'จำนวนห้องนอน'],
  },
  {
    field: 'bathrooms',
    label: 'Bathrooms',
    labelTh: 'จำนวนห้องน้ำ',
    required: false,
    type: 'number',
    synonyms: ['bathroom', 'bathrooms', 'bath', 'baths', 'ห้องน้ำ', 'จำนวนห้องน้ำ'],
  },
  {
    field: 'building',
    label: 'Building / Tower',
    labelTh: 'อาคาร / ตึก',
    required: false,
    type: 'string',
    synonyms: ['building', 'tower', 'building no', 'ตึก', 'อาคาร'],
  },
  {
    field: 'floor',
    label: 'Floor',
    labelTh: 'ชั้น',
    required: false,
    type: 'number',
    synonyms: ['floor', 'storey', 'level', 'ชั้น'],
  },
  {
    field: 'roomNo',
    label: 'Room Number',
    labelTh: 'เลขที่ห้อง',
    required: false,
    type: 'string',
    synonyms: ['room no', 'room_no', 'unit no', 'unit_no', 'ห้องเลขที่', 'เลขห้อง'],
  },
  {
    field: 'houseNo',
    label: 'House Number',
    labelTh: 'บ้านเลขที่',
    required: false,
    type: 'string',
    synonyms: ['house no', 'house_no', 'บ้านเลขที่'],
  },
  {
    field: 'furniture',
    label: 'Furniture Status',
    labelTh: 'เฟอร์นิเจอร์',
    required: false,
    type: 'string',
    synonyms: ['furniture', 'furnishing', 'เฟอร์นิเจอร์'],
  },
  {
    field: 'petFriendly',
    label: 'Pet Friendly',
    labelTh: 'อนุญาตสัตว์เลี้ยง',
    required: false,
    type: 'boolean',
    synonyms: ['pet', 'pets', 'pet friendly', 'pet_friendly', 'สัตว์เลี้ยง', 'เลี้ยงสัตว์'],
  },
  {
    field: 'hasPool',
    label: 'Has Swimming Pool',
    labelTh: 'มีสระว่ายน้ำ',
    required: false,
    type: 'boolean',
    synonyms: ['pool', 'swimming pool', 'has pool', 'has_pool', 'สระว่ายน้ำ'],
  },
  {
    field: 'poolType',
    label: 'Pool Type',
    labelTh: 'ประเภทสระว่ายน้ำ',
    required: false,
    type: 'string',
    synonyms: ['pool type', 'pool_type', 'ประเภทสระ'],
  },
  {
    field: 'yearBuilt',
    label: 'Year Built',
    labelTh: 'ปีที่สร้างเสร็จ',
    required: false,
    type: 'number',
    synonyms: ['year build', 'year built', 'year_built', 'year', 'ปีสร้าง', 'ปีที่สร้าง'],
  },
  {
    field: 'agentName',
    label: 'Agent Name',
    labelTh: 'ชื่อเอเจนต์',
    required: false,
    type: 'string',
    synonyms: ['agent', 'agent name', 'agent_name', 'broker', 'เอเจนต์', 'ตัวแทน'],
  },
  {
    field: 'agencyType',
    label: 'Agency Type',
    labelTh: 'ประเภทสัญญาเอเจนต์',
    required: false,
    type: 'string',
    synonyms: ['agency type', 'agency_type', 'contract type', 'ประเภทสัญญา'],
  },
  {
    field: 'ownerName',
    label: 'Landlord / Owner Name',
    labelTh: 'ชื่อเจ้าของทรัพย์',
    required: false,
    type: 'string',
    synonyms: [
      'landlord name',
      'landlord_name',
      'owner name',
      'owner_name',
      'landlord',
      'owner',
      'ชื่อเจ้าของ',
      'ผู้ให้เช่า',
    ],
  },
  {
    field: 'ownerPhone',
    label: 'Landlord Phone',
    labelTh: 'เบอร์โทรเจ้าของ',
    required: false,
    type: 'string',
    synonyms: [
      'landlord phone',
      'landlord_phone',
      'owner phone',
      'owner_phone',
      'phone',
      'tel',
      'contact number',
      'เบอร์โทร',
      'เบอร์โทรเจ้าของ',
    ],
  },
  {
    field: 'ownerEmail',
    label: 'Landlord Email',
    labelTh: 'อีเมลเจ้าของ',
    required: false,
    type: 'string',
    synonyms: ['landlord email', 'owner email', 'owner_email', 'email', 'อีเมล'],
  },
  {
    field: 'comments',
    label: 'Internal Notes / Comments',
    labelTh: 'หมายเหตุภายใน',
    required: false,
    type: 'string',
    synonyms: ['comments', 'comment', 'notes', 'remarks', 'remark', 'หมายเหตุ'],
  },
  {
    field: 'photoUrls',
    label: 'Photo URLs',
    labelTh: 'ลิงก์รูปภาพ',
    required: false,
    type: 'string',
    synonyms: ['photo urls', 'photo_urls', 'photos', 'images', 'image urls', 'รูปภาพ', 'ลิงก์รูปภาพ'],
  },
];

// Normalized lookup map for fast synonym resolution
const SYNONYM_MAP = new Map<string, FieldDefinition>();
CANONICAL_FIELDS.forEach((f) => {
  SYNONYM_MAP.set(f.field.toLowerCase(), f);
  SYNONYM_MAP.set(f.label.toLowerCase(), f);
  SYNONYM_MAP.set(f.labelTh.toLowerCase(), f);
  f.synonyms.forEach((syn) => {
    SYNONYM_MAP.set(syn.toLowerCase().trim(), f);
  });
});

// -------------------------------------------------------------
// 2. COLUMN MAPPING ANALYZER
// -------------------------------------------------------------
export interface ColumnMappingResult {
  mappedFields: {
    sourceColumn: string;
    targetField: string;
    targetLabel: string;
    targetLabelTh: string;
    confidence: 'exact' | 'synonym' | 'manual';
  }[];
  unmappedFields: {
    field: string;
    label: string;
    labelTh: string;
    required: boolean;
  }[];
  missingRequiredFields: {
    field: string;
    label: string;
    labelTh: string;
  }[];
  unknownFields: string[];
}

export function analyzeColumnMapping(
  sourceHeaders: string[],
  customMapping?: Record<string, string>
): ColumnMappingResult {
  const mappedFields: ColumnMappingResult['mappedFields'] = [];
  const mappedTargetFieldSet = new Set<string>();
  const unknownFields: string[] = [];

  sourceHeaders.forEach((rawHeader) => {
    const headerTrimmed = String(rawHeader || '').trim();
    if (!headerTrimmed) return;

    // 1. Check custom user mapping first
    if (customMapping && customMapping[headerTrimmed]) {
      const target = customMapping[headerTrimmed];
      const fieldDef = CANONICAL_FIELDS.find((f) => f.field === target);
      if (fieldDef) {
        mappedFields.push({
          sourceColumn: headerTrimmed,
          targetField: fieldDef.field,
          targetLabel: fieldDef.label,
          targetLabelTh: fieldDef.labelTh,
          confidence: 'manual',
        });
        mappedTargetFieldSet.add(fieldDef.field);
        return;
      }
    }

    // 2. Check exact or synonym match
    const normalizedHeader = headerTrimmed.toLowerCase().replace(/[_\s-]+/g, ' ');
    const matchedDef =
      SYNONYM_MAP.get(normalizedHeader) ||
      SYNONYM_MAP.get(headerTrimmed.toLowerCase());

    if (matchedDef) {
      const isExact =
        matchedDef.field.toLowerCase() === headerTrimmed.toLowerCase() ||
        matchedDef.label.toLowerCase() === headerTrimmed.toLowerCase();
      mappedFields.push({
        sourceColumn: headerTrimmed,
        targetField: matchedDef.field,
        targetLabel: matchedDef.label,
        targetLabelTh: matchedDef.labelTh,
        confidence: isExact ? 'exact' : 'synonym',
      });
      mappedTargetFieldSet.add(matchedDef.field);
    } else {
      unknownFields.push(headerTrimmed);
    }
  });

  const unmappedFields: ColumnMappingResult['unmappedFields'] = [];
  const missingRequiredFields: ColumnMappingResult['missingRequiredFields'] = [];

  CANONICAL_FIELDS.forEach((f) => {
    if (!mappedTargetFieldSet.has(f.field)) {
      unmappedFields.push({
        field: f.field,
        label: f.label,
        labelTh: f.labelTh,
        required: f.required,
      });
      if (f.required) {
        missingRequiredFields.push({
          field: f.field,
          label: f.label,
          labelTh: f.labelTh,
        });
      }
    }
  });

  return {
    mappedFields,
    unmappedFields,
    missingRequiredFields,
    unknownFields,
  };
}

// -------------------------------------------------------------
// 3. PROPERTY_ID NORMALIZATION & POLICY
// -------------------------------------------------------------
export interface PropertyIdNormalizationResult {
  canonicalId: string;
  originalId: string;
  hasWhitespaceAnomaly: boolean;
  isValid: boolean;
  error?: string;
}

export function normalizePropertyId(raw: any): PropertyIdNormalizationResult {
  const originalStr = String(raw ?? '');
  const trimmed = originalStr.trim();

  if (!trimmed) {
    return {
      canonicalId: '',
      originalId: originalStr,
      hasWhitespaceAnomaly: false,
      isValid: false,
      error: 'Property ID is empty or whitespace-only',
    };
  }

  const hasWhitespaceAnomaly =
    originalStr !== trimmed || /\s{2,}/.test(trimmed);

  // Policy: Trimmed and Uppercase for consistency
  const canonicalId = trimmed.toUpperCase();

  // Basic format sanity: must not contain invalid characters like quotes, tabs, or newlines
  if (/[\n\r\t"'`<>\\/]/.test(canonicalId)) {
    return {
      canonicalId,
      originalId: originalStr,
      hasWhitespaceAnomaly,
      isValid: false,
      error: `Property ID contains invalid characters: "${originalStr}"`,
    };
  }

  return {
    canonicalId,
    originalId: originalStr,
    hasWhitespaceAnomaly,
    isValid: true,
  };
}

// -------------------------------------------------------------
// 4. VALUE PARSERS, SANITIZATION & SECURITY AUDIT
// -------------------------------------------------------------

/**
 * Detects if a cell string contains an active spreadsheet formula injection payload
 * Targets cells beginning with =, @, \t, \r, or (+ / - followed by letters, formulas, commands)
 */
export function isDangerousFormula(val: any): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;

  // Direct formula triggers
  if (/^[=@\t\r]/.test(trimmed)) {
    return true;
  }

  // Formula triggers via + or - followed by letters, parentheses, pipes, or equations (e.g. +cmd, -SUM, +HYPERLINK)
  if (/^[\+\-]\s*[A-Za-z_=(|]/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Escapes formula injection by prefixing with a single quote (')
 * Preserves normal numeric values (e.g. -500000, +66812345678)
 */
export function escapeFormulaInjection(val: any): any {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (isDangerousFormula(trimmed)) {
    return `'${trimmed}`;
  }
  return val;
}

export function sanitizeString(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  return escapeFormulaInjection(str);
}

export function parseNumericField(
  val: any,
  fieldName: string,
  allowZero: boolean = true
): { value: number | null; error?: string } {
  if (val === null || val === undefined || val === '') {
    return { value: null };
  }
  // Remove commas, currency symbols, and spaces
  const cleaned = String(val).replace(/[,\s฿$]/g, '').trim();
  if (cleaned === '') return { value: null };

  const num = Number(cleaned);
  // Strictly verify finite number: rejects NaN, Infinity, -Infinity, unparseable strings
  if (!Number.isFinite(num)) {
    return {
      value: null,
      error: `Field "${fieldName}" contains invalid numeric value: "${val}"`,
    };
  }

  if (num < 0) {
    return {
      value: null,
      error: `Field "${fieldName}" cannot be negative (${num})`,
    };
  }

  if (!allowZero && num === 0) {
    return {
      value: null,
      error: `Field "${fieldName}" must be greater than zero`,
    };
  }

  return { value: num };
}

export function parseDateField(
  val: any,
  fieldName: string
): { value: string | null; error?: string } {
  if (val === null || val === undefined || val === '') {
    return { value: null };
  }

  // Handle Excel serial date numbers (e.g. 45200)
  if (typeof val === 'number' && val > 1000 && val < 100000) {
    const d = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      return { value: d.toISOString().split('T')[0] };
    }
  }

  const str = String(val).trim();
  if (!str) return { value: null };

  const d = new Date(str);
  if (isNaN(d.getTime())) {
    return {
      value: null,
      error: `Field "${fieldName}" contains invalid date format: "${str}"`,
    };
  }

  // Verify year, month, day components for date strings like YYYY-MM-DD
  const match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
      return {
        value: null,
        error: `Field "${fieldName}" contains out-of-range calendar date: "${str}"`,
      };
    }
  }

  return { value: d.toISOString().split('T')[0] };
}

export function parseJsonOrArrayField(
  val: any,
  fieldName: string
): { value: any | null; error?: string } {
  if (val === null || val === undefined || val === '') return { value: null };
  if (typeof val === 'object') return { value: val };
  const str = String(val).trim();
  if (!str) return { value: null };

  if (str.startsWith('{') || str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      return { value: parsed };
    } catch {
      return {
        value: null,
        error: `Field "${fieldName}" contains invalid JSON syntax: "${str}"`,
      };
    }
  }
  // Comma-separated list fallback
  return { value: str.split(',').map((s) => s.trim()).filter(Boolean) };
}

// -------------------------------------------------------------
// 4.1 FILE SECURITY VALIDATION & SPREADSHEET PARSING
// -------------------------------------------------------------
export interface FileSecurityCheckResult {
  isValid: boolean;
  cleanFileName: string;
  detectedType: 'csv' | 'xlsx' | 'xls' | 'unknown';
  error?: string;
}

export function validateFileSecurity(
  rawFileName: string,
  fileSize: number,
  fileBuffer?: Buffer,
  mimeType?: string
): FileSecurityCheckResult {
  // 1. Path Traversal & Filename Sanitization
  const baseName = path.basename(String(rawFileName || 'upload.xlsx')).replace(/\0/g, '');
  const cleanFileName = baseName.replace(/[^a-zA-Z0-9._\-\u0E00-\u0E7F]/g, '_');

  // 2. File Size Limit (15 MB)
  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
  if (fileSize > MAX_FILE_SIZE) {
    return {
      isValid: false,
      cleanFileName,
      detectedType: 'unknown',
      error: `File size (${(fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 15 MB`,
    };
  }

  // 3. MIME Type Validation (if provided)
  if (mimeType) {
    const validMimes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/csv',
      'text/plain',
      'application/octet-stream',
    ];
    if (!validMimes.some((m) => mimeType.toLowerCase().includes(m))) {
      return {
        isValid: false,
        cleanFileName,
        detectedType: 'unknown',
        error: `MIME type "${mimeType}" is not permitted. Only CSV and Excel files are allowed.`,
      };
    }
  }

  // 4. File Extension Check
  const ext = path.extname(cleanFileName).toLowerCase();
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  if (!allowedExtensions.includes(ext)) {
    return {
      isValid: false,
      cleanFileName,
      detectedType: 'unknown',
      error: `Invalid file extension "${ext}". Only .csv and .xlsx files are permitted`,
    };
  }

  // 5. Magic Bytes / Header Inspection
  if (fileBuffer && fileBuffer.length >= 4) {
    // Windows PE / EXE: 'MZ'
    if (fileBuffer[0] === 0x4d && fileBuffer[1] === 0x5a) {
      return {
        isValid: false,
        cleanFileName,
        detectedType: 'unknown',
        error: 'Security violation: Uploaded file has executable binary signature (MZ/PE header) disguised as spreadsheet',
      };
    }
    // Linux ELF: 7F 45 4C 46
    if (fileBuffer[0] === 0x7f && fileBuffer[1] === 0x45 && fileBuffer[2] === 0x4c && fileBuffer[3] === 0x46) {
      return {
        isValid: false,
        cleanFileName,
        detectedType: 'unknown',
        error: 'Security violation: Uploaded file has Linux binary executable signature (ELF)',
      };
    }

    if (ext === '.xlsx') {
      // XLSX must start with ZIP magic bytes: PK\x03\x04 (50 4B 03 04)
      const isZip = fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b && fileBuffer[2] === 0x03 && fileBuffer[3] === 0x04;
      if (!isZip) {
        return {
          isValid: false,
          cleanFileName,
          detectedType: 'unknown',
          error: 'File signature mismatch: File has .xlsx extension but does not contain valid OpenXML ZIP signature',
        };
      }
      return { isValid: true, cleanFileName, detectedType: 'xlsx' };
    }

    if (ext === '.csv') {
      const headerSnippet = fileBuffer.slice(0, 512).toString('utf8').toLowerCase();
      if (headerSnippet.includes('<script') || headerSnippet.includes('<?php') || headerSnippet.startsWith('#!/bin/')) {
        return {
          isValid: false,
          cleanFileName,
          detectedType: 'unknown',
          error: 'Security violation: CSV file contains disallowed script tags or shell executable header',
        };
      }
      return { isValid: true, cleanFileName, detectedType: 'csv' };
    }
  }

  return {
    isValid: true,
    cleanFileName,
    detectedType: ext === '.csv' ? 'csv' : 'xlsx',
  };
}

export function parseSpreadsheetBuffer(
  buffer: Buffer,
  fileName: string,
  maxRows: number = 5000
): {
  headers: string[];
  rows: any[];
  totalRows: number;
  warnings: string[];
} {
  const isCsv = fileName.toLowerCase().endsWith('.csv');
  let workbook: XLSX.WorkBook;

  if (isCsv) {
    // For CSV, decode UTF-8 string and strip potential BOM to ensure proper Thai and character fidelity
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    workbook = XLSX.read(text, {
      type: 'string',
      raw: false,
    });
  } else {
    workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      raw: false,
    });
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Spreadsheet contains no sheets');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error('First worksheet in workbook is empty');
  }

  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (rows.length > maxRows) {
    throw new Error(`Row limit exceeded: File contains ${rows.length} rows, maximum allowed is ${maxRows}`);
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return {
    headers,
    rows,
    totalRows: rows.length,
    warnings: [],
  };
}

// -------------------------------------------------------------
// 5. ROW VALIDATION INTERFACES
// -------------------------------------------------------------
export interface RowValidationError {
  row: number;
  propertyId: string;
  field?: string;
  sourceColumn?: string;
  errorType:
    | 'MISSING_REQUIRED'
    | 'INVALID_NUMBER'
    | 'INVALID_CATEGORY'
    | 'INVALID_STATUS'
    | 'INVALID_ZONE'
    | 'INVALID_DATE'
    | 'INVALID_JSON'
    | 'DUPLICATE_IN_FILE'
    | 'DUPLICATE_IN_DB'
    | 'SECURITY_FORMULA_INJECTION'
    | 'FORMAT'
    | 'VALIDATION';
  error: string;
  message: string;
}

export interface FieldDiff {
  field: string;
  label: string;
  oldVal: any;
  newVal: any;
}

export interface ValidatedRow {
  rowNum: number;
  originalData: any;
  canonicalId: string;
  category: string;
  status: string;
  propertyLabel: string;
  title: string;
  titleTh?: string;
  zone: string;
  area: string;
  district: string;
  city: string;
  postalCode: string;
  address: string;
  rentPrice: number | null;
  price: number | null;
  usableArea: number | null;
  landArea: number | null;
  bedrooms: number;
  bathrooms: number;
  floor: number | null;
  yearBuilt: number | null;
  building: string;
  roomNo: string;
  houseNo: string;
  furniture: string;
  petFriendly: boolean;
  hasPool: boolean;
  poolType: string;
  agentName: string;
  agencyType: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  comments: string;
  photoUrls?: string;
  isExistingInDb: boolean;
  dbRecord?: DbProperty;
  diffs?: FieldDiff[];
  classification: 'NEW' | 'UPDATE' | 'SKIP' | 'INVALID' | 'DUPLICATE_IN_FILE';
  generatedId?: string;
}

// -------------------------------------------------------------
// 6. DRY RUN ENGINE (100% READ ONLY) & SAFE LIVE IMPORT ENGINE
// -------------------------------------------------------------
export const AUTHORIZED_IMPORT_ROLES = [
  'Administrator',
  'Admin',
  'Super Admin',
  'Manager',
  'Branch / Sales Manager',
  'Director',
  'System Admin',
];

export interface PlanRow {
  action: 'NEW' | 'UPDATE' | 'SKIP' | 'NEW_ID';
  rowNum: number;
  propertyId: string;
  targetId: string;
  raw: Record<string, any>;
  mapped: Record<string, any>;
  diffs?: FieldDiff[];
  hasError: boolean;
}

export interface ImportTokenData {
  token: string;
  fileFingerprint: string;
  dbStateFingerprint: string;
  duplicateMode: 'skip' | 'update' | 'new_id';
  fileName: string;
  userName: string;
  userId?: string;
  userRole?: string;
  summary: DryRunResult['summary'];
  diffs: DryRunResult['diffs'];
  errors: RowValidationError[];
  previewRows: DryRunResult['previewRows'];
  planRows: PlanRow[];
  createdAt: number;
  expiresAt: number;
  status: 'ACTIVE' | 'PROCESSING' | 'CONSUMED' | 'EXPIRED';
}

export function computeFileFingerprint(rawRows: any[] | Buffer | string): string {
  const hash = crypto.createHash('sha256');
  if (Buffer.isBuffer(rawRows)) {
    hash.update(rawRows);
  } else if (typeof rawRows === 'string') {
    hash.update(rawRows);
  } else {
    hash.update(JSON.stringify(rawRows));
  }
  return hash.digest('hex');
}

export async function computeDbStateFingerprint(): Promise<string> {
  const records = await db
    .select({
      propertyId: propertiesTable.propertyId,
      updatedAt: propertiesTable.updatedAt,
      price: propertiesTable.price,
      rentPrice: propertiesTable.rentPrice,
      status: propertiesTable.status,
    })
    .from(propertiesTable)
    .orderBy(asc(propertiesTable.propertyId));

  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(records));
  return hash.digest('hex');
}

class ImportTokenManager {
  private tokens = new Map<string, ImportTokenData>();

  saveToken(data: ImportTokenData): void {
    this.tokens.set(data.token, data);
  }

  getToken(token: string): ImportTokenData | null {
    const data = this.tokens.get(token);
    if (!data) return null;
    if (Date.now() > data.expiresAt && data.status === 'ACTIVE') {
      data.status = 'EXPIRED';
    }
    return data;
  }

  markProcessing(token: string): { success: boolean; error?: string } {
    const data = this.getToken(token);
    if (!data) return { success: false, error: 'TOKEN_NOT_FOUND' };
    if (data.status === 'CONSUMED') return { success: false, error: 'TOKEN_ALREADY_CONSUMED' };
    if (data.status === 'PROCESSING') return { success: false, error: 'TOKEN_IN_PROGRESS' };
    if (data.status === 'EXPIRED') return { success: false, error: 'TOKEN_EXPIRED' };
    data.status = 'PROCESSING';
    return { success: true };
  }

  markConsumed(token: string): void {
    const data = this.tokens.get(token);
    if (data) {
      data.status = 'CONSUMED';
    }
  }

  markActive(token: string): void {
    const data = this.tokens.get(token);
    if (data && data.status === 'PROCESSING') {
      data.status = 'ACTIVE';
    }
  }

  clear(): void {
    this.tokens.clear();
  }
}

export const importTokenManager = new ImportTokenManager();

export interface DryRunOptions {
  duplicateMode: 'skip' | 'update' | 'new_id';
  fileName: string;
  userName: string;
  userId?: string;
  userRole?: string;
  customMapping?: Record<string, string>;
}

export interface DryRunResult {
  summary: {
    totalRows: number;
    newCount: number;
    existingCount: number;
    updatedCount: number;
    skippedCount: number;
    unchangedCount: number;
    duplicateInFileCount: number;
    invalidCount: number;
    errorCount: number;
  };
  columnMapping: ColumnMappingResult;
  diffs: {
    row: number;
    propertyId: string;
    originalId: string;
    changes: FieldDiff[];
  }[];
  errors: RowValidationError[];
  previewRows: {
    row: number;
    propertyId: string;
    title: string;
    category: string;
    status: string;
    price: number | null;
    rentPrice: number | null;
    classification: 'NEW' | 'UPDATE' | 'SKIP' | 'INVALID' | 'DUPLICATE_IN_FILE';
    b21Status?: 'NEW' | 'UPDATED' | 'UNCHANGED' | 'ERROR';
    notes: string;
  }[];
  dryRun: true;
  dbMutation: false;
  importToken: string;
  fileFingerprint: string;
  dbStateFingerprint: string;
  expiresAt: number;
}

/**
 * Execute Dry Run: 100% READ ONLY inspection of incoming data against database
 */
export async function executeImportDryRun(
  rawRows: any[],
  options: DryRunOptions
): Promise<DryRunResult> {
  const MAX_IMPORT_ROWS = 5000;
  if (rawRows.length > MAX_IMPORT_ROWS) {
    throw new Error(
      `Row limit exceeded: Input contains ${rawRows.length} rows, which exceeds the maximum allowed limit of ${MAX_IMPORT_ROWS} rows per import.`
    );
  }

  const totalRows = rawRows.length;
  const errors: RowValidationError[] = [];
  const diffs: DryRunResult['diffs'] = [];
  const previewRows: DryRunResult['previewRows'] = [];
  const planRows: PlanRow[] = [];

  let newCount = 0;
  let existingCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let duplicateInFileCount = 0;
  let invalidCount = 0;

  // Extract source headers
  const sourceHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
  const columnMapping = analyzeColumnMapping(sourceHeaders, options.customMapping);

  // Map of source column -> canonical field
  const headerToField = new Map<string, string>();
  columnMapping.mappedFields.forEach((m) => {
    headerToField.set(m.sourceColumn, m.targetField);
  });

  // 1. Gather all normalized property IDs for batch DB lookup
  const seenInFile = new Map<string, number>(); // canonicalId -> rowNum
  const candidateIds: string[] = [];

  rawRows.forEach((row) => {
    const rawId =
      row[columnMapping.mappedFields.find((m) => m.targetField === 'propertyId')?.sourceColumn || 'Property ID'] ||
      row.propertyId ||
      row['Property ID'] ||
      row.PropertyID ||
      row.id;
    const norm = normalizePropertyId(rawId);
    if (norm.isValid && norm.canonicalId) {
      candidateIds.push(norm.canonicalId);
    }
  });

  // 2. Fetch existing DB records in bulk (READ ONLY query)
  const existingMap = new Map<string, DbProperty>();
  if (candidateIds.length > 0) {
    // Generate case variants to ensure match regardless of DB case
    const idVariants: string[] = [];
    candidateIds.forEach((id) => {
      idVariants.push(id);
      idVariants.push(id.toUpperCase());
      idVariants.push(id.toLowerCase());
    });
    const uniqueVariants = Array.from(new Set(idVariants));

    // Query existing properties in chunks to prevent query param overflow
    const CHUNK_SIZE = 200;
    for (let i = 0; i < uniqueVariants.length; i += CHUNK_SIZE) {
      const chunk = uniqueVariants.slice(i, i + CHUNK_SIZE);
      const dbProps = await db
        .select()
        .from(propertiesTable)
        .where(inArray(propertiesTable.propertyId, chunk));
      dbProps.forEach((p) => {
        existingMap.set(p.propertyId.toUpperCase(), p);
      });
    }
  }

  // Set to track generated IDs for new_id mode to prevent collisions
  const generatedIdsSet = new Set<string>();

  // 3. Process and validate each row
  for (let idx = 0; idx < rawRows.length; idx++) {
    const raw = rawRows[idx];
    const rowNum = idx + 1; // 1-indexed

    // Map raw row to canonical fields
    const mappedRow: Record<string, any> = {};
    Object.entries(raw).forEach(([colName, colVal]) => {
      const canonicalField = headerToField.get(colName);
      if (canonicalField) {
        mappedRow[canonicalField] = colVal;
      } else {
        mappedRow[colName] = colVal; // Fallback
      }
    });

    let rowHasError = false;

    // --- Validate Property ID Early (to provide propertyId context for all row checks) ---
    const rawId = mappedRow.propertyId || raw['Property ID'] || raw.PropertyID || raw.id;
    const idNorm = normalizePropertyId(rawId);

    // --- Detect Spreadsheet Formula Injection across all raw string cells ---
    Object.entries(raw).forEach(([cellKey, cellVal]) => {
      if (typeof cellVal === 'string' && isDangerousFormula(cellVal)) {
        errors.push({
          row: rowNum,
          propertyId: String(rawId || ''),
          field: cellKey,
          sourceColumn: cellKey,
          errorType: 'SECURITY_FORMULA_INJECTION',
          error: `Cell "${cellKey}" contains potential spreadsheet formula injection: "${cellVal}"`,
          message: `Cell "${cellKey}" contains potential spreadsheet formula injection: "${cellVal}"`,
        });
        // Sanitize immediately to neutralize payload
        mappedRow[cellKey] = escapeFormulaInjection(cellVal);
      }
    });

    if (!idNorm.isValid) {
      const errType = !rawId ? 'MISSING_REQUIRED' : 'FORMAT';
      const errMsg = idNorm.error || 'Invalid Property ID';
      errors.push({
        row: rowNum,
        propertyId: String(rawId || ''),
        field: 'propertyId',
        sourceColumn: 'Property ID',
        errorType: errType,
        error: errMsg,
        message: errMsg,
      });
      invalidCount++;
      previewRows.push({
        row: rowNum,
        propertyId: String(rawId || ''),
        title: String(mappedRow.title || ''),
        category: String(mappedRow.category || ''),
        status: String(mappedRow.status || ''),
        price: null,
        rentPrice: null,
        classification: 'INVALID',
        b21Status: 'ERROR',
        notes: errMsg,
      });
      continue;
    }

    const canonicalId = idNorm.canonicalId;

    // --- Check Duplicate in File ---
    const isFileDup = seenInFile.has(canonicalId);
    if (isFileDup && options.duplicateMode !== 'new_id') {
      const prevRow = seenInFile.get(canonicalId);
      duplicateInFileCount++;
      const dupMsg = `Duplicate Property ID "${canonicalId}" found in file (already present at row ${prevRow})`;
      errors.push({
        row: rowNum,
        propertyId: canonicalId,
        field: 'propertyId',
        sourceColumn: 'Property ID',
        errorType: 'DUPLICATE_IN_FILE',
        error: dupMsg,
        message: dupMsg,
      });
      previewRows.push({
        row: rowNum,
        propertyId: canonicalId,
        title: String(mappedRow.title || ''),
        category: String(mappedRow.category || ''),
        status: String(mappedRow.status || ''),
        price: null,
        rentPrice: null,
        classification: 'DUPLICATE_IN_FILE',
        b21Status: 'ERROR',
        notes: `Duplicate in file: clashes with row ${prevRow}`,
      });
      continue;
    }
    seenInFile.set(canonicalId, rowNum);

    const existingDb = existingMap.get(canonicalId);

    // --- Validate Title (Required for new properties; preserved if updating) ---
    let title = String(mappedRow.title || raw['Project'] || raw['Project TH'] || '').trim();
    if (!title) {
      if (existingDb && options.duplicateMode === 'update') {
        title = existingDb.title; // Safe preservation of existing title
      } else {
        const titleMsg = 'Property Title / Project Name is required';
        errors.push({
          row: rowNum,
          propertyId: canonicalId,
          field: 'title',
          sourceColumn: 'title',
          errorType: 'MISSING_REQUIRED',
          error: titleMsg,
          message: titleMsg,
        });
        rowHasError = true;
      }
    }

    // --- Validate Category (Required for new properties; preserved if updating) ---
    let rawCategory = String(mappedRow.category || raw['Category'] || raw['category'] || '').trim();
    let matchedCategory: string | undefined;
    if (!rawCategory) {
      if (existingDb && options.duplicateMode === 'update') {
        rawCategory = existingDb.category;
        matchedCategory = existingDb.category;
      } else {
        const catMsg = 'Property Category is required';
        errors.push({
          row: rowNum,
          propertyId: canonicalId,
          field: 'category',
          sourceColumn: 'category',
          errorType: 'MISSING_REQUIRED',
          error: catMsg,
          message: catMsg,
        });
        rowHasError = true;
      }
    } else {
      matchedCategory = VALID_CATEGORIES.find(
        (c) => c.toLowerCase() === rawCategory.toLowerCase()
      );
      if (!matchedCategory) {
        const catErr = `Invalid Category "${rawCategory}". Allowed categories: ${VALID_CATEGORIES.join(', ')}`;
        errors.push({
          row: rowNum,
          propertyId: canonicalId,
          field: 'category',
          sourceColumn: 'category',
          errorType: 'INVALID_CATEGORY',
          error: catErr,
          message: catErr,
        });
        rowHasError = true;
      }
    }

    // --- Validate Status (Enum) ---
    const rawStatus = String(mappedRow.status || raw['Status'] || raw['Property Status'] || 'Available').trim();
    const VALID_STATUSES = ['Available', 'Reserved', 'Sold', 'Rented', 'Inactive', 'Unavailable'];
    const matchedStatus = VALID_STATUSES.find(
      (s) => s.toLowerCase() === rawStatus.toLowerCase()
    );
    if (rawStatus && !matchedStatus) {
      const statusErr = `Invalid Status "${rawStatus}". Allowed statuses: ${VALID_STATUSES.join(', ')}`;
      errors.push({
        row: rowNum,
        propertyId: canonicalId,
        field: 'status',
        sourceColumn: 'status',
        errorType: 'INVALID_STATUS',
        error: statusErr,
        message: statusErr,
      });
      rowHasError = true;
    }

    // --- Validate Phuket Zone & Area ---
    const rawZone = String(mappedRow.zone ?? raw['Zone'] ?? '').trim();
    const rawArea = String(mappedRow.area ?? raw['Area'] ?? '').trim();

    let zone = rawZone;
    let area = rawArea;

    if (rawZone) {
      if (!PHUKET_ZONE_MAPPING[rawZone]) {
        const zoneErr = `Invalid Zone "${rawZone}". Allowed zones: ${Object.keys(PHUKET_ZONE_MAPPING).join(', ')}`;
        errors.push({
          row: rowNum,
          propertyId: canonicalId,
          field: 'zone',
          sourceColumn: 'zone',
          errorType: 'INVALID_ZONE',
          error: zoneErr,
          message: zoneErr,
        });
        rowHasError = true;
      } else if (rawArea) {
        const allowedAreas = PHUKET_ZONE_MAPPING[rawZone];
        const areaMatched = allowedAreas.some(
          (a) => a.toLowerCase() === rawArea.toLowerCase() || rawArea.toLowerCase().includes(a.toLowerCase())
        );
        if (!areaMatched) {
          const zoneErr = `Area "${rawArea}" does not belong to ${rawZone}. Allowed: ${allowedAreas.join(', ')}`;
          errors.push({
            row: rowNum,
            propertyId: canonicalId,
            field: 'area',
            sourceColumn: 'area',
            errorType: 'INVALID_ZONE',
            error: zoneErr,
            message: zoneErr,
          });
          rowHasError = true;
        }
      }
    } else {
      zone = 'Zone 2';
      area = rawArea || 'Rawai';
    }

    // --- Validate Numeric Fields ---
    const rentPriceRes = parseNumericField(mappedRow.rentPrice ?? raw['Rent Price'], 'rentPrice');
    if (rentPriceRes.error) {
      errors.push({
        row: rowNum,
        propertyId: canonicalId,
        field: 'rentPrice',
        sourceColumn: 'Rent Price',
        errorType: 'INVALID_NUMBER',
        error: rentPriceRes.error,
        message: rentPriceRes.error,
      });
      rowHasError = true;
    }

    const priceRes = parseNumericField(mappedRow.price ?? raw['Sale Price'], 'price');
    if (priceRes.error) {
      errors.push({
        row: rowNum,
        propertyId: canonicalId,
        field: 'price',
        sourceColumn: 'Sale Price',
        errorType: 'INVALID_NUMBER',
        error: priceRes.error,
        message: priceRes.error,
      });
      rowHasError = true;
    }

    const usableAreaRes = parseNumericField(mappedRow.usableArea ?? raw['Usable Area'], 'usableArea');
    if (usableAreaRes.error) {
      errors.push({
        row: rowNum,
        propertyId: canonicalId,
        field: 'usableArea',
        sourceColumn: 'Usable Area',
        errorType: 'INVALID_NUMBER',
        error: usableAreaRes.error,
        message: usableAreaRes.error,
      });
      rowHasError = true;
    }

    const buildingAreaRes = parseNumericField(mappedRow.buildingArea ?? raw['Building Area'] ?? raw['built area'], 'buildingArea');
    if (buildingAreaRes.error) {
      errors.push({
        row: rowNum,
        propertyId: canonicalId,
        field: 'buildingArea',
        sourceColumn: 'Building Area',
        errorType: 'INVALID_NUMBER',
        error: buildingAreaRes.error,
        message: buildingAreaRes.error,
      });
      rowHasError = true;
    }

    const landAreaRes = parseNumericField(mappedRow.landArea ?? raw['Land'] ?? raw['Land Area'], 'landArea');
    if (landAreaRes.error) {
      errors.push({
        row: rowNum,
        propertyId: canonicalId,
        field: 'landArea',
        sourceColumn: 'Land Area',
        errorType: 'INVALID_NUMBER',
        error: landAreaRes.error,
        message: landAreaRes.error,
      });
      rowHasError = true;
    }

    const bedroomsRes = parseNumericField(mappedRow.bedrooms ?? raw['Bedroom'], 'bedrooms');
    if (bedroomsRes.error) {
      errors.push({
        row: rowNum,
        propertyId: canonicalId,
        field: 'bedrooms',
        sourceColumn: 'Bedroom',
        errorType: 'INVALID_NUMBER',
        error: bedroomsRes.error,
        message: bedroomsRes.error,
      });
      rowHasError = true;
    }

    const bathroomsRes = parseNumericField(mappedRow.bathrooms ?? raw['Bathroom'], 'bathrooms');
    if (bathroomsRes.error) {
      errors.push({
        row: rowNum,
        propertyId: canonicalId,
        field: 'bathrooms',
        sourceColumn: 'Bathroom',
        errorType: 'INVALID_NUMBER',
        error: bathroomsRes.error,
        message: bathroomsRes.error,
      });
      rowHasError = true;
    }

    const floorRes = parseNumericField(mappedRow.floor ?? raw['Floor'] ?? raw['ชั้น'], 'floor');
    if (floorRes.error) {
      errors.push({
        row: rowNum,
        propertyId: canonicalId,
        field: 'floor',
        sourceColumn: 'Floor',
        errorType: 'INVALID_NUMBER',
        error: floorRes.error,
        message: floorRes.error,
      });
      rowHasError = true;
    }

    const yearBuiltRes = parseNumericField(
      mappedRow.yearBuilt ?? raw['Year Built'] ?? raw['Year Build'] ?? raw['ปีที่สร้าง'],
      'yearBuilt'
    );
    if (yearBuiltRes.error) {
      errors.push({
        row: rowNum,
        propertyId: canonicalId,
        field: 'yearBuilt',
        sourceColumn: 'Year Built',
        errorType: 'INVALID_NUMBER',
        error: yearBuiltRes.error,
        message: yearBuiltRes.error,
      });
      rowHasError = true;
    }

    // --- Validate Date Fields ---
    if (mappedRow.lastFollowUpDate || raw['Last Follow Up'] || raw['Last Followup Date']) {
      const dateVal = mappedRow.lastFollowUpDate || raw['Last Follow Up'] || raw['Last Followup Date'];
      const dateRes = parseDateField(dateVal, 'lastFollowUpDate');
      if (dateRes.error) {
        errors.push({
          row: rowNum,
          propertyId: canonicalId,
          field: 'lastFollowUpDate',
          sourceColumn: 'Last Follow Up',
          errorType: 'INVALID_DATE',
          error: dateRes.error,
          message: dateRes.error,
        });
        rowHasError = true;
      }
    }

    // --- Validate JSON / Images fields ---
    if (mappedRow.images || raw['Images'] || raw['Photo URLs']) {
      const jsonVal = mappedRow.images || raw['Images'] || raw['Photo URLs'];
      const jsonRes = parseJsonOrArrayField(jsonVal, 'images');
      if (jsonRes.error) {
        errors.push({
          row: rowNum,
          propertyId: canonicalId,
          field: 'images',
          sourceColumn: 'Images',
          errorType: 'INVALID_JSON',
          error: jsonRes.error,
          message: jsonRes.error,
        });
        rowHasError = true;
      }
    }

    if (rowHasError) {
      invalidCount++;
      previewRows.push({
        row: rowNum,
        propertyId: canonicalId,
        title,
        category: matchedCategory || rawCategory,
        status: matchedStatus || rawStatus,
        price: priceRes.value,
        rentPrice: rentPriceRes.value,
        classification: 'INVALID',
        b21Status: 'ERROR',
        notes: errors[errors.length - 1]?.error || 'Validation error',
      });
      continue;
    }

    // --- Check Existing in Database & Duplicate Mode ---
    if (existingDb) {
      existingCount++;

      if (options.duplicateMode === 'skip') {
        skippedCount++;
        planRows.push({
          action: 'SKIP',
          rowNum,
          propertyId: canonicalId,
          targetId: canonicalId,
          raw,
          mapped: mappedRow,
          hasError: false,
        });
        previewRows.push({
          row: rowNum,
          propertyId: canonicalId,
          title,
          category: matchedCategory || rawCategory,
          status: matchedStatus || rawStatus,
          price: priceRes.value,
          rentPrice: rentPriceRes.value,
          classification: 'SKIP',
          b21Status: 'UNCHANGED',
          notes: `Existing record in DB. Duplicate mode is set to Skip.`,
        });
      } else if (options.duplicateMode === 'update') {
        // Compute Field-level diff (CRITICAL: empty/null will NOT overwrite existing values)
        const rowDiffs: FieldDiff[] = [];

        const compareField = (
          field: string,
          label: string,
          oldVal: any,
          newVal: any
        ) => {
          // Never overwrite with empty/null/undefined
          if (newVal === null || newVal === undefined || String(newVal).trim() === '') {
            return;
          }
          const strOld = String(oldVal ?? '').trim();
          const strNew = String(newVal).trim();
          if (strOld !== strNew) {
            rowDiffs.push({
              field,
              label,
              oldVal: strOld || '(empty)',
              newVal: strNew,
            });
          }
        };

        compareField('title', 'Project Name', existingDb.title, title);
        compareField('category', 'Category', existingDb.category, matchedCategory);
        compareField('status', 'Status', existingDb.status, matchedStatus);
        compareField('zone', 'Zone', existingDb.zone, zone);
        compareField('area', 'Area', existingDb.area, area);

        if (priceRes.value !== null) {
          compareField('price', 'Sale Price', existingDb.price, String(priceRes.value));
        }
        if (rentPriceRes.value !== null) {
          compareField('rentPrice', 'Rent Price', existingDb.rentPrice, String(rentPriceRes.value));
        }
        if (usableAreaRes.value !== null) {
          compareField('usableArea', 'Usable Area', existingDb.usableArea, String(usableAreaRes.value));
        }
        if (bedroomsRes.value !== null) {
          compareField('bedrooms', 'Bedrooms', existingDb.bedrooms, bedroomsRes.value);
        }
        if (bathroomsRes.value !== null) {
          compareField('bathrooms', 'Bathrooms', existingDb.bathrooms, bathroomsRes.value);
        }

        const agent = String(mappedRow.agentName || raw['Agent'] || '').trim();
        if (agent) compareField('agentName', 'Agent', existingDb.agentName, agent);

        const owner = String(mappedRow.ownerName || raw['Landlord Name'] || '').trim();
        if (owner) compareField('ownerName', 'Owner Name', existingDb.ownerName, owner);

        const ownerPhone = String(mappedRow.ownerPhone || raw['Landlord Phone'] || '').trim();
        if (ownerPhone) compareField('ownerPhone', 'Owner Phone', existingDb.ownerPhone, ownerPhone);

        if (rowDiffs.length > 0) {
          diffs.push({
            row: rowNum,
            propertyId: canonicalId,
            originalId: idNorm.originalId,
            changes: rowDiffs,
          });
          updatedCount++;
          planRows.push({
            action: 'UPDATE',
            rowNum,
            propertyId: canonicalId,
            targetId: canonicalId,
            raw,
            mapped: mappedRow,
            diffs: rowDiffs,
            hasError: false,
          });
          previewRows.push({
            row: rowNum,
            propertyId: canonicalId,
            title,
            category: matchedCategory || rawCategory,
            status: matchedStatus || rawStatus,
            price: priceRes.value,
            rentPrice: rentPriceRes.value,
            classification: 'UPDATE',
            b21Status: 'UPDATED',
            notes: `${rowDiffs.length} fields modified`,
          });
        } else {
          skippedCount++;
          planRows.push({
            action: 'SKIP',
            rowNum,
            propertyId: canonicalId,
            targetId: canonicalId,
            raw,
            mapped: mappedRow,
            hasError: false,
          });
          previewRows.push({
            row: rowNum,
            propertyId: canonicalId,
            title,
            category: matchedCategory || rawCategory,
            status: matchedStatus || rawStatus,
            price: priceRes.value,
            rentPrice: rentPriceRes.value,
            classification: 'SKIP',
            b21Status: 'UNCHANGED',
            notes: 'No fields changed compared to database record',
          });
        }
      } else if (options.duplicateMode === 'new_id') {
        // Generate deterministic, collision-proof ID
        let suffix = 1;
        let generatedId = `${canonicalId}-N${suffix}`;
        while (
          existingMap.has(generatedId) ||
          generatedIdsSet.has(generatedId)
        ) {
          suffix++;
          generatedId = `${canonicalId}-N${suffix}`;
        }
        generatedIdsSet.add(generatedId);

        newCount++;
        planRows.push({
          action: 'NEW_ID',
          rowNum,
          propertyId: canonicalId,
          targetId: generatedId,
          raw,
          mapped: mappedRow,
          hasError: false,
        });
        previewRows.push({
          row: rowNum,
          propertyId: generatedId,
          title,
          category: matchedCategory || rawCategory,
          status: matchedStatus || rawStatus,
          price: priceRes.value,
          rentPrice: rentPriceRes.value,
          classification: 'NEW',
          b21Status: 'NEW',
          notes: `Original ID ${canonicalId} existed. Assigned unique ID: ${generatedId}`,
        });
      }
    } else {
      // New property (not in DB)
      let finalId = canonicalId;
      if (options.duplicateMode === 'new_id' && (generatedIdsSet.has(finalId) || isFileDup)) {
        let suffix = 1;
        let candidate = `${canonicalId}-N${suffix}`;
        while (existingMap.has(candidate) || generatedIdsSet.has(candidate)) {
          suffix++;
          candidate = `${canonicalId}-N${suffix}`;
        }
        finalId = candidate;
      }
      generatedIdsSet.add(finalId);
      newCount++;
      planRows.push({
        action: 'NEW',
        rowNum,
        propertyId: canonicalId,
        targetId: finalId,
        raw,
        mapped: mappedRow,
        hasError: false,
      });
      previewRows.push({
        row: rowNum,
        propertyId: finalId,
        title,
        category: matchedCategory || rawCategory,
        status: matchedStatus || rawStatus,
        price: priceRes.value,
        rentPrice: rentPriceRes.value,
        classification: 'NEW',
        b21Status: 'NEW',
        notes: finalId !== canonicalId ? `Duplicate in file. Assigned unique ID: ${finalId}` : 'Ready to import as new record',
      });
    }
  }

  const errorCount = errors.length;

  const fileFingerprint = computeFileFingerprint(rawRows);
  const dbStateFingerprint = await computeDbStateFingerprint();
  const importToken = `IMP-TOKEN-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes TTL

  const summary = {
    totalRows,
    newCount,
    existingCount,
    updatedCount,
    skippedCount,
    unchangedCount: skippedCount,
    duplicateInFileCount,
    invalidCount,
    errorCount,
  };

  const tokenData: ImportTokenData = {
    token: importToken,
    fileFingerprint,
    dbStateFingerprint,
    duplicateMode: options.duplicateMode,
    fileName: options.fileName,
    userName: options.userName,
    userId: options.userId,
    userRole: options.userRole,
    summary,
    diffs,
    errors,
    previewRows: previewRows.slice(0, 100),
    planRows,
    createdAt: Date.now(),
    expiresAt,
    status: 'ACTIVE',
  };

  importTokenManager.saveToken(tokenData);

  return {
    summary,
    columnMapping,
    diffs,
    errors,
    previewRows: previewRows.slice(0, 100), // Preview up to first 100 items
    dryRun: true,
    dbMutation: false,
    importToken,
    fileFingerprint,
    dbStateFingerprint,
    expiresAt,
  };
}

// -------------------------------------------------------------
// 7. SAFE LIVE IMPORT ENGINE (TRANSACTIONAL & AUDITED)
// -------------------------------------------------------------
export interface LiveImportOptions {
  importToken: string;
  confirmRealImport: boolean;
  fileFingerprint?: string;
  duplicateMode?: 'skip' | 'update' | 'new_id';
  fileName?: string;
  user: {
    id?: string;
    name: string;
    role?: string;
  };
  matchedImages?: Record<string, Array<{ url?: string; dataUrl?: string; fileName?: string; title?: string }>>;
}

export interface LiveImportResult {
  success: boolean;
  statusCode?: number;
  code?: string;
  error?: string;
  importId?: string;
  status?: 'Completed' | 'Partial' | 'Failed';
  summary?: {
    totalRows: number;
    newCount: number;
    updatedCount: number;
    skippedCount: number;
    errorCount: number;
  };
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
  affectedPropertyIds?: string[];
  errors?: RowValidationError[];
}

/**
 * Execute Safe Live Import with multi-stage safety gates:
 * 1. User authentication & Role authorization
 * 2. Explicit confirmation check (confirmRealImport: true)
 * 3. Import Token validation (existence, expiry, state, double-submission)
 * 4. File fingerprint match
 * 5. Database state concurrency validation
 * 6. Atomic database transaction with per-property and batch audit logging
 */
export async function executeSafeLiveImport(
  options: LiveImportOptions
): Promise<LiveImportResult> {
  const startedAt = new Date();
  const startTime = Date.now();

  // Safety Gate 1: Explicit confirmation flag
  if (options.confirmRealImport !== true) {
    return {
      success: false,
      statusCode: 400,
      code: 'CONFIRMATION_REQUIRED',
      error: 'Live import requires explicit user confirmation (confirmRealImport: true). Run Dry Run preview first.',
    };
  }

  // Safety Gate 2: User Authentication & Role Authorization
  if (!options.user || !options.user.name) {
    return {
      success: false,
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      error: 'Authentication required. Current user information is missing.',
    };
  }

  const role = String(options.user.role || '').trim();
  const isAuthorized = AUTHORIZED_IMPORT_ROLES.some(
    (r) => r.toLowerCase() === role.toLowerCase()
  );
  if (!isAuthorized) {
    return {
      success: false,
      statusCode: 403,
      code: 'UNAUTHORIZED_ROLE',
      error: `User role "${role || 'Unknown'}" is not authorized to execute Live Import. Authorized roles: ${AUTHORIZED_IMPORT_ROLES.join(', ')}`,
    };
  }

  // Safety Gate 3: Import Token Validation
  if (!options.importToken) {
    return {
      success: false,
      statusCode: 400,
      code: 'TOKEN_REQUIRED',
      error: 'Import token is missing. Please run a Dry Run preview to generate an active import token.',
    };
  }

  const tokenData = importTokenManager.getToken(options.importToken);
  if (!tokenData) {
    return {
      success: false,
      statusCode: 400,
      code: 'TOKEN_NOT_FOUND',
      error: 'Import token not found or invalid. Please execute a fresh Dry Run simulation.',
    };
  }

  if (tokenData.status === 'CONSUMED') {
    return {
      success: false,
      statusCode: 409,
      code: 'DOUBLE_SUBMISSION',
      error: 'Import token has already been consumed. Double submission prevented.',
    };
  }

  if (tokenData.status === 'PROCESSING') {
    return {
      success: false,
      statusCode: 409,
      code: 'IMPORT_IN_PROGRESS',
      error: 'An import operation is already currently in progress for this token.',
    };
  }

  if (tokenData.status === 'EXPIRED') {
    return {
      success: false,
      statusCode: 400,
      code: 'TOKEN_EXPIRED',
      error: 'Import token has expired (TTL: 15 minutes). Please run a new Dry Run simulation.',
    };
  }

  // Safety Gate 4: File Fingerprint Match
  if (options.fileFingerprint && options.fileFingerprint !== tokenData.fileFingerprint) {
    return {
      success: false,
      statusCode: 400,
      code: 'FINGERPRINT_MISMATCH',
      error: 'File fingerprint mismatch. File contents differ from the Dry Run preview.',
    };
  }

  // Safety Gate 5: Duplicate Mode Match
  if (options.duplicateMode && options.duplicateMode !== tokenData.duplicateMode) {
    return {
      success: false,
      statusCode: 400,
      code: 'DUPLICATE_MODE_MISMATCH',
      error: `Duplicate mode mismatch. Expected "${tokenData.duplicateMode}", received "${options.duplicateMode}".`,
    };
  }

  // Safety Gate 6: Database State / Concurrency Check
  const currentDbStateFingerprint = await computeDbStateFingerprint();
  if (currentDbStateFingerprint !== tokenData.dbStateFingerprint) {
    return {
      success: false,
      statusCode: 409,
      code: 'DATABASE_STATE_CHANGED',
      error: 'DATABASE_STATE_CHANGED: The database property records were modified by another transaction after your Dry Run preview. Please run a fresh Dry Run to inspect the latest changes.',
    };
  }

  // Mark token as processing
  const lockStatus = importTokenManager.markProcessing(tokenData.token);
  if (!lockStatus.success) {
    return {
      success: false,
      statusCode: 409,
      code: lockStatus.error || 'LOCK_FAILED',
      error: 'Could not acquire import lock for token.',
    };
  }

  const importId = `IMP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const affectedPropertyIds: string[] = [];
  const rowErrors: any[] = [...tokenData.errors];

  let liveNewCount = 0;
  let liveUpdatedCount = 0;
  let liveSkippedCount = 0;

  try {
    // Execute Database Transaction
    await db.transaction(async (tx) => {
      for (const planRow of tokenData.planRows) {
        if (planRow.hasError) {
          continue;
        }

        const raw = planRow.raw || {};
        const mapped = planRow.mapped || {};

        if (planRow.action === 'SKIP') {
          liveSkippedCount++;
          continue;
        }

        if (planRow.action === 'NEW' || planRow.action === 'NEW_ID') {
          // Parse images
          let imagesList: any[] = [];
          const photoUrlsRaw = mapped.photoUrls || raw.photoUrls || raw['Photo URLs'] || raw['Images'];
          if (photoUrlsRaw) {
            const urls = String(photoUrlsRaw)
              .split(/[\n,;]+/)
              .map((u) => u.trim())
              .filter((u) => u.startsWith('http'));
            imagesList = urls.map((url, idx) => ({
              id: `img-import-${Date.now()}-${idx}`,
              url,
              isCover: idx === 0,
              hasWatermark: false,
              title: `Photo ${idx + 1}`,
            }));
          }

          if (options.matchedImages) {
            const propMatchedImgs =
              options.matchedImages[planRow.targetId] ||
              options.matchedImages[planRow.propertyId] ||
              [];
            propMatchedImgs.forEach((rawImg: any, idx: number) => {
              const url = typeof rawImg === 'string' ? rawImg : rawImg?.url || rawImg?.dataUrl || (rawImg?.fileName ? `/images/${rawImg.fileName}` : '');
              const fileName = typeof rawImg === 'string' ? rawImg.split('/').pop() || '' : rawImg?.fileName;
              const title = typeof rawImg === 'string' ? fileName : rawImg?.title || fileName;

              const alreadyHas = imagesList.some((ex: any) => {
                const exUrl = typeof ex === 'string' ? ex : ex?.url;
                const exFile = typeof ex === 'object' ? ex?.fileName : '';
                return (exFile && fileName && exFile.toLowerCase() === fileName.toLowerCase()) || (exUrl && url && exUrl === url);
              });

              if (!alreadyHas && url) {
                imagesList.push({
                  id: `img-matched-${Date.now()}-${idx}`,
                  url,
                  fileName,
                  isCover: imagesList.length === 0,
                  hasWatermark: false,
                  title,
                });
              }
            });
          }

          const insertRecord: InsertDbProperty = {
            propertyId: planRow.targetId,
            title: mapped.title || raw.title || raw['Project'] || raw['Project TH'] || `Property ${planRow.targetId}`,
            titleTh: mapped.titleTh || raw.titleTh || raw['Project TH'] || '',
            projectName: mapped.projectName || raw.projectName || raw['Project'] || '',
            projectNameTh: mapped.projectNameTh || raw.projectNameTh || raw['Project TH'] || '',
            category: mapped.category || raw.category || raw['Category'] || 'Villa',
            zone: mapped.zone || raw.zone || raw['Zone'] || 'Zone 2',
            area: mapped.area || raw.area || raw['Area'] || 'Rawai',
            district: mapped.district || raw.district || raw['District'] || 'Mueang Phuket',
            city: mapped.city || raw.city || raw['City'] || 'Phuket',
            nation: mapped.nation || raw.nation || raw['Nation'] || 'Thailand',
            postalCode: mapped.postalCode || raw.postalCode || raw['Postal Code'] || '83130',
            address: mapped.address || raw.address || raw['Address EN'] || raw['Address TH'] || '',
            status: mapped.status || raw.status || raw['Property Status'] || 'Available',
            propertyLabel: mapped.propertyLabel || raw.propertyLabel || raw['Property Label'] || 'Rent',
            rentPrice: mapped.rentPrice !== undefined && mapped.rentPrice !== null && mapped.rentPrice !== ''
              ? String(mapped.rentPrice)
              : String(raw.rentPrice || raw['Rent Price'] || '0'),
            price: mapped.price !== undefined && mapped.price !== null && mapped.price !== ''
              ? String(mapped.price)
              : String(raw.price || raw['Sale Price'] || '0'),
            usableArea: mapped.usableArea !== undefined && mapped.usableArea !== null && mapped.usableArea !== ''
              ? String(mapped.usableArea)
              : String(raw.usableArea || raw['Usable Area'] || '0'),
            landArea: mapped.landArea !== undefined && mapped.landArea !== null && mapped.landArea !== ''
              ? String(mapped.landArea)
              : String(raw.landArea || raw['Land Area'] || '0'),
            bedrooms: mapped.bedrooms !== undefined && mapped.bedrooms !== null
              ? Number(mapped.bedrooms)
              : (Number(raw.bedrooms || raw['Bedroom'] || 0) || 0),
            bathrooms: mapped.bathrooms !== undefined && mapped.bathrooms !== null
              ? Number(mapped.bathrooms)
              : (Number(raw.bathrooms || raw['Bathroom'] || 0) || 0),
            building: mapped.building || raw.building || raw['Building'] || '',
            floor: mapped.floor !== undefined && mapped.floor !== null
              ? Number(mapped.floor)
              : (Number(raw.floor || raw['Floor'] || 0) || null),
            roomNo: mapped.roomNo || raw.roomNo || raw['Room No'] || '',
            houseNo: mapped.houseNo || raw.houseNo || raw['House No'] || '',
            furniture: mapped.furniture || raw.furniture || raw['Furniture'] || 'Fully Furnished',
            petFriendly: mapped.petFriendly !== undefined && mapped.petFriendly !== null
              ? Boolean(mapped.petFriendly)
              : (raw['Pet'] ? String(raw['Pet']).includes('Allow') : false),
            hasPool: mapped.hasPool !== undefined && mapped.hasPool !== null
              ? Boolean(mapped.hasPool)
              : (raw['Pool'] ? String(raw['Pool']).toLowerCase() !== 'no' : false),
            poolType: mapped.poolType || raw.poolType || raw['Pool Type'] || 'No Pool',
            yearBuilt: mapped.yearBuilt !== undefined && mapped.yearBuilt !== null
              ? Number(mapped.yearBuilt)
              : (Number(raw.yearBuilt || raw['Year Build'] || 0) || null),
            agentName: mapped.agentName || raw.agentName || raw['Agent'] || options.user.name,
            agencyType: mapped.agencyType || raw.agencyType || raw['Agency Type'] || 'Co-Broke',
            ownerName: mapped.ownerName || raw.ownerName || raw['Landlord Name'] || '',
            ownerPhone: mapped.ownerPhone || raw.ownerPhone || raw['Landlord Phone'] || '',
            ownerEmail: mapped.ownerEmail || raw.ownerEmail || raw['Landlord Email'] || '',
            comments: mapped.comments || raw.comments || raw['Comments'] || '',
            images: imagesList,
            isPublished: true,
            publishStatus: 'Published',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await tx.insert(propertiesTable).values(insertRecord);
          affectedPropertyIds.push(planRow.targetId);
          liveNewCount++;

          // Audit log for created property
          await tx.insert(auditLogsTable).values({
            propertyId: planRow.targetId,
            action: 'Imported',
            userName: options.user.name,
            userId: options.user.id || 'usr-default',
            oldValue: null,
            newValue: `Created via import (${tokenData.fileName}) as ${planRow.targetId} [Import: ${importId}]`,
            createdAt: new Date(),
          });
        } else if (planRow.action === 'UPDATE') {
          // Fetch existing record
          const [existing] = await tx
            .select()
            .from(propertiesTable)
            .where(eq(propertiesTable.propertyId, planRow.targetId));

          if (!existing) {
            liveSkippedCount++;
            continue;
          }

          const updateFields: Partial<InsertDbProperty> = {
            updatedAt: new Date(),
          };

          const checkAndAssign = (field: keyof InsertDbProperty, val: any) => {
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              (updateFields as any)[field] = val;
            }
          };

          checkAndAssign('title', mapped.title || raw.title || raw['Project']);
          checkAndAssign('titleTh', mapped.titleTh || raw.titleTh || raw['Project TH']);
          checkAndAssign('projectName', mapped.projectName || raw.projectName || raw['Project']);
          checkAndAssign('projectNameTh', mapped.projectNameTh || raw.projectNameTh || raw['Project TH']);
          checkAndAssign('category', mapped.category || raw.category || raw['Category']);
          checkAndAssign('zone', mapped.zone || raw.zone || raw['Zone']);
          checkAndAssign('area', mapped.area || raw.area || raw['Area']);
          checkAndAssign('district', mapped.district || raw.district || raw['District']);
          checkAndAssign('city', mapped.city || raw.city || raw['City']);
          checkAndAssign('postalCode', mapped.postalCode || raw.postalCode || raw['Postal Code']);
          checkAndAssign('address', mapped.address || raw.address || raw['Address EN'] || raw['Address TH']);
          checkAndAssign('status', mapped.status || raw.status || raw['Property Status']);
          checkAndAssign('propertyLabel', mapped.propertyLabel || raw.propertyLabel || raw['Property Label']);

          if (mapped.rentPrice !== undefined && mapped.rentPrice !== null && mapped.rentPrice !== '') {
            updateFields.rentPrice = String(mapped.rentPrice);
          } else if (raw.rentPrice || raw['Rent Price']) {
            updateFields.rentPrice = String(raw.rentPrice || raw['Rent Price']);
          }

          if (mapped.price !== undefined && mapped.price !== null && mapped.price !== '') {
            updateFields.price = String(mapped.price);
          } else if (raw.price || raw['Sale Price']) {
            updateFields.price = String(raw.price || raw['Sale Price']);
          }

          if (mapped.usableArea !== undefined && mapped.usableArea !== null && mapped.usableArea !== '') {
            updateFields.usableArea = String(mapped.usableArea);
          } else if (raw.usableArea || raw['Usable Area']) {
            updateFields.usableArea = String(raw.usableArea || raw['Usable Area']);
          }

          if (mapped.bedrooms !== undefined && mapped.bedrooms !== null) {
            updateFields.bedrooms = Number(mapped.bedrooms);
          } else if (raw.bedrooms !== undefined || raw['Bedroom'] !== undefined) {
            updateFields.bedrooms = Number(raw.bedrooms || raw['Bedroom']);
          }

          if (mapped.bathrooms !== undefined && mapped.bathrooms !== null) {
            updateFields.bathrooms = Number(mapped.bathrooms);
          } else if (raw.bathrooms !== undefined || raw['Bathroom'] !== undefined) {
            updateFields.bathrooms = Number(raw.bathrooms || raw['Bathroom']);
          }

          checkAndAssign('furniture', mapped.furniture || raw.furniture || raw['Furniture']);
          if (mapped.petFriendly !== undefined && mapped.petFriendly !== null) {
            updateFields.petFriendly = Boolean(mapped.petFriendly);
          } else if (raw['Pet']) {
            updateFields.petFriendly = String(raw['Pet']).includes('Allow');
          }

          if (mapped.hasPool !== undefined && mapped.hasPool !== null) {
            updateFields.hasPool = Boolean(mapped.hasPool);
          } else if (raw['Pool']) {
            updateFields.hasPool = String(raw['Pool']).toLowerCase() !== 'no';
          }

          checkAndAssign('agentName', mapped.agentName || raw.agentName || raw['Agent']);
          checkAndAssign('agencyType', mapped.agencyType || raw.agencyType || raw['Agency Type']);
          checkAndAssign('ownerName', mapped.ownerName || raw.ownerName || raw['Landlord Name']);
          checkAndAssign('ownerPhone', mapped.ownerPhone || raw.ownerPhone || raw['Landlord Phone']);
          checkAndAssign('ownerEmail', mapped.ownerEmail || raw.ownerEmail || raw['Landlord Email']);
          checkAndAssign('comments', mapped.comments || raw.comments || raw['Comments']);

          if (options.matchedImages) {
            const propMatchedImgs =
              options.matchedImages[planRow.targetId] ||
              options.matchedImages[planRow.propertyId] ||
              [];
            if (propMatchedImgs.length > 0) {
              const existingImages: any[] = Array.isArray(existing.images) ? existing.images : [];
              const merged = [...existingImages];
              propMatchedImgs.forEach((rawImg: any, idx: number) => {
                const url = typeof rawImg === 'string' ? rawImg : rawImg?.url || rawImg?.dataUrl || (rawImg?.fileName ? `/images/${rawImg.fileName}` : '');
                const fileName = typeof rawImg === 'string' ? rawImg.split('/').pop() || '' : rawImg?.fileName;
                const title = typeof rawImg === 'string' ? fileName : rawImg?.title || fileName;

                const alreadyHas = existingImages.some((ex: any) => {
                  const exUrl = typeof ex === 'string' ? ex : ex?.url;
                  const exFile = typeof ex === 'object' ? ex?.fileName : '';
                  return (exFile && fileName && exFile.toLowerCase() === fileName.toLowerCase()) || (exUrl && url && exUrl === url);
                });

                if (!alreadyHas && url) {
                  merged.push({
                    id: `img-matched-${Date.now()}-${idx}`,
                    url,
                    fileName,
                    isCover: merged.length === 0,
                    hasWatermark: false,
                    title,
                  });
                }
              });
              updateFields.images = merged;

              // Record audit log for matched images
              await tx.insert(auditLogsTable).values({
                propertyId: planRow.targetId,
                action: 'Images Updated',
                userName: options.user.name,
                userId: options.user.id || 'usr-default',
                oldValue: `${existingImages.length} images`,
                newValue: `${merged.length} images (+${propMatchedImgs.length} matched)`,
                createdAt: new Date(),
              });
            }
          }

          await tx
            .update(propertiesTable)
            .set(updateFields)
            .where(eq(propertiesTable.propertyId, planRow.targetId));

          affectedPropertyIds.push(planRow.targetId);
          liveUpdatedCount++;

          // Record granular field audit logs
          if (updateFields.price && String(updateFields.price) !== String(existing.price)) {
            await tx.insert(auditLogsTable).values({
              propertyId: planRow.targetId,
              action: 'Price Changed',
              userName: options.user.name,
              userId: options.user.id || 'usr-default',
              oldValue: `Sale Price: ${existing.price} THB`,
              newValue: `Sale Price: ${updateFields.price} THB`,
              createdAt: new Date(),
            });
          }

          if (updateFields.rentPrice && String(updateFields.rentPrice) !== String(existing.rentPrice)) {
            await tx.insert(auditLogsTable).values({
              propertyId: planRow.targetId,
              action: 'Price Changed',
              userName: options.user.name,
              userId: options.user.id || 'usr-default',
              oldValue: `Rent Price: ${existing.rentPrice} THB`,
              newValue: `Rent Price: ${updateFields.rentPrice} THB`,
              createdAt: new Date(),
            });
          }

          if (updateFields.status && updateFields.status !== existing.status) {
            await tx.insert(auditLogsTable).values({
              propertyId: planRow.targetId,
              action: 'Status Changed',
              userName: options.user.name,
              userId: options.user.id || 'usr-default',
              oldValue: existing.status,
              newValue: updateFields.status,
              createdAt: new Date(),
            });
          }

          if (updateFields.agentName && updateFields.agentName !== existing.agentName) {
            await tx.insert(auditLogsTable).values({
              propertyId: planRow.targetId,
              action: 'Agent Changed',
              userName: options.user.name,
              userId: options.user.id || 'usr-default',
              oldValue: existing.agentName,
              newValue: updateFields.agentName,
              createdAt: new Date(),
            });
          }

          await tx.insert(auditLogsTable).values({
            propertyId: planRow.targetId,
            action: 'Updated',
            userName: options.user.name,
            userId: options.user.id || 'usr-default',
            oldValue: null,
            newValue: `Updated via import (${tokenData.fileName}) with ${Object.keys(updateFields).length} fields modified [Import: ${importId}]`,
            createdAt: new Date(),
          });
        }
      }

      const completedTime = new Date();
      const durationMs = completedTime.getTime() - startTime;

      const rowPlans = (tokenData.planRows || (tokenData as any).plan || []).map((p: any) => ({
        row: p.rowNum || p.row,
        propertyId: p.targetId || p.propertyId || p.originalId,
        action: p.action,
        status: p.hasError ? 'Error' : 'Success',
        errors: p.errors || [],
        warnings: p.warnings || [],
        changes: p.diffs || [],
      }));

      // Record Import History
      const overallStatus = rowErrors.length === 0 ? 'Completed' : (liveNewCount > 0 || liveUpdatedCount > 0 ? 'Partial' : 'Failed');
      await tx.insert(importHistoryTable).values({
        importId,
        fileName: tokenData.fileName,
        userName: options.user.name,
        userId: options.user.id || 'usr-default',
        totalRows: tokenData.summary.totalRows,
        newCount: liveNewCount,
        updatedCount: liveUpdatedCount,
        skippedCount: liveSkippedCount,
        errorCount: rowErrors.length,
        status: overallStatus,
        errorsJson: {
          errors: rowErrors,
          rows: rowPlans,
          duplicateMode: tokenData.duplicateMode || options.duplicateMode || 'skip',
          durationMs,
          startedAt: startedAt.toISOString(),
          completedAt: completedTime.toISOString(),
          affectedPropertyIds,
          maskedToken: tokenData.token ? `••••••••${tokenData.token.slice(-6)}` : undefined,
          maskedFingerprint: tokenData.fileFingerprint ? `••••••••${tokenData.fileFingerprint.slice(-8)}` : undefined,
        },
        createdAt: new Date(),
      });

      // Record Global Bulk Audit Log
      await tx.insert(auditLogsTable).values({
        propertyId: 'BULK',
        action: 'Imported',
        userName: options.user.name,
        userId: options.user.id || 'usr-default',
        oldValue: null,
        newValue: `Bulk live imported ${tokenData.fileName} (${importId}): ${liveNewCount} new, ${liveUpdatedCount} updated, ${liveSkippedCount} skipped, ${rowErrors.length} errors`,
        createdAt: new Date(),
      });
    });

    // Mark token as consumed on success
    importTokenManager.markConsumed(tokenData.token);

    const completedAt = new Date();
    const durationMs = Date.now() - startTime;
    const finalStatus = rowErrors.length === 0 ? 'Completed' : (liveNewCount > 0 || liveUpdatedCount > 0 ? 'Partial' : 'Failed');

    return {
      success: true,
      importId,
      status: finalStatus,
      summary: {
        totalRows: tokenData.summary.totalRows,
        newCount: liveNewCount,
        updatedCount: liveUpdatedCount,
        skippedCount: liveSkippedCount,
        errorCount: rowErrors.length,
      },
      durationMs,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      affectedPropertyIds,
      errors: rowErrors,
    };
  } catch (err: any) {
    // Revert token state so user can retry or inspect
    importTokenManager.markActive(tokenData.token);

    // Record Failed status in import history outside of failed transaction
    try {
      await db.insert(importHistoryTable).values({
        importId,
        fileName: tokenData.fileName,
        userName: options.user.name,
        userId: options.user.id || 'usr-default',
        totalRows: tokenData.summary.totalRows,
        newCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: rowErrors.length + 1,
        status: 'Failed',
        errorsJson: [{ row: 0, field: 'SYSTEM', value: null, error: err.message || 'Transaction aborted' }, ...rowErrors],
        createdAt: new Date(),
      });
    } catch (logErr) {
      console.error('Failed to write failure history:', logErr);
    }

    return {
      success: false,
      statusCode: 500,
      code: 'TRANSACTION_FAILED',
      error: `Live import failed and all changes were rolled back: ${err.message || 'Transaction error'}`,
    };
  }
}

// -------------------------------------------------------------
// 8. B21 IMAGE MATCHING & VALIDATION ENGINE
// -------------------------------------------------------------
export interface RawImageInput {
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  dataUrl?: string;
}

export interface ImageMatchItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl?: string;
  extractedCode: string | null;
  matchedPropertyId: string | null;
  status: 'Matched' | 'Unmatched' | 'Duplicate' | 'Invalid';
  reason?: string;
}

export interface ImageMatchingSummary {
  totalImages: number;
  matchedCount: number;
  unmatchedCount: number;
  duplicateCount: number;
  invalidCount: number;
  items: ImageMatchItem[];
  matchedByProperty: Record<string, ImageMatchItem[]>;
}

/**
 * Extract Property Code from image filename (e.g. PH001.jpg, PH001_01.jpg, PH001_02.jpg -> PH001)
 * Enforces strict validation:
 * - Allowed extensions: JPG, JPEG, PNG, WEBP
 * - Must match known property codes (from database or imported file)
 * - If code cannot be matched: STRICTLY NO GUESSING
 */
export function extractPropertyCodeFromFilename(
  fileName: string,
  knownPropertyCodes: string[] = []
): {
  code: string | null;
  isMatch: boolean;
  status: 'Matched' | 'Unmatched' | 'Duplicate' | 'Invalid';
  reason?: string;
} {
  const ext = path.extname(fileName).toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  if (!validExtensions.includes(ext)) {
    return {
      code: null,
      isMatch: false,
      status: 'Invalid',
      reason: `Unsupported file format "${ext || 'none'}". Supported formats: JPG, JPEG, PNG, WEBP.`,
    };
  }

  const baseName = path.basename(fileName, ext).trim();
  if (!baseName) {
    return {
      code: null,
      isMatch: false,
      status: 'Invalid',
      reason: 'Empty filename',
    };
  }

  // Build normalized canonical mapping (case-insensitive lookup)
  const canonicalMap = new Map<string, string>();
  knownPropertyCodes.forEach((c) => {
    if (c && c.trim()) {
      canonicalMap.set(c.trim().toUpperCase(), c.trim());
    }
  });

  const upperBase = baseName.toUpperCase();

  // 1. Direct exact match (e.g. "PH001.jpg" -> "PH001")
  if (canonicalMap.has(upperBase)) {
    const code = canonicalMap.get(upperBase)!;
    return { code, isMatch: true, status: 'Matched' };
  }

  // 2. Prefix match sorted by length descending (longest code first to prevent prefix collisions)
  const sortedCodes = Array.from(canonicalMap.keys()).sort((a, b) => b.length - a.length);
  for (const cand of sortedCodes) {
    if (
      upperBase.startsWith(cand + '_') ||
      upperBase.startsWith(cand + '-') ||
      upperBase.startsWith(cand + ' ') ||
      upperBase.startsWith(cand + '.')
    ) {
      const code = canonicalMap.get(cand)!;
      return { code, isMatch: true, status: 'Matched' };
    }
  }

  // 3. Delimiter split by underscore or space (e.g. "PH001_bedroom_01" -> "PH001")
  const parts = baseName.split(/[_\s]+/);
  if (parts.length > 1) {
    const candidate = parts[0].toUpperCase();
    if (canonicalMap.has(candidate)) {
      const code = canonicalMap.get(candidate)!;
      return { code, isMatch: true, status: 'Matched' };
    }
  }

  // If no match: STRICTLY NO GUESSING
  return {
    code: null,
    isMatch: false,
    status: 'Unmatched',
    reason: `Property code not found in database or imported file. Guessing is strictly prohibited.`,
  };
}

/**
 * Match a batch of uploaded images against Property Codes
 * Categorizes each image as:
 * - Matched (valid format, code matches DB or Excel)
 * - Unmatched (valid format, code not found, strictly no guessing)
 * - Duplicate (duplicate image file in batch)
 * - Invalid (unsupported format, e.g. .pdf, .txt, corrupted)
 */
export async function matchImagesToProperties(
  images: RawImageInput[],
  additionalPropertyCodes: string[] = []
): Promise<ImageMatchingSummary> {
  // Query existing property codes from database
  let dbCodes: string[] = [];
  try {
    const props = await db
      .select({ propertyId: propertiesTable.propertyId })
      .from(propertiesTable);
    dbCodes = props.map((p) => p.propertyId).filter(Boolean) as string[];
  } catch (err) {
    console.warn('Failed to query property IDs from DB for image matching:', err);
  }

  const allKnownCodes = Array.from(
    new Set([...dbCodes, ...additionalPropertyCodes.map((c) => String(c).trim()).filter(Boolean)])
  );

  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const items: ImageMatchItem[] = [];
  const matchedByProperty: Record<string, ImageMatchItem[]> = {};
  const seenFilenames = new Set<string>();

  let matchedCount = 0;
  let unmatchedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const fileName = (img.fileName || `image_${i}.jpg`).trim();
    const fileSize = img.fileSize || 0;
    const mimeType = img.mimeType || 'image/jpeg';
    const dataUrl = img.dataUrl;

    const ext = path.extname(fileName).toLowerCase();

    // 1. Check valid format
    if (!validExtensions.includes(ext)) {
      invalidCount++;
      items.push({
        id: `img-${Date.now()}-${i}`,
        fileName,
        fileSize,
        mimeType,
        dataUrl,
        extractedCode: null,
        matchedPropertyId: null,
        status: 'Invalid',
        reason: `Unsupported format "${ext || 'none'}". Only JPG, JPEG, PNG, WEBP are accepted.`,
      });
      continue;
    }

    // 2. Check duplicate in upload batch
    const lowerName = fileName.toLowerCase();
    if (seenFilenames.has(lowerName)) {
      duplicateCount++;
      items.push({
        id: `img-${Date.now()}-${i}`,
        fileName,
        fileSize,
        mimeType,
        dataUrl,
        extractedCode: null,
        matchedPropertyId: null,
        status: 'Duplicate',
        reason: `Duplicate image filename "${fileName}" in current upload batch.`,
      });
      continue;
    }
    seenFilenames.add(lowerName);

    // 3. Extract and match property code
    const extraction = extractPropertyCodeFromFilename(fileName, allKnownCodes);
    if (!extraction.isMatch || !extraction.code) {
      unmatchedCount++;
      items.push({
        id: `img-${Date.now()}-${i}`,
        fileName,
        fileSize,
        mimeType,
        dataUrl,
        extractedCode: null,
        matchedPropertyId: null,
        status: 'Unmatched',
        reason: extraction.reason || 'No matching Property Code found. Guessing is strictly prohibited.',
      });
      continue;
    }

    // Successfully matched
    matchedCount++;
    const matchItem: ImageMatchItem = {
      id: `img-${Date.now()}-${i}`,
      fileName,
      fileSize,
      mimeType,
      dataUrl,
      extractedCode: extraction.code,
      matchedPropertyId: extraction.code,
      status: 'Matched',
      reason: `Matched with Property Code ${extraction.code}`,
    };
    items.push(matchItem);

    if (!matchedByProperty[extraction.code]) {
      matchedByProperty[extraction.code] = [];
    }
    matchedByProperty[extraction.code].push(matchItem);
  }

  return {
    totalImages: images.length,
    matchedCount,
    unmatchedCount,
    duplicateCount,
    invalidCount,
    items,
    matchedByProperty,
  };
}
