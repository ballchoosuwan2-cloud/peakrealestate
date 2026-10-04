export interface ZoneOption {
  zone: string;
  areas: string[];
}

export const PHUKET_ZONES: ZoneOption[] = [
  {
    zone: 'Zone 1',
    areas: ['Phuket town', 'Kathu', 'Aopor pier', 'Kohkeaw', 'Yamu', 'Naka'],
  },
  {
    zone: 'Zone 2',
    areas: ['Chalong', 'Bigbudha', 'Rawai', 'Naiharn', 'Panwa', 'Saiyuan'],
  },
  {
    zone: 'Zone 3',
    areas: ['Kata', 'Karon', 'Patong', 'Kamala', 'Kalim'],
  },
  {
    zone: 'Zone 4',
    areas: ['Surin', 'Bangtao', 'Layan', 'Chengtalay', 'Thalang', 'Pasak'],
  },
  {
    zone: 'Zone 5',
    areas: ['Naithon', 'Maikhao', 'Airport', 'Naiyang'],
  },
];

export const DISTRICT_OPTIONS = [
  { id: 'muang', name: 'Muang Phuket (อำเภอเมืองภูเก็ต)', short: 'Muang' },
  { id: 'kathu', name: 'Kathu (อำเภอกะทู้)', short: 'Kathu' },
  { id: 'thalang', name: 'Thalang (อำเภอถลาง)', short: 'Thalang' },
];

export const AREA_DISTRICT_MAP: Record<string, { district: string; postalCode: string }> = {
  // Zone 1
  'Phuket town': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83000' },
  'Kohkeaw': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83000' },
  'Kathu': { district: 'Kathu (อำเภอกะทู้)', postalCode: '83120' },
  'Aopor pier': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Yamu': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Naka': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },

  // Zone 2
  'Chalong': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83130' },
  'Bigbudha': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83130' },
  'Rawai': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83130' },
  'Naiharn': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83130' },
  'Panwa': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83130' },
  'Saiyuan': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83130' },

  // Zone 3
  'Kata': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83100' },
  'Karon': { district: 'Muang Phuket (อำเภอเมืองภูเก็ต)', postalCode: '83100' },
  'Patong': { district: 'Kathu (อำเภอกะทู้)', postalCode: '83150' },
  'Kamala': { district: 'Kathu (อำเภอกะทู้)', postalCode: '83120' },
  'Kalim': { district: 'Kathu (อำเภอกะทู้)', postalCode: '83150' },

  // Zone 4
  'Surin': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Bangtao': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Layan': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Chengtalay': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Thalang': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Pasak': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },

  // Zone 5
  'Naithon': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Maikhao': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Airport': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
  'Naiyang': { district: 'Thalang (อำเภอถลาง)', postalCode: '83110' },
};

export const HOUSE_VIEWS = [
  'Mountain View',
  'Garden View',
  'Hill View',
  'City View',
  'Lagoon View',
  'Road View',
  'Pool View',
  'Building View',
  'Jungle View',
  'Sea View',
  'Yard View',
  'Lake View',
  'Golf View',
];

export const CHECKLIST_ITEMS = [
  'Movie Room',
  'Kettle',
  'Safety Box',
  'Smart TV',
  'Cooker Hood',
  'TV',
  'Beach Chair',
  'Coffee Machine',
  'Dressing Table',
  'Wifi',
  'Toaster',
  'Drying Machines',
  'Working Desk',
  'Washing Machine',
  'Pavilion',
  'BBQ Grill',
  'Sauna Room',
  'Electric Stove',
  'Bathtub',
  'Dishwasher',
  'CCTV',
  'Refrigerator',
  'Fan',
  'Ceiling Fan',
  'Snooker Room',
  'Fitness',
  'Kitchen Ware',
  'Balcony',
  'Gas Stove',
  'Air Conditioner',
  'Sofa',
  'Wardrobe',
  'Rice Cooker',
  'Oven',
  'Dining Table',
  'Ironing Equipment',
  'Microwave',
  'Public Car Park',
  'Private Car Park',
  'Jacuzzi',
  'Water Heater',
  'Copper Pan',
  'Private Swimming Pool',
  'Public Swimming Pool',
  'Gyms and Sports Facilities',
  'Garden',
  'Game Rooms',
  'Security Services',
];

export const SERVICE_INCLUDES = [
  'Free pool and garden cleaning',
  'Free water fee',
  'Government electricity rate',
  'High-speed Wi-Fi',
  'Pest control service',
  'Common area fee included',
  'Weekly housekeeping',
  '24/7 Security guard & CCTV',
];

export const POPULAR_PROJECTS = [
  { en: 'Majestic Villas', th: 'มาเจสติก วิลล่า' },
  { en: 'Mono Palai', th: 'โมโน ป่าหล่าย' },
  { en: 'The Heights Phuket', th: 'เดอะ ไฮท์ ภูเก็ต' },
  { en: 'Botanica Luxury Villas', th: 'โบทานิกา ลักชัวรี่ วิลล่า' },
  { en: 'Anchan Horizon', th: 'อัญชัน ฮอไรซอน' },
  { en: 'Banyan Tree Residences', th: 'บันยันทรี เรสซิเดนซ์' },
  { en: 'MontAzure Lakeside', th: 'มอนท์เอซัวร์ เลคไซด์' },
];

export const SAMPLE_VILLA_PHOTOS = [
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
];

export const FOLLOWUP_CONTENT_OPTIONS = [
  'Available',
  'Sold',
  'Not Ready',
  'Co-agent',
  'Rented - Vacating',
  'Rented',
  'Contract Renewal',
  'Avoid This Property',
  'Owner Changed',
  'Short-term Rental',
  'Owner Difficult',
  'Cannot Contact',
  'Landlord phone number added',
] as const;

export interface PropertyStatusTab {
  key: string;
  label: string;
  category?: string | null;
  status?: string;
  filter?: string;
}

export const PROPERTY_STATUS_TABS: PropertyStatusTab[] = [
  { key: 'all', label: 'All', category: null },
  { key: 'land', label: 'Lands', category: 'Land' },
  { key: 'commercial', label: 'Commercial Buildings', category: 'Commercial' },
  { key: 'hotel', label: 'Hotels', category: 'Hotel' },
  { key: 'condo', label: 'Condominium', category: 'Condo' },
  { key: 'villa', label: 'Villas', category: 'Villa' },
  { key: 'house', label: 'Houses', category: 'House' },
  { key: 'expire_soon', label: 'Expire Soon', filter: 'expire_soon' },
  { key: 'need_update', label: 'Need Update', filter: 'need_update' },
  { key: 'sold', label: 'Sold', status: 'Sold' },
  { key: 'new_register', label: 'New Register', filter: 'new_register' },
  { key: 'black_list', label: 'Black List', filter: 'black_list' },
  { key: 'occupancy_audit', label: 'Occupancy Audit', filter: 'occupancy_audit' },
  { key: 'archived', label: 'Archived / ถังขยะ', filter: 'archived' },
];


