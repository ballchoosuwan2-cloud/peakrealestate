import React, { useState, useEffect } from 'react';
import { Property, FollowUpRecord, LandlordPhoneRecord, User } from '../types';
import { Language, translations } from '../lib/i18n';
import { FOLLOWUP_CONTENT_OPTIONS } from './propertyConstants';
import {
  Clock,
  User as UserIcon,
  Copy,
  Check,
  Phone,
  AlertTriangle,
  Send,
  Calendar,
  DollarSign,
  ShieldAlert,
  History,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface PropertyFollowUpProps {
  property: Property;
  currentUser: User;
  language: Language;
  onUpdateProperty: (updatedProperty: Property) => void;
}

export function PropertyFollowUp({
  property,
  currentUser,
  language,
  onUpdateProperty,
}: PropertyFollowUpProps) {
  const t = translations[language];

  // Active Submode: 'add_update' | 'view_phone_record'
  const [activeMode, setActiveMode] = useState<'add_update' | 'view_phone_record'>('add_update');

  // Real-time clock for Update Time
  const formatCurrentTimestamp = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const [currentTime, setCurrentTime] = useState(formatCurrentTimestamp());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(formatCurrentTimestamp());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Form State
  const [selectedContents, setSelectedContents] = useState<string[]>([]);
  const [customContent, setCustomContent] = useState('');
  const [landlordPhone3, setLandlordPhone3] = useState(property.landlordPhone3 || property.ownerPhone || '');
  const [isBlackList, setIsBlackList] = useState(property.isBlackList ?? false);
  const [latestPrice, setLatestPrice] = useState<string>(
    property.price ? String(property.price) : property.rentPrice ? String(property.rentPrice) : ''
  );
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Virtual phones default or from property
  const virtualPhone1 = property.virtualPhone1 || '15659172';
  const virtualPhone2 = property.virtualPhone2 || '15659172';
  const landlordName = property.ownerName || 'K. เจ้าของทรัพย์';

  // Toggle Content Chip
  const toggleContent = (item: string) => {
    if (selectedContents.includes(item)) {
      setSelectedContents(selectedContents.filter((c) => c !== item));
    } else {
      setSelectedContents([...selectedContents, item]);
    }
    setValidationError('');
  };

  // Copy Phone Number Helper
  const handleCopy = (text: string, fieldId: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Handle Form Submit
  const handleAddUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedContents.length === 0) {
      setValidationError('Please select follow-up content (กรุณาเลือก Follow-up Content อย่างน้อย 1 รายการ)');
      return;
    }

    setIsSubmitting(true);

    const nowIso = new Date().toISOString();
    const updateTimeString = currentTime;

    // Create Follow-up Record
    const newRecord: FollowUpRecord = {
      id: `fup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      propertyId: property.id,
      landlordId: property.ownerId || `landlord-${property.id}`,
      landlordName: landlordName,
      userId: currentUser.id,
      userName: currentUser.name,
      updateTime: updateTimeString,
      content: selectedContents,
      customContent: customContent.trim() || undefined,
      latestPrice: latestPrice ? Number(latestPrice) : undefined,
      nextFollowUp: nextFollowUp.trim() || undefined,
      blackList: isBlackList,
      virtualPhone1,
      virtualPhone2,
      landlordPhone3: landlordPhone3.trim() || undefined,
      channel: '[GoView] Spoke · Call',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Check if phone number was added/changed to create a LandlordPhoneRecord
    let updatedPhoneRecords = [...(property.landlordPhoneRecords || [])];
    const phoneChanged = landlordPhone3.trim() && landlordPhone3.trim() !== property.landlordPhone3;
    const phoneContentSelected = selectedContents.includes('Landlord phone number added');

    if (phoneChanged || phoneContentSelected) {
      const newPhoneRecord: LandlordPhoneRecord = {
        id: `phone-${Date.now()}`,
        landlordId: property.ownerId,
        landlordName: landlordName,
        propertyId: property.propertyId,
        virtualPhone1,
        virtualPhone2,
        phone3: landlordPhone3.trim(),
        dateAdded: updateTimeString,
        addedBy: currentUser.name,
        changeNote: phoneContentSelected ? 'Phone added via follow-up status' : 'Updated landlord phone 3',
      };
      updatedPhoneRecords = [newPhoneRecord, ...updatedPhoneRecords];
    }

    // Determine if property status should change from follow-up chips
    let newStatus = property.status;
    if (selectedContents.includes('Available')) newStatus = 'Available';
    if (selectedContents.includes('Rented')) newStatus = 'Rented';
    if (selectedContents.includes('Sold')) newStatus = 'Sold';
    if (selectedContents.includes('Avoid This Property')) newStatus = 'Inactive';

    // Format latest follow-up date (YYYY-MM-DD)
    const todayDate = updateTimeString.split(' ')[0];

    // Compile updated property
    const existingFollowUps = property.followUpRecords || [];
    const updatedProperty: Property = {
      ...property,
      status: newStatus,
      isBlackList: isBlackList,
      lastFollowUpDate: todayDate,
      lastFollowUpStatus: selectedContents[0] || property.status,
      lastFollowUpContent: customContent || selectedContents.join(', '),
      landlordPhone3: landlordPhone3.trim() || property.landlordPhone3,
      virtualPhone1,
      virtualPhone2,
      followUpRecords: [newRecord, ...existingFollowUps],
      landlordPhoneRecords: updatedPhoneRecords,
      comments: customContent ? customContent : property.comments,
      updatedAt: nowIso,
    };

    // Save and emit
    onUpdateProperty(updatedProperty);

    // Reset Form
    setSelectedContents([]);
    setCustomContent('');
    setIsSubmitting(false);
    setSuccessMessage('Follow-up record successfully saved to database!');
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const followUpHistory = property.followUpRecords || [];
  const phoneHistory = property.landlordPhoneRecords || [];

  return (
    <div className="space-y-6 text-xs text-slate-800">
      {/* Top Mode Navigation Buttons */}
      <div className="flex items-center justify-center gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveMode('add_update')}
            className={`px-6 py-2 rounded-lg font-semibold text-xs transition-all ${
              activeMode === 'add_update'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Add update
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('view_phone_record')}
            className={`px-6 py-2 rounded-lg font-semibold text-xs transition-all ${
              activeMode === 'view_phone_record'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            View Landlord phone record ({phoneHistory.length})
          </button>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold text-xs">{successMessage}</span>
        </div>
      )}

      {/* ERROR NOTIFICATION */}
      {validationError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-2 animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-semibold text-xs">{validationError}</span>
        </div>
      )}

      {/* MODE 1: ADD UPDATE FORM */}
      {activeMode === 'add_update' && (
        <form onSubmit={handleAddUpdate} className="space-y-5">
          {/* Row 1: Update Time, Update User, Landlord Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Update Time *</label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  readOnly
                  value={currentTime}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl bg-slate-100 text-slate-700 font-mono text-xs cursor-not-allowed select-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Update User</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  readOnly
                  value={currentUser.name}
                  className="w-full pl-9 pr-3 py-2 border rounded-xl bg-slate-100 text-slate-700 font-medium text-xs cursor-not-allowed select-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Landlord Name</label>
              <input
                type="text"
                readOnly
                value={landlordName}
                className="w-full px-3 py-2 border rounded-xl bg-slate-100 text-slate-700 font-medium text-xs cursor-not-allowed select-none"
              />
            </div>
          </div>

          {/* Row 2: Virtual Phone No1, Virtual Phone No2, Landlord Phone No3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Virtual Phone No1</label>
              <div className="flex gap-1.5">
                <a
                  href={`tel:${virtualPhone1}`}
                  className="flex-1 px-3 py-2 border rounded-xl bg-slate-100 text-slate-800 font-mono text-xs flex items-center hover:bg-slate-200 transition-colors"
                  title="Click to call on mobile"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500 mr-2" />
                  {virtualPhone1}
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(virtualPhone1, 'vp1')}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors"
                  title="Copy Phone Number"
                >
                  {copiedField === 'vp1' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Virtual Phone No2</label>
              <div className="flex gap-1.5">
                <a
                  href={`tel:${virtualPhone2}`}
                  className="flex-1 px-3 py-2 border rounded-xl bg-slate-100 text-slate-800 font-mono text-xs flex items-center hover:bg-slate-200 transition-colors"
                  title="Click to call on mobile"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500 mr-2" />
                  {virtualPhone2}
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(virtualPhone2, 'vp2')}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors"
                  title="Copy Phone Number"
                >
                  {copiedField === 'vp2' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Landlord Phone No3</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={landlordPhone3}
                  onChange={(e) => setLandlordPhone3(e.target.value)}
                  placeholder="e.g. 081-xxx-xxxx"
                  className="flex-1 px-3 py-2 border rounded-xl bg-white text-slate-900 font-mono text-xs focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                />
                {landlordPhone3 && (
                  <button
                    type="button"
                    onClick={() => handleCopy(landlordPhone3, 'lp3')}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center"
                    title="Copy Phone Number"
                  >
                    {copiedField === 'lp3' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Black List Toggle Switch */}
          <div className="p-3.5 rounded-xl border flex items-center justify-between transition-colors bg-white border-slate-200">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className={`w-5 h-5 ${isBlackList ? 'text-red-600' : 'text-slate-400'}`} />
              <div>
                <span className="font-bold text-slate-900 block text-xs">Black List</span>
                <span className="text-[11px] text-slate-500">
                  {isBlackList
                    ? 'Property / Landlord is marked as BLACK LIST (บันทึกสถานะติดแบล็กลิสต์ในระบบ)'
                    : 'Turn ON to mark this property or landlord as Black List'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsBlackList(!isBlackList)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isBlackList ? 'bg-red-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isBlackList ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Row 4: Content * (Select Chips / Button Group) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-slate-800 font-bold text-xs">
                Content * <span className="text-red-600">(เลือก Follow-up Status ได้หลายรายการ)</span>
              </label>
              {selectedContents.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedContents([])}
                  className="text-[11px] text-slate-500 hover:text-red-600"
                >
                  Clear Selection ({selectedContents.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {FOLLOWUP_CONTENT_OPTIONS.map((item) => {
                const isSelected = selectedContents.includes(item);
                const isDanger = item === 'Avoid This Property' || item === 'Owner Difficult';
                const isSuccess = item === 'Available' || item === 'Landlord phone number added';
                const isWarning = item === 'Sold' || item === 'Rented' || item === 'Cannot Contact';

                let activeClasses = 'bg-blue-600 text-white border-blue-600 shadow-xs';
                if (isDanger) activeClasses = 'bg-red-600 text-white border-red-600 shadow-xs';
                if (isSuccess) activeClasses = 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
                if (isWarning) activeClasses = 'bg-amber-600 text-white border-amber-600 shadow-xs';

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleContent(item)}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                      isSelected
                        ? activeClasses
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 5: Custom Follow-up Content */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Custom follow-up content (บันทึกรายละเอียดเพิ่มเติม)
            </label>
            <textarea
              rows={3}
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              placeholder="e.g. Owner confirmed property is still available. Latest price: 60,000 THB. Next follow-up: 23 Sep 2026."
              className="w-full px-3.5 py-2.5 border rounded-xl bg-white text-slate-900 text-xs focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
            />
          </div>

          {/* Row 6: Latest Price & Next Follow-up */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Latest Price (THB)</span>
              </label>
              <input
                type="number"
                min="0"
                value={latestPrice}
                onChange={(e) => setLatestPrice(e.target.value)}
                placeholder="e.g. 60000"
                className="w-full px-3 py-2 border rounded-xl bg-white font-semibold text-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Next Follow-up</span>
              </label>
              <input
                type="text"
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
                placeholder="e.g. 23 Sep 2026 หรือ 2026-09-23"
                className="w-full px-3 py-2 border rounded-xl bg-white text-slate-900 text-xs"
              />
            </div>
          </div>

          {/* Add Update Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving to Database...' : 'Add update'}</span>
          </button>
        </form>
      )}

      {/* MODE 2: VIEW LANDLORD PHONE RECORD */}
      {activeMode === 'view_phone_record' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>Landlord Phone Details: {landlordName}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Virtual Phone No1</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{virtualPhone1}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Virtual Phone No2</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{virtualPhone2}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Landlord Phone No3</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {property.landlordPhone3 || property.ownerPhone || 'Not set'}
                </span>
              </div>
            </div>
          </div>

          {/* Phone Audit Timeline */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              <span>ประวัติการเปลี่ยนแปลงเบอร์โทร ({phoneHistory.length})</span>
            </h4>

            {phoneHistory.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No phone modification records yet.
              </div>
            ) : (
              <div className="space-y-2">
                {phoneHistory.map((rec) => (
                  <div key={rec.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{rec.phone3 || rec.virtualPhone1}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                          {rec.changeNote || 'Phone Recorded'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Added by {rec.addedBy} · {rec.dateAdded}
                      </span>
                    </div>

                    <a
                      href={`tel:${rec.phone3 || rec.virtualPhone1}`}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY UPDATE LIST (Always visible below the form per Screenshot 2) */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <span>History update ({followUpHistory.length})</span>
          </h4>
        </div>

        {followUpHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Clock className="w-6 h-6 mx-auto text-slate-300 mb-1" />
            <p className="font-semibold text-xs text-slate-600">No follow-up records yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Submit the form above to add the first follow-up update</p>
          </div>
        ) : (
          <div className="space-y-3">
            {followUpHistory.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2 hover:border-slate-300 transition-colors"
              >
                {/* Header: User & Timestamp */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-600">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>{item.userName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.updateTime}</span>
                  </div>
                </div>

                {/* Channel / Action */}
                <div className="text-[11px] text-slate-500 font-medium">
                  {item.channel || '[GoView] Spoke · Call'}
                </div>

                {/* Content Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {item.content.map((c) => (
                    <span
                      key={c}
                      className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold border border-slate-200"
                    >
                      {c}
                    </span>
                  ))}
                  {item.blackList && (
                    <span className="px-2.5 py-0.5 rounded-md bg-red-100 text-red-700 text-[11px] font-bold border border-red-200">
                      Black List
                    </span>
                  )}
                </div>

                {/* Custom Content */}
                {item.customContent && (
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    {item.customContent}
                  </p>
                )}

                {/* Latest Price & Next Follow-up */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700 pt-1">
                  {item.latestPrice && (
                    <span>Latest price: ฿{Number(item.latestPrice).toLocaleString()}</span>
                  )}
                  {item.nextFollowUp && <span>Next: {item.nextFollowUp}</span>}
                </div>

                {/* Signature & Create Time Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>— {item.userName}</span>
                  <span>Create Time: {item.updateTime}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
