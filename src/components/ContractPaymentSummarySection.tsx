import React, { useState, useEffect } from 'react';
import { Contract, PaymentSchedule, PaymentRecord, User, PaymentStatus } from '../types';
import {
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Paperclip,
  Check,
  X,
  Calendar,
} from 'lucide-react';

interface ContractPaymentSummarySectionProps {
  contract: Contract;
  currentUser: User;
  onPaymentRecorded?: () => void;
}

export const ContractPaymentSummarySection: React.FC<ContractPaymentSummarySectionProps> = ({
  contract,
  currentUser,
  onPaymentRecorded,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    totalScheduled: number;
    totalPaid: number;
    totalRemaining: number;
    totalOverdue: number;
    schedulesCount: {
      total: number;
      paid: number;
      pending: number;
      overdue: number;
      partial: number;
      cancelled: number;
    };
    schedules: PaymentSchedule[];
    records: PaymentRecord[];
  } | null>(null);

  const [generating, setGenerating] = useState(false);
  const [recordingModalSchedule, setRecordingModalSchedule] = useState<PaymentSchedule | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<'Bank Transfer' | 'Cash' | 'Other'>('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [receiptFile, setReceiptFile] = useState<any>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [actionError, setActionError] = useState('');

  const contractId = contract.contractId || contract.contractNumber || contract.id;

  const fetchContractPayments = async () => {
    if (!contractId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/contracts/${contractId}/payments`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch contract payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractPayments();
  }, [contractId]);

  // Generate schedule automatically from contract terms
  const handleGenerateSchedule = async () => {
    try {
      setGenerating(true);
      const res = await fetch(`/api/contracts/${contractId}/generate-payment-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role || 'Agent',
          'x-user-name': currentUser.name || 'User',
          'x-user-id': currentUser.id || 'usr-1',
        },
      });
      const json = await res.json();
      if (json.success) {
        await fetchContractPayments();
      } else {
        alert(json.error || 'Failed to generate schedule');
      }
    } catch (err: any) {
      alert(err.message || 'Error generating schedule');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenRecord = (s: PaymentSchedule) => {
    setRecordingModalSchedule(s);
    const rem = Number(s.remainingAmount) || 0;
    setPayAmount(rem > 0 ? rem.toString() : Number(s.amount).toString());
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('Bank Transfer');
    setReferenceNo('');
    setReceiptFile(null);
    setActionError('');
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExts = ['.jpg', '.jpeg', '.png', '.pdf'];
    const name = file.name.toLowerCase();
    if (!validExts.some((ext) => name.endsWith(ext))) {
      setActionError('Only JPG, JPEG, PNG, or PDF files are allowed');
      return;
    }

    setUploadingReceipt(true);
    setActionError('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = reader.result as string;
          const res = await fetch('/api/payments/upload-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileData,
              fileType: file.type,
            }),
          });
          const resJson = await res.json();
          if (resJson.success && resJson.file) {
            setReceiptFile(resJson.file);
          } else {
            setActionError(resJson.error || 'Upload failed');
          }
        } catch (err: any) {
          setActionError(err.message || 'Upload failed');
        } finally {
          setUploadingReceipt(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setActionError(err.message || 'Failed to read file');
      setUploadingReceipt(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingModalSchedule) return;

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setActionError('Payment amount must be greater than 0');
      return;
    }

    setSubmittingPayment(true);
    setActionError('');

    try {
      const res = await fetch('/api/payments/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role || 'Agent',
          'x-user-name': currentUser.name || 'User',
          'x-user-id': currentUser.id || 'usr-1',
        },
        body: JSON.stringify({
          contractId,
          paymentScheduleId: recordingModalSchedule.id,
          paymentDate: payDate,
          amount: amt,
          paymentMethod: payMethod,
          bank: contract.landlordBank || 'Kasikorn Bank',
          accountNo: contract.landlordAccountNo || '',
          referenceNo,
          receiptFile,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Failed to record payment');
      }

      setRecordingModalSchedule(null);
      await fetchContractPayments();
      if (onPaymentRecorded) onPaymentRecorded();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const renderStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
            Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-2.5 h-2.5 text-blue-600" />
            Partial
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse">
            <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
            Overdue
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
            <X className="w-2.5 h-2.5" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-2.5 h-2.5 text-amber-600" />
            Pending
          </span>
        );
    }
  };

  const totalScheduled = data?.totalScheduled || 0;
  const totalPaid = data?.totalPaid || 0;
  const totalRemaining = data?.totalRemaining || 0;
  const totalOverdue = data?.totalOverdue || 0;
  const percentPaid = totalScheduled > 0 ? Math.min(100, Math.round((totalPaid / totalScheduled) * 100)) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              Payment Schedule & Financial Status (ตารางชำระเงินและยอดค้าง)
            </h4>
            <p className="text-[11px] text-slate-500">
              สถานะการรับชำระเงินจริงเทียบกับสัญญา B22
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(!data?.schedules || data.schedules.length === 0) && (
            <button
              onClick={handleGenerateSchedule}
              disabled={generating}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-sm transition"
            >
              <RefreshCw className={`w-3 h-3 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'กำลังสร้าง...' : 'สร้างรอบชำระจากสัญญา (Generate)'}
            </button>
          )}
          <button
            onClick={fetchContractPayments}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition"
            title="Refresh payments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {totalScheduled > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="font-semibold text-slate-600">
              Payment Completion: <strong className="text-slate-900">{percentPaid}%</strong>
            </span>
            <span className="text-slate-500">
              ฿{totalPaid.toLocaleString()} / ฿{totalScheduled.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${percentPaid}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary 4 Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Expected</span>
          <span className="font-mono font-bold text-slate-900 text-sm">
            ฿{totalScheduled.toLocaleString()}
          </span>
        </div>
        <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
          <span className="text-emerald-700 block text-[10px] uppercase font-bold">Total Received</span>
          <span className="font-mono font-bold text-emerald-600 text-sm">
            ฿{totalPaid.toLocaleString()}
          </span>
        </div>
        <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
          <span className="text-amber-700 block text-[10px] uppercase font-bold">Remaining Due</span>
          <span className="font-mono font-bold text-amber-600 text-sm">
            ฿{totalRemaining.toLocaleString()}
          </span>
        </div>
        <div className={`p-2.5 rounded-lg border ${totalOverdue > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
          <span className={`block text-[10px] uppercase font-bold ${totalOverdue > 0 ? 'text-red-700' : 'text-slate-400'}`}>
            Overdue Balance
          </span>
          <span className={`font-mono font-bold text-sm ${totalOverdue > 0 ? 'text-red-600' : 'text-slate-700'}`}>
            ฿{totalOverdue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Schedules List */}
      <div className="space-y-2">
        <h5 className="font-bold text-slate-800 text-xs">
          Schedule Items ({data?.schedules?.length || 0})
        </h5>

        {loading ? (
          <div className="py-6 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-300" />
            Loading schedules...
          </div>
        ) : !data?.schedules || data.schedules.length === 0 ? (
          <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 space-y-2">
            <p>ยังไม่มีรายการกำหนดชำระเงินสำหรับสัญญานี้</p>
            <button
              onClick={handleGenerateSchedule}
              disabled={generating}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition"
            >
              + สร้างกำหนดชำระอัตโนมัติ (เงินประกัน, ค่าเช่าล่วงหน้า, ค่าเช่ารายเดือน)
            </button>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {data.schedules.map((s) => {
              const amt = Number(s.amount) || 0;
              const paid = Number(s.paidAmount) || 0;
              const rem = Math.max(0, amt - paid);
              return (
                <div key={s.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{s.title}</span>
                      {renderStatusBadge(s.status)}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Due: <strong className="text-slate-700 font-mono">{s.dueDate}</strong></span>
                      <span>•</span>
                      <span>Total: <strong className="text-slate-900 font-mono">฿{amt.toLocaleString()}</strong></span>
                      <span>•</span>
                      <span>Paid: <strong className="text-emerald-600 font-mono">฿{paid.toLocaleString()}</strong></span>
                      {rem > 0 && (
                        <>
                          <span>•</span>
                          <span>Remaining: <strong className="text-amber-600 font-mono">฿{rem.toLocaleString()}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    {s.status !== 'Paid' && s.status !== 'Cancelled' && (
                      <button
                        onClick={() => handleOpenRecord(s)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-sm transition"
                      >
                        รับชำระ
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record Payment Submodal */}
      {recordingModalSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-5 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
              <h4 className="font-bold text-slate-900">
                Record Payment: {recordingModalSchedule.title}
              </h4>
              <button
                onClick={() => setRecordingModalSchedule(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-[11px]">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Amount (฿) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="Bank Transfer">โอนเงิน (Bank Transfer)</option>
                  <option value="Cash">เงินสด (Cash)</option>
                  <option value="Other">อื่นๆ (Other)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Reference / Slip No.</label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. 20260924XXXX"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Receipt / Proof (JPG, PNG, PDF)
                </label>
                {receiptFile ? (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] flex justify-between items-center">
                    <span className="truncate">{receiptFile.fileName}</span>
                    <button
                      type="button"
                      onClick={() => setReceiptFile(null)}
                      className="text-red-500 ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleReceiptUpload}
                    disabled={uploadingReceipt}
                    className="text-xs"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordingModalSchedule(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment || uploadingReceipt}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700"
                >
                  {submittingPayment ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
