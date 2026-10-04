import React, { useState } from 'react';
import { Property, User, Viewing } from '../types';
import { Language, translations } from '../lib/i18n';
import { PropertyFollowUp } from './PropertyFollowUp';
import {
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Building2,
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  DollarSign,
  User as UserIcon,
  Phone,
  Mail,
  Calendar,
  Image as ImageIcon,
  Video,
  Globe,
  ExternalLink,
  ShieldCheck,
  Eye,
  KeyRound,
  FileCheck,
  Waves,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

interface PropertyDetailModalProps {
  property: Property;
  currentUser: User;
  language: Language;
  initialTab?: 'basic' | 'price' | 'landlord' | 'map' | 'photos' | 'videos' | 'occupancy' | 'followup' | 'website' | 'viewings';
  onUpdateProperty: (updatedProperty: Property) => void;
  onClose: () => void;
  viewings?: Viewing[];
}

export function PropertyDetailModal({
  property,
  currentUser,
  language,
  initialTab = 'basic',
  onUpdateProperty,
  onClose,
  viewings = [],
}: PropertyDetailModalProps) {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'price', label: 'Price Info' },
    { id: 'landlord', label: 'Landlord Info' },
    { id: 'map', label: 'Map' },
    { id: 'photos', label: 'Photos' },
    { id: 'videos', label: 'Videos' },
    { id: 'occupancy', label: 'Occupancy Status' },
    { id: 'followup', label: 'Followup' },
    { id: 'website', label: 'Website' },
    { id: 'viewings', label: 'Viewing Records' },
  ];

  const handleCopyUrl = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${property.title} (${property.propertyId}) - PEAK REAL ESTATE`,
        text: property.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      handleCopyUrl();
    }
  };

  const formatPrice = (n: number) => `THB ${n.toLocaleString()}`;

  // Filter viewings for this property
  const propertyViewings = viewings.filter(
    (v) => v.propertyId === property.id || v.propertyCustomId === property.propertyId
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F8F9FA] text-slate-900 overflow-y-auto animate-in fade-in duration-150">
      {/* Top Header Bar (Matching Screenshot 2) */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-xs px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors"
            title="Back to listing"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold font-serif text-slate-900 tracking-tight flex items-center gap-2">
              <span>Property Detail ({property.propertyId})</span>
              {property.isBlackList && (
                <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[11px] font-bold border border-red-200">
                  Black List
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Horizontal Tabs Navigation (Matching Screenshot 2) */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 overflow-x-auto shrink-0">
        <div className="flex space-x-6 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'text-blue-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Body Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">
        {/* TAB 1: BASIC INFO */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Quick Hero Summary Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row gap-6 items-start">
              {property.images && property.images.length > 0 ? (
                <div className="w-full md:w-72 h-48 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative border">
                  <img
                    src={property.images[0]?.url}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  {property.images[0]?.hasWatermark && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-bold tracking-wider">
                      PEAK REAL ESTATE
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full md:w-72 h-48 rounded-xl bg-slate-100 flex items-center justify-center border text-slate-400">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}

              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                    {property.propertyId}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                    {property.status}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                    {property.category}
                  </span>
                  {property.propertyLabel && (
                    <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200">
                      {property.propertyLabel}
                    </span>
                  )}
                </div>

                <h1 className="text-xl font-bold font-serif text-slate-900">{property.title}</h1>
                {property.titleTh && <p className="text-xs text-slate-500">{property.titleTh}</p>}

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    {property.address}
                    {property.district && `, ${property.district}`}
                    {property.city && `, ${property.city}`}
                    {property.zone && ` (${property.zone}${property.area ? ` / ${property.area}` : ''})`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Bedrooms</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{property.bedrooms} Beds</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Bathrooms</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{property.bathrooms} Baths</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Usable Area</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{property.usableArea} sq.m</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Land Area</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{property.landArea ? `${property.landArea} sq.m` : '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Specifications & Property Structure */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Property Structure & Ownership</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">House No.</span>
                  <span className="font-semibold text-slate-900">{property.houseNo || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Building / Room</span>
                  <span className="font-semibold text-slate-900">
                    {property.building || ''} {property.roomNo ? `Room ${property.roomNo}` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Villa Ownership</span>
                  <span className="font-semibold text-slate-900">{property.villaOwnership || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Land Ownership</span>
                  <span className="font-semibold text-slate-900">{property.landOwnership || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Year Built</span>
                  <span className="font-semibold text-slate-900">{property.yearBuilt || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Pool Details</span>
                  <span className="font-semibold text-slate-900">
                    {property.hasHousePool || (property.hasPool ? 'Private Pool' : 'No Pool')}
                    {property.poolType ? ` (${property.poolType})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Pet Policy</span>
                  <span className="font-semibold text-slate-900">{property.petFriendly ? 'Pet Friendly' : 'No Pets'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Assigned Agent</span>
                  <span className="font-semibold text-slate-900">{property.agentName || '-'}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Description</h3>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{property.description}</p>
              {property.descriptionTh && (
                <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line pt-2 border-t border-slate-100">
                  {property.descriptionTh}
                </p>
              )}
            </div>

            {/* Amenities & Checklists */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Facilities & Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((item) => (
                    <span
                      key={item}
                      className="px-3 py-1 rounded-xl bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRICE INFO */}
        {activeTab === 'price' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Pricing & Commercial Terms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">Sale Price</span>
                  <p className="text-xl font-bold font-serif text-emerald-950 mt-1">
                    {property.price ? formatPrice(property.price) : '-'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
                  <span className="text-[10px] text-blue-700 font-bold uppercase">Monthly Rent</span>
                  <p className="text-xl font-bold font-serif text-blue-950 mt-1">
                    {property.rentPrice ? `${formatPrice(property.rentPrice)} / month` : '-'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200">
                  <span className="text-[10px] text-purple-700 font-bold uppercase">Security Deposit</span>
                  <p className="text-base font-bold text-purple-950 mt-1">{property.deposit || '2 Months'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Advance Rent</span>
                  <span className="font-semibold text-slate-900">{property.advancePayment || '1 Month'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Commission</span>
                  <span className="font-semibold text-slate-900">{property.commission || '1 Month / Year'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Common Fee</span>
                  <span className="font-semibold text-slate-900">
                    {property.commonFee ? `THB ${property.commonFee.toLocaleString()}` : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Electricity & Water</span>
                  <span className="font-semibold text-slate-900">
                    {property.electricityBill || 'Government Rate'} / {property.waterBill || 'Government Rate'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LANDLORD INFO */}
        {activeTab === 'landlord' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Landlord Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Owner / Landlord Name</span>
                  <p className="text-sm font-bold text-slate-900 mt-1">{property.ownerName || 'K. เจ้าของทรัพย์'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Contact Phone</span>
                  <p className="text-sm font-bold font-mono text-slate-900 mt-1">{property.ownerPhone || '-'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Email</span>
                  <p className="text-sm font-bold text-slate-900 mt-1">{property.ownerEmail || '-'}</p>
                </div>
              </div>

              {property.landlordNotes && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase mb-1">Internal Notes</span>
                  <p className="text-xs text-slate-700">{property.landlordNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MAP */}
        {activeTab === 'map' && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Location & Coordinates</h3>
            <p className="text-xs text-slate-600">
              {property.address}, {property.district}, {property.city}
            </p>
            {property.googleMapUrl && (
              <a
                href={property.googleMapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Google Maps</span>
              </a>
            )}
          </div>
        )}

        {/* TAB 5: PHOTOS */}
        {activeTab === 'photos' && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Property Photos ({property.images?.length || 0})</h3>
            {property.images && property.images.length > 0 ? (
              <div className="space-y-4">
                {/* Main View */}
                <div className="relative aspect-[16/9] w-full max-h-[500px] rounded-2xl overflow-hidden bg-black border border-slate-200">
                  <img
                    src={property.images[activePhotoIdx]?.url || property.images[0].url}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Thumbnails */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {property.images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        activePhotoIdx === idx ? 'border-red-600 scale-102 shadow-md' : 'border-slate-200 opacity-60'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs">No photos uploaded.</p>
            )}
          </div>
        )}

        {/* TAB 6: VIDEOS */}
        {activeTab === 'videos' && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Virtual Tours & Videos</h3>
            {property.videos && property.videos.length > 0 ? (
              <div className="space-y-3">
                {property.videos.map((v) => (
                  <div key={v.id} className="p-3.5 rounded-xl border flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{v.title || 'Property Video'}</p>
                      <p className="text-xs text-blue-600 underline font-mono">{v.url}</p>
                    </div>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                    >
                      Watch
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs">No videos added.</p>
            )}
          </div>
        )}

        {/* TAB 7: OCCUPANCY STATUS */}
        {activeTab === 'occupancy' && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Occupancy & Rental Period</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Current Status</span>
                <span className="font-bold text-sm text-slate-900">{property.status}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Rented From</span>
                <span className="font-bold text-sm text-slate-900">{property.rentFrom || '-'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Rented To</span>
                <span className="font-bold text-sm text-slate-900">{property.rentTo || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: FOLLOWUP (SECTIONS 35-53 - FULL IMPLEMENTATION FROM SCREENSHOT 2) */}
        {activeTab === 'followup' && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <PropertyFollowUp
              property={property}
              currentUser={currentUser}
              language={language}
              onUpdateProperty={onUpdateProperty}
            />
          </div>
        )}

        {/* TAB 9: WEBSITE & SEO */}
        {activeTab === 'website' && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Website & Portal Syndication</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Publish Status</span>
                <span className="font-bold text-slate-900">{property.isPublished ? 'Published' : 'Unpublished'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Featured Listing</span>
                <span className="font-bold text-slate-900">{property.featured ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: VIEWING RECORDS */}
        {activeTab === 'viewings' && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Viewing History ({propertyViewings.length})</h3>
            {propertyViewings.length === 0 ? (
              <p className="text-slate-400 text-xs">No viewing appointments recorded for this property yet.</p>
            ) : (
              <div className="space-y-2">
                {propertyViewings.map((v) => (
                  <div key={v.id} className="p-3 rounded-xl border flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{v.customerName} ({v.customerPhone})</p>
                      <p className="text-slate-500">{v.dateTime} · Agent: {v.agentName}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
