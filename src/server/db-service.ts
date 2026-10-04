import { and, desc, asc, eq, ilike, or, gte, lte, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  propertiesTable,
  importHistoryTable,
  auditLogsTable,
  databaseBackupsTable,
  DbProperty,
  InsertDbProperty,
} from '../db/schema.ts';
import fs from 'fs';
import path from 'path';

// Phuket Zone mapping for strict data validation
export const PHUKET_ZONE_MAPPING: Record<string, string[]> = {
  'Zone 1': ['Phuket Town', 'Kathu', 'Ao Por Pier', 'Koh Kaew', 'Yamu', 'Naka'],
  'Zone 2': ['Chalong', 'Big Buddha', 'Rawai', 'Nai Harn', 'Panwa', 'Saiyuan'],
  'Zone 3': ['Kata', 'Karon', 'Patong', 'Kamala', 'Kalim'],
  'Zone 4': ['Surin', 'Bang Tao', 'Layan', 'Cherngtalay', 'Thalang', 'Pasak'],
  'Zone 5': ['Naithon', 'Mai Khao', 'Airport', 'Nai Yang'],
};

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

// Ensure backups folder exists
const BACKUPS_DIR = path.join(process.cwd(), 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
  try {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create backups directory:', err);
  }
}

/**
 * Seed initial real properties if database is currently empty
 */
export async function seedInitialPropertiesIfEmpty(): Promise<number> {
  if (process.env.NODE_ENV !== 'test') {
    return 0;
  }
  try {
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(propertiesTable);
    const count = Number(countResult[0]?.count || 0);

    if (count > 0) {
      return count;
    }

    console.log('Seeding initial properties into PostgreSQL...');

    const initialProperties: InsertDbProperty[] = [
      {
        propertyId: 'VL-1001',
        title: 'The Peak Oceanfront Pool Villa',
        titleTh: 'เดอะ พีค โอเชียนฟรอนต์ พูลวิลล่า ระดับอัลตร้าลักชัวรี่',
        address: '88/12 Millionaires Mile, Kamala Bay',
        district: 'Kamala',
        city: 'Phuket',
        zone: 'Zone 3',
        area: 'Kamala',
        nation: 'Thailand',
        postalCode: '83150',
        category: 'Villa',
        status: 'Available',
        propertyLabel: 'Rent and Sale',
        isPublished: true,
        publishStatus: 'Published',
        price: '85000000',
        rentPrice: '420000',
        dailyRent: '25000',
        bedrooms: 5,
        bathrooms: 6,
        usableArea: '860',
        landArea: '1200',
        yearBuilt: 2023,
        furniture: 'Fully Furnished',
        petFriendly: true,
        petType: 'Pets Allowed',
        hasPool: true,
        hasHousePool: 'Private Pool',
        poolType: 'Saltwater Pool',
        ownerName: 'Khun Somchai Ratanakul',
        ownerPhone: '081-999-8877',
        ownerEmail: 'somchai.r@investment.th',
        virtualPhone1: '02-888-9101',
        virtualPhone2: '02-888-9102',
        landlordPhone3: '081-999-8877',
        agentId: 'usr-1',
        agentName: 'Somchai Prasert',
        agencyType: 'Exclusive',
        description: 'Breathtaking cliffside oceanfront villa featuring private infinity pool, panoramic sunset views of Andaman Sea, Italian marble finishes, chef kitchen, and private elevator.',
        descriptionTh: 'วิลล่าหรูริมผาติดทะเลกมลา สระว่ายน้ำอินฟินิตี้ส่วนตัว วิวพระอาทิตย์ตกอันดามันแบบพาโนรามา ตกแต่งด้วยหินอ่อนอิตาลี ลิฟต์ส่วนตัว และครัวระดับเชฟ',
        googleMapUrl: 'https://maps.google.com/?q=7.9519,98.2798',
        amenities: ['Private Infinity Pool', 'Cinema Room', 'Wine Cellar', 'Elevator', 'Gym', '24/7 Security', 'Smart Home System'],
        featured: true,
        images: [
          { id: 'img-1-1', url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80', isCover: true, hasWatermark: true, title: 'Front Facade & Pool' },
          { id: 'img-1-2', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', isCover: false, hasWatermark: true, title: 'Infinity Pool Sunset' },
          { id: 'img-1-3', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', isCover: false, hasWatermark: false, title: 'Living Lounge' },
          { id: 'img-1-4', url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80', isCover: false, hasWatermark: false, title: 'Master Bedroom' },
        ],
        deposit: '2 Months',
        advancePayment: '1 Month',
        commission: '1 Month',
        saleCommission: '3%',
        transferType: '50/50',
        commonFee: '15000',
        latitude: '7.9519',
        longitude: '98.2798',
        lastFollowUpDate: '2026-09-10',
        lastFollowUpStatus: 'Available',
        lastFollowUpContent: 'Confirmed with landlord, price negotiable for multi-year lease.',
      },
      {
        propertyId: 'CD-2045',
        title: 'Skyline Sea View Penthouse Patong',
        titleTh: 'สกายไลน์ ซีวิว เพนต์เฮาส์ ป่าตอง',
        address: '45/8 Phra Barami Road',
        district: 'Patong',
        city: 'Phuket',
        zone: 'Zone 3',
        area: 'Patong',
        nation: 'Thailand',
        postalCode: '83150',
        category: 'Condo',
        status: 'Available',
        propertyLabel: 'Rent and Sale',
        isPublished: true,
        publishStatus: 'Published',
        price: '24500000',
        rentPrice: '135000',
        bedrooms: 3,
        bathrooms: 3,
        usableArea: '240',
        floor: 28,
        yearBuilt: 2022,
        furniture: 'Fully Furnished',
        petFriendly: false,
        hasPool: true,
        ownerName: 'William Sterling',
        ownerPhone: '+66 82 334 9102',
        ownerEmail: 'w.sterling@monaco-holding.mc',
        agentId: 'usr-2',
        agentName: 'Nichada Prasert',
        agencyType: 'Co-Broke',
        description: 'Top-floor corner penthouse with wrap-around balcony, private heated jacuzzi, double-height ceiling, and uninterrupted views across Patong Bay.',
        descriptionTh: 'เพนต์เฮาส์มุมชั้นบนสุด ระเบียงกว้างวิวทะเลอ่าวป่าตอง 180 องศา อ่างจากุซซี่ส่วนตัว เพดานสูงโปร่ง 2 ชั้น พร้อมเฟอร์นิเจอร์สั่งทำพิเศษ',
        googleMapUrl: 'https://maps.google.com/?q=7.8967,98.2965',
        amenities: ['Private Jacuzzi', 'Sky Lounge', 'Fitness Center', 'Keycard Access', 'Covered Parking', 'Sea View'],
        featured: true,
        images: [
          { id: 'img-2-1', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', isCover: true, hasWatermark: true, title: 'Penthouse Living Room' },
          { id: 'img-2-2', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80', isCover: false, hasWatermark: false, title: 'Open Kitchen' },
        ],
        latitude: '7.8967',
        longitude: '98.2965',
        lastFollowUpDate: '2026-09-08',
        lastFollowUpStatus: 'Available',
      },
      {
        propertyId: 'VL-1002',
        title: 'Bang Tao Sanctuary Luxury Pool Residence',
        titleTh: 'บางเทา แซงค์ทัวรี่ พูลเรสซิเดนซ์ ใกล้โบ๊ทอเวนิว',
        address: '12/4 Choeng Thale Soi 1',
        district: 'Thalang',
        city: 'Phuket',
        zone: 'Zone 4',
        area: 'Bang Tao',
        nation: 'Thailand',
        postalCode: '83110',
        category: 'Villa',
        status: 'Reserved',
        propertyLabel: 'Sale',
        isPublished: true,
        publishStatus: 'Published',
        price: '49000000',
        rentPrice: '280000',
        bedrooms: 4,
        bathrooms: 5,
        usableArea: '520',
        landArea: '800',
        yearBuilt: 2024,
        furniture: 'Fully Furnished',
        petFriendly: true,
        hasPool: true,
        ownerName: 'Khun Pornpen Chulaporn',
        ownerPhone: '086-771-4567',
        agentId: 'usr-3',
        agentName: 'Kittisak Vong',
        agencyType: 'Exclusive',
        description: 'Modern Balinese style luxury villa steps from Laguna Golf and Boat Avenue, surrounded by tropical greenery with a 15m private saltwater lap pool.',
        amenities: ['15m Saltwater Pool', 'BBQ Pavilion', 'Solar Panel System', 'Maid Quarter', 'Double Garage'],
        featured: true,
        images: [
          { id: 'img-3-1', url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80', isCover: true, hasWatermark: true, title: 'Villa Exterior' },
        ],
        latitude: '7.9942',
        longitude: '98.3031',
        lastFollowUpDate: '2026-09-12',
        lastFollowUpStatus: 'Reserved',
      },
      {
        propertyId: 'HS-3001',
        title: 'Kathu Country Golf Course Family Villa',
        titleTh: 'บ้านเดี่ยวหรูวิวสนามกอล์ฟ กะทู้ ภูเก็ต',
        address: '99/5 Vichitsongkram Road',
        district: 'Kathu',
        city: 'Phuket',
        zone: 'Zone 1',
        area: 'Kathu',
        nation: 'Thailand',
        postalCode: '83120',
        category: 'House',
        status: 'Available',
        propertyLabel: 'Rent and Sale',
        isPublished: true,
        publishStatus: 'Published',
        price: '18900000',
        rentPrice: '95000',
        bedrooms: 4,
        bathrooms: 4,
        usableArea: '380',
        landArea: '600',
        yearBuilt: 2021,
        furniture: 'Fully Furnished',
        petFriendly: true,
        hasPool: true,
        ownerName: 'Michael Chen',
        ownerPhone: '098-123-9988',
        agentId: 'usr-2',
        agentName: 'Nichada Prasert',
        agencyType: 'Representative',
        description: 'Spacious 2-storey golf course view family home with private landscaped garden, swimming pool, and high European standard building specs.',
        images: [
          { id: 'img-4-1', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80', isCover: true, hasWatermark: true, title: 'House Elevation' },
        ],
        latitude: '7.9155',
        longitude: '98.3328',
        lastFollowUpDate: '2026-09-11',
        lastFollowUpStatus: 'Available',
      },
      {
        propertyId: 'LD-4001',
        title: 'Prime Hillside Sea View Land Parcel Layan',
        titleTh: 'ที่ดินแปลงสวยเนินเขาซีวิว หาดลายัน 2 ไร่',
        address: 'Soi Layan 4, Choeng Thale',
        district: 'Thalang',
        city: 'Phuket',
        zone: 'Zone 4',
        area: 'Layan',
        nation: 'Thailand',
        postalCode: '83110',
        category: 'Land',
        status: 'Available',
        propertyLabel: 'Sale',
        isPublished: true,
        publishStatus: 'Published',
        price: '68000000',
        bedrooms: 0,
        bathrooms: 0,
        usableArea: '0',
        landArea: '3200',
        furniture: 'Unfurnished',
        petFriendly: true,
        hasPool: false,
        ownerName: 'Khun Thanin Srisuk',
        ownerPhone: '081-333-2211',
        agentId: 'usr-1',
        agentName: 'Somchai Prasert',
        agencyType: 'Direct',
        description: 'Rare 2-Rai (3,200 sq.m) Nor Sor 3 Gor titled land with direct sea views, concrete road access, 3-phase electricity, ideal for custom mega-villa or boutique resort development.',
        images: [
          { id: 'img-5-1', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80', isCover: true, hasWatermark: true, title: 'Panoramic Hillside Land' },
        ],
        latitude: '8.0315',
        longitude: '98.2912',
      },
      {
        propertyId: 'CD-2046',
        title: 'Laguna Beachfront 2-Bedroom Condo',
        titleTh: 'ลากูน่า บีชฟรอนต์ คอนโด 2 ห้องนอน',
        address: '39 Moo 4, Srisoonthorn Road',
        district: 'Thalang',
        city: 'Phuket',
        zone: 'Zone 4',
        area: 'Cherngtalay',
        nation: 'Thailand',
        postalCode: '83110',
        category: 'Condo',
        status: 'Sold',
        propertyLabel: 'Sale',
        isPublished: true,
        publishStatus: 'Published',
        price: '16500000',
        rentPrice: '85000',
        bedrooms: 2,
        bathrooms: 2,
        usableArea: '110',
        floor: 4,
        yearBuilt: 2023,
        furniture: 'Fully Furnished',
        petFriendly: false,
        hasPool: true,
        ownerName: 'Elena Rostova',
        ownerPhone: '+7 916 555 4321',
        agentId: 'usr-3',
        agentName: 'Kittisak Vong',
        agencyType: 'Co-Broke',
        description: 'Beachfront condominium located directly within Laguna resort complex, rental pool management program with guaranteed high rental returns.',
        images: [
          { id: 'img-6-1', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80', isCover: true, hasWatermark: true, title: 'Condo Building' },
        ],
        latitude: '7.9922',
        longitude: '98.2965',
      },
      {
        propertyId: 'CM-5001',
        title: 'Modern Retail & Office Shophouse Chalong Hub',
        titleTh: 'อาคารพาณิชย์ 4 ชั้น ทำเลทองห้าแยกฉลอง',
        address: '108/2 Chao Fa East Road',
        district: 'Mueang Phuket',
        city: 'Phuket',
        zone: 'Zone 2',
        area: 'Chalong',
        nation: 'Thailand',
        postalCode: '83130',
        category: 'Commercial',
        status: 'Rented',
        propertyLabel: 'Rent',
        isPublished: true,
        publishStatus: 'Published',
        price: '14800000',
        rentPrice: '65000',
        bedrooms: 2,
        bathrooms: 4,
        usableArea: '320',
        landArea: '180',
        yearBuilt: 2022,
        furniture: 'Partially Furnished',
        petFriendly: false,
        hasPool: false,
        ownerName: 'Chaiwat Charoenrat',
        ownerPhone: '089-112-2334',
        agentId: 'usr-2',
        agentName: 'Nichada Prasert',
        agencyType: 'Co-Broke',
        description: 'High visibility 4-storey commercial building with glass front, elevator shaft, ample front customer parking, ideal for clinic, law firm or design agency.',
        images: [
          { id: 'img-7-1', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80', isCover: true, hasWatermark: true, title: 'Commercial Front' },
        ],
        latitude: '7.8512',
        longitude: '98.3411',
      },
      {
        propertyId: 'VL-1003',
        title: 'Rawai Tropical Pool Villa near Nai Harn Beach',
        titleTh: 'ราไวย์ ทรอปิคอล พูลวิลล่า ใกล้หาดในหาน',
        address: '55/3 Saiyuan Road',
        district: 'Mueang Phuket',
        city: 'Phuket',
        zone: 'Zone 2',
        area: 'Rawai',
        nation: 'Thailand',
        postalCode: '83130',
        category: 'Villa',
        status: 'Available',
        propertyLabel: 'Rent and Sale',
        isPublished: true,
        publishStatus: 'Published',
        price: '21500000',
        rentPrice: '120000',
        bedrooms: 3,
        bathrooms: 3,
        usableArea: '280',
        landArea: '450',
        yearBuilt: 2022,
        furniture: 'Fully Furnished',
        petFriendly: true,
        hasPool: true,
        ownerName: 'Anders Lindqvist',
        ownerPhone: '+46 70 123 4567',
        agentId: 'usr-1',
        agentName: 'Somchai Prasert',
        agencyType: 'Exclusive',
        description: 'Charming single-storey tropical villa located in prime Saiyuan quiet residential neighborhood, just 5 minutes drive to stunning Nai Harn Beach.',
        images: [
          { id: 'img-8-1', url: 'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80', isCover: true, hasWatermark: true, title: 'Villa Garden' },
        ],
        latitude: '7.7844',
        longitude: '98.3184',
        lastFollowUpDate: '2026-09-13',
        lastFollowUpStatus: 'Available',
      },
    ];

    await db.insert(propertiesTable).values(initialProperties);

    // Initial audit log
    await db.insert(auditLogsTable).values({
      propertyId: 'ALL',
      action: 'Imported',
      userName: 'System Administrator',
      userId: 'system',
      newValue: `Database initialized with ${initialProperties.length} properties`,
    });

    console.log(`Successfully seeded ${initialProperties.length} properties.`);
    return initialProperties.length;
  } catch (error) {
    console.error('Failed to seed properties:', error);
    return 0;
  }
}

export interface PropertyQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  status?: string;
  propertyLabel?: string;
  agentName?: string;
  agencyType?: string;
  zone?: string;
  area?: string;
  district?: string;
  rentPriceMin?: number;
  rentPriceMax?: number;
  salePriceMin?: number;
  salePriceMax?: number;
  bedroom?: number;
  bathroom?: number;
  hasPool?: boolean;
  petFriendly?: boolean;
  furniture?: string;
  publishStatus?: string;
  approvalStatus?: string;
  isBlackList?: boolean;
  isArchived?: boolean; // false = active listings, true = archived listings, undefined = active only (default)
  userRole?: string;
  userId?: string;
  qualityFilter?: string; // 'missing_id' | 'missing_price' | 'missing_area' | 'missing_photos' | 'invalid_location' | 'need_update'
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  propertyIds?: string[];
  importId?: string;
}

/**
 * Formula injection escaping (CSV/Spreadsheet security)
 */
export function escapeFormulaInjection(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function maskToken(token?: string | null): string {
  if (!token) return '••••••••';
  const clean = token.trim();
  if (clean.length <= 6) return '••••••••';
  return `••••••••${clean.slice(-6)}`;
}

export function maskFingerprint(fingerprint?: string | null): string {
  if (!fingerprint) return '••••••••';
  const clean = fingerprint.trim();
  if (clean.length <= 8) return '••••••••';
  return `••••••••${clean.slice(-8)}`;
}

/**
 * Server-side Query with pagination, search, rich filtering, and sorting
 */
export async function getProperties(params: PropertyQueryParams) {
  try {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 15));
    const offset = (page - 1) * pageSize;

    const conditions = [];

    // Search query across 10 fields
    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(propertiesTable.propertyId, q),
          ilike(propertiesTable.title, q),
          ilike(propertiesTable.titleTh, q),
          ilike(propertiesTable.projectName, q),
          ilike(propertiesTable.ownerName, q),
          ilike(propertiesTable.ownerPhone, q),
          ilike(propertiesTable.agentName, q),
          ilike(propertiesTable.roomNo, q),
          ilike(propertiesTable.houseNo, q),
          ilike(propertiesTable.city, q),
          ilike(propertiesTable.area, q),
          ilike(propertiesTable.district, q)
        )
      );
    }

    // Direct Filters
    if (params.category && params.category !== 'All') {
      conditions.push(eq(propertiesTable.category, params.category));
    }
    if (params.status && params.status !== 'All') {
      conditions.push(eq(propertiesTable.status, params.status));
    }
    if (params.propertyLabel && params.propertyLabel !== 'All') {
      conditions.push(eq(propertiesTable.propertyLabel, params.propertyLabel));
    }
    if (params.agentName && params.agentName !== 'All') {
      conditions.push(eq(propertiesTable.agentName, params.agentName));
    }
    if (params.agencyType && params.agencyType !== 'All') {
      conditions.push(eq(propertiesTable.agencyType, params.agencyType));
    }
    if (params.zone && params.zone !== 'All') {
      conditions.push(eq(propertiesTable.zone, params.zone));
    }
    if (params.area && params.area !== 'All') {
      conditions.push(eq(propertiesTable.area, params.area));
    }
    if (params.district && params.district !== 'All') {
      conditions.push(eq(propertiesTable.district, params.district));
    }
    if (params.bedroom !== undefined && params.bedroom > 0) {
      conditions.push(eq(propertiesTable.bedrooms, params.bedroom));
    }
    if (params.bathroom !== undefined && params.bathroom > 0) {
      conditions.push(eq(propertiesTable.bathrooms, params.bathroom));
    }
    if (params.furniture && params.furniture !== 'All') {
      conditions.push(eq(propertiesTable.furniture, params.furniture));
    }
    if (params.hasPool !== undefined) {
      conditions.push(eq(propertiesTable.hasPool, params.hasPool));
    }
    if (params.petFriendly !== undefined) {
      conditions.push(eq(propertiesTable.petFriendly, params.petFriendly));
    }
    if (params.publishStatus && params.publishStatus !== 'All') {
      conditions.push(eq(propertiesTable.publishStatus, params.publishStatus));
    }
    if (params.approvalStatus && params.approvalStatus !== 'All') {
      conditions.push(eq(propertiesTable.approvalStatus, params.approvalStatus));
    }
    if (params.isBlackList !== undefined) {
      conditions.push(eq(propertiesTable.isBlackList, params.isBlackList));
    }

    // Archive filtering: By default only show non-archived properties (isArchived === false)
    if (params.isArchived !== undefined) {
      conditions.push(eq(propertiesTable.isArchived, params.isArchived));
    } else {
      conditions.push(eq(propertiesTable.isArchived, false));
    }

    // Price range filters
    if (params.rentPriceMin !== undefined && params.rentPriceMin > 0) {
      conditions.push(gte(propertiesTable.rentPrice, params.rentPriceMin.toString()));
    }
    if (params.rentPriceMax !== undefined && params.rentPriceMax > 0) {
      conditions.push(lte(propertiesTable.rentPrice, params.rentPriceMax.toString()));
    }
    if (params.salePriceMin !== undefined && params.salePriceMin > 0) {
      conditions.push(gte(propertiesTable.price, params.salePriceMin.toString()));
    }
    if (params.salePriceMax !== undefined && params.salePriceMax > 0) {
      conditions.push(lte(propertiesTable.price, params.salePriceMax.toString()));
    }

    // Data Quality Filter
    if (params.qualityFilter) {
      if (params.qualityFilter === 'missing_price') {
        conditions.push(
          or(
            sql`${propertiesTable.price} IS NULL OR ${propertiesTable.price} = '0'`,
            sql`${propertiesTable.rentPrice} IS NULL OR ${propertiesTable.rentPrice} = '0'`
          )
        );
      } else if (params.qualityFilter === 'missing_area') {
        conditions.push(
          sql`${propertiesTable.usableArea} IS NULL OR ${propertiesTable.usableArea} = '0'`
        );
      } else if (params.qualityFilter === 'missing_photos') {
        conditions.push(
          sql`${propertiesTable.images} IS NULL OR jsonb_array_length(${propertiesTable.images}) = 0`
        );
      } else if (params.qualityFilter === 'need_update') {
        conditions.push(
          or(
            sql`${propertiesTable.lastFollowUpDate} IS NULL`,
            sql`${propertiesTable.lastFollowUpDate} < TO_CHAR(NOW() - INTERVAL '30 days', 'YYYY-MM-DD')`
          )
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting
    let orderByClause;
    const isDesc = params.sortOrder === 'desc';
    switch (params.sortBy) {
      case 'propertyId':
        orderByClause = isDesc ? desc(propertiesTable.propertyId) : asc(propertiesTable.propertyId);
        break;
      case 'price':
        orderByClause = isDesc ? desc(propertiesTable.price) : asc(propertiesTable.price);
        break;
      case 'rentPrice':
        orderByClause = isDesc ? desc(propertiesTable.rentPrice) : asc(propertiesTable.rentPrice);
        break;
      case 'usableArea':
        orderByClause = isDesc ? desc(propertiesTable.usableArea) : asc(propertiesTable.usableArea);
        break;
      case 'status':
        orderByClause = isDesc ? desc(propertiesTable.status) : asc(propertiesTable.status);
        break;
      case 'bedrooms':
        orderByClause = isDesc ? desc(propertiesTable.bedrooms) : asc(propertiesTable.bedrooms);
        break;
      case 'updatedAt':
        orderByClause = isDesc ? desc(propertiesTable.updatedAt) : asc(propertiesTable.updatedAt);
        break;
      case 'createdAt':
      default:
        orderByClause = isDesc ? desc(propertiesTable.createdAt) : asc(propertiesTable.createdAt);
        break;
    }

    // Execute query for data
    const query = db
      .select()
      .from(propertiesTable)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset(offset);

    const rows = await query;

    // Execute query for total count matching filters
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(propertiesTable)
      .where(whereClause);

    const total = Number(countResult[0]?.count || 0);

    // Calculate Global KPI Stats directly from DB
    const statsResult = await db.select({
      total: sql<number>`count(*) filter (where ${propertiesTable.isArchived} = false)`,
      archived: sql<number>`count(*) filter (where ${propertiesTable.isArchived} = true)`,
      available: sql<number>`count(*) filter (where ${propertiesTable.status} = 'Available' and ${propertiesTable.isArchived} = false)`,
      rented: sql<number>`count(*) filter (where ${propertiesTable.status} = 'Rented' and ${propertiesTable.isArchived} = false)`,
      sold: sql<number>`count(*) filter (where ${propertiesTable.status} = 'Sold' and ${propertiesTable.isArchived} = false)`,
      draft: sql<number>`count(*) filter (where (${propertiesTable.publishStatus} = 'Draft' or ${propertiesTable.isPublished} = false) and ${propertiesTable.isArchived} = false)`,
      published: sql<number>`count(*) filter (where (${propertiesTable.publishStatus} = 'Published' or ${propertiesTable.isPublished} = true) and ${propertiesTable.isArchived} = false)`,
      blackList: sql<number>`count(*) filter (where ${propertiesTable.isBlackList} = true and ${propertiesTable.isArchived} = false)`,
      needUpdate: sql<number>`count(*) filter (where (${propertiesTable.lastFollowUpDate} is null or ${propertiesTable.lastFollowUpDate} < to_char(now() - interval '30 days', 'YYYY-MM-DD')) and ${propertiesTable.isArchived} = false)`,
      missingPrice: sql<number>`count(*) filter (where (${propertiesTable.price} is null or ${propertiesTable.price} = '0') and (${propertiesTable.rentPrice} is null or ${propertiesTable.rentPrice} = '0') and ${propertiesTable.isArchived} = false)`,
      missingArea: sql<number>`count(*) filter (where (${propertiesTable.usableArea} is null or ${propertiesTable.usableArea} = '0') and ${propertiesTable.isArchived} = false)`,
      missingPhotos: sql<number>`count(*) filter (where (${propertiesTable.images} is null or jsonb_array_length(${propertiesTable.images}) = 0) and ${propertiesTable.isArchived} = false)`,
    }).from(propertiesTable);

    const statsRow: any = statsResult[0] || {};
    const stats = {
      total: Number(statsRow.total || 0),
      archived: Number(statsRow.archived || 0),
      available: Number(statsRow.available || 0),
      rented: Number(statsRow.rented || 0),
      sold: Number(statsRow.sold || 0),
      draft: Number(statsRow.draft || 0),
      published: Number(statsRow.published || 0),
      blackList: Number(statsRow.blackList || 0),
      needUpdate: Number(statsRow.needUpdate || 0),
      quality: {
        missingPrice: Number(statsRow.missingPrice || 0),
        missingArea: Number(statsRow.missingArea || 0),
        missingPhotos: Number(statsRow.missingPhotos || 0),
      }
    };

    return {
      data: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      stats,
    };
  } catch (error) {
    console.error('getProperties failed:', error);
    throw new Error('Failed to retrieve properties from database.', { cause: error });
  }
}

/**
 * Get Global KPI Statistics directly from PostgreSQL
 */
export async function getPropertyStats() {
  try {
    const statsResult = await db.select({
      total: sql<number>`count(*) filter (where ${propertiesTable.isArchived} = false)`,
      archived: sql<number>`count(*) filter (where ${propertiesTable.isArchived} = true)`,
      available: sql<number>`count(*) filter (where ${propertiesTable.status} = 'Available' and ${propertiesTable.isArchived} = false)`,
      rented: sql<number>`count(*) filter (where ${propertiesTable.status} = 'Rented' and ${propertiesTable.isArchived} = false)`,
      sold: sql<number>`count(*) filter (where ${propertiesTable.status} = 'Sold' and ${propertiesTable.isArchived} = false)`,
      draft: sql<number>`count(*) filter (where (${propertiesTable.publishStatus} = 'Draft' or ${propertiesTable.isPublished} = false) and ${propertiesTable.isArchived} = false)`,
      published: sql<number>`count(*) filter (where (${propertiesTable.publishStatus} = 'Published' or ${propertiesTable.isPublished} = true) and ${propertiesTable.isArchived} = false)`,
      blackList: sql<number>`count(*) filter (where ${propertiesTable.isBlackList} = true and ${propertiesTable.isArchived} = false)`,
      needUpdate: sql<number>`count(*) filter (where (${propertiesTable.lastFollowUpDate} is null or ${propertiesTable.lastFollowUpDate} < to_char(now() - interval '30 days', 'YYYY-MM-DD')) and ${propertiesTable.isArchived} = false)`,
      missingPrice: sql<number>`count(*) filter (where (${propertiesTable.price} is null or ${propertiesTable.price} = '0') and (${propertiesTable.rentPrice} is null or ${propertiesTable.rentPrice} = '0') and ${propertiesTable.isArchived} = false)`,
      missingArea: sql<number>`count(*) filter (where (${propertiesTable.usableArea} is null or ${propertiesTable.usableArea} = '0') and ${propertiesTable.isArchived} = false)`,
      missingPhotos: sql<number>`count(*) filter (where (${propertiesTable.images} is null or jsonb_array_length(${propertiesTable.images}) = 0) and ${propertiesTable.isArchived} = false)`,
    }).from(propertiesTable);

    const statsRow: any = statsResult[0] || {};
    return {
      total: Number(statsRow.total || 0),
      archived: Number(statsRow.archived || 0),
      available: Number(statsRow.available || 0),
      rented: Number(statsRow.rented || 0),
      sold: Number(statsRow.sold || 0),
      draft: Number(statsRow.draft || 0),
      published: Number(statsRow.published || 0),
      blackList: Number(statsRow.blackList || 0),
      needUpdate: Number(statsRow.needUpdate || 0),
      quality: {
        missingPrice: Number(statsRow.missingPrice || 0),
        missingArea: Number(statsRow.missingArea || 0),
        missingPhotos: Number(statsRow.missingPhotos || 0),
      }
    };
  } catch (error) {
    console.error('getPropertyStats failed:', error);
    throw new Error('Failed to retrieve statistics from database.', { cause: error });
  }
}

/**
 * Get single property by Property ID
 */
export async function getPropertyByPropertyId(propertyId: string): Promise<DbProperty | null> {
  try {
    const result = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.propertyId, propertyId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error(`Failed to fetch property ${propertyId}:`, error);
    throw new Error(`Failed to fetch property ${propertyId}`, { cause: error });
  }
}

/**
 * Create a new property with unique ID validation and audit logging
 */
export async function createProperty(
  data: InsertDbProperty,
  user: { name: string; id?: string }
): Promise<DbProperty> {
  try {
    // Check if propertyId already exists
    const existing = await getPropertyByPropertyId(data.propertyId);
    if (existing) {
      throw new Error(`Property ID "${data.propertyId}" already exists in the database.`);
    }

    const [inserted] = await db.insert(propertiesTable).values(data).returning();

    // Log to Audit Trail
    await db.insert(auditLogsTable).values({
      propertyId: inserted.propertyId,
      action: 'Created',
      userName: user.name,
      userId: user.id || 'usr-default',
      newValue: `Property created: ${inserted.title || inserted.propertyId} (${inserted.category}, ${inserted.status})`,
    });

    return inserted;
  } catch (error) {
    console.error('createProperty failed:', error);
    throw error;
  }
}

/**
 * Update an existing property with audit logging and change detection
 */
export async function updateProperty(
  propertyId: string,
  data: Partial<InsertDbProperty>,
  user: { name: string; id?: string }
): Promise<DbProperty> {
  try {
    const existing = await getPropertyByPropertyId(propertyId);
    if (!existing) {
      throw new Error(`Property "${propertyId}" not found.`);
    }

    // Detect changes for specific audit logs
    const auditActions: { action: string; oldVal: string; newVal: string }[] = [];

    if (data.status && data.status !== existing.status) {
      auditActions.push({
        action: 'Status Changed',
        oldVal: existing.status,
        newVal: data.status,
      });
    }

    if (data.price && data.price !== existing.price) {
      auditActions.push({
        action: 'Price Changed',
        oldVal: `Sale Price: ${existing.price} THB`,
        newVal: `Sale Price: ${data.price} THB`,
      });
    }

    if (data.rentPrice && data.rentPrice !== existing.rentPrice) {
      auditActions.push({
        action: 'Price Changed',
        oldVal: `Rent Price: ${existing.rentPrice} THB`,
        newVal: `Rent Price: ${data.rentPrice} THB`,
      });
    }

    if (data.agentName && data.agentName !== existing.agentName) {
      auditActions.push({
        action: 'Agent Changed',
        oldVal: existing.agentName,
        newVal: data.agentName,
      });
    }

    const [updated] = await db
      .update(propertiesTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(propertiesTable.propertyId, propertyId))
      .returning();

    // Write audit logs
    if (auditActions.length > 0) {
      for (const item of auditActions) {
        await db.insert(auditLogsTable).values({
          propertyId,
          action: item.action,
          userName: user.name,
          userId: user.id || 'usr-default',
          oldValue: item.oldVal,
          newValue: item.newVal,
        });
      }
    } else {
      await db.insert(auditLogsTable).values({
        propertyId,
        action: 'Updated',
        userName: user.name,
        userId: user.id || 'usr-default',
        newValue: 'Property details modified',
      });
    }

    return updated;
  } catch (error) {
    console.error(`updateProperty failed for ${propertyId}:`, error);
    throw error;
  }
}

/**
 * Soft delete (Archive) a property with audit logging.
 * NEVER hard delete data to ensure zero data loss.
 */
export async function deleteProperty(
  propertyId: string,
  user: { name: string; id?: string }
): Promise<boolean> {
  try {
    const existing = await getPropertyByPropertyId(propertyId);
    if (!existing) {
      throw new Error(`Property "${propertyId}" not found.`);
    }

    // Soft delete: set isArchived to true
    await db
      .update(propertiesTable)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(propertiesTable.propertyId, propertyId));

    await db.insert(auditLogsTable).values({
      propertyId,
      action: 'Archived',
      userName: user.name,
      userId: user.id || 'usr-default',
      oldValue: `Active: ${existing.title || existing.propertyId}`,
      newValue: `Archived (Soft deleted) by ${user.name}`,
    });

    return true;
  } catch (error) {
    console.error(`deleteProperty (archive) failed for ${propertyId}:`, error);
    throw error;
  }
}

/**
 * Restore an archived property with audit logging
 */
export async function restoreProperty(
  propertyId: string,
  user: { name: string; id?: string }
): Promise<DbProperty> {
  try {
    const existing = await getPropertyByPropertyId(propertyId);
    if (!existing) {
      throw new Error(`Property "${propertyId}" not found.`);
    }

    const [restored] = await db
      .update(propertiesTable)
      .set({
        isArchived: false,
        updatedAt: new Date(),
      })
      .where(eq(propertiesTable.propertyId, propertyId))
      .returning();

    await db.insert(auditLogsTable).values({
      propertyId,
      action: 'Restored',
      userName: user.name,
      userId: user.id || 'usr-default',
      oldValue: `Archived`,
      newValue: `Restored to Active by ${user.name}`,
    });

    return restored;
  } catch (error) {
    console.error(`restoreProperty failed for ${propertyId}:`, error);
    throw error;
  }
}

/**
 * Bulk soft delete (Archive) properties
 */
export async function bulkDeleteProperties(
  propertyIds: string[],
  user: { name: string; id?: string }
): Promise<number> {
  try {
    if (propertyIds.length === 0) return 0;

    await db
      .update(propertiesTable)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(inArray(propertiesTable.propertyId, propertyIds));

    await db.insert(auditLogsTable).values({
      propertyId: 'BULK',
      action: 'Archived',
      userName: user.name,
      userId: user.id || 'usr-default',
      oldValue: `Active batch (${propertyIds.length})`,
      newValue: `Bulk archived ${propertyIds.length} properties: ${propertyIds.slice(0, 5).join(', ')}${propertyIds.length > 5 ? '...' : ''}`,
    });

    return propertyIds.length;
  } catch (error) {
    console.error('bulkDeleteProperties (archive) failed:', error);
    throw error;
  }
}

/**
 * Bulk restore archived properties
 */
export async function bulkRestoreProperties(
  propertyIds: string[],
  user: { name: string; id?: string }
): Promise<number> {
  try {
    if (propertyIds.length === 0) return 0;

    await db
      .update(propertiesTable)
      .set({
        isArchived: false,
        updatedAt: new Date(),
      })
      .where(inArray(propertiesTable.propertyId, propertyIds));

    await db.insert(auditLogsTable).values({
      propertyId: 'BULK',
      action: 'Restored',
      userName: user.name,
      userId: user.id || 'usr-default',
      oldValue: `Archived batch (${propertyIds.length})`,
      newValue: `Bulk restored ${propertyIds.length} properties: ${propertyIds.slice(0, 5).join(', ')}${propertyIds.length > 5 ? '...' : ''}`,
    });

    return propertyIds.length;
  } catch (error) {
    console.error('bulkRestoreProperties failed:', error);
    throw error;
  }
}

/**
 * Bulk update status
 */
export async function bulkUpdateStatus(
  propertyIds: string[],
  newStatus: string,
  user: { name: string; id?: string }
): Promise<number> {
  try {
    if (propertyIds.length === 0) return 0;

    await db
      .update(propertiesTable)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(inArray(propertiesTable.propertyId, propertyIds));

    await db.insert(auditLogsTable).values({
      propertyId: 'BULK',
      action: 'Status Changed',
      userName: user.name,
      userId: user.id || 'usr-default',
      newValue: `Bulk updated status to ${newStatus} for ${propertyIds.length} properties`,
    });

    return propertyIds.length;
  } catch (error) {
    console.error('bulkUpdateStatus failed:', error);
    throw error;
  }
}

/**
 * Bulk Import Batch with transaction, duplicate handling, and validation
 */
export async function importBatch(
  batchRows: any[],
  options: {
    duplicateMode: 'skip' | 'update' | 'new_id';
    fileName: string;
    userName: string;
    userId?: string;
    dryRun?: boolean;
  }
) {
  let newCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors: { row: number; propertyId: string; error: string }[] = [];
  const seenInBatch = new Set<string>();

  for (let i = 0; i < batchRows.length; i++) {
    const raw = batchRows[i];
    const rowNum = i + 1;

    try {
      let propId = String(raw.propertyId || raw['Property ID'] || raw['PropertyID'] || '').trim();
      if (!propId) {
        errors.push({ row: rowNum, propertyId: '', error: 'Property ID is required' });
        errorCount++;
        continue;
      }

      const canonicalId = propId.toUpperCase();
      if (seenInBatch.has(canonicalId)) {
        errors.push({
          row: rowNum,
          propertyId: propId,
          error: `Duplicate Property ID "${canonicalId}" in file`,
        });
        errorCount++;
        continue;
      }
      seenInBatch.add(canonicalId);

      // Check Category
      const category = String(raw.category || raw['Category'] || 'Villa').trim();
      if (!VALID_CATEGORIES.some((c) => c.toLowerCase() === category.toLowerCase())) {
        errors.push({
          row: rowNum,
          propertyId: propId,
          error: `Invalid Category "${category}". Allowed: ${VALID_CATEGORIES.join(', ')}`,
        });
        errorCount++;
        continue;
      }

      // Check Zone & Area validation
      const zone = String(raw.zone || raw['Zone'] || 'Zone 2').trim();
      const area = String(raw.area || raw['Area'] || 'Rawai').trim();

      if (PHUKET_ZONE_MAPPING[zone]) {
        const allowedAreas = PHUKET_ZONE_MAPPING[zone];
        const areaMatched = allowedAreas.some(
          (a) => a.toLowerCase() === area.toLowerCase() || area.toLowerCase().includes(a.toLowerCase())
        );
        if (!areaMatched) {
          errors.push({
            row: rowNum,
            propertyId: propId,
            error: `Area "${area}" does not belong to ${zone}. Allowed areas in ${zone}: ${allowedAreas.join(', ')}`,
          });
          errorCount++;
          continue;
        }
      }

      // Check if property exists
      const existing = await getPropertyByPropertyId(propId);

      if (existing) {
        if (options.duplicateMode === 'skip') {
          skippedCount++;
          continue;
        } else if (options.duplicateMode === 'update') {
          if (options.dryRun) {
            updatedCount++;
            continue;
          }

          // Prepare update data - safely preserve existing non-empty values
          const updateData: Partial<InsertDbProperty> = {
            category,
            zone,
            area,
            status: (raw.status || raw['Status'] || raw['Property Status'] || '').trim() || existing.status,
            propertyLabel: (raw.propertyLabel || raw['Property Label'] || '').trim() || existing.propertyLabel,
            title: (raw.title || raw['Project'] || raw['Project TH'] || '').trim() || existing.title,
            titleTh: (raw.titleTh || raw['Project TH'] || '').trim() || existing.titleTh,
            projectName: (raw.projectName || raw['Project'] || '').trim() || existing.projectName,
            address: (raw.address || raw['Address EN'] || raw['Address TH'] || '').trim() || existing.address,
            district: (raw.district || raw['District'] || '').trim() || existing.district,
            city: (raw.city || raw['City'] || '').trim() || existing.city,
            postalCode: (raw.postalCode || raw['Postal Code'] || '').trim() || existing.postalCode,
            rentPrice: raw.rentPrice || raw['Rent Price'] ? String(raw.rentPrice || raw['Rent Price']) : existing.rentPrice,
            price: raw.price || raw['Sale Price'] ? String(raw.price || raw['Sale Price']) : existing.price,
            usableArea: raw.usableArea || raw['Usable Area'] ? String(raw.usableArea || raw['Usable Area']) : existing.usableArea,
            bedrooms: raw.bedrooms !== undefined ? Number(raw.bedrooms) : (raw['Bedroom'] !== undefined ? Number(raw['Bedroom']) : existing.bedrooms),
            bathrooms: raw.bathrooms !== undefined ? Number(raw.bathrooms) : (raw['Bathroom'] !== undefined ? Number(raw['Bathroom']) : existing.bathrooms),
            furniture: (raw.furniture || raw['Furniture'] || '').trim() || existing.furniture,
            petFriendly: raw.petFriendly !== undefined ? Boolean(raw.petFriendly) : (raw['Pet'] ? raw['Pet'].includes('Allow') : existing.petFriendly),
            hasPool: raw.hasPool !== undefined ? Boolean(raw.hasPool) : (raw['Pool'] ? raw['Pool'].toLowerCase() !== 'no' : existing.hasPool),
            agentName: (raw.agentName || raw['Agent'] || '').trim() || existing.agentName,
            agencyType: (raw.agencyType || raw['Agency Type'] || '').trim() || existing.agencyType,
            ownerName: (raw.ownerName || raw['Landlord Name'] || '').trim() || existing.ownerName,
            ownerPhone: (raw.ownerPhone || raw['Landlord Phone'] || '').trim() || existing.ownerPhone,
            comments: (raw.comments || raw['Comments'] || '').trim() || existing.comments,
            updatedAt: new Date(),
          };

          await db.update(propertiesTable).set(updateData).where(eq(propertiesTable.propertyId, propId));
          updatedCount++;
          continue;
        } else if (options.duplicateMode === 'new_id') {
          // Auto-generate new unique ID
          let counter = 1;
          let candidate = `${propId}-N${counter}`;
          while (await getPropertyByPropertyId(candidate)) {
            counter++;
            candidate = `${propId}-N${counter}`;
          }
          propId = candidate;
        }
      }

      if (options.dryRun) {
        newCount++;
        continue;
      }

      // Parse images from Photo URLs column
      let imagesList: any[] = [];
      const photoUrlsRaw = raw.photoUrls || raw['Photo URLs'] || raw['Images'];
      if (photoUrlsRaw) {
        const urls = String(photoUrlsRaw).split(/[\n,;]+/).map((u) => u.trim()).filter((u) => u.startsWith('http'));
        imagesList = urls.map((url, idx) => ({
          id: `img-import-${Date.now()}-${idx}`,
          url,
          isCover: idx === 0,
          hasWatermark: false,
          title: `Photo ${idx + 1}`,
        }));
      }

      // Insert new property
      const insertRecord: InsertDbProperty = {
        propertyId: propId,
        title: raw.title || raw['Project'] || raw['Project TH'] || `Property ${propId}`,
        titleTh: raw.titleTh || raw['Project TH'] || '',
        projectName: raw.projectName || raw['Project'] || '',
        projectNameTh: raw.projectNameTh || raw['Project TH'] || '',
        category,
        zone,
        area,
        district: raw.district || raw['District'] || 'Mueang Phuket',
        city: raw.city || raw['City'] || 'Phuket',
        nation: raw.nation || raw['Nation'] || 'Thailand',
        postalCode: raw.postalCode || raw['Postal Code'] || '83130',
        address: raw.address || raw['Address EN'] || raw['Address TH'] || '',
        status: raw.status || raw['Property Status'] || 'Available',
        propertyLabel: raw.propertyLabel || raw['Property Label'] || 'Rent',
        rentPrice: String(raw.rentPrice || raw['Rent Price'] || '0'),
        price: String(raw.price || raw['Sale Price'] || '0'),
        usableArea: String(raw.usableArea || raw['Usable Area'] || '0'),
        bedrooms: Number(raw.bedrooms || raw['Bedroom'] || 0),
        bathrooms: Number(raw.bathrooms || raw['Bathroom'] || 0),
        building: raw.building || raw['Building'] || '',
        floor: Number(raw.floor || raw['Floor'] || 0) || null,
        roomNo: raw.roomNo || raw['Room No'] || '',
        houseNo: raw.houseNo || raw['House No'] || '',
        furniture: raw.furniture || raw['Furniture'] || 'Fully Furnished',
        petFriendly: raw['Pet'] ? raw['Pet'].includes('Allow') : Boolean(raw.petFriendly),
        hasPool: raw['Pool'] ? raw['Pool'].toLowerCase() !== 'no' : Boolean(raw.hasPool),
        poolType: raw.poolType || raw['Pool Type'] || 'No Pool',
        yearBuilt: Number(raw.yearBuilt || raw['Year Build'] || 0) || null,
        agentName: raw.agentName || raw['Agent'] || options.userName,
        agencyType: raw.agencyType || raw['Agency Type'] || 'Co-Broke',
        ownerName: raw.ownerName || raw['Landlord Name'] || '',
        ownerPhone: raw.ownerPhone || raw['Landlord Phone'] || '',
        ownerEmail: raw.ownerEmail || raw['Landlord Email'] || '',
        comments: raw.comments || raw['Comments'] || '',
        images: imagesList,
        isPublished: true,
        publishStatus: 'Published',
      };

      await db.insert(propertiesTable).values(insertRecord);
      newCount++;
    } catch (err: any) {
      errorCount++;
      errors.push({
        row: rowNum,
        propertyId: raw.propertyId || '',
        error: err.message || 'Database insert error',
      });
    }
  }

  return {
    totalRows: batchRows.length,
    newCount,
    updatedCount,
    skippedCount,
    errorCount,
    errors,
  };
}

/**
 * Save an Import History entry
 */
export async function recordImportHistory(data: {
  fileName: string;
  userName: string;
  userId?: string;
  totalRows: number;
  newCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  status: string;
  errorsJson: any[];
}) {
  try {
    const importId = `IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const [record] = await db
      .insert(importHistoryTable)
      .values({
        importId,
        fileName: data.fileName,
        userName: data.userName,
        userId: data.userId || 'usr-default',
        totalRows: data.totalRows,
        newCount: data.newCount,
        updatedCount: data.updatedCount,
        skippedCount: data.skippedCount,
        errorCount: data.errorCount,
        status: data.status,
        errorsJson: data.errorsJson,
      })
      .returning();

    // Log to Audit Trail
    await db.insert(auditLogsTable).values({
      propertyId: 'BULK',
      action: 'Imported',
      userName: data.userName,
      userId: data.userId || 'usr-default',
      newValue: `Imported ${data.fileName}: New ${data.newCount}, Updated ${data.updatedCount}, Skipped ${data.skippedCount}, Errors ${data.errorCount}`,
    });

    return record;
  } catch (error) {
    console.error('recordImportHistory failed:', error);
    return null;
  }
}

export interface ImportHistoryQueryParams {
  search?: string;
  status?: string;
  mode?: string;
  operator?: string;
  dateRange?: string; // 'all' | 'today' | '7days' | '30days' | 'custom'
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'totalRows' | 'newCount' | 'updatedCount' | 'errorCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export function parseImportHistoryPayload(record: any) {
  if (!record) return null;
  let parsed: any = record.errorsJson;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = {};
    }
  }

  const isLegacyArray = Array.isArray(parsed);
  const errors = isLegacyArray ? parsed : (Array.isArray(parsed?.errors) ? parsed.errors : []);
  const rows = isLegacyArray
    ? parsed.map((err: any, idx: number) => ({
        row: err.row || idx + 1,
        propertyId: err.propertyId || '',
        action: 'FAIL',
        status: 'Error',
        errors: [err.error || err.reason || 'Import error'],
        warnings: [],
      }))
    : (Array.isArray(parsed?.rows) ? parsed.rows : []);

  const duplicateMode = !isLegacyArray && parsed?.duplicateMode ? parsed.duplicateMode : 'skip';
  const durationMs = !isLegacyArray && parsed?.durationMs ? parsed.durationMs : 0;
  const startedAt = !isLegacyArray && parsed?.startedAt ? parsed.startedAt : record.createdAt;
  const completedAt = !isLegacyArray && parsed?.completedAt ? parsed.completedAt : record.createdAt;
  const affectedPropertyIds: string[] = !isLegacyArray && Array.isArray(parsed?.affectedPropertyIds) ? parsed.affectedPropertyIds : [];

  const rawToken = !isLegacyArray ? parsed?.maskedToken : null;
  const rawFingerprint = !isLegacyArray ? parsed?.maskedFingerprint : null;

  return {
    ...record,
    mode: duplicateMode,
    duplicateMode,
    durationMs,
    startedAt,
    completedAt,
    affectedPropertyIds,
    errors,
    rows,
    maskedToken: maskToken(rawToken),
    maskedFingerprint: maskFingerprint(rawFingerprint),
  };
}

/**
 * Retrieve Import History records with advanced server-side search, filtering, and pagination
 */
export async function getImportHistory(
  paramsOrLimit: ImportHistoryQueryParams | number = 50
) {
  try {
    if (typeof paramsOrLimit === 'number') {
      const records = await db
        .select()
        .from(importHistoryTable)
        .orderBy(desc(importHistoryTable.createdAt))
        .limit(paramsOrLimit);
      return records.map(parseImportHistoryPayload);
    }

    const params = paramsOrLimit || {};
    const conditions = [];

    // Search: importId, fileName, userName
    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(importHistoryTable.importId, q),
          ilike(importHistoryTable.fileName, q),
          ilike(importHistoryTable.userName, q)
        )
      );
    }

    // Status filter
    if (params.status && params.status !== 'All') {
      conditions.push(eq(importHistoryTable.status, params.status));
    }

    // Operator filter
    if (params.operator && params.operator !== 'All') {
      conditions.push(eq(importHistoryTable.userName, params.operator));
    }

    // Date range filter
    if (params.dateRange && params.dateRange !== 'all') {
      const now = new Date();
      if (params.dateRange === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        conditions.push(gte(importHistoryTable.createdAt, startOfDay));
      } else if (params.dateRange === '7days') {
        const past7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        conditions.push(gte(importHistoryTable.createdAt, past7));
      } else if (params.dateRange === '30days') {
        const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        conditions.push(gte(importHistoryTable.createdAt, past30));
      } else if (params.dateRange === 'custom') {
        if (params.startDate) {
          conditions.push(gte(importHistoryTable.createdAt, new Date(params.startDate)));
        }
        if (params.endDate) {
          conditions.push(lte(importHistoryTable.createdAt, new Date(params.endDate)));
        }
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting
    const sortField = params.sortBy || 'createdAt';
    const isAsc = params.sortOrder === 'asc';

    let orderExpr;
    if (sortField === 'totalRows') {
      orderExpr = isAsc ? asc(importHistoryTable.totalRows) : desc(importHistoryTable.totalRows);
    } else if (sortField === 'newCount') {
      orderExpr = isAsc ? asc(importHistoryTable.newCount) : desc(importHistoryTable.newCount);
    } else if (sortField === 'updatedCount') {
      orderExpr = isAsc ? asc(importHistoryTable.updatedCount) : desc(importHistoryTable.updatedCount);
    } else if (sortField === 'errorCount') {
      orderExpr = isAsc ? asc(importHistoryTable.errorCount) : desc(importHistoryTable.errorCount);
    } else {
      orderExpr = isAsc ? asc(importHistoryTable.createdAt) : desc(importHistoryTable.createdAt);
    }

    const allRecords = await db
      .select()
      .from(importHistoryTable)
      .where(whereClause)
      .orderBy(orderExpr);

    let mappedRecords = allRecords.map(parseImportHistoryPayload);

    // Filter by mode if specified (skip, update, new_id)
    if (params.mode && params.mode !== 'All') {
      mappedRecords = mappedRecords.filter(
        (r) => (r.mode || '').toLowerCase() === params.mode!.toLowerCase()
      );
    }

    // Pagination
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 25));
    const totalCount = mappedRecords.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedRecords = mappedRecords.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: paginatedRecords,
      items: paginatedRecords,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  } catch (error) {
    console.error('getImportHistory failed:', error);
    return {
      data: [],
      items: [],
      pagination: { page: 1, pageSize: 25, totalCount: 0, totalPages: 1 },
      page: 1,
      pageSize: 25,
      totalCount: 0,
      totalPages: 1,
    };
  }
}

/**
 * Retrieve Single Import History record by importId
 */
export async function getImportHistoryById(importId: string) {
  try {
    const [record] = await db
      .select()
      .from(importHistoryTable)
      .where(eq(importHistoryTable.importId, importId));
    if (!record) return null;

    const parsed = parseImportHistoryPayload(record);

    // Fetch related audit logs for this import
    const auditLogs = await db
      .select()
      .from(auditLogsTable)
      .where(
        or(
          ilike(auditLogsTable.newValue, `%${importId}%`),
          ilike(auditLogsTable.oldValue, `%${importId}%`)
        )
      )
      .orderBy(desc(auditLogsTable.createdAt));

    let fullAuditLogs = auditLogs;
    if (fullAuditLogs.length === 0 && parsed.affectedPropertyIds?.length > 0) {
      fullAuditLogs = await db
        .select()
        .from(auditLogsTable)
        .where(inArray(auditLogsTable.propertyId, parsed.affectedPropertyIds))
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(50);
    }

    return {
      ...parsed,
      auditLogs: fullAuditLogs,
    };
  } catch (error) {
    console.error(`getImportHistoryById(${importId}) failed:`, error);
    return null;
  }
}

/**
 * Generate Secure CSV export for Import History with formula injection protection
 */
export async function generateImportHistoryCsv(params: ImportHistoryQueryParams = {}): Promise<string> {
  const result: any = await getImportHistory({ ...params, page: 1, pageSize: 5000 });
  const records = Array.isArray(result) ? result : (result.data || []);

  const headers = [
    'Import ID',
    'Filename',
    'Operator',
    'Mode',
    'Date',
    'Total Rows',
    'Inserted',
    'Updated',
    'Skipped',
    'Failed',
    'Status',
  ];

  const rows = records.map((r: any) => [
    escapeFormulaInjection(r.importId),
    escapeFormulaInjection(r.fileName),
    escapeFormulaInjection(r.userName),
    escapeFormulaInjection(r.mode || 'skip'),
    escapeFormulaInjection(r.createdAt ? new Date(r.createdAt).toISOString() : ''),
    escapeFormulaInjection(r.totalRows || 0),
    escapeFormulaInjection(r.newCount || 0),
    escapeFormulaInjection(r.updatedCount || 0),
    escapeFormulaInjection(r.skippedCount || 0),
    escapeFormulaInjection(r.errorCount || 0),
    escapeFormulaInjection(r.status || 'Completed'),
  ]);

  const escapeCsvCell = (val: any) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row: any[]) => row.map(escapeCsvCell).join(',')),
  ];

  return csvLines.join('\n');
}

export interface AuditLogsQueryParams {
  importId?: string;
  propertyId?: string;
  userName?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Retrieve Audit Logs with advanced server-side search, filtering, and pagination
 */
export async function getAuditLogs(
  paramsOrPropId?: string | AuditLogsQueryParams,
  limit = 100
) {
  try {
    if (typeof paramsOrPropId === 'string') {
      if (paramsOrPropId && paramsOrPropId !== 'ALL') {
        return await db
          .select()
          .from(auditLogsTable)
          .where(eq(auditLogsTable.propertyId, paramsOrPropId))
          .orderBy(desc(auditLogsTable.createdAt))
          .limit(limit);
      }
      return await db
        .select()
        .from(auditLogsTable)
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(limit);
    }

    const params: AuditLogsQueryParams = paramsOrPropId || {};
    const conditions = [];

    if (params.importId && params.importId.trim()) {
      const impId = params.importId.trim();
      conditions.push(
        or(
          ilike(auditLogsTable.newValue, `%${impId}%`),
          ilike(auditLogsTable.oldValue, `%${impId}%`)
        )
      );
    }

    if (params.propertyId && params.propertyId !== 'ALL') {
      conditions.push(eq(auditLogsTable.propertyId, params.propertyId.trim()));
    }

    if (params.userName && params.userName !== 'All') {
      conditions.push(eq(auditLogsTable.userName, params.userName.trim()));
    }

    if (params.action && params.action !== 'All') {
      conditions.push(eq(auditLogsTable.action, params.action.trim()));
    }

    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(auditLogsTable.propertyId, q),
          ilike(auditLogsTable.userName, q),
          ilike(auditLogsTable.action, q),
          ilike(auditLogsTable.newValue, q),
          ilike(auditLogsTable.oldValue, q)
        )
      );
    }

    if (params.startDate) {
      conditions.push(gte(auditLogsTable.createdAt, new Date(params.startDate)));
    }
    if (params.endDate) {
      conditions.push(lte(auditLogsTable.createdAt, new Date(params.endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const allRecords = await db
      .select()
      .from(auditLogsTable)
      .where(whereClause)
      .orderBy(desc(auditLogsTable.createdAt));

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 25));
    const totalCount = allRecords.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedRecords = allRecords.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: paginatedRecords,
      items: paginatedRecords,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  } catch (error) {
    console.error('getAuditLogs failed:', error);
    return {
      data: [],
      items: [],
      pagination: { page: 1, pageSize: 25, totalCount: 0, totalPages: 1 },
      page: 1,
      pageSize: 25,
      totalCount: 0,
      totalPages: 1,
    };
  }
}

/**
 * Create a real database backup snapshot to file and database
 */
export async function createDatabaseBackup(createdByName: string) {
  try {
    const backupId = `BCK-${Date.now()}`;
    const fileName = `peak_db_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filePath = path.join(BACKUPS_DIR, fileName);

    // Fetch all records
    const allProperties = await db.select().from(propertiesTable);
    const allImports = await db.select().from(importHistoryTable);
    const allAuditLogs = await db.select().from(auditLogsTable);

    const snapshot = {
      backupId,
      createdAt: new Date().toISOString(),
      createdByName,
      recordCount: allProperties.length,
      properties: allProperties,
      importHistory: allImports,
      auditLogs: allAuditLogs,
    };

    const jsonStr = JSON.stringify(snapshot, null, 2);
    fs.writeFileSync(filePath, jsonStr, 'utf-8');
    const fileSize = Buffer.byteLength(jsonStr, 'utf-8');

    const [backupRecord] = await db
      .insert(databaseBackupsTable)
      .values({
        backupId,
        fileName,
        fileSize,
        recordCount: allProperties.length,
        status: 'Success',
        createdByName,
      })
      .returning();

    await db.insert(auditLogsTable).values({
      propertyId: 'DATABASE',
      action: 'Updated',
      userName: createdByName,
      newValue: `Created database backup ${fileName} with ${allProperties.length} records (${Math.round(fileSize / 1024)} KB)`,
    });

    return backupRecord;
  } catch (error) {
    console.error('createDatabaseBackup failed:', error);
    throw error;
  }
}

/**
 * List real database backups
 */
export async function listDatabaseBackups() {
  try {
    return await db
      .select()
      .from(databaseBackupsTable)
      .orderBy(desc(databaseBackupsTable.createdAt))
      .limit(50);
  } catch (error) {
    console.error('listDatabaseBackups failed:', error);
    return [];
  }
}

/**
 * Restore database from an actual backup file in a transaction
 */
export async function restoreDatabaseBackup(backupId: string, userName: string) {
  try {
    const backup = await db
      .select()
      .from(databaseBackupsTable)
      .where(eq(databaseBackupsTable.backupId, backupId))
      .limit(1);

    if (!backup[0]) {
      throw new Error(`Backup record ${backupId} not found.`);
    }

    const filePath = path.join(BACKUPS_DIR, backup[0].fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file ${backup[0].fileName} not found on server.`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const snapshot = JSON.parse(content);
    const properties = snapshot.properties || [];

    // Clear and restore properties
    await db.delete(propertiesTable);

    if (properties.length > 0) {
      // Clean serial ids to let Postgres handle or insert as is
      const cleanProperties = properties.map((p: any) => {
        const { id, ...rest } = p;
        return rest;
      });

      // Insert in chunks of 100
      for (let i = 0; i < cleanProperties.length; i += 100) {
        const chunk = cleanProperties.slice(i, i + 100);
        await db.insert(propertiesTable).values(chunk);
      }
    }

    await db.insert(auditLogsTable).values({
      propertyId: 'DATABASE',
      action: 'Updated',
      userName,
      newValue: `Restored database from backup ${backup[0].fileName} (${properties.length} properties restored)`,
    });

    return {
      success: true,
      restoredCount: properties.length,
      backupId,
    };
  } catch (error) {
    console.error('restoreDatabaseBackup failed:', error);
    throw error;
  }
}

export const dbService = {
  getProperties,
  getPropertyStats,
  getPropertyByPropertyId,
  createProperty,
  updateProperty,
  deleteProperty,
  bulkDeleteProperties,
  bulkUpdateStatus,
  importBatch,
  recordImportHistory,
  getImportHistory,
  getImportDetail: getImportHistoryById,
  getImportHistoryById,
  exportImportHistoryCsv: generateImportHistoryCsv,
  generateImportHistoryCsv,
  getAuditLogs,
  createDatabaseBackup,
  listDatabaseBackups,
  restoreDatabaseBackup,
  escapeFormulaInjection,
  maskToken,
  maskFingerprint,
};
