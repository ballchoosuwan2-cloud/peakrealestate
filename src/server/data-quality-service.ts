/**
 * B16 — Data Quality Center Verification Service
 * Real PostgreSQL-backed property audit, integrity, and anomaly detection.
 */

import { db } from '../db/index.ts';
import { propertiesTable } from '../db/schema.ts';

export const VALID_CATEGORIES = [
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

export const VALID_STATUSES = [
  'Available',
  'Reserved',
  'Sold',
  'Rented',
  'Inactive',
  'Unavailable',
];

export const PHUKET_ZONE_MAPPING: Record<string, string[]> = {
  'Zone 1': ['Kathu', 'Patong', 'Kamala', 'Kalim', 'Loch Palm', 'Red Mountain'],
  'Zone 2': ['Chalong', 'Big Buddha', 'Rawai', 'Nai Harn', 'Panwa', 'Saiyuan', 'Cape Panwa'],
  'Zone 3': ['Phuket Town', 'Koh Kaew', 'Rassada', 'Wichit', 'Samkong'],
  'Zone 4': ['Bang Tao', 'Laguna', 'Surin', 'Layan', 'Cherngtalay', 'Pasak', 'Choeng Thale'],
  'Zone 5': ['Thalang', 'Mai Khao', 'Nai Yang', 'Airport', 'Paklok', 'Ao Por', 'Yamu'],
};

export interface DataQualityIssue {
  propertyId: string;
  field: string;
  issueType: string;
  currentValue: string;
  severity: 'Error' | 'Warning';
  message: string;
}

export interface DataQualitySummary {
  totalProperties: number;
  valid: number;
  warnings: number;
  errors: number;
  potentialDuplicates: number;
  missingImportantFields: number;
  fieldBreakdown: Record<string, number>;
  issueTypeBreakdown: Record<string, number>;
}

export interface DataQualityQueryOptions {
  severity?: 'All' | 'Error' | 'Warning';
  field?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Scan all properties in the PostgreSQL database and produce comprehensive quality reports
 */
export async function scanPropertyDataQuality(options: DataQualityQueryOptions = {}) {
  const properties = await db.select().from(propertiesTable);
  const totalProperties = properties.length;

  const issues: DataQualityIssue[] = [];
  const propertyIssueMap = new Map<string, { errors: number; warnings: number }>();
  const titleMap = new Map<string, string[]>();
  const idCounts = new Map<string, number>();

  // First pass: Index IDs and titles for duplicate detection
  for (const p of properties) {
    const rawId = (p.propertyId || '').trim();
    if (rawId) {
      const normalizedId = rawId.toUpperCase();
      idCounts.set(normalizedId, (idCounts.get(normalizedId) || 0) + 1);
    }

    const title = (p.title || '').trim().toLowerCase();
    if (title && title.length > 5) {
      const list = titleMap.get(title) || [];
      list.push(p.propertyId);
      titleMap.set(title, list);
    }
  }

  let potentialDuplicatesCount = 0;
  let missingImportantFieldsCount = 0;

  for (const p of properties) {
    const propId = p.propertyId || 'UNKNOWN';
    let propErrors = 0;
    let propWarnings = 0;
    let hasMissingImportant = false;

    const addIssue = (
      field: string,
      issueType: string,
      currentValue: any,
      severity: 'Error' | 'Warning',
      message: string
    ) => {
      issues.push({
        propertyId: propId,
        field,
        issueType,
        currentValue: currentValue !== null && currentValue !== undefined ? String(currentValue) : '—',
        severity,
        message,
      });

      if (severity === 'Error') propErrors++;
      if (severity === 'Warning') propWarnings++;
    };

    // 1. Property ID Validations
    if (!p.propertyId || !p.propertyId.trim()) {
      addIssue('propertyId', 'MISSING_PROPERTY_ID', p.propertyId, 'Error', 'Property ID is missing or blank');
      hasMissingImportant = true;
    } else {
      if (p.propertyId !== p.propertyId.trim()) {
        addIssue('propertyId', 'WHITESPACE_PROPERTY_ID', p.propertyId, 'Warning', 'Property ID has leading/trailing whitespace anomaly');
      }

      const normId = p.propertyId.trim().toUpperCase();
      if ((idCounts.get(normId) || 0) > 1) {
        addIssue('propertyId', 'DUPLICATE_PROPERTY_ID', p.propertyId, 'Error', `Duplicate Property ID detected (${idCounts.get(normId)} records)`);
      }

      if (!/^[A-Za-z0-9_-]{2,32}$/.test(p.propertyId.trim())) {
        addIssue('propertyId', 'INVALID_ID_FORMAT', p.propertyId, 'Error', 'Property ID format contains illegal characters or invalid length');
      }
    }

    // 2. Price Validations
    const salePrice = Number(p.price);
    const rentPrice = Number(p.rentPrice);

    if (p.price !== null && p.price !== undefined && String(p.price).trim() !== '' && isNaN(salePrice)) {
      addIssue('price', 'INVALID_PRICE_NUMERIC', p.price, 'Error', 'Sale price is not a valid numeric value');
    } else if (salePrice < 0) {
      addIssue('price', 'NEGATIVE_PRICE', p.price, 'Error', 'Sale price cannot be negative');
    }

    if (p.rentPrice !== null && p.rentPrice !== undefined && String(p.rentPrice).trim() !== '' && isNaN(rentPrice)) {
      addIssue('rentPrice', 'INVALID_PRICE_NUMERIC', p.rentPrice, 'Error', 'Rent price is not a valid numeric value');
    } else if (rentPrice < 0) {
      addIssue('rentPrice', 'NEGATIVE_PRICE', p.rentPrice, 'Error', 'Rent price cannot be negative');
    }

    // Zero where not allowed: neither sale nor rent price is positive
    const hasSale = !isNaN(salePrice) && salePrice > 0;
    const hasRent = !isNaN(rentPrice) && rentPrice > 0;
    if (!hasSale && !hasRent) {
      addIssue('price', 'MISSING_PRICE', `${p.price || 0} / ${p.rentPrice || 0}`, 'Error', 'Both sale price and rent price are missing or zero');
      hasMissingImportant = true;
    }

    // 3. Area Validations
    const usable = Number(p.usableArea);
    const land = Number(p.landArea);

    if (p.usableArea !== null && p.usableArea !== undefined && String(p.usableArea).trim() !== '' && isNaN(usable)) {
      addIssue('usableArea', 'INVALID_AREA_NUMERIC', p.usableArea, 'Error', 'Usable area is not a valid numeric value');
    } else if (usable < 0) {
      addIssue('usableArea', 'NEGATIVE_AREA', p.usableArea, 'Error', 'Usable area cannot be negative');
    } else if (!p.usableArea || usable === 0) {
      addIssue('usableArea', 'ZERO_USABLE_AREA', p.usableArea, 'Warning', 'Usable area is missing or specified as zero');
      hasMissingImportant = true;
    }

    if (p.landArea !== null && p.landArea !== undefined && String(p.landArea).trim() !== '' && isNaN(land)) {
      addIssue('landArea', 'INVALID_AREA_NUMERIC', p.landArea, 'Error', 'Land area is not a valid numeric value');
    } else if (land < 0) {
      addIssue('landArea', 'NEGATIVE_AREA', p.landArea, 'Error', 'Land area cannot be negative');
    }

    // 4. Bedroom / Bathroom Validations
    if (p.bedrooms !== null && p.bedrooms !== undefined) {
      const beds = Number(p.bedrooms);
      if (isNaN(beds)) {
        addIssue('bedrooms', 'INVALID_BEDROOM_NUMERIC', p.bedrooms, 'Error', 'Bedrooms is not a valid number');
      } else if (beds < 0) {
        addIssue('bedrooms', 'NEGATIVE_BEDROOM', p.bedrooms, 'Error', 'Bedrooms cannot be negative');
      }
    }

    if (p.bathrooms !== null && p.bathrooms !== undefined) {
      const baths = Number(p.bathrooms);
      if (isNaN(baths)) {
        addIssue('bathrooms', 'INVALID_BATHROOM_NUMERIC', p.bathrooms, 'Error', 'Bathrooms is not a valid number');
      } else if (baths < 0) {
        addIssue('bathrooms', 'NEGATIVE_BATHROOM', p.bathrooms, 'Error', 'Bathrooms cannot be negative');
      }
    }

    // 5. Category Enum Validation
    if (!p.category || !p.category.trim()) {
      addIssue('category', 'MISSING_CATEGORY', p.category, 'Error', 'Property category is missing');
    } else {
      const matchCat = VALID_CATEGORIES.find((c) => c.toLowerCase() === p.category!.trim().toLowerCase());
      if (!matchCat) {
        addIssue('category', 'INVALID_CATEGORY', p.category, 'Error', `Category "${p.category}" is not in canonical enum (${VALID_CATEGORIES.join(', ')})`);
      }
    }

    // 6. Status Enum Validation
    if (!p.status || !p.status.trim()) {
      addIssue('status', 'MISSING_STATUS', p.status, 'Error', 'Property status is missing');
    } else {
      const matchStat = VALID_STATUSES.find((s) => s.toLowerCase() === p.status!.trim().toLowerCase());
      if (!matchStat) {
        addIssue('status', 'INVALID_STATUS', p.status, 'Error', `Status "${p.status}" is not in canonical enum (${VALID_STATUSES.join(', ')})`);
      }
    }

    // 7. Zone & Area Mapping
    if (!p.zone || !p.zone.trim()) {
      addIssue('zone', 'MISSING_ZONE', p.zone, 'Warning', 'Zone is not assigned');
    } else {
      const zoneClean = p.zone.trim();
      const validZoneAreas = PHUKET_ZONE_MAPPING[zoneClean];
      if (!validZoneAreas) {
        addIssue('zone', 'INVALID_ZONE', p.zone, 'Error', `Zone "${p.zone}" is not recognized (Expected Zone 1 - Zone 5)`);
      } else if (p.area && p.area.trim()) {
        const areaClean = p.area.trim().toLowerCase();
        const recognized = validZoneAreas.some((a) => a.toLowerCase() === areaClean || areaClean.includes(a.toLowerCase()) || a.toLowerCase().includes(areaClean));
        if (!recognized) {
          addIssue('area', 'UNRECOGNIZED_AREA_FOR_ZONE', p.area, 'Warning', `Area "${p.area}" is not in the standard list for ${zoneClean}`);
        }
      }
    }

    // 8. Title Check
    if (!p.title || p.title.trim().length < 5) {
      addIssue('title', 'MISSING_OR_SHORT_TITLE', p.title, 'Warning', 'Title is missing or less than 5 characters');
      hasMissingImportant = true;
    }

    // 9. Potential duplicate by title
    const t = (p.title || '').trim().toLowerCase();
    if (t && t.length > 5) {
      const matchingIds = titleMap.get(t) || [];
      if (matchingIds.length > 1) {
        addIssue('title', 'POTENTIAL_DUPLICATE_TITLE', p.title, 'Warning', `Potential duplicate property with matching title (${matchingIds.filter((id) => id !== propId).join(', ')})`);
      }
    }

    // 10. Landlord / Owner Contact Check
    if (!p.ownerName && !p.ownerPhone) {
      addIssue('owner', 'MISSING_OWNER_CONTACT', 'No contact', 'Warning', 'No owner name or phone number recorded');
    }

    if (hasMissingImportant) {
      missingImportantFieldsCount++;
    }

    propertyIssueMap.set(propId, { errors: propErrors, warnings: propWarnings });
  }

  // Count summary metrics
  let validCount = 0;
  let errorsCount = 0;
  let warningsCount = 0;

  for (const [, counts] of propertyIssueMap.entries()) {
    if (counts.errors > 0) {
      errorsCount++;
    } else if (counts.warnings > 0) {
      warningsCount++;
    } else {
      validCount++;
    }
  }

  // Count potential duplicate properties
  const duplicateProps = new Set<string>();
  for (const [, ids] of titleMap.entries()) {
    if (ids.length > 1) {
      ids.forEach((id) => duplicateProps.add(id));
    }
  }
  potentialDuplicatesCount = duplicateProps.size;

  // Breakdown by field & issueType
  const fieldBreakdown: Record<string, number> = {};
  const issueTypeBreakdown: Record<string, number> = {};

  for (const issue of issues) {
    fieldBreakdown[issue.field] = (fieldBreakdown[issue.field] || 0) + 1;
    issueTypeBreakdown[issue.issueType] = (issueTypeBreakdown[issue.issueType] || 0) + 1;
  }

  const summary: DataQualitySummary = {
    totalProperties,
    valid: validCount,
    warnings: warningsCount,
    errors: errorsCount,
    potentialDuplicates: potentialDuplicatesCount,
    missingImportantFields: missingImportantFieldsCount,
    fieldBreakdown,
    issueTypeBreakdown,
  };

  // Filter issues based on request
  let filteredIssues = issues;

  if (options.severity && options.severity !== 'All') {
    filteredIssues = filteredIssues.filter((i) => i.severity === options.severity);
  }

  if (options.field && options.field !== 'All') {
    filteredIssues = filteredIssues.filter((i) => i.field.toLowerCase() === options.field!.toLowerCase());
  }

  if (options.search && options.search.trim()) {
    const q = options.search.trim().toLowerCase();
    filteredIssues = filteredIssues.filter(
      (i) =>
        i.propertyId.toLowerCase().includes(q) ||
        i.field.toLowerCase().includes(q) ||
        i.issueType.toLowerCase().includes(q) ||
        i.message.toLowerCase().includes(q) ||
        i.currentValue.toLowerCase().includes(q)
    );
  }

  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize) || 25));
  const totalCount = filteredIssues.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginatedIssues = filteredIssues.slice((page - 1) * pageSize, page * pageSize);

  return {
    summary,
    issues: paginatedIssues,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
}
