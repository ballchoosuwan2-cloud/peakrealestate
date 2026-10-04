import { Property } from '../types';
import { validateAreaBelongsToZone } from './property-location-options';

export interface ReadinessCheckItem {
  id: string;
  field: string;
  labelTh: string;
  labelEn: string;
  tab: 'basic' | 'landlord' | 'price' | 'photos' | 'videos' | 'map' | 'logs' | 'publish';
  passed: boolean;
  messageTh?: string;
  messageEn?: string;
}

export interface PublishReadinessResult {
  isReady: boolean;
  score: number;
  totalChecks: number;
  passedChecks: number;
  checklist: ReadinessCheckItem[];
  missingFields: ReadinessCheckItem[];
}

export function evaluatePropertyPublishReadiness(property: Partial<Property>): PublishReadinessResult {
  const checklist: ReadinessCheckItem[] = [];

  // 1. Property ID
  checklist.push({
    id: 'propertyId',
    field: 'propertyId',
    labelTh: 'รหัสอสังหาริมทรัพย์ (Property ID)',
    labelEn: 'Property ID',
    tab: 'basic',
    passed: Boolean(property.propertyId && property.propertyId.trim().length > 0),
    messageTh: 'กรุณากรอกรหัสอสังหาริมทรัพย์',
    messageEn: 'Property ID is required',
  });

  // 2. Category
  checklist.push({
    id: 'category',
    field: 'category',
    labelTh: 'ประเภทอสังหาริมทรัพย์ (Category)',
    labelEn: 'Category',
    tab: 'basic',
    passed: Boolean(property.category),
    messageTh: 'กรุณาระบุประเภทอสังหาริมทรัพย์',
    messageEn: 'Category is required',
  });

  // 3. Agent
  checklist.push({
    id: 'agent',
    field: 'agentName',
    labelTh: 'ผู้ดูแลทรัพย์ (Agent)',
    labelEn: 'Agent',
    tab: 'basic',
    passed: Boolean(property.agentName || property.agentId),
    messageTh: 'กรุณาระบุเอเจนต์ผู้รับผิดชอบ',
    messageEn: 'Agent must be assigned',
  });

  // 4. Agency Type
  checklist.push({
    id: 'agencyType',
    field: 'agencyType',
    labelTh: 'ประเภทตัวแทน (Agency Type)',
    labelEn: 'Agency Type',
    tab: 'basic',
    passed: Boolean(property.agencyType && property.agencyType.trim().length > 0),
    messageTh: 'กรุณาระบุประเภทตัวแทน เช่น Representative / Exclusive',
    messageEn: 'Agency Type is required',
  });

  // 5. Property Label
  checklist.push({
    id: 'propertyLabel',
    field: 'propertyLabel',
    labelTh: 'ป้ายประเภทการตลาด (Property Label)',
    labelEn: 'Property Label',
    tab: 'basic',
    passed: Boolean(property.propertyLabel),
    messageTh: 'กรุณาเลือก Rent, Sale หรือ Rent and Sale',
    messageEn: 'Property Label is required',
  });

  // 6. Property Status
  checklist.push({
    id: 'status',
    field: 'status',
    labelTh: 'สถานะอสังหาริมทรัพย์ (Status)',
    labelEn: 'Status',
    tab: 'basic',
    passed: Boolean(property.status),
    messageTh: 'กรุณาระบุสถานะของทรัพย์',
    messageEn: 'Status is required',
  });

  // 7. Rented Condition (Rent To required if status is Rented)
  if (property.status === 'Rented') {
    checklist.push({
      id: 'rentTo',
      field: 'rentTo',
      labelTh: 'วันสิ้นสุดสัญญาเช่า (Rent To) สำหรับสถานะ Rented',
      labelEn: 'Rent To Date (Required when Rented)',
      tab: 'basic',
      passed: Boolean(property.rentTo && property.rentTo.trim().length > 0),
      messageTh: 'สถานะ Rented ต้องระบุวันที่สิ้นสุดสัญญาเช่า (Rent To)',
      messageEn: 'Rent To date is required when status is Rented',
    });
  }

  // 8. Location - Nation & City
  checklist.push({
    id: 'location',
    field: 'city',
    labelTh: 'ประเทศและเมือง (Nation & City)',
    labelEn: 'Nation & City',
    tab: 'basic',
    passed: Boolean((property.nation || 'Thailand') && (property.city || 'Phuket')),
    messageTh: 'กรุณาระบุประเทศและเมือง',
    messageEn: 'Nation and City must be specified',
  });

  // 9. Zone & Area
  const pureArea = property.area
    ? property.area.includes('/')
      ? property.area.split('/')[1].trim()
      : property.area.trim()
    : '';

  const zoneValid = Boolean(property.zone && property.zone.trim().length > 0);
  const areaBelongsToZone = zoneValid && pureArea ? validateAreaBelongsToZone(property.zone!, pureArea) : false;

  checklist.push({
    id: 'zoneArea',
    field: 'area',
    labelTh: 'โซนและทำเล (Zone & Area)',
    labelEn: 'Zone & Area',
    tab: 'basic',
    passed: zoneValid && areaBelongsToZone,
    messageTh: !zoneValid
      ? 'กรุณาเลือกโซน (Zone)'
      : !areaBelongsToZone
      ? 'ทำเล (Area) ที่เลือกไม่สอดคล้องกับโซน (Zone)'
      : undefined,
    messageEn: 'Zone and a valid matching Area are required',
  });

  // 10. House No.
  checklist.push({
    id: 'houseNo',
    field: 'houseNo',
    labelTh: 'บ้านเลขที่ (House No.)',
    labelEn: 'House No.',
    tab: 'basic',
    passed: Boolean(property.houseNo && property.houseNo.trim().length > 0),
    messageTh: 'กรุณากรอกบ้านเลขที่',
    messageEn: 'House No. is required',
  });

  // 11. Usable Area
  checklist.push({
    id: 'usableArea',
    field: 'usableArea',
    labelTh: 'พื้นที่ใช้สอย (Usable Area)',
    labelEn: 'Usable Area',
    tab: 'basic',
    passed: typeof property.usableArea === 'number' && property.usableArea > 0,
    messageTh: 'พื้นที่ใช้สอยต้องมากกว่า 0 ตร.ม.',
    messageEn: 'Usable Area must be greater than 0 Sq.m',
  });

  // 12. Description TH (Property Info TH)
  const descTh = property.descriptionTh || '';
  checklist.push({
    id: 'descriptionTh',
    field: 'descriptionTh',
    labelTh: 'รายละเอียดภาษาไทย (Property Info TH)',
    labelEn: 'Property Info (Thai)',
    tab: 'basic',
    passed: descTh.trim().length > 0 && descTh.length <= 2000,
    messageTh: descTh.trim().length === 0 ? 'กรุณากรอกรายละเอียดภาษาไทย' : 'ความยาวต้องไม่เกิน 2,000 ตัวอักษร',
    messageEn: 'Property Info TH is required (max 2000 chars)',
  });

  // 13. Description EN (Property Info EN)
  const descEn = property.description || '';
  checklist.push({
    id: 'description',
    field: 'description',
    labelTh: 'รายละเอียดภาษาอังกฤษ (Property Info EN)',
    labelEn: 'Property Info (English)',
    tab: 'basic',
    passed: descEn.trim().length > 0 && descEn.length <= 2000,
    messageTh: descEn.trim().length === 0 ? 'กรุณากรอกรายละเอียดภาษาอังกฤษ' : 'ความยาวต้องไม่เกิน 2,000 ตัวอักษร',
    messageEn: 'Property Info EN is required (max 2000 chars)',
  });

  // 14. Price Validation by Property Label
  const label = property.propertyLabel || 'Rent and Sale';
  if (label === 'Rent' || label === 'Rent and Sale') {
    checklist.push({
      id: 'rentPrice',
      field: 'rentPrice',
      labelTh: 'ราคาเช่าต่อเดือน (Monthly Rent)',
      labelEn: 'Monthly Rent',
      tab: 'price',
      passed: typeof property.rentPrice === 'number' && property.rentPrice > 0,
      messageTh: 'กรุณาระบุราคาเช่าต่อเดือน (ต้องมากกว่า 0 THB)',
      messageEn: 'Monthly Rent is required for Rent listings',
    });
  }

  if (label === 'Sale' || label === 'Rent and Sale') {
    checklist.push({
      id: 'price',
      field: 'price',
      labelTh: 'ราคาขาย (Sale Price)',
      labelEn: 'Sale Price',
      tab: 'price',
      passed: typeof property.price === 'number' && property.price > 0,
      messageTh: 'กรุณาระบุราคาขาย (ต้องมากกว่า 0 THB)',
      messageEn: 'Sale Price is required for Sale listings',
    });
  }

  // 15. Photos
  const images = property.images || [];
  const hasCover = images.some((img) => img.isCover);
  checklist.push({
    id: 'photos',
    field: 'images',
    labelTh: 'รูปภาพอสังหาริมทรัพย์และรูปหน้าปก (Photos & Cover)',
    labelEn: 'Photos & Cover Image',
    tab: 'photos',
    passed: images.length > 0 && hasCover,
    messageTh: images.length === 0 ? 'ต้องมีรูปภาพอย่างน้อย 1 รูป' : 'ต้องมีรูปภาพหน้าปก (Cover Image)',
    messageEn: images.length === 0 ? 'At least 1 photo is required' : 'Cover photo must be designated',
  });

  // 16. Landlord Details
  checklist.push({
    id: 'landlord',
    field: 'ownerName',
    labelTh: 'ข้อมูลเจ้าของทรัพย์ (Landlord Name & Phone)',
    labelEn: 'Landlord Contact Info',
    tab: 'landlord',
    passed: Boolean(property.ownerName && property.ownerPhone),
    messageTh: 'กรุณาระบุชื่อและเบอร์โทรศัพท์เจ้าของทรัพย์',
    messageEn: 'Landlord Name and Phone are required',
  });

  const totalChecks = checklist.length;
  const passedChecks = checklist.filter((item) => item.passed).length;
  const missingFields = checklist.filter((item) => !item.passed);
  const isReady = missingFields.length === 0;
  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  return {
    isReady,
    score,
    totalChecks,
    passedChecks,
    checklist,
    missingFields,
  };
}
