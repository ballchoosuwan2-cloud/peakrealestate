import React, { useState, useEffect } from 'react';
import {
  Contract,
  Property,
  Customer,
  User,
} from '../types';
import { Language } from '../lib/i18n';
import { numberToThaiBaht, numberToEnglishWords } from '../lib/number-words';
import {
  ArrowLeft,
  Save,
  Download,
  FileText,
  Upload,
  Trash2,
  Plus,
  Building2,
  User as UserIcon,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Calendar,
  Phone,
  CreditCard,
  Home,
  Shield,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  properties: Property[];
  customers: Customer[];
  users: User[];
  currentUser: User;
  language: Language;
  onSaved: (contract: Contract) => void;
}

export function ContractFormModal({
  isOpen,
  onClose,
  contract,
  properties,
  customers,
  users,
  currentUser,
  language,
  onSaved,
}: ContractFormModalProps) {
  if (!isOpen) return null;

  const isEdit = Boolean(contract && contract.id);
  const [activeSection, setActiveSection] = useState<string>('contract');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [contractId, setContractId] = useState(
    contract?.contractId || contract?.contractNumber || `RENT-2026-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [contractType, setContractType] = useState(contract?.contractType || 'Rent Contract');
  const [status, setStatus] = useState(contract?.status || 'Active');
  const [signDate, setSignDate] = useState(contract?.signDate || new Date().toISOString().slice(0, 10));
  const [rentalStart, setRentalStart] = useState(
    contract?.rentalStart || contract?.startDate || new Date().toISOString().slice(0, 10)
  );
  const [rentalEnd, setRentalEnd] = useState(
    contract?.rentalEnd ||
      contract?.endDate ||
      new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  );
  const [rentalTime, setRentalTime] = useState(contract?.rentalTime || '12 Months');
  const [withPet, setWithPet] = useState(Boolean(contract?.withPet));

  // Property State
  const [selectedPropId, setSelectedPropId] = useState(contract?.propertyId || (properties[0]?.propertyId || properties[0]?.id || ''));
  const [agentName, setAgentName] = useState(contract?.agent || currentUser.name);
  const [agentPhone, setAgentPhone] = useState(contract?.agentPhone || currentUser.phone || '');
  const [houseNo, setHouseNo] = useState(contract?.houseNo || '');
  const [projectEn, setProjectEn] = useState(contract?.projectEn || '');
  const [projectTh, setProjectTh] = useState(contract?.projectTh || '');
  const [nation, setNation] = useState(contract?.nation || 'Thailand');
  const [province, setProvince] = useState(contract?.province || 'Phuket');
  const [district, setDistrict] = useState(contract?.district || '');
  const [subDistrict, setSubDistrict] = useState(contract?.subDistrict || '');
  const [roadEn, setRoadEn] = useState(contract?.roadEn || '');
  const [roadTh, setRoadTh] = useState(contract?.roadTh || '');
  const [soiEn, setSoiEn] = useState(contract?.soiEn || '');
  const [soiTh, setSoiTh] = useState(contract?.soiTh || '');
  const [mooEn, setMooEn] = useState(contract?.mooEn || '');
  const [mooTh, setMooTh] = useState(contract?.mooTh || '');
  const [postalCode, setPostalCode] = useState(contract?.postalCode || '');
  const [houseRegistrationFile, setHouseRegistrationFile] = useState<any>(contract?.houseRegistrationFile || null);

  // Landlord State
  const [ownerName, setOwnerName] = useState(contract?.ownerName || '');
  const [landlordCertificateType, setLandlordCertificateType] = useState(contract?.landlordCertificateType || 'Thai ID');
  const [landlordIdNo, setLandlordIdNo] = useState(contract?.landlordIdNo || '');
  const [landlordNationality, setLandlordNationality] = useState(contract?.landlordNationality || 'Thai');
  const [landlordBank, setLandlordBank] = useState(contract?.landlordBank || 'Kasikorn Bank');
  const [landlordAccountName, setLandlordAccountName] = useState(contract?.landlordAccountName || '');
  const [landlordAccountNo, setLandlordAccountNo] = useState(contract?.landlordAccountNo || '');
  const [landlordAddressHouseNo, setLandlordAddressHouseNo] = useState(contract?.landlordAddressHouseNo || '');
  const [landlordAddressProject, setLandlordAddressProject] = useState(contract?.landlordAddressProject || '');
  const [landlordAddressNation, setLandlordAddressNation] = useState(contract?.landlordAddressNation || 'Thailand');
  const [landlordAddressProvince, setLandlordAddressProvince] = useState(contract?.landlordAddressProvince || 'Phuket');
  const [landlordAddressDistrict, setLandlordAddressDistrict] = useState(contract?.landlordAddressDistrict || '');
  const [landlordAddressSubDistrict, setLandlordAddressSubDistrict] = useState(contract?.landlordAddressSubDistrict || '');
  const [landlordAddressRoad, setLandlordAddressRoad] = useState(contract?.landlordAddressRoad || '');
  const [landlordAddressSoi, setLandlordAddressSoi] = useState(contract?.landlordAddressSoi || '');
  const [landlordAddressMoo, setLandlordAddressMoo] = useState(contract?.landlordAddressMoo || '');
  const [landlordAddressPostalCode, setLandlordAddressPostalCode] = useState(contract?.landlordAddressPostalCode || '');
  const [ownerThaiIdFile, setOwnerThaiIdFile] = useState<any>(contract?.ownerThaiIdFile || null);

  // Tenant State
  const [tenantName, setTenantName] = useState(contract?.tenantName || '');
  const [tenantPhone, setTenantPhone] = useState(contract?.tenantPhone || '');
  const [tenantNationality, setTenantNationality] = useState(contract?.tenantNationality || 'Foreigner');
  const [tenantCertificateType, setTenantCertificateType] = useState(contract?.tenantCertificateType || 'Passport');
  const [tenantIdNo, setTenantIdNo] = useState(contract?.tenantIdNo || '');
  const [tenantPassportFile, setTenantPassportFile] = useState<any>(contract?.tenantPassportFile || null);
  const [moreTenants, setMoreTenants] = useState<any[]>(contract?.moreTenants || []);

  // Rental Fee State
  const [monthlyRent, setMonthlyRent] = useState<number>(contract?.monthlyRent || 35000);
  const [paymentTerm, setPaymentTerm] = useState(contract?.paymentTerm || 'Monthly');
  const [monthlyRentBahtEn, setMonthlyRentBahtEn] = useState(contract?.monthlyRentBahtEn || '');
  const [monthlyRentBahtTh, setMonthlyRentBahtTh] = useState(contract?.monthlyRentBahtTh || '');
  const [paymentDate, setPaymentDate] = useState(contract?.paymentDate || '23');
  const [penaltyAmount, setPenaltyAmount] = useState(contract?.penaltyAmount || '437.50');
  const [priceComments, setPriceComments] = useState(contract?.priceComments || '');
  const [deposit, setDeposit] = useState<number>(contract?.deposit !== undefined ? contract.deposit : 70000);
  const [depositBahtEn, setDepositBahtEn] = useState(contract?.depositBahtEn || '');
  const [depositBahtTh, setDepositBahtTh] = useState(contract?.depositBahtTh || '');
  const [advanceRental, setAdvanceRental] = useState<number>(contract?.advanceRental !== undefined ? contract.advanceRental : 35000);
  const [advanceRentalBahtEn, setAdvanceRentalBahtEn] = useState(contract?.advanceRentalBahtEn || '');
  const [advanceRentalBahtTh, setAdvanceRentalBahtTh] = useState(contract?.advanceRentalBahtTh || '');
  const [commissionFromOwner, setCommissionFromOwner] = useState<number>(contract?.commissionFromOwner || 35000);
  const [commissionBahtEn, setCommissionBahtEn] = useState(contract?.commissionBahtEn || '');
  const [commissionBahtTh, setCommissionBahtTh] = useState(contract?.commissionBahtTh || '');

  // Computed total
  const totalPrice = deposit + advanceRental;
  const totalPriceBahtTh = numberToThaiBaht(totalPrice);
  const totalPriceBahtEn = numberToEnglishWords(totalPrice);

  // Sales State
  const [salesName, setSalesName] = useState(contract?.salesName || currentUser.name);
  const [salesPhone, setSalesPhone] = useState(contract?.salesPhone || currentUser.phone || '');
  const [salesCommission, setSalesCommission] = useState(contract?.salesCommission || '35,000');

  // Comments
  const [comments, setComments] = useState(contract?.comments || '');

  // Attachments & History
  const [attachments, setAttachments] = useState<any[]>(contract?.attachments || []);
  const [generatedWordFiles, setGeneratedWordFiles] = useState<any[]>(contract?.generatedWordFiles || []);
  const [currentWordFileUrl, setCurrentWordFileUrl] = useState<string>(contract?.currentWordFileUrl || '');

  // Auto-fill financial words when numbers change
  useEffect(() => {
    if (monthlyRent > 0) {
      setMonthlyRentBahtTh(numberToThaiBaht(monthlyRent));
      setMonthlyRentBahtEn(numberToEnglishWords(monthlyRent));
    }
  }, [monthlyRent]);

  useEffect(() => {
    if (deposit >= 0) {
      setDepositBahtTh(numberToThaiBaht(deposit));
      setDepositBahtEn(numberToEnglishWords(deposit));
    }
  }, [deposit]);

  useEffect(() => {
    if (advanceRental >= 0) {
      setAdvanceRentalBahtTh(numberToThaiBaht(advanceRental));
      setAdvanceRentalBahtEn(numberToEnglishWords(advanceRental));
    }
  }, [advanceRental]);

  useEffect(() => {
    if (commissionFromOwner >= 0) {
      setCommissionBahtTh(numberToThaiBaht(commissionFromOwner));
      setCommissionBahtEn(numberToEnglishWords(commissionFromOwner));
    }
  }, [commissionFromOwner]);

  // Handle Property Selection & Auto-fill
  const handleSelectProperty = (propId: string) => {
    setSelectedPropId(propId);
    const found = properties.find((p) => p.propertyId === propId || p.id === propId);
    if (!found) return;

    setProjectEn(found.projectName || found.title || '');
    setProjectTh(found.projectNameTh || found.titleTh || '');
    setHouseNo(found.roomNo || '');
    setDistrict(found.district || '');
    setSubDistrict(found.subDistrict || '');
    setProvince(found.province || 'Phuket');
    setPostalCode(found.postalCode || '');
    setRoadEn(found.addressEnDetail?.road || '');
    setRoadTh(found.addressThDetail?.road || '');
    setSoiEn(found.addressEnDetail?.soi || '');
    setSoiTh(found.addressThDetail?.soi || '');
    setMooEn(found.addressEnDetail?.moo || '');
    setMooTh(found.addressThDetail?.moo || '');

    if (found.ownerName) {
      setOwnerName(found.ownerName);
      setLandlordAccountName(found.ownerName);
    }
    if (found.landlordIdNumber) {
      setLandlordIdNo(found.landlordIdNumber);
    }
    if (found.agentName) {
      setAgentName(found.agentName);
      setSalesName(found.agentName);
    }

    if (found.rentPrice && found.rentPrice > 0) {
      setMonthlyRent(found.rentPrice);
      setDeposit(found.rentPrice * 2);
      setAdvanceRental(found.rentPrice);
      setCommissionFromOwner(found.rentPrice);
      setSalesCommission(String(found.rentPrice));
    }
  };

  // Auto-fill Sales details when agent user is selected
  const handleSelectSalesUser = (userName: string) => {
    setSalesName(userName);
    const u = users.find((x) => x.name === userName);
    if (u?.phone) {
      setSalesPhone(u.phone);
    }
  };

  // Safe file upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'houseReg' | 'ownerId' | 'tenantPassport' | 'attachment') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject dangerous file extensions
    const dangerousExt = ['.exe', '.sh', '.bat', '.cmd', '.js', '.vbs', '.php', '.py'];
    const lowerName = file.name.toLowerCase();
    if (dangerousExt.some((ext) => lowerName.endsWith(ext))) {
      alert('Forbidden: Executable files and scripts cannot be uploaded.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch('/api/contracts/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64Data,
            fileType: file.type,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          alert(`File upload failed: ${json.error}`);
          return;
        }

        const uploadedFile = json.file;
        if (targetField === 'houseReg') {
          setHouseRegistrationFile(uploadedFile);
        } else if (targetField === 'ownerId') {
          setOwnerThaiIdFile(uploadedFile);
        } else if (targetField === 'tenantPassport') {
          setTenantPassportFile(uploadedFile);
        } else if (targetField === 'attachment') {
          setAttachments((prev) => [...prev, uploadedFile]);
        }
      } catch (err: any) {
        console.error('File upload error:', err);
        alert('File upload error: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Save
  const handleSave = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!signDate) {
      setErrorMessage('Sign Date is required (กรุณาระบุวันที่ทำสัญญา)');
      setActiveSection('contract');
      return;
    }
    if (!rentalStart) {
      setErrorMessage('Rental Start Date is required (กรุณาระบุวันเริ่มสัญญา)');
      setActiveSection('contract');
      return;
    }
    if (!rentalEnd) {
      setErrorMessage('Rental End Date is required (กรุณาระบุวันสิ้นสุดสัญญา)');
      setActiveSection('contract');
      return;
    }
    if (!selectedPropId) {
      setErrorMessage('Property ID is required (กรุณาเลือกรหัสทรัพย์สิน)');
      setActiveSection('property');
      return;
    }
    if (!tenantPhone) {
      setErrorMessage('Tenant Phone is required (กรุณาระบุเบอร์โทรศัพท์ผู้เช่า)');
      setActiveSection('tenant');
      return;
    }
    if (!salesName) {
      setErrorMessage('Sales person is required (กรุณาระบุเจ้าหน้าที่ฝ่ายขาย)');
      setActiveSection('sales');
      return;
    }

    setIsSubmitting(true);

    const payload: any = {
      id: contract?.id || `ctr-${Date.now()}`,
      contractId,
      contractType,
      status,
      signDate,
      rentalStart,
      rentalEnd,
      rentalTime,
      withPet,

      // Property
      propertyId: selectedPropId,
      propertyCustomId: selectedPropId,
      propertyTitle: projectEn || projectTh || selectedPropId,
      agent: agentName,
      agentPhone,
      houseNo,
      projectEn,
      projectTh,
      nation,
      province,
      district,
      subDistrict,
      roadEn,
      roadTh,
      soiEn,
      soiTh,
      mooEn,
      mooTh,
      postalCode,
      houseRegistrationFile,

      // Landlord
      ownerName,
      landlordCertificateType,
      landlordIdNo,
      landlordNationality,
      landlordBank,
      landlordAccountName,
      landlordAccountNo,
      landlordAddressHouseNo,
      landlordAddressProject,
      landlordAddressNation,
      landlordAddressProvince,
      landlordAddressDistrict,
      landlordAddressSubDistrict,
      landlordAddressRoad,
      landlordAddressSoi,
      landlordAddressMoo,
      landlordAddressPostalCode,
      ownerThaiIdFile,

      // Tenant
      tenantName: tenantName || 'Valued Client',
      tenantPhone,
      tenantNationality,
      tenantCertificateType,
      tenantIdNo,
      tenantPassportFile,
      moreTenants,

      // Rental Fee
      monthlyRent,
      paymentTerm,
      monthlyRentBahtEn,
      monthlyRentBahtTh,
      paymentDate,
      penaltyAmount,
      priceComments,
      totalPrice,
      totalPriceBahtEn,
      totalPriceBahtTh,
      deposit,
      depositBahtEn,
      depositBahtTh,
      advanceRental,
      advanceRentalBahtEn,
      advanceRentalBahtTh,
      commissionFromOwner,
      commissionBahtEn,
      commissionBahtTh,

      // Sales
      salesName,
      salesPhone,
      salesCommission,

      // Comments & Attachments
      comments,
      attachments,

      currentUser,
    };

    try {
      const endpoint = isEdit ? `/api/contracts/${contract!.id}` : '/api/contracts';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save contract');
      }

      setSuccessMessage('Contract saved successfully! Word document generated.');
      if (data.contract) {
        if (data.contract.generatedWordFiles) {
          setGeneratedWordFiles(data.contract.generatedWordFiles);
        }
        if (data.contract.currentWordFileUrl) {
          setCurrentWordFileUrl(data.contract.currentWordFileUrl);
        }
        onSaved(data.contract);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Save contract error:', err);
      setErrorMessage(err.message || 'Error saving contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download Latest Word Document
  const handleDownloadWord = () => {
    if (contract?.id) {
      window.location.href = `/api/contracts/${contract.id}/download-docx`;
    } else if (currentWordFileUrl) {
      window.open(currentWordFileUrl, '_blank');
    } else {
      alert('Please save the contract first to generate and download the Word document.');
    }
  };

  const sections = [
    { id: 'contract', label: 'Contract', icon: FileText },
    { id: 'property', label: 'Property', icon: Building2 },
    { id: 'landlord_basic', label: 'Landlord Basic', icon: UserIcon },
    { id: 'landlord_bank', label: 'Landlord Bank', icon: CreditCard },
    { id: 'tenant', label: 'Tenant Information', icon: UserIcon },
    { id: 'rental_fee', label: 'Rental Fee & Payment', icon: DollarSign },
    { id: 'sales', label: 'Sales & Commission', icon: Shield },
    { id: 'comments', label: 'Comments', icon: FileCheck },
    { id: 'attachments', label: 'Attach Files & Word', icon: Upload },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold font-serif tracking-wide text-white">
                {isEdit ? `Edit Rental Contract (${contractId})` : 'Add Rental Contract'}
              </h2>
              <p className="text-xs text-slate-400">
                PEAK Real Estate • Standard Bilingual Lease Agreement Management
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadWord}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
              title="Download Word Document (.docx)"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Download Rental Contract (.docx)
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Contract'}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Body: Sidebar Nav + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-56 bg-slate-50 border-r border-slate-200 p-3 flex flex-col gap-1 overflow-y-auto shrink-0">
            {sections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition ${
                    isActive
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Scrollable Content Panels */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
            {/* 1. CONTRACT INFORMATION */}
            {activeSection === 'contract' && (
              <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2.5">
                  1. Contract Information (ข้อมูลสัญญา)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Contract ID (รหัสสัญญา)
                    </label>
                    <input
                      type="text"
                      value={contractId}
                      onChange={(e) => setContractId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Contract Type (ประเภทสัญญา)
                    </label>
                    <select
                      value={contractType}
                      onChange={(e) => setContractType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-red-500 outline-none"
                    >
                      <option value="Rent Contract">Rent Contract (สัญญาเช่า)</option>
                      <option value="Sale Contract">Sale Contract (สัญญาซื้อขาย)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Status (สถานะ)
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-red-500 outline-none"
                    >
                      <option value="Active">Active (มีผลบังคับใช้)</option>
                      <option value="Draft">Draft (ฉบับร่าง)</option>
                      <option value="Expiring Soon">Expiring Soon (ใกล้หมดอายุ)</option>
                      <option value="Expired">Expired (สิ้นสุดสัญญา)</option>
                      <option value="Terminated">Terminated (ยกเลิกสัญญา)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Sign Date * (วันที่ทำสัญญา)
                    </label>
                    <input
                      type="date"
                      required
                      value={signDate}
                      onChange={(e) => setSignDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Rental Start * (วันเริ่มต้นการเช่า)
                    </label>
                    <input
                      type="date"
                      required
                      value={rentalStart}
                      onChange={(e) => setRentalStart(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Rental End * (วันสิ้นสุดการเช่า)
                    </label>
                    <input
                      type="date"
                      required
                      value={rentalEnd}
                      onChange={(e) => setRentalEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Rental Time (ระยะเวลาการเช่า)
                    </label>
                    <input
                      type="text"
                      value={rentalTime}
                      onChange={(e) => setRentalTime(e.target.value)}
                      placeholder="e.g. 12 Months / 1 Year"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="withPetCheckbox"
                      checked={withPet}
                      onChange={(e) => setWithPet(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor="withPetCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      With Pet (อนุญาตให้เลี้ยงสัตว์)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PROPERTY INFORMATION */}
            {activeSection === 'property' && (
              <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-base font-bold text-slate-800">
                    2. Property Information (ข้อมูลทรัพย์สิน)
                  </h3>
                  <span className="text-xs text-slate-500">
                    เลือกทรัพย์สินเพื่อดึงข้อมูลอัตโนมัติ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Select Property */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Property ID * (เลือกรหัสทรัพย์สิน)
                    </label>
                    <select
                      value={selectedPropId}
                      onChange={(e) => handleSelectProperty(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-red-500 outline-none"
                    >
                      <option value="">-- กรุณาเลือกทรัพย์สิน --</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.propertyId || p.id}>
                          [{p.propertyId}] {p.title} • {p.projectName || p.district} • ฿{p.rentPrice?.toLocaleString() || '0'}/mo
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Agent (ตัวแทนนายหน้า)</label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Phone No (เบอร์โทรตัวแทน)</label>
                    <input
                      type="text"
                      value={agentPhone}
                      onChange={(e) => setAgentPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">House No (บ้านเลขที่/ห้องเลขที่)</label>
                    <input
                      type="text"
                      value={houseNo}
                      onChange={(e) => setHouseNo(e.target.value)}
                      placeholder="e.g. 88/12"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Project EN (ชื่อโครงการ อังกฤษ)</label>
                    <input
                      type="text"
                      value={projectEn}
                      onChange={(e) => setProjectEn(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Project TH (ชื่อโครงการ ไทย)</label>
                    <input
                      type="text"
                      value={projectTh}
                      onChange={(e) => setProjectTh(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nation (ประเทศ)</label>
                    <input
                      type="text"
                      value={nation}
                      onChange={(e) => setNation(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Province (จังหวัด)</label>
                    <input
                      type="text"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">District (อำเภอ)</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Sub-District (ตำบล)</label>
                    <input
                      type="text"
                      value={subDistrict}
                      onChange={(e) => setSubDistrict(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Road (ถนน)</label>
                    <input
                      type="text"
                      value={roadEn}
                      onChange={(e) => setRoadEn(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Soi (ซอย)</label>
                    <input
                      type="text"
                      value={soiEn}
                      onChange={(e) => setSoiEn(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Moo (หมู่ที่)</label>
                    <input
                      type="text"
                      value={mooEn}
                      onChange={(e) => setMooEn(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Postal Code (รหัสไปรษณีย์)</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  {/* House Registration File Upload */}
                  <div className="sm:col-span-2 lg:col-span-3 pt-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      House Registration (jpg/png) สำเนาทะเบียนบ้าน
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer border border-slate-300 flex items-center gap-1.5 transition">
                        <Upload className="w-3.5 h-3.5" />
                        Choose File
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'houseReg')}
                        />
                      </label>
                      {houseRegistrationFile && (
                        <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{houseRegistrationFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setHouseRegistrationFile(null)}
                            className="text-slate-400 hover:text-red-600 ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. LANDLORD BASIC INFORMATION */}
            {activeSection === 'landlord_basic' && (
              <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2.5">
                  3. Landlord Basic Information (ข้อมูลผู้ให้เช่า)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Owner Name (ชื่อผู้ให้เช่า)
                    </label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Somchai Prasert"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Type of Certificate (ประเภทบัตร)
                    </label>
                    <select
                      value={landlordCertificateType}
                      onChange={(e) => setLandlordCertificateType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    >
                      <option value="Thai ID">Thai ID (บัตรประชาชนไทย)</option>
                      <option value="Passport">Passport (หนังสือเดินทาง)</option>
                      <option value="Company Registration">Company Registration (หนังสือรับรองบริษัท)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Identification No (เลขประจำตัว)
                    </label>
                    <input
                      type="text"
                      value={landlordIdNo}
                      onChange={(e) => setLandlordIdNo(e.target.value)}
                      placeholder="e.g. 1-8399-00123-45-6"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nationality (สัญชาติ)
                    </label>
                    <input
                      type="text"
                      value={landlordNationality}
                      onChange={(e) => setLandlordNationality(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Landlord House No (บ้านเลขที่)
                    </label>
                    <input
                      type="text"
                      value={landlordAddressHouseNo}
                      onChange={(e) => setLandlordAddressHouseNo(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Landlord Province (จังหวัด)
                    </label>
                    <input
                      type="text"
                      value={landlordAddressProvince}
                      onChange={(e) => setLandlordAddressProvince(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  {/* Owner Thai ID Upload */}
                  <div className="sm:col-span-2 lg:col-span-3 pt-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Owner Thai ID (jpg/png) สำเนาบัตรประชาชนผู้ให้เช่า
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer border border-slate-300 flex items-center gap-1.5 transition">
                        <Upload className="w-3.5 h-3.5" />
                        Choose ID File
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'ownerId')}
                        />
                      </label>
                      {ownerThaiIdFile && (
                        <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{ownerThaiIdFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setOwnerThaiIdFile(null)}
                            className="text-slate-400 hover:text-red-600 ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. LANDLORD BANK INFORMATION */}
            {activeSection === 'landlord_bank' && (
              <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2.5">
                  4. Landlord Bank Information (ข้อมูลบัญชีธนาคารรับเงิน)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Transfer Bank (ธนาคาร)
                    </label>
                    <input
                      type="text"
                      value={landlordBank}
                      onChange={(e) => setLandlordBank(e.target.value)}
                      placeholder="e.g. Kasikorn Bank (กสิกรไทย)"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Account (ชื่อบัญชี)
                    </label>
                    <input
                      type="text"
                      value={landlordAccountName}
                      onChange={(e) => setLandlordAccountName(e.target.value)}
                      placeholder="Account holder name"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Account No (หมายเลขบัญชี)
                    </label>
                    <input
                      type="text"
                      value={landlordAccountNo}
                      onChange={(e) => setLandlordAccountNo(e.target.value)}
                      placeholder="e.g. 012-3-45678-9"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. TENANT INFORMATION */}
            {activeSection === 'tenant' && (
              <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-base font-bold text-slate-800">
                    5. Tenant Information (ข้อมูลผู้เช่า)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreTenants((prev) => [
                        ...prev,
                        { id: `t-${Date.now()}`, name: '', phone: '', nationality: '', certificateType: 'Passport', idNo: '' },
                      ]);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    More Tenants (เพิ่มผู้เช่าร่วม)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Tenant Name (ชื่อผู้เช่า)
                    </label>
                    <input
                      type="text"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="Full name"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Phone No * (เบอร์โทรศัพท์)
                    </label>
                    <input
                      type="text"
                      required
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      placeholder="e.g. 081-999-8877"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nationality (สัญชาติ)
                    </label>
                    <input
                      type="text"
                      value={tenantNationality}
                      onChange={(e) => setTenantNationality(e.target.value)}
                      placeholder="e.g. Russian, British, French"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Type of Certificate (ประเภทเอกสาร)
                    </label>
                    <select
                      value={tenantCertificateType}
                      onChange={(e) => setTenantCertificateType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    >
                      <option value="Passport">Passport (หนังสือเดินทาง)</option>
                      <option value="Thai ID">Thai ID (บัตรประชาชนไทย)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Identification No (เลขที่หนังสือเดินทาง/บัตร)
                    </label>
                    <input
                      type="text"
                      value={tenantIdNo}
                      onChange={(e) => setTenantIdNo(e.target.value)}
                      placeholder="e.g. AA1234567"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  {/* Passport Upload */}
                  <div className="sm:col-span-2 lg:col-span-3 pt-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Passport (jpg/png) สำเนาพาสปอร์ตผู้เช่า
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer border border-slate-300 flex items-center gap-1.5 transition">
                        <Upload className="w-3.5 h-3.5" />
                        Choose Passport
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'tenantPassport')}
                        />
                      </label>
                      {tenantPassportFile && (
                        <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{tenantPassportFile.name}</span>
                          <button
                            type="button"
                            onClick={() => setTenantPassportFile(null)}
                            className="text-slate-400 hover:text-red-600 ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Tenants List */}
                {moreTenants.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 mb-2">More Tenants (ผู้เช่าร่วม):</h4>
                    <div className="space-y-2">
                      {moreTenants.map((tItem, idx) => (
                        <div key={tItem.id || idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <input
                            type="text"
                            placeholder="Name"
                            value={tItem.name}
                            onChange={(e) => {
                              const copy = [...moreTenants];
                              copy[idx].name = e.target.value;
                              setMoreTenants(copy);
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Phone"
                            value={tItem.phone}
                            onChange={(e) => {
                              const copy = [...moreTenants];
                              copy[idx].phone = e.target.value;
                              setMoreTenants(copy);
                            }}
                            className="w-32 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Nationality"
                            value={tItem.nationality}
                            onChange={(e) => {
                              const copy = [...moreTenants];
                              copy[idx].nationality = e.target.value;
                              setMoreTenants(copy);
                            }}
                            className="w-32 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Passport / ID"
                            value={tItem.idNo}
                            onChange={(e) => {
                              const copy = [...moreTenants];
                              copy[idx].idNo = e.target.value;
                              setMoreTenants(copy);
                            }}
                            className="w-36 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setMoreTenants(moreTenants.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. RENTAL FEE AND PAYMENT TERM */}
            {activeSection === 'rental_fee' && (
              <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2.5">
                  6. Rental Fee And Payment Term (อัตราค่าเช่าและการชำระเงิน)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Monthly Rent * (ค่าเช่าต่อเดือน THB)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Term * (รอบการชำระ)
                    </label>
                    <select
                      value={paymentTerm}
                      onChange={(e) => setPaymentTerm(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    >
                      <option value="Monthly">Monthly (รายเดือน)</option>
                      <option value="Quarterly">Quarterly (ราย 3 เดือน)</option>
                      <option value="Semi-Annually">Semi-Annually (ราย 6 เดือน)</option>
                      <option value="Yearly">Yearly (รายปี)</option>
                      <option value="1 Year">1 Year Lump Sum (ชำระก้อนเดียวทั้งปี)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Date (วันที่ต้องชำระของทุกเดือน)
                    </label>
                    <input
                      type="text"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      placeholder="e.g. 23"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  {/* Monthly Rent Baht in Words */}
                  <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Monthly Rent Baht (En) ข้อความภาษาอังกฤษ
                      </label>
                      <input
                        type="text"
                        value={monthlyRentBahtEn}
                        onChange={(e) => setMonthlyRentBahtEn(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:border-red-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Monthly Rent Baht (Th) ข้อความภาษาไทย
                      </label>
                      <input
                        type="text"
                        value={monthlyRentBahtTh}
                        onChange={(e) => setMonthlyRentBahtTh(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Penalty Amount (เบี้ยปรับล่าช้า บาท/วัน)
                    </label>
                    <input
                      type="text"
                      value={penaltyAmount}
                      onChange={(e) => setPenaltyAmount(e.target.value)}
                      placeholder="e.g. 437.50"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Deposit * (เงินประกันความเสียหาย THB)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={deposit}
                      onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Advance Rental * (ค่าเช่าล่วงหน้า THB)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={advanceRental}
                      onChange={(e) => setAdvanceRental(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-red-500 outline-none"
                    />
                  </div>

                  {/* Total Price Auto-calc */}
                  <div className="sm:col-span-2 lg:col-span-3 bg-amber-50/60 p-4 rounded-xl border border-amber-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-900">
                        Total Price (ยอดรวมเงินประกัน + ค่าเช่าล่วงหน้าที่ต้องชำระวันทำสัญญา):
                      </span>
                      <span className="text-base font-extrabold text-amber-800 font-mono">
                        ฿{totalPrice.toLocaleString()} THB
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="text-xs text-amber-800">
                        <span className="font-semibold">EN: </span>{totalPriceBahtEn}
                      </div>
                      <div className="text-xs text-amber-800">
                        <span className="font-semibold">TH: </span>{totalPriceBahtTh}
                      </div>
                    </div>
                  </div>

                  {/* Commission From Owner */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Commission from Owner (ค่านายหน้าจากผู้ให้เช่า THB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={commissionFromOwner}
                      onChange={(e) => setCommissionFromOwner(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Price Comments (หมายเหตุราคาและการชำระเงิน)
                    </label>
                    <input
                      type="text"
                      value={priceComments}
                      onChange={(e) => setPriceComments(e.target.value)}
                      placeholder="e.g. Deposit includes 2 months damage guarantee + 1 month advance payment"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. SALES INFORMATION AND COMMISSION */}
            {activeSection === 'sales' && (
              <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2.5">
                  7. Sales Information And Commission (ข้อมูลฝ่ายขายและค่าคอมมิชชั่น)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sales Person * (เจ้าหน้าที่ฝ่ายขาย)
                    </label>
                    <select
                      value={salesName}
                      onChange={(e) => handleSelectSalesUser(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-red-500 outline-none"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sales Phone (เบอร์โทรฝ่ายขาย)
                    </label>
                    <input
                      type="text"
                      value={salesPhone}
                      onChange={(e) => setSalesPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-red-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sales Commission * (ค่าคอมมิชชั่นฝ่ายขาย)
                    </label>
                    <input
                      type="text"
                      required
                      value={salesCommission}
                      onChange={(e) => setSalesCommission(e.target.value)}
                      placeholder="e.g. 35,000 or 1 Month"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-red-600 focus:border-red-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 8. COMMENTS */}
            {activeSection === 'comments' && (
              <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-base font-bold text-slate-800">
                    8. Comments (ข้อคิดเห็นและหมายเหตุสัญญา)
                  </h3>
                  <span className={`text-xs font-mono ${comments.length > 450 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                    {comments.length} / 500 characters
                  </span>
                </div>

                <div>
                  <textarea
                    rows={6}
                    maxLength={500}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter any special notes, tenant requests, or contract considerations here (max 500 characters)..."
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-red-500 outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* 9. ATTACH FILES & WORD GENERATION */}
            {activeSection === 'attachments' && (
              <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-base font-bold text-slate-800">
                    9. Attach Files & Generated Word (.docx) History
                  </h3>
                  <label className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition">
                    <Upload className="w-3.5 h-3.5" />
                    Upload File
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'attachment')}
                    />
                  </label>
                </div>

                {/* Uploaded Files List */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Attached Documents (เอกสารแนบ):</h4>
                  {attachments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">
                      No additional files attached yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((att, idx) => (
                        <div
                          key={att.id || idx}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-red-500" />
                            <span className="font-semibold text-slate-800">{att.name}</span>
                            {att.size && (
                              <span className="text-slate-400 text-[11px]">
                                ({(att.size / 1024).toFixed(1)} KB)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {att.url && (
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-600 hover:text-slate-900 p-1 rounded hover:bg-slate-200"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Generated Word Document History */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 mb-2">
                    Generated Word (.docx) History (ประวัติการสร้างเอกสารสัญญา Word):
                  </h4>
                  {generatedWordFiles.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <p className="text-xs text-slate-500 mb-2">
                        {isEdit
                          ? 'Click "Download Rental Contract" or save to generate Version 1.'
                          : 'Word document will be automatically generated upon clicking Save Contract.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {generatedWordFiles.map((wf, idx) => (
                        <div
                          key={wf.id || idx}
                          className="flex items-center justify-between p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            <div>
                              <div className="font-bold text-emerald-950 flex items-center gap-2">
                                <span>Version {wf.version || generatedWordFiles.length - idx}</span>
                                <span className="text-emerald-700 font-normal">({wf.fileName})</span>
                              </div>
                              <div className="text-[11px] text-emerald-700">
                                Generated: {new Date(wf.generatedAt).toLocaleString()} • By {wf.generatedBy || 'System'}
                              </div>
                            </div>
                          </div>
                          <a
                            href={wf.url || `/api/contracts/${contract?.id}/download-docx?version=${wf.version}`}
                            download
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download .docx
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
