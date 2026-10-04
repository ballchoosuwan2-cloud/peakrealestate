import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Property, PropertyCategory, PropertyStatus, User, PropertyImage } from '../types';
import { Language, translations } from '../lib/i18n';
import {
  PHUKET_ZONES,
  DISTRICT_OPTIONS,
  AREA_DISTRICT_MAP,
  HOUSE_VIEWS,
  CHECKLIST_ITEMS,
  SERVICE_INCLUDES,
  POPULAR_PROJECTS,
  SAMPLE_VILLA_PHOTOS,
} from './propertyConstants';
import {
  PHUKET_ZONE_OPTIONS,
  getAreasForZone,
  validateAreaBelongsToZone,
  getDistrictAndPostal,
  formatZoneAreaSummary,
  parseZoneAndArea,
} from '../lib/property-location-options';
import {
  evaluatePropertyPublishReadiness,
  PublishReadinessResult,
} from '../lib/property-publish';
import {
  ArrowLeft,
  Save,
  Share2,
  Copy,
  Check,
  Upload,
  Camera,
  Image as ImageIcon,
  Trash2,
  MoveLeft,
  MoveRight,
  Eye,
  X,
  Plus,
  Video as VideoIcon,
  MapPin,
  Clock,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  DollarSign,
  UserCheck,
  Layers,
  FileText,
  ExternalLink,
  PhoneCall,
} from 'lucide-react';
import { PropertyFollowUp } from './PropertyFollowUp';

interface PropertyFormModalProps {
  property: Property | null; // null means create new
  currentUser: User;
  users: User[];
  language: Language;
  onSave: (property: Property) => void;
  onClose: () => void;
}

type TabKey =
  | 'basic'
  | 'landlord'
  | 'price'
  | 'photos'
  | 'videos'
  | 'map'
  | 'followup'
  | 'logs'
  | 'publish';

export function PropertyFormModal({
  property,
  currentUser,
  users,
  language,
  onSave,
  onClose,
}: PropertyFormModalProps) {
  const t = translations[language];
  const isEdit = Boolean(property);

  // Active Tab (Default: 'basic')
  const [activeTab, setActiveTab] = useState<TabKey>('basic');

  // Form Data State
  const [formData, setFormData] = useState<Property>(() => {
    if (property) {
      return { ...property };
    }
    const defaultZone = 'Zone 2';
    const defaultArea = 'Rawai';
    const randomNum = Math.floor(1000 + Math.random() * 9000);

    return {
      id: `prop-${Date.now()}-${randomNum}`,
      propertyId: `VN015-${randomNum}`,
      title: 'Majestic Villas Phuket Luxury Residence',
      titleTh: 'มาเจสติก วิลล่า ภูเก็ต เรสซิเดนซ์หรู',
      address: '271/2000 Moo 2, Rawai',
      district: 'Muang Phuket (อำเภอเมืองภูเก็ต)',
      city: 'Phuket',
      category: 'Villa',
      status: 'Available',
      isPublished: true,
      price: 28500000,
      rentPrice: 150000,
      bedrooms: 3,
      bathrooms: 3,
      usableArea: 472,
      landArea: 120,
      floor: 1,
      yearBuilt: 2022,
      furniture: 'Fully Furnished',
      petFriendly: true,
      hasPool: true,
      ownerName: 'Khun Somchai Prasert',
      ownerPhone: '081-987-6543',
      ownerEmail: 'somchai.owner@peakrealestate.com',
      agentId: currentUser.id,
      agentName: currentUser.name,
      description:
        'Majestic Villas features 3 bedrooms, 3 bathrooms, a living room, a fully furnished, spacious balcony, a fully equipped kitchen, shared pool and parking spaces.\n\nFree pool and garden cleaning\nExcluding villa cleaning fee 800 baht per time\n3 months deposit, 1 month in advance\nElectricity fee according to government bill\nFree water fee',
      descriptionTh:
        'Majestic Villas มี 3 ห้องนอน 3 ห้องน้ำ ห้องนั่งเล่น เฟอร์นิเจอร์ครบครัน ระเบียงกว้างขวาง ห้องครัวครบครัน สระว่ายน้ำรวม และที่จอดรถ\n\nฟรีค่าทำความสะอาดสระว่ายน้ำ และสวน\nไม่รวมค่าทำความสะอาดวิลล่า ครั้งละ 800บาท\nมัดจำ 3เดือน ล่วงหน้า 1เดือน\nค่าไฟฟ้า ตามบิลรัฐบาล\nฟรีค่าน้ำ',
      googleMapUrl: 'https://maps.google.com/?q=7.7844,98.3184',
      amenities: ['Private Pool', 'Security', 'Parking', 'Garden', 'Wifi'],
      images: [
        {
          id: `img-1`,
          url: SAMPLE_VILLA_PHOTOS[0],
          isCover: true,
          hasWatermark: true,
          title: 'Main Villa Exterior',
        },
        {
          id: `img-2`,
          url: SAMPLE_VILLA_PHOTOS[1],
          isCover: false,
          hasWatermark: true,
          title: 'Pool Terrace',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Custom fields from user prompt
      zone: defaultZone,
      area: `${defaultZone} / ${defaultArea}`,
      nation: 'Thailand',
      postalCode: '83130',
      agencyType: 'Representative',
      agencyFrom: '',
      agencyTo: '',
      propertyLabel: 'Rent and Sale',
      rentedOutBy: '',
      rentFrom: '',
      rentTo: '2026-12-31',
      villaOwnership: 'Freehold',
      landOwnership: 'Chanote',
      houseNo: '271/2000',
      building: 'Building A',
      buildingNo: 'A1',
      roomNo: 'Villa 12',
      buildingYear: 2022,
      landUnit: 'Sq.w',
      usableAreaUnit: 'Sq.m',
      projectName: 'Majestic Villas',
      projectNameTh: 'มาเจสติก วิลล่า',
      furnitureType: 'Include',
      petType: 'Pets Allowed',
      petRemark: 'AskForPhotos',
      propertyType: '3B',
      hasHousePool: 'Private Pool',
      poolType: 'Chlorine Pool',
      views: ['City View', 'Yard View', 'Garden View'],
      checkList: [
        'Smart TV',
        'Air Conditioner',
        'Sofa',
        'Refrigerator',
        'Microwave',
        'Private Car Park',
        'Washing Machine',
      ],
      serviceInclude: [
        'Free pool and garden cleaning',
        'Free water fee',
        'Government electricity rate',
      ],
      addressThDetail: { road: 'Viset Road', soi: 'Soi Suksan 2', moo: 'Moo 2' },
      addressEnDetail: { road: 'Viset Road', soi: 'Soi Suksan 2', moo: 'Moo 2' },
      locationInfoTh:
        '1.1 กม. ถึงหาดราไวย์\n2.1 กม. ถึงหาดฉลอง\n3.2 กม. ถึงหาดในหาน\n35 กม. ถึงสนามบินนานาชาติภูเก็ต',
      locationInfoEn:
        '1.1 km. to Rawai Beach\n2.1 km. to Chalong Beach\n3.2 km. to Naiharn Beach\n35 km. to Phuket International Airport',
      comments:
        'Villa owner is flexible on contract terms for 1+ year lease. Viewings require 2-hour advance notice.',
      dailyRent: 12000,
      deposit: '3 months deposit',
      advancePayment: '1 month in advance',
      commission: '1 month rent for 1 year contract',
      commonFee: 4500,
      electricityBill: 'Government Bill rate',
      waterBill: 'Free water fee included',
      landlordContactMethod: 'WhatsApp',
      landlordIdNumber: '3-8302-00129-88-1',
      landlordNotes: 'Preferred payment via Kasikorn Bank. Bank details verified.',
      videos: [
        {
          id: 'v-1',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          title: 'Villa Walkthrough Video',
        },
      ],
      latitude: 7.7844,
      longitude: 98.3184,
      updateLogs: [
        {
          id: 'log-1',
          date: new Date().toLocaleDateString('th-TH'),
          time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          user: currentUser.name,
          action: isEdit ? 'Opened for Edit' : 'Listing Draft Initialized',
          prevValue: '-',
          newValue: 'VN015 Initial Record',
        },
      ],
      publishStatus: 'Published',
    };
  });

  // Track if user modified any field
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // File Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewLightboxIndex, setPreviewLightboxIndex] = useState<number | null>(null);

  // Video state
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

  // Refs for file inputs
  const desktopFileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileGalleryInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Helper to mark dirty
  const updateForm = (updates: Partial<Property>) => {
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Prevent leaving window with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Publish & Validation Readiness
  const readiness: PublishReadinessResult = useMemo(
    () => evaluatePropertyPublishReadiness(formData),
    [formData]
  );

  const tabErrors = useMemo(() => {
    const counts: Record<TabKey, number> = {
      basic: 0,
      landlord: 0,
      price: 0,
      photos: 0,
      videos: 0,
      map: 0,
      followup: 0,
      logs: 0,
      publish: 0,
    };
    for (const item of readiness.missingFields) {
      if (counts[item.tab] !== undefined) {
        counts[item.tab]++;
      }
    }
    return counts;
  }, [readiness]);

  // Handle Zone -> Area selection
  const currentZone = formData.zone || 'Zone 2';
  const availableAreas = useMemo(() => {
    return getAreasForZone(currentZone);
  }, [currentZone]);

  // Helper to parse pure area name from e.g. "Zone 2 / Rawai"
  const currentPureArea = useMemo(() => {
    if (!formData.area) return availableAreas[0] || '';
    if (formData.area.includes('/')) {
      const parts = formData.area.split('/');
      return parts[1].trim();
    }
    return formData.area;
  }, [formData.area, availableAreas]);

  const handleZoneChange = (zone: string) => {
    const areasInZone = getAreasForZone(zone);
    const isStillValid = validateAreaBelongsToZone(zone, currentPureArea);
    const chosenArea = isStillValid ? currentPureArea : (areasInZone[0] || '');
    const areaString = formatZoneAreaSummary(zone, chosenArea);
    const mapping = getDistrictAndPostal(chosenArea);

    updateForm({
      zone,
      area: areaString,
      district: mapping.district || formData.district,
      postalCode: mapping.postalCode || formData.postalCode,
    });
  };

  const handleAreaChange = (areaName: string) => {
    const areaString = formatZoneAreaSummary(currentZone, areaName);
    const mapping = getDistrictAndPostal(areaName);

    updateForm({
      area: areaString,
      district: mapping.district || formData.district,
      postalCode: mapping.postalCode || formData.postalCode,
    });
  };

  // Copy helper
  const handleCopyText = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // -------------------------------------------------------------
  // PHOTO UPLOAD ENGINE (Computer Drag & Drop, Mobile Gallery/Camera)
  // -------------------------------------------------------------
  const processFiles = (files: FileList | File[]) => {
    setUploadError(null);
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSizeBytes = 15 * 1024 * 1024; // 15MB
    const validFiles: File[] = [];
    const seenKeys = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setUploadError(
          language === 'th'
            ? `ไฟล์ "${file.name}" ไม่รองรับ! รองรับเฉพาะ JPG, PNG, WEBP`
            : `File "${file.name}" is invalid! Only JPG, PNG, and WEBP are supported.`
        );
        return;
      }
      if (file.size > maxSizeBytes) {
        setUploadError(
          language === 'th'
            ? `ไฟล์ "${file.name}" มีขนาดเกิน 15MB`
            : `File "${file.name}" exceeds 15MB size limit.`
        );
        return;
      }
      const fileKey = `${file.name}-${file.size}`;
      if (seenKeys.has(fileKey)) {
        continue; // skip duplicate in batch
      }
      seenKeys.add(fileKey);
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);

    // Read files via FileReader
    const readers = validFiles.map((file, idx) => {
      return new Promise<PropertyImage>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const url = e.target?.result as string;
          resolve({
            id: `img-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            url,
            isCover: false,
            hasWatermark: true,
            title: file.name.replace(/\.[^/.]+$/, ''),
          });
        };
        reader.readAsDataURL(file);
      });
    });

    // Simulate progress smoothly
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 120);

    Promise.all(readers).then((newImages) => {
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);

        // Append images, make first one cover if none exists
        setFormData((prev) => {
          const existing = prev.images || [];
          const hasCover = existing.some((img) => img.isCover);
          if (!hasCover && newImages.length > 0) {
            newImages[0].isCover = true;
          }
          return {
            ...prev,
            images: [...existing, ...newImages],
          };
        });
        setIsDirty(true);
      }, 300);
    });
  };

  // Reorder Images
  const handleMoveImage = (fromIdx: number, direction: 'left' | 'right') => {
    const images = [...(formData.images || [])];
    const toIdx = direction === 'left' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= images.length) return;

    const temp = images[fromIdx];
    images[fromIdx] = images[toIdx];
    images[toIdx] = temp;

    updateForm({ images });
  };

  // Set Cover Photo
  const handleSetCoverPhoto = (targetIdx: number) => {
    const images = (formData.images || []).map((img, idx) => ({
      ...img,
      isCover: idx === targetIdx,
    }));
    updateForm({ images });
  };

  // Toggle Watermark
  const handleToggleWatermark = (targetIdx: number) => {
    const images = (formData.images || []).map((img, idx) =>
      idx === targetIdx ? { ...img, hasWatermark: !img.hasWatermark } : img
    );
    updateForm({ images });
  };

  // Delete Image
  const handleDeleteImage = (targetIdx: number) => {
    const images = (formData.images || []).filter((_, idx) => idx !== targetIdx);
    if (images.length > 0 && !images.some((img) => img.isCover)) {
      images[0].isCover = true;
    }
    updateForm({ images });
  };

  // Add Sample Luxury Photos
  const handleAddSamplePhotos = () => {
    const sampleImages: PropertyImage[] = SAMPLE_VILLA_PHOTOS.map((url, idx) => ({
      id: `sample-${Date.now()}-${idx}`,
      url,
      isCover: idx === 0,
      hasWatermark: true,
      title: `Majestic Villa View ${idx + 1}`,
    }));
    updateForm({ images: sampleImages });
  };

  // -------------------------------------------------------------
  // VIDEOS ENGINE
  // -------------------------------------------------------------
  const handleAddVideo = () => {
    if (!newVideoUrl.trim()) return;
    const newVideo = {
      id: `vid-${Date.now()}`,
      url: newVideoUrl.trim(),
      title: newVideoTitle.trim() || 'Property Video Tour',
    };
    updateForm({ videos: [...(formData.videos || []), newVideo] });
    setNewVideoUrl('');
    setNewVideoTitle('');
  };

  const handleDeleteVideo = (id: string) => {
    updateForm({
      videos: (formData.videos || []).filter((v) => v.id !== id),
    });
  };

  // -------------------------------------------------------------
  // VALIDATION & SAVE SYSTEM
  // -------------------------------------------------------------
  const validateForm = (): string[] => {
    return readiness.missingFields.map((item) =>
      language === 'th' ? (item.messageTh || item.labelTh) : (item.messageEn || item.labelEn)
    );
  };

  const handleSave = () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      if (readiness.missingFields.length > 0) {
        setActiveTab(readiness.missingFields[0].tab);
      } else {
        setActiveTab('basic');
      }
      return;
    }

    setValidationErrors([]);
    setIsSaving(true);

    // Append update log
    const now = new Date();
    const newLog = {
      id: `log-${Date.now()}`,
      date: now.toLocaleDateString('th-TH'),
      time: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      user: currentUser.name,
      action: isEdit ? 'Property Details Updated' : 'New Property Created',
      prevValue: isEdit ? 'Previous Version' : '-',
      newValue: `ID: ${formData.propertyId}, Status: ${formData.status}, Price: ${formData.price || formData.rentPrice}`,
    };

    const finalProperty: Property = {
      ...formData,
      updatedAt: now.toISOString(),
      updateLogs: [newLog, ...(formData.updateLogs || [])],
    };

    onSave(finalProperty);
    setIsSaving(false);
    setIsDirty(false);
  };

  // Close with unsaved changes prompt
  const handleSafeClose = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        language === 'th'
          ? 'คุณมีข้อมูลที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้โดยไม่บันทึกหรือไม่?'
          : 'You have unsaved changes. Are you sure you want to leave without saving?'
      );
      if (!confirmLeave) return;
    }
    onClose();
  };

  // Publish Status Helper
  const isReadyToPublish = useMemo(() => {
    const hasId = Boolean(formData.propertyId);
    const hasCategory = Boolean(formData.category);
    const hasTitle = Boolean(formData.title || formData.titleTh);
    const hasPrice = Boolean(formData.price || formData.rentPrice);
    const hasArea = Boolean(formData.usableArea);
    const hasPhoto = Boolean(formData.images && formData.images.length > 0);
    return hasId && hasCategory && hasTitle && hasPrice && hasArea && hasPhoto;
  }, [formData]);

  // Tab definitions
  const tabs: { id: TabKey; label: string; icon: any }[] = [
    { id: 'basic', label: language === 'th' ? 'ข้อมูลพื้นฐาน (Basic Info)' : 'Basic Information', icon: Info },
    { id: 'landlord', label: language === 'th' ? 'เจ้าของทรัพย์ (Landlord)' : 'Landlord', icon: UserCheck },
    { id: 'price', label: language === 'th' ? 'ราคาและเงื่อนไข (Price)' : 'Price', icon: DollarSign },
    { id: 'photos', label: `${language === 'th' ? 'รูปภาพ (Photos)' : 'Photos'} (${formData.images?.length || 0})`, icon: ImageIcon },
    { id: 'videos', label: `${language === 'th' ? 'วิดีโอ (Videos)' : 'Videos'} (${formData.videos?.length || 0})`, icon: VideoIcon },
    { id: 'map', label: language === 'th' ? 'แผนที่และพิกัด (Map)' : 'Map', icon: MapPin },
    { id: 'followup', label: language === 'th' ? 'ติดตามสถานะ (Follow-up)' : 'Follow-up', icon: PhoneCall },
    { id: 'logs', label: language === 'th' ? 'ประวัติการแก้ไข (Update Logs)' : 'Update Logs', icon: Clock },
    { id: 'publish', label: language === 'th' ? 'เผยแพร่สู่เว็บไซต์ (Publish)' : 'Publish to Website', icon: Globe },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F6F9] flex flex-col overflow-hidden text-slate-800">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP APPLICATION BAR                                        */}
      {/* ------------------------------------------------------------- */}
      <header className="bg-[#0A0C10] text-white px-4 sm:px-6 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleSafeClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'th' ? 'ย้อนกลับ' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-2 truncate">
            <span className="px-2 py-0.5 rounded bg-red-600/90 text-white font-mono font-bold text-[11px] tracking-wide">
              {formData.propertyId || 'NEW'}
            </span>
            <h1 className="font-serif font-bold text-sm sm:text-base text-white truncate max-w-[220px] sm:max-w-md">
              {isEdit
                ? `Property Detail (${formData.propertyId})`
                : (language === 'th' ? 'เพิ่มอสังหาริมทรัพย์ใหม่' : 'Add New Property')}
            </h1>
            {isDirty && (
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold border border-amber-500/30">
                {language === 'th' ? 'มีการแก้ไข' : 'Unsaved changes'}
              </span>
            )}
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleCopyText(window.location.href, 'url')}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
            title="Copy URL"
          >
            {copiedField === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedField === 'url' ? 'Copied' : 'Copy URL'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: formData.title, url: window.location.href }).catch(() => {});
              } else {
                handleCopyText(window.location.href, 'url');
              }
            }}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 text-white font-semibold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (language === 'th' ? 'บันทึก' : 'Save')}</span>
          </button>
        </div>
      </header>

      {/* Save Success Banner */}
      {saveSuccessMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs flex items-center justify-between shrink-0 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-medium">{saveSuccessMessage}</span>
          </div>
          <button onClick={() => setSaveSuccessMessage(null)}>
            <X className="w-4 h-4 opacity-80 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Validation Errors Banner */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2.5 text-xs shrink-0 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">
              {language === 'th' ? 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน:' : 'Please fill in all required fields:'}
            </p>
            <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px] text-red-700">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
          <button onClick={() => setValidationErrors([])} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. SUB-NAVIGATION TABS (Horizontal Scrollable)                 */}
      {/* ------------------------------------------------------------- */}
      <nav className="bg-white border-b border-slate-200 px-4 sm:px-6 overflow-x-auto scrollbar-none flex gap-1 shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const errCount = tabErrors[tab.id] || 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium text-xs whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-red-600 text-red-600 bg-red-50/40 font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {errCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none">
                  {errCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ------------------------------------------------------------- */}
      {/* 3. TAB CONTENTS (Scrollable Main Body)                        */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: BASIC INFORMATION                                  */}
        {/* ========================================================= */}
        {activeTab === 'basic' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Section Card: Basic Information */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Info className="w-4 h-4 text-red-600" />
                <span>Basic Information (ข้อมูลพื้นฐานอสังหาริมทรัพย์)</span>
              </h2>

              {/* Grid Row 1: Property ID, Category, Agent, Agency Type, Agency Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
                {/* Property ID */}
                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Property ID *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.propertyId}
                      onChange={(e) => updateForm({ propertyId: e.target.value })}
                      className="w-full px-3 py-2 pr-7 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-xs font-mono font-bold text-slate-900"
                      placeholder="VN015"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyText(formData.propertyId, 'id')}
                      className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-700"
                      title="Copy ID"
                    >
                      {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Category */}
                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => updateForm({ category: e.target.value as PropertyCategory })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium"
                  >
                    <option value="Villa">Villa (วิลล่า)</option>
                    <option value="House">House (บ้านเดี่ยว/ทาวน์เฮ้าส์)</option>
                    <option value="Condo">Condominium (คอนโดมิเนียม)</option>
                    <option value="Commercial">Commercial (อาคารพาณิชย์)</option>
                    <option value="Land">Land (ที่ดิน)</option>
                    <option value="Warehouse">Warehouse (โกดัง)</option>
                    <option value="Office">Office (สำนักงาน)</option>
                  </select>
                </div>

                {/* Agent */}
                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Agent *
                  </label>
                  <select
                    value={formData.agentId}
                    onChange={(e) => {
                      const sel = users.find((u) => u.id === e.target.value);
                      updateForm({
                        agentId: e.target.value,
                        agentName: sel?.name || currentUser.name,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Agency Type */}
                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Agency Type *
                  </label>
                  <select
                    value={formData.agencyType || 'Representative'}
                    onChange={(e) => updateForm({ agencyType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium"
                  >
                    <option value="Representative">Representative</option>
                    <option value="Exclusive">Exclusive Listing</option>
                    <option value="Co-broke">Co-broke (ร่วมเอเจนต์)</option>
                    <option value="Direct">Direct Owner (เจ้าของตรง)</option>
                  </select>
                </div>

                {/* Agency Time From */}
                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Agency Time From
                  </label>
                  <input
                    type="date"
                    value={formData.agencyFrom || ''}
                    onChange={(e) => updateForm({ agencyFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>

                {/* Agency Time To */}
                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Agency Time To
                  </label>
                  <input
                    type="date"
                    value={formData.agencyTo || ''}
                    onChange={(e) => updateForm({ agencyTo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>
              </div>

              {/* Grid Row 2: Property Label, Status, Rented Out By, Rent From, Rent To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Property Label *
                  </label>
                  <select
                    value={formData.propertyLabel || 'Rent and Sale'}
                    onChange={(e) => updateForm({ propertyLabel: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-900"
                  >
                    <option value="Rent">Rent (สำหรับเช่า)</option>
                    <option value="Sale">Sale (สำหรับขาย)</option>
                    <option value="Rent and Sale">Rent and Sale (ทั้งเช่าและขาย)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Property Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => updateForm({ status: e.target.value as PropertyStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-900"
                  >
                    <option value="Available">Available (ว่างพร้อมขาย/เช่า)</option>
                    <option value="Rented">Rented (ติดสัญญาเช่า)</option>
                    <option value="Sold">Sold (ขายแล้ว)</option>
                    <option value="Reserved">Reserved (จองแล้ว)</option>
                    <option value="Inactive">Unavailable / Inactive</option>
                  </select>
                </div>

                {formData.status === 'Rented' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-700 mb-1">
                      Rented out By
                    </label>
                    <select
                      value={formData.rentedOutBy || ''}
                      onChange={(e) => updateForm({ rentedOutBy: e.target.value })}
                      className="w-full px-3 py-2 border border-amber-300 rounded-xl bg-amber-50 text-xs font-medium"
                    >
                      <option value="">Please select</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                      <option value="Direct Owner">Direct Owner</option>
                      <option value="External Agency">External Agency</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Rented out By (Disabled)
                    </label>
                    <input
                      type="text"
                      disabled
                      placeholder="Only when Rented"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-xs text-slate-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Rental Start Time
                  </label>
                  <input
                    type="date"
                    value={formData.rentFrom || ''}
                    onChange={(e) => updateForm({ rentFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Rental End Time *
                  </label>
                  <input
                    type="date"
                    value={formData.rentTo || ''}
                    onChange={(e) => updateForm({ rentTo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>
              </div>

              {/* Grid Row 3: Nation, City, Zone -> Area (PROMPT SECTION 5), District, Postal Code */}
              <div className="space-y-2 p-4 bg-slate-50/90 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <span>Location & Area Selection (ระบบพื้นที่ 5 โซน)</span>
                  </span>
                  <span className="text-[11px] font-mono text-red-600 font-bold bg-red-100/60 px-2 py-0.5 rounded">
                    Current: {formData.area || 'Zone 2 / Rawai'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
                  {/* Nation */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nation *
                    </label>
                    <select
                      value={formData.nation || 'Thailand'}
                      onChange={(e) => updateForm({ nation: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium"
                    >
                      <option value="Thailand">Thailand (ประเทศไทย)</option>
                    </select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      City *
                    </label>
                    <select
                      value={formData.city || 'Phuket'}
                      onChange={(e) => updateForm({ city: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium"
                    >
                      <option value="Phuket">Phuket (ภูเก็ต)</option>
                      <option value="Phang Nga">Phang Nga (พังงา)</option>
                      <option value="Krabi">Krabi (กระบี่)</option>
                    </select>
                  </div>

                  {/* Zone Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Zone *
                    </label>
                    <select
                      value={currentZone}
                      onChange={(e) => handleZoneChange(e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-xl bg-red-50/50 text-xs font-bold text-slate-900"
                    >
                      {PHUKET_ZONES.map((z) => (
                        <option key={z.zone} value={z.zone}>
                          {z.zone} ({z.areas.slice(0, 3).join(', ')}...)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Area Selector (Filtered by Zone) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Area (ตาม Zone) *
                    </label>
                    <select
                      value={currentPureArea}
                      onChange={(e) => handleAreaChange(e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-xl bg-white text-xs font-bold text-red-600"
                    >
                      {availableAreas.map((areaName) => (
                        <option key={areaName} value={areaName}>
                          {areaName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District (auto-updates or manual) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      District *
                    </label>
                    <select
                      value={formData.district}
                      onChange={(e) => updateForm({ district: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium"
                    >
                      {DISTRICT_OPTIONS.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Postal Code */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[11px] text-slate-600">Postal Code (รหัสไปรษณีย์):</span>
                    <input
                      type="text"
                      value={formData.postalCode || ''}
                      onChange={(e) => updateForm({ postalCode: e.target.value })}
                      className="w-28 px-3 py-1 border border-slate-300 rounded-lg bg-white text-xs font-mono font-bold"
                      placeholder="83130"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    * ระบบเลือก District และ Postal Code อัตโนมัติเมื่อเลือก Area
                  </span>
                </div>
              </div>

              {/* Grid Row 4: Ownership, Property Number & Project */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Villa Ownership
                  </label>
                  <select
                    value={formData.villaOwnership || 'Freehold'}
                    onChange={(e) => updateForm({ villaOwnership: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="Freehold">Freehold (ถือครองกรรมสิทธิ์)</option>
                    <option value="Leasehold">Leasehold (สิทธิการเช่าระยะยาว)</option>
                    <option value="Thai Company">Thai Company (นิติบุคคลไทย)</option>
                    <option value="Protected Leasehold">Protected Leasehold</option>
                    <option value="Foreign Freehold">Foreign Freehold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Land Ownership
                  </label>
                  <select
                    value={formData.landOwnership || 'Chanote'}
                    onChange={(e) => updateForm({ landOwnership: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="Chanote">Chanote (โฉนด น.ส. 4 จ.)</option>
                    <option value="Nor Sor 3 Gor">Nor Sor 3 Gor (น.ส. 3 ก.)</option>
                    <option value="Leasehold">Leasehold (สัญญาเช่า)</option>
                    <option value="Thai Company">Thai Company Ownership</option>
                    <option value="Other">Other (อื่นๆ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    House No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.houseNo || ''}
                    onChange={(e) => updateForm({ houseNo: e.target.value })}
                    placeholder="48/41 or 271/2000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Land Area
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={formData.landArea ?? ''}
                      onChange={(e) => updateForm({ landArea: Number(e.target.value) })}
                      placeholder="120"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                    />
                    <select
                      value={formData.landUnit || 'Sq.w'}
                      onChange={(e) => updateForm({ landUnit: e.target.value as any })}
                      className="w-20 px-2 py-2 border border-slate-300 rounded-xl bg-slate-50 text-xs font-semibold"
                    >
                      <option value="Sq.w">Sq.w</option>
                      <option value="Sq.m">Sq.m</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Grid Row 5: Project Name EN/TH */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Project Name (EN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.projectName || formData.title || ''}
                    onChange={(e) =>
                      updateForm({
                        projectName: e.target.value,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g. Majestic Villas / Mono Palai"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold"
                  />
                  {/* Quick Suggestions */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {POPULAR_PROJECTS.slice(0, 4).map((p) => (
                      <button
                        key={p.en}
                        type="button"
                        onClick={() =>
                          updateForm({
                            projectName: p.en,
                            projectNameTh: p.th,
                            title: p.en,
                            titleTh: p.th,
                          })
                        }
                        className="px-2 py-0.5 text-[10px] rounded bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-300"
                      >
                        + {p.en}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Project Name (TH)
                  </label>
                  <input
                    type="text"
                    value={formData.projectNameTh || formData.titleTh || ''}
                    onChange={(e) =>
                      updateForm({
                        projectNameTh: e.target.value,
                        titleTh: e.target.value,
                      })
                    }
                    placeholder="e.g. มาเจสติก วิลล่า / โมโน ป่าหล่าย"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Grid Row 6: Area, Bed/Bath, Building/Floor/Room */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Useable Area * (Sq.m)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.usableArea ?? ''}
                    onChange={(e) => updateForm({ usableArea: Number(e.target.value) })}
                    placeholder="472"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Bedroom *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.bedrooms ?? ''}
                    onChange={(e) => updateForm({ bedrooms: Number(e.target.value) })}
                    placeholder="3"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Bathroom *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={formData.bathrooms ?? ''}
                    onChange={(e) => updateForm({ bathrooms: Number(e.target.value) })}
                    placeholder="3"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Building
                  </label>
                  <input
                    type="text"
                    value={formData.building || ''}
                    onChange={(e) => updateForm({ building: e.target.value })}
                    placeholder="Building A"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Floor
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.floor ?? ''}
                    onChange={(e) => updateForm({ floor: Number(e.target.value) })}
                    placeholder="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Room No.
                  </label>
                  <input
                    type="text"
                    value={formData.roomNo || ''}
                    onChange={(e) => updateForm({ roomNo: e.target.value })}
                    placeholder="Room 102"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>
              </div>

              {/* Grid Row 7: Furniture, Pet, Year Build, Type, Pool, Pool Type */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Furniture
                  </label>
                  <select
                    value={formData.furnitureType || 'Include'}
                    onChange={(e) =>
                      updateForm({
                        furnitureType: e.target.value as any,
                        furniture:
                          e.target.value === 'Include'
                            ? 'Fully Furnished'
                            : e.target.value === 'Partly Furnished'
                            ? 'Partially Furnished'
                            : 'Unfurnished',
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="Include">Include (เฟอร์ฯ ครบ)</option>
                    <option value="Partly Furnished">Partly Furnished</option>
                    <option value="Exclude">Exclude (ห้องเปล่า)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pet Friendly *
                  </label>
                  <select
                    value={formData.petType || 'Pets Allowed'}
                    onChange={(e) =>
                      updateForm({
                        petType: e.target.value as any,
                        petFriendly: e.target.value === 'Pets Allowed',
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="Pets Allowed">Pets Allowed (เลี้ยงสัตว์ได้)</option>
                    <option value="Pets Not Allowed">Pets Not Allowed</option>
                    <option value="Ask Owner">Ask Owner (สอบถามเจ้าของ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pet Remark
                  </label>
                  <input
                    type="text"
                    value={formData.petRemark || ''}
                    onChange={(e) => updateForm({ petRemark: e.target.value })}
                    placeholder="AskForPhotos / Small pets"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Year Build
                  </label>
                  <input
                    type="number"
                    min="1990"
                    max="2035"
                    value={formData.buildingYear || formData.yearBuilt || ''}
                    onChange={(e) =>
                      updateForm({
                        buildingYear: Number(e.target.value),
                        yearBuilt: Number(e.target.value),
                      })
                    }
                    placeholder="2022"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Type
                  </label>
                  <input
                    type="text"
                    value={formData.propertyType || '3B'}
                    onChange={(e) => updateForm({ propertyType: e.target.value })}
                    placeholder="3B / Villa"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    House Pool *
                  </label>
                  <select
                    value={formData.hasHousePool || 'Private Pool'}
                    onChange={(e) =>
                      updateForm({
                        hasHousePool: e.target.value as any,
                        hasPool: e.target.value !== 'No Pool',
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="Private Pool">Private Pool (สระส่วนตัว)</option>
                    <option value="Shared Pool">Shared Pool (สระส่วนกลาง)</option>
                    <option value="No Pool">No Pool (ไม่มีสระว่ายน้ำ)</option>
                  </select>
                </div>
              </div>

              {/* Pool Type */}
              <div className="max-w-xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pool Type
                </label>
                <select
                  value={formData.poolType || 'Chlorine Pool'}
                  onChange={(e) => updateForm({ poolType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                >
                  <option value="Chlorine Pool">Chlorine Pool (สระคลอรีน)</option>
                  <option value="Saltwater Pool">Saltwater Pool (สระเกลือ)</option>
                  <option value="Other Pool">Other Pool (อื่นๆ)</option>
                </select>
              </div>

              {/* Address Bilingual Details */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 block">
                  Address Details (ข้อมูลที่อยู่แยกภาษา)
                </span>

                {/* Address (EN) */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700">Address (EN)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={formData.addressEnDetail?.road || ''}
                      onChange={(e) =>
                        updateForm({
                          addressEnDetail: { ...formData.addressEnDetail, road: e.target.value },
                        })
                      }
                      placeholder="Road (e.g. Viset Road)"
                      className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={formData.addressEnDetail?.soi || ''}
                      onChange={(e) =>
                        updateForm({
                          addressEnDetail: { ...formData.addressEnDetail, soi: e.target.value },
                        })
                      }
                      placeholder="Soi (e.g. Soi Suksan 2)"
                      className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={formData.addressEnDetail?.moo || ''}
                      onChange={(e) =>
                        updateForm({
                          addressEnDetail: { ...formData.addressEnDetail, moo: e.target.value },
                        })
                      }
                      placeholder="Moo (e.g. Moo 2)"
                      className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Address (TH) */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700">Address (TH)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={formData.addressThDetail?.road || ''}
                      onChange={(e) =>
                        updateForm({
                          addressThDetail: { ...formData.addressThDetail, road: e.target.value },
                        })
                      }
                      placeholder="ถนน (เช่น ถนนวิเศษ)"
                      className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={formData.addressThDetail?.soi || ''}
                      onChange={(e) =>
                        updateForm({
                          addressThDetail: { ...formData.addressThDetail, soi: e.target.value },
                        })
                      }
                      placeholder="ซอย (เช่น ซอยสุขสันต์ 2)"
                      className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                    <input
                      type="text"
                      value={formData.addressThDetail?.moo || ''}
                      onChange={(e) =>
                        updateForm({
                          addressThDetail: { ...formData.addressThDetail, moo: e.target.value },
                        })
                      }
                      placeholder="หมู่ (เช่น หมู่ 2)"
                      className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* View / House View (Multi-select Chips) */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">
                    House View * (เลือกวิวของอสังหาริมทรัพย์)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Selected: {formData.views?.length || 0}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {HOUSE_VIEWS.map((viewName) => {
                    const isSelected = formData.views?.includes(viewName);
                    return (
                      <button
                        key={viewName}
                        type="button"
                        onClick={() => {
                          const existing = formData.views || [];
                          const updated = isSelected
                            ? existing.filter((v) => v !== viewName)
                            : [...existing, viewName];
                          updateForm({ views: updated });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs scale-102 font-bold'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {viewName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Check List (48 Items from Prompt) */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900">
                    Check List * (สิ่งอำนวยความสะดวกและอุปกรณ์ครบครัน)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateForm({
                          checkList: [
                            'Smart TV',
                            'Air Conditioner',
                            'Sofa',
                            'Refrigerator',
                            'Microwave',
                            'Washing Machine',
                            'Private Car Park',
                            'Wifi',
                            'Dining Table',
                            'Bathtub',
                          ],
                        })
                      }
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      Select Popular
                    </button>
                    <span className="text-[11px] text-slate-500">
                      Selected: {formData.checkList?.length || 0} items
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200 scrollbar-thin">
                  {CHECKLIST_ITEMS.map((item) => {
                    const isSelected = formData.checkList?.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          const existing = formData.checkList || [];
                          const updated = isSelected
                            ? existing.filter((x) => x !== item)
                            : [...existing, item];
                          updateForm({ checkList: updated });
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs font-semibold'
                            : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Service Include */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-900 block">
                  Service Include (บริการที่รวมในค่าเช่าหรือโครงการ)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_INCLUDES.map((svc) => {
                    const isSelected = formData.serviceInclude?.includes(svc);
                    return (
                      <button
                        key={svc}
                        type="button"
                        onClick={() => {
                          const existing = formData.serviceInclude || [];
                          const updated = isSelected
                            ? existing.filter((s) => s !== svc)
                            : [...existing, svc];
                          updateForm({ serviceInclude: updated });
                        }}
                        className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                          isSelected
                            ? 'bg-emerald-700 text-white font-semibold'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {svc}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Textareas with Character Counters */}
              <div className="space-y-4 pt-3 border-t border-slate-100">
                {/* Location Info (TH & EN) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Location Info TH */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-700">Location Info (TH)</label>
                      <span className="font-mono text-[10px] text-slate-500">
                        {formData.locationInfoTh?.length || 0} / 1000
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={formData.locationInfoTh || ''}
                      onChange={(e) => updateForm({ locationInfoTh: e.target.value })}
                      placeholder="1.1 กม. ถึงหาดราไวย์..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-xs leading-relaxed"
                    />
                  </div>

                  {/* Location Info EN */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-700">Location Info (EN)</label>
                      <span className="font-mono text-[10px] text-slate-500">
                        {formData.locationInfoEn?.length || 0} / 1000
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={formData.locationInfoEn || ''}
                      onChange={(e) => updateForm({ locationInfoEn: e.target.value })}
                      placeholder="1.1 km. to Rawai Beach..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-xs leading-relaxed"
                    />
                  </div>
                </div>

                {/* Property Info (TH & EN) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Property Info TH */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Property Info (TH) *</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(formData.descriptionTh || '', 'p-th')}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy text"
                        >
                          {copiedField === 'p-th' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </label>
                      <span className="font-mono text-[10px] text-slate-500">
                        {formData.descriptionTh?.length || 0} / 2000
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      maxLength={2000}
                      value={formData.descriptionTh || ''}
                      onChange={(e) => updateForm({ descriptionTh: e.target.value })}
                      placeholder="รายละเอียดวิลล่า (ภาษาไทย)..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-xs leading-relaxed"
                    />
                  </div>

                  {/* Property Info EN */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Property Info (EN) *</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(formData.description || '', 'p-en')}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy text"
                        >
                          {copiedField === 'p-en' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </label>
                      <span className="font-mono text-[10px] text-slate-500">
                        {formData.description?.length || 0} / 2000
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      maxLength={2000}
                      value={formData.description || ''}
                      onChange={(e) => updateForm({ description: e.target.value })}
                      placeholder="Property details in English..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-xs leading-relaxed"
                    />
                  </div>
                </div>

                {/* Comments (Max 5000) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-700">Comments (หมายเหตุภายในทีม)</label>
                    <span className="font-mono text-[10px] text-slate-500">
                      {formData.comments?.length || 0} / 5000
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={5000}
                    value={formData.comments || ''}
                    onChange={(e) => updateForm({ comments: e.target.value })}
                    placeholder="Internal agent remarks, owner flexibility, key handover notes..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: LANDLORD (เจ้าของทรัพย์)                           */}
        {/* ========================================================= */}
        {activeTab === 'landlord' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <UserCheck className="w-4 h-4 text-red-600" />
                <span>Landlord Information (ข้อมูลเจ้าของอสังหาริมทรัพย์)</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Landlord Name * (ชื่อเจ้าของ)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName || ''}
                    onChange={(e) => updateForm({ ownerName: e.target.value })}
                    placeholder="Khun Somchai Prasert"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number * (เบอร์โทรศัพท์)
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.ownerPhone || ''}
                    onChange={(e) => updateForm({ ownerPhone: e.target.value })}
                    placeholder="081-987-6543"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address (อีเมล)
                  </label>
                  <input
                    type="email"
                    value={formData.ownerEmail || ''}
                    onChange={(e) => updateForm({ ownerEmail: e.target.value })}
                    placeholder="owner@gmail.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preferred Contact Method (ช่องทางติดต่อหลัก)
                  </label>
                  <select
                    value={formData.landlordContactMethod || 'WhatsApp'}
                    onChange={(e) => updateForm({ landlordContactMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Line">Line ID</option>
                    <option value="Phone">Direct Phone Call</option>
                    <option value="WeChat">WeChat</option>
                    <option value="Email">Email</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ID Card / Passport / Tax ID
                  </label>
                  <input
                    type="text"
                    value={formData.landlordIdNumber || ''}
                    onChange={(e) => updateForm({ landlordIdNumber: e.target.value })}
                    placeholder="3-8302-00129-88-1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rental Remittance Bank Account
                  </label>
                  <input
                    type="text"
                    placeholder="Bank, Account No., Account Name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Landlord Notes & Special Agreements (ข้อตกลงและบันทึกเพิ่มเติม)
                </label>
                <textarea
                  rows={3}
                  value={formData.landlordNotes || ''}
                  onChange={(e) => updateForm({ landlordNotes: e.target.value })}
                  placeholder="e.g. Owner requests payment directly via wire transfer, allows pets with double deposit..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: PRICE (ราคาและเงื่อนไข)                            */}
        {/* ========================================================= */}
        {activeTab === 'price' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Price & Terms (โครงสร้างราคาและเงื่อนไขการทำสัญญา)</span>
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Property Label:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-xs text-slate-800 border border-slate-200">
                    {formData.propertyLabel || 'Rent and Sale'}
                  </span>
                </div>
              </div>

              {/* 1. RENTAL SECTION (Visible if Rent or Rent and Sale) */}
              {(formData.propertyLabel === 'Rent' || formData.propertyLabel === 'Rent and Sale' || !formData.propertyLabel) && (
                <div className="p-4 sm:p-5 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-emerald-200/60">
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider">
                      Rental Terms
                    </span>
                    <span className="text-xs font-bold text-emerald-950">
                      {language === 'th' ? 'ข้อมูลสำหรับสัญญาเช่า (Rental Structure)' : 'Rental Pricing & Terms'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Monthly Rent * (ค่าเช่ารายเดือน - THB/Month)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.rentPrice ?? ''}
                        onChange={(e) => updateForm({ rentPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder="150000"
                        className="w-full px-3.5 py-2.5 border border-emerald-300 rounded-xl bg-white text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                      {formData.rentPrice ? (
                        <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
                          ฿ {Number(formData.rentPrice).toLocaleString()} THB / Month
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Daily Rent (ค่าเช่ารายวัน หากมี)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.dailyRent ?? ''}
                        onChange={(e) => updateForm({ dailyRent: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder="12000"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Deposit (เงินมัดจำ / ประกันสัญญา)
                      </label>
                      <input
                        type="text"
                        value={formData.deposit || ''}
                        onChange={(e) => updateForm({ deposit: e.target.value })}
                        placeholder="e.g. 2 months deposit"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Advance Payment (ชำระล่วงหน้า)
                      </label>
                      <input
                        type="text"
                        value={formData.advancePayment || ''}
                        onChange={(e) => updateForm({ advancePayment: e.target.value })}
                        placeholder="e.g. 1 month in advance"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Rental Commission (ค่านายหน้าสัญญาเช่า)
                      </label>
                      <input
                        type="text"
                        value={formData.commission || ''}
                        onChange={(e) => updateForm({ commission: e.target.value })}
                        placeholder="e.g. 1 month rent for 1 year contract"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. SALE SECTION (Visible if Sale or Rent and Sale) */}
              {(formData.propertyLabel === 'Sale' || formData.propertyLabel === 'Rent and Sale' || !formData.propertyLabel) && (
                <div className="p-4 sm:p-5 bg-blue-50/40 rounded-2xl border border-blue-200 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-blue-200/60">
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wider">
                      Sale Terms
                    </span>
                    <span className="text-xs font-bold text-blue-950">
                      {language === 'th' ? 'ข้อมูลสำหรับการขายและโอนกรรมสิทธิ์ (Sale Structure)' : 'Sale Pricing & Ownership Transfer'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Sale Price * (ราคาขาย - THB)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.price ?? ''}
                        onChange={(e) => updateForm({ price: e.target.value === '' ? undefined : Number(e.target.value) })}
                        placeholder="28500000"
                        className="w-full px-3.5 py-2.5 border border-blue-300 rounded-xl bg-white text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                      {formData.price ? (
                        <span className="text-[11px] text-blue-700 font-semibold block mt-1">
                          ฿ {Number(formData.price).toLocaleString()} THB
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Transfer Fee / Tax Terms (ค่าธรรมเนียมโอนกรรมสิทธิ์)
                      </label>
                      <select
                        value={formData.transferType || '50/50'}
                        onChange={(e) => updateForm({ transferType: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-xs font-medium"
                      >
                        <option value="50/50">50 / 50 (คนละครึ่ง)</option>
                        <option value="Seller Pays All">Seller Pays All (ผู้ขายออกทั้งหมด)</option>
                        <option value="Buyer Pays All">Buyer Pays All (ผู้ซื้อออกทั้งหมด)</option>
                        <option value="Negotiable">Negotiable (ตามตกลง)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Sale Commission (ค่านายหน้าขาย)
                      </label>
                      <input
                        type="text"
                        value={formData.saleCommission || (formData.propertyLabel === 'Sale' ? formData.commission : '') || ''}
                        onChange={(e) => updateForm({ saleCommission: e.target.value })}
                        placeholder="e.g. 3% or 5%"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Land Tax / Stamp Duty Note
                      </label>
                      <input
                        type="text"
                        placeholder="Included in 50/50 or by negotiation"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. COMMON UTILITIES & EXPENSES */}
              <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <span className="text-xs font-bold text-slate-900 block">
                  {language === 'th' ? 'ค่าส่วนกลางและสาธารณูปโภค (Common Fee & Utilities)' : 'Common Area & Utilities'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Common Area Fee (ค่าส่วนกลาง - บาท/เดือน)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.commonFee ?? ''}
                      onChange={(e) => updateForm({ commonFee: e.target.value === '' ? undefined : Number(e.target.value) })}
                      placeholder="4500"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Electricity & Water Billing Rate
                    </label>
                    <input
                      type="text"
                      value={formData.electricityBill || 'Government Bill Rate'}
                      onChange={(e) => updateForm({ electricityBill: e.target.value })}
                      placeholder="Government Bill Rate"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PHOTOS (PHOTO UPLOAD - THE MOST IMPORTANT FEATURE) */}
        {/* ========================================================= */}
        {activeTab === 'photos' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              {/* Header & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-red-600" />
                    <span>Photo Upload & Gallery Management</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    รองรับการอัปโหลดหลายรูปพร้อมกันจากคอมพิวเตอร์และมือถือ, กำหนดรูป Cover, ใส่ Watermark อัตโนมัติ
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    {formData.images?.length || 0} Photos uploaded
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSamplePhotos}
                    className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Load Villa Sample Photos</span>
                  </button>
                </div>
              </div>

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
                  <span>{uploadError}</span>
                  <button onClick={() => setUploadError(null)}>
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              )}

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Uploading photos... (กำลังประมวลผลรูปภาพ)</span>
                    <span className="font-mono text-red-600">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-red-600 h-full rounded-full transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* --------------------------------------------------- */}
              {/* DRAG & DROP & MULTI-DEVICE INPUT ZONE               */}
              {/* --------------------------------------------------- */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files) {
                    processFiles(e.dataTransfer.files);
                  }
                }}
                className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-3 ${
                  isDragOver
                    ? 'border-red-500 bg-red-50/50 scale-101'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-red-600">
                  <Upload className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">
                    Drag and drop photos here, or browse files
                  </p>
                  <p className="text-xs text-slate-500">
                    รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 15MB ต่อรูป (เลือกได้หลายรูปพร้อมกัน)
                  </p>
                </div>

                {/* Upload Action Buttons (Desktop & Mobile) */}
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  {/* Desktop / Generic Multiple Files Picker */}
                  <button
                    type="button"
                    onClick={() => desktopFileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload from Computer / Device</span>
                  </button>

                  {/* Mobile Photo Library / Gallery Button */}
                  <button
                    type="button"
                    onClick={() => mobileGalleryInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Select from Gallery / Library</span>
                  </button>

                  {/* Mobile Camera Button */}
                  <button
                    type="button"
                    onClick={() => mobileCameraInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-slate-600" />
                    <span>Take Photo with Camera</span>
                  </button>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={desktopFileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) processFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <input
                  ref={mobileGalleryInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) processFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <input
                  ref={mobileCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) processFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* --------------------------------------------------- */}
              {/* PHOTO PREVIEW & MANAGEMENT GRID                     */}
              {/* --------------------------------------------------- */}
              {formData.images && formData.images.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Total <strong>{formData.images.length}</strong> photos (Drag/Arrows to reorder, set Cover photo for listing card)
                    </span>
                    <button
                      type="button"
                      onClick={() => updateForm({ images: [] })}
                      className="text-red-600 hover:underline font-semibold"
                    >
                      Clear all photos
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.images.map((img, idx) => (
                      <div
                        key={img.id}
                        className={`relative rounded-2xl overflow-hidden border-2 transition-all bg-slate-900 group shadow-xs ${
                          img.isCover ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {/* Image Canvas */}
                        <div className="aspect-[4/3] w-full relative overflow-hidden bg-black">
                          <img
                            src={img.url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                          />

                          {/* Watermark Overlay Preview */}
                          {img.hasWatermark && (
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 border border-white/20 text-[9px] font-bold text-white tracking-wider pointer-events-none">
                              PEAK REAL ESTATE
                            </div>
                          )}

                          {/* Cover Badge */}
                          {img.isCover && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-xs">
                              ⭐ COVER PHOTO
                            </div>
                          )}

                          {/* Order Indicator */}
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white font-mono text-[10px] font-bold">
                            #{idx + 1}
                          </div>

                          {/* Click to Preview Overlay Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewLightboxIndex(idx)}
                            className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                            title="Click for full view"
                          >
                            <Eye className="w-7 h-7 drop-shadow-md" />
                          </button>
                        </div>

                        {/* Card Controls Bar */}
                        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-xs">
                          {/* Reorder Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveImage(idx, 'left')}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move Left"
                            >
                              <MoveLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === (formData.images?.length || 0) - 1}
                              onClick={() => handleMoveImage(idx, 'right')}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move Right"
                            >
                              <MoveRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Cover & Watermark Toggles */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSetCoverPhoto(idx)}
                              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                                img.isCover
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {img.isCover ? 'Cover' : 'Set Cover'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleWatermark(idx)}
                              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                                img.hasWatermark
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Watermark
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteImage(idx)}
                              className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                              title="Delete Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold text-slate-600">No photos uploaded yet</p>
                  <p className="text-xs">
                    Please upload photos above or click &quot;Load Villa Sample Photos&quot; to test.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: VIDEOS (วิดีโอ)                                     */}
        {/* ========================================================= */}
        {activeTab === 'videos' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <VideoIcon className="w-4 h-4 text-red-600" />
                <span>Property Videos & Virtual Tours (วิดีโอพาชมทรัพย์)</span>
              </h2>

              {/* Add Video Form */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-900 block">
                  Add Video Link (YouTube, Vimeo, MP4)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="url"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                  <input
                    type="text"
                    value={newVideoTitle}
                    onChange={(e) => setNewVideoTitle(e.target.value)}
                    placeholder="Video Title (e.g. Master Bedroom & Pool Tour)"
                    className="px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddVideo}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Video</span>
                </button>
              </div>

              {/* Videos List */}
              <div className="space-y-4">
                {(formData.videos || []).map((vid) => (
                  <div
                    key={vid.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{vid.title}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteVideo(vid.id)}
                        className="p-1 rounded text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                      {vid.url.includes('youtube') || vid.url.includes('youtu.be') ? (
                        <iframe
                          src={vid.url.replace('watch?v=', 'embed/')}
                          title={vid.title}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      ) : (
                        <video controls src={vid.url} className="w-full h-full object-cover" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: MAP (แผนที่และพิกัด)                                */}
        {/* ========================================================= */}
        {activeTab === 'map' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-red-600" />
                <span>Map & Geographic Coordinates (พิกัดแผนที่)</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Latitude (ละติจูด)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude ?? 7.7844}
                    onChange={(e) => updateForm({ latitude: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Longitude (ลองจิจูด)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude ?? 98.3184}
                    onChange={(e) => updateForm({ longitude: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700">Quick Phuket Presets:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Rawai Beach', lat: 7.7844, lng: 98.3184 },
                    { name: 'Chalong Pier', lat: 7.8217, lng: 98.3512 },
                    { name: 'Patong Beach', lat: 7.8967, lng: 98.2965 },
                    { name: 'Bang Tao Beach', lat: 7.9942, lng: 98.2936 },
                    { name: 'Phuket Old Town', lat: 7.884, lng: 98.3908 },
                  ].map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() =>
                        updateForm({
                          latitude: p.lat,
                          longitude: p.lng,
                          googleMapUrl: `https://maps.google.com/?q=${p.lat},${p.lng}`,
                        })
                      }
                      className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Preview Frame */}
              <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden border border-slate-300 bg-slate-100 relative">
                <iframe
                  title="Location Map"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${(formData.longitude || 98.3184) - 0.01}%2C${(formData.latitude || 7.7844) - 0.01}%2C${(formData.longitude || 98.3184) + 0.01}%2C${(formData.latitude || 7.7844) + 0.01}&layer=mapnik&marker=${formData.latitude || 7.7844}%2C${formData.longitude || 98.3184}`}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: FOLLOW-UP (ระบบติดตามสถานะและการติดต่อเจ้าของทรัพย์)   */}
        {/* ========================================================= */}
        {activeTab === 'followup' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <PropertyFollowUp
              property={formData}
              currentUser={currentUser}
              language={language}
              onUpdateProperty={(updated) => updateForm(updated)}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: UPDATE LOGS (ประวัติการแก้ไข)                       */}
        {/* ========================================================= */}
        {activeTab === 'logs' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Clock className="w-4 h-4 text-red-600" />
                <span>Audit Trail & Update Logs (ประวัติการเปลี่ยนแปลงข้อมูล)</span>
              </h2>

              <p className="text-xs text-slate-500">
                ระบบบันทึกประวัติการแก้ไขโดยอัตโนมัติ (Read-only) เพื่อความปลอดภัยและความโปร่งใส
              </p>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {(formData.updateLogs || []).map((log) => (
                  <div key={log.id} className="p-3.5 bg-white flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          by {log.user}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">{log.newValue}</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400 shrink-0 font-mono">
                      <div>{log.date}</div>
                      <div>{log.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: PUBLISH TO WEBSITE (เผยแพร่สู่เว็บไซต์)             */}
        {/* ========================================================= */}
        {activeTab === 'publish' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Publish to Website & Portal Channels (สถานะการเผยแพร่)</span>
              </h2>

              {/* Status Banner */}
              <div
                className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  formData.publishStatus === 'Published'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        formData.publishStatus === 'Published'
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {formData.publishStatus || 'Draft'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Score: {readiness.score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {formData.publishStatus === 'Published'
                      ? (language === 'th'
                          ? 'อสังหาริมทรัพย์นี้กำลังแสดงบนหน้าเว็บไซต์ PEAK REAL ESTATE และระบบพอร์ทัล'
                          : 'This property listing is live on PEAK REAL ESTATE website and portal channels.')
                      : (language === 'th'
                          ? 'อสังหาริมทรัพย์ยังไม่ถูกเผยแพร่สู่สาธารณะ กรุณาตรวจสอบเกณฑ์ความพร้อมด้านล่าง'
                          : 'Property is currently in draft. Complete all required fields below to publish.')}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!readiness.isReady) {
                        setValidationErrors(
                          readiness.missingFields.map((m) =>
                            language === 'th' ? (m.messageTh || m.labelTh) : (m.messageEn || m.labelEn)
                          )
                        );
                        if (readiness.missingFields.length > 0) {
                          setActiveTab(readiness.missingFields[0].tab);
                        }
                        return;
                      }
                      updateForm({ publishStatus: 'Published', isPublished: true });
                      setSaveSuccessMessage(
                        language === 'th'
                          ? 'อสังหาริมทรัพย์ได้รับการเผยแพร่เรียบร้อยแล้ว!'
                          : 'Property published successfully!'
                      );
                      setTimeout(() => setSaveSuccessMessage(null), 3000);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Globe className="w-4 h-4" />
                    <span>{language === 'th' ? 'เผยแพร่สู่เว็บไซต์' : 'Publish Listing'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateForm({ publishStatus: 'Unpublished', isPublished: false });
                      setSaveSuccessMessage(
                        language === 'th' ? 'ยกเลิกการเผยแพร่เรียบร้อย' : 'Listing unpublished'
                      );
                      setTimeout(() => setSaveSuccessMessage(null), 2500);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 text-xs font-bold cursor-pointer transition-all"
                  >
                    {language === 'th' ? 'ยกเลิกการเผยแพร่' : 'Unpublish'}
                  </button>
                </div>
              </div>

              {/* Readiness Progress Bar */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    {language === 'th' ? 'ระดับความพร้อมในการเผยแพร่ (Readiness Score)' : 'Publish Readiness Progress'}
                  </span>
                  <span className="font-mono font-bold text-slate-900">{readiness.score}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      readiness.score === 100
                        ? 'bg-emerald-500'
                        : readiness.score >= 70
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${readiness.score}%` }}
                  />
                </div>
              </div>

              {/* Quality Checklist */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 block">
                    {language === 'th'
                      ? 'เกณฑ์ตรวจสอบคุณภาพก่อนเผยแพร่ (Quality Checklist)'
                      : 'Pre-Publish Quality Checklist'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {readiness.checklist.filter((c) => c.passed).length} / {readiness.checklist.length} Passed
                  </span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {readiness.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className={`font-semibold ${item.passed ? 'text-slate-800' : 'text-slate-900'}`}>
                            {language === 'th' ? item.labelTh : item.labelEn}
                          </p>
                          {!item.passed && (
                            <p className="text-[11px] text-red-600 mt-0.5">
                              {language === 'th' ? item.messageTh : item.messageEn}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {item.passed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {language === 'th' ? 'เรียบร้อย' : 'Passed'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveTab(item.tab)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                          >
                            {language === 'th' ? 'ไปแก้ไข' : 'Fix Field'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* 4. BOTTOM ACTION & SAVE BAR (STICKY)                          */}
      {/* ------------------------------------------------------------- */}
      <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{formData.propertyId}</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">{formData.area || 'Zone 2 / Rawai'}</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">{formData.images?.length || 0} Photos</span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSafeClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
          >
            {language === 'th' ? 'ยกเลิก' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (language === 'th' ? 'บันทึกข้อมูล (Save)' : 'Save Property')}</span>
          </button>
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* 5. LIGHTBOX MODAL FOR FULL-SIZE PHOTO PREVIEW                 */}
      {/* ------------------------------------------------------------- */}
      {previewLightboxIndex !== null && formData.images && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setPreviewLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center">
            <img
              src={formData.images[previewLightboxIndex]?.url}
              alt=""
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
            {formData.images[previewLightboxIndex]?.hasWatermark && (
              <div className="absolute bottom-6 left-6 px-4 py-1.5 rounded-lg bg-black/80 text-white font-bold tracking-widest text-sm border border-white/20">
                PEAK REAL ESTATE
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4 text-white text-xs">
            <button
              type="button"
              disabled={previewLightboxIndex === 0}
              onClick={() => setPreviewLightboxIndex((p) => (p !== null ? Math.max(0, p - 1) : 0))}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-30 cursor-pointer"
            >
              Previous
            </button>
            <span className="font-mono">
              {previewLightboxIndex + 1} / {formData.images.length}
            </span>
            <button
              type="button"
              disabled={previewLightboxIndex === formData.images.length - 1}
              onClick={() =>
                setPreviewLightboxIndex((p) =>
                  p !== null ? Math.min(formData.images!.length - 1, p + 1) : 0
                )
              }
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-30 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
