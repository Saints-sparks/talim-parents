/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, XCircle, Clock, CreditCard, Loader2,
  ChevronRight, AlertCircle, Building2, Smartphone, Globe,
  ShieldCheck, Lock, RefreshCw,
} from 'lucide-react';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import {
  getDueFees, initializePayment, verifyPayment,
  getPaymentProviders,
} from '../services/payments.services';
import SkeletonLoader from '../Components/SkeletonLoader';
import { toast } from '../Components/CustomToast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NGN = (n) =>
  `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STEP_LABELS = ['Select Fees', 'Choose Provider', 'Review & Confirm', 'Payment'];

const PROVIDER_META = {
  paystack: {
    name: 'Paystack',
    tagline: 'Cards, Bank Transfer, USSD',
    icon: <Building2 size={24} className="text-green-600" />,
    bg: 'bg-green-50',
    border: 'border-green-200',
    selectedBorder: 'border-green-500',
    badge: 'bg-green-100 text-green-700',
  },
  opay: {
    name: 'OPay',
    tagline: 'Wallet, Bank Transfer, Card',
    icon: <Smartphone size={24} className="text-blue-600" />,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    selectedBorder: 'border-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
  stripe: {
    name: 'Stripe',
    tagline: 'Visa, Mastercard, Amex',
    icon: <Globe size={24} className="text-purple-600" />,
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    selectedBorder: 'border-purple-500',
    badge: 'bg-purple-100 text-purple-700',
  },
};

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step, total = 3 }) {
  return (
    <div className="mb-8 overflow-x-auto pb-1">
      <div className="flex min-w-[420px] items-center gap-0">
        {STEP_LABELS.slice(0, total).map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <React.Fragment key={n}>
              <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    done
                      ? 'bg-[#003366] text-white'
                      : active
                      ? 'bg-[#003366] text-white ring-4 ring-[#003366]/20'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {done ? <CheckCircle size={16} /> : n}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-[#003366]' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < total - 1 && (
                <div className={`flex-1 h-0.5 mb-5 ${done ? 'bg-[#003366]' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1: Select Fees ──────────────────────────────────────────────────────

function SelectFeesStep({ studentId, preSelected, onNext }) {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set(preSelected || []));

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    getDueFees(studentId)
      .then((data) => {
        const list = data?.fees || data?.data || [];
        setFees(list);
        // Keep pre-selected only if they exist in the list
        if (preSelected?.length) {
          const ids = new Set(list.map((f) => f._id));
          setSelected(new Set(preSelected.filter((id) => ids.has(id))));
        }
      })
      .catch(() => toast.error('Failed to load due fees'))
      .finally(() => setLoading(false));
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === fees.length) setSelected(new Set());
    else setSelected(new Set(fees.map((f) => f._id)));
  };

  const selectedFees = fees.filter((f) => selected.has(f._id));
  const total = selectedFees.reduce((s, f) => s + (f.amount || 0), 0);

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonLoader key={i} />)}</div>;

  if (fees.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold">No outstanding fees</p>
        <p className="text-sm text-gray-400 mt-1">All fees are up to date.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{fees.length}</span> fee{fees.length !== 1 ? 's' : ''} outstanding
        </p>
        <button onClick={toggleAll} className="text-xs text-[#003366] hover:underline font-medium">
          {selected.size === fees.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="space-y-3">
        {fees.map((fee) => {
          const isSelected = selected.has(fee._id);
          const isOverdue = fee.isOverdue || (fee.dueDate && new Date(fee.dueDate) < new Date());
          return (
            <div
              key={fee._id}
              onClick={() => toggle(fee._id)}
              className={`bg-white rounded-2xl border-2 cursor-pointer transition-all p-4 ${
                isSelected ? 'border-[#003366] shadow-sm' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  readOnly
                  className="mt-1 w-4 h-4 accent-[#003366] pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{fee.feeName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{fee.category}</span>
                        {isOverdue && (
                          <span className="text-xs text-red-500 flex items-center gap-1 font-medium">
                            <AlertCircle size={10} /> Overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-[#003366]">{NGN(fee.amount)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Due {fmtDate(fee.dueDate)}</p>
                    </div>
                  </div>
                  {fee.lateFeeAmount > 0 && (
                    <p className="text-xs text-orange-500 mt-1">
                      + {NGN(fee.lateFeeAmount)} late fee applies
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected.size > 0 && (
        <div className="mt-6 bg-[#003366]/5 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">{selected.size} fee{selected.size !== 1 ? 's' : ''} selected</p>
            <p className="text-lg font-bold text-[#003366]">{NGN(total)}</p>
          </div>
          <button
            onClick={() => onNext(Array.from(selected), selectedFees)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#003366] text-white rounded-xl text-sm font-semibold hover:bg-[#003366]/90 transition"
          >
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Choose Provider ──────────────────────────────────────────────────

function ChooseProviderStep({ onNext, onBack }) {
  const [providers, setProviders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPaymentProviders()
      .then((data) => {
        const list = (data?.providers || data?.data || []).filter((p) => p.isEnabled);
        setProviders(list);
      })
      .catch(() => toast.error('Failed to load payment providers'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonLoader key={i} />)}</div>;

  if (providers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <AlertCircle size={40} className="text-orange-400 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold">No payment providers available</p>
        <p className="text-sm text-gray-400 mt-1">Please contact the school administrator.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Select how you'd like to make this payment.</p>
      <div className="space-y-3">
        {providers.map((p) => {
          const meta = PROVIDER_META[p.providerName] || {};
          const isSelected = selected === p.providerName;
          return (
            <div
              key={p.providerName}
              onClick={() => setSelected(p.providerName)}
              className={`bg-white rounded-2xl border-2 cursor-pointer transition-all p-4 flex items-center gap-4 ${
                isSelected
                  ? `${meta.selectedBorder || 'border-[#003366]'} shadow-sm`
                  : `${meta.border || 'border-gray-100'} hover:border-gray-200`
              }`}
            >
              <div className={`w-12 h-12 rounded-xl ${meta.bg || 'bg-gray-50'} flex items-center justify-center shrink-0`}>
                {meta.icon || <CreditCard size={24} className="text-gray-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{meta.name || p.providerName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{meta.tagline || 'Online payment'}</p>
              </div>
              <div className="shrink-0">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#003366] bg-[#003366]' : 'border-gray-300'}`}>
                  {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
        <Lock size={12} />
        <span>All transactions are secured and encrypted</span>
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={onBack} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
          Back
        </button>
        <button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="flex-1 py-2.5 bg-[#003366] text-white rounded-xl text-sm font-semibold hover:bg-[#003366]/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Review & Confirm ─────────────────────────────────────────────────

function ReviewStep({ selectedFees, provider, studentName, onConfirm, onBack, loading }) {
  const subtotal = selectedFees.reduce((s, f) => s + (f.amount || 0), 0);
  const lateFees = selectedFees.reduce((s, f) => s + (f.lateFeeAmount || 0), 0);
  const total = subtotal + lateFees;
  const meta = PROVIDER_META[provider] || {};

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Review your payment details before proceeding.</p>

      {/* Student */}
      <div className="bg-[#003366]/5 rounded-2xl p-4 mb-4">
        <p className="text-xs text-gray-500 mb-1">Paying for</p>
        <p className="font-semibold text-[#003366]">{studentName || 'Selected Student'}</p>
      </div>

      {/* Fee breakdown */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fee Breakdown</p>
        </div>
        <div className="divide-y divide-gray-50">
          {selectedFees.map((fee) => (
            <div key={fee._id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{fee.feeName}</p>
                <p className="text-xs text-gray-400">{fee.category}</p>
                {fee.lateFeeAmount > 0 && (
                  <p className="text-xs text-orange-500 mt-0.5">+ {NGN(fee.lateFeeAmount)} late fee</p>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-800 shrink-0">{NGN(fee.amount)}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{NGN(subtotal)}</span>
          </div>
          {lateFees > 0 && (
            <div className="flex justify-between text-sm text-orange-600">
              <span>Late Fees</span>
              <span>+ {NGN(lateFees)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-[#003366] pt-1 border-t border-gray-100">
            <span>Total</span>
            <span className="text-lg">{NGN(total)}</span>
          </div>
        </div>
      </div>

      {/* Provider */}
      <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 mb-6">
        <div className={`w-10 h-10 rounded-xl ${meta.bg || 'bg-gray-50'} flex items-center justify-center shrink-0`}>
          {meta.icon || <CreditCard size={20} className="text-gray-600" />}
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-400">Payment via</p>
          <p className="font-semibold text-gray-800">{meta.name || provider}</p>
        </div>
        <ShieldCheck size={18} className="text-green-500" />
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} disabled={loading} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-3 bg-[#003366] text-white rounded-xl text-sm font-bold hover:bg-[#003366]/90 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Processing...
            </>
          ) : (
            <>
              <Lock size={14} /> Confirm & Pay {NGN(total)}
            </>
          )}
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-3">
        You will be redirected to {meta.name || provider} to complete your payment securely.
      </p>
    </div>
  );
}

// ─── Step 4: Payment Result ───────────────────────────────────────────────────

function PaymentResult({ status, message, reference, onRetry, onDone }) {
  if (status === 'verifying') {
    return (
      <div className="py-16 text-center">
        <Loader2 size={48} className="text-[#003366] mx-auto mb-4 animate-spin" />
        <p className="font-semibold text-gray-700">Verifying your payment…</p>
        <p className="text-sm text-gray-400 mt-1">Please wait while we confirm your transaction.</p>
      </div>
    );
  }

  if (status === 'successful') {
    return (
      <div className="py-12 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-1">Payment Successful!</h3>
        <p className="text-sm text-gray-500 mb-2">{message || 'Your payment was processed successfully.'}</p>
        {reference && (
          <p className="text-xs text-gray-400 font-mono mb-6">Ref: {reference}</p>
        )}
        <button
          onClick={onDone}
          className="px-8 py-3 bg-[#003366] text-white rounded-xl font-semibold hover:bg-[#003366]/90 transition"
        >
          Back to Payments
        </button>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="py-12 text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Clock size={40} className="text-yellow-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-1">Payment Pending</h3>
        <p className="text-sm text-gray-500 mb-2">{message || 'Your payment is being processed.'}</p>
        {reference && (
          <p className="text-xs text-gray-400 font-mono mb-1">Ref: {reference}</p>
        )}
        <p className="text-xs text-gray-400 mb-6">This may take a few minutes. Your receipt will appear once confirmed.</p>
        <button
          onClick={onDone}
          className="px-8 py-3 bg-[#003366] text-white rounded-xl font-semibold hover:bg-[#003366]/90 transition"
        >
          Back to Payments
        </button>
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="py-12 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle size={40} className="text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-1">Payment Cancelled</h3>
        <p className="text-sm text-gray-500 mb-6">You cancelled the payment. No charges were made.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onDone} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            Back to Payments
          </button>
          <button onClick={onRetry} className="px-6 py-2.5 bg-[#003366] text-white rounded-xl text-sm font-semibold hover:bg-[#003366]/90">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // failed / error
  return (
    <div className="py-12 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <XCircle size={40} className="text-red-500" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-1">Payment Failed</h3>
      <p className="text-sm text-gray-500 mb-6">{message || 'Something went wrong. Please try again.'}</p>
      <div className="flex gap-3 justify-center">
        <button onClick={onDone} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
          Back to Payments
        </button>
        <button onClick={onRetry} className="px-6 py-2.5 bg-[#003366] text-white rounded-xl text-sm font-semibold hover:bg-[#003366]/90 flex items-center gap-2">
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MakePayment() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const { selectedStudent } = useSelectedStudent();

  // Payment flow state
  const [step, setStep] = useState(1);
  const [selectedFeeIds, setSelectedFeeIds] = useState(state?.feeAssignmentIds || []);
  const [selectedFees, setSelectedFees] = useState([]);
  const [provider, setProvider] = useState(null);
  const [initLoading, setInitLoading] = useState(false);

  // Verification state
  const [verifyStatus, setVerifyStatus] = useState(null); // null | 'verifying' | 'successful' | 'pending' | 'failed' | 'cancelled'
  const [verifyMessage, setVerifyMessage] = useState('');
  const [verifyRef, setVerifyRef] = useState('');

  const studentId = state?.studentId || selectedStudent?._id;
  const studentName = selectedStudent
    ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
    : 'Selected Student';

  // Handle payment callback redirect (provider redirects back with ?reference=xxx or ?status=cancelled)
  const handleCallback = useCallback(async (reference, status) => {
    if (status === 'cancelled' || status === 'cancel') {
      setVerifyStatus('cancelled');
      setStep(4);
      return;
    }
    if (!reference) {
      setVerifyStatus('failed');
      setVerifyMessage('No payment reference received.');
      setStep(4);
      return;
    }
    setVerifyRef(reference);
    setVerifyStatus('verifying');
    setStep(4);
    try {
      const data = await verifyPayment(reference);
      const txStatus = data?.status || data?.transaction?.status;
      if (txStatus === 'successful') {
        setVerifyStatus('successful');
        setVerifyMessage(data?.message || 'Your payment was confirmed.');
      } else if (txStatus === 'pending') {
        setVerifyStatus('pending');
        setVerifyMessage(data?.message || 'Payment is being processed.');
      } else {
        setVerifyStatus('failed');
        setVerifyMessage(data?.message || 'Payment could not be confirmed.');
      }
    } catch (err) {
      setVerifyStatus('failed');
      setVerifyMessage(err?.response?.data?.message || 'Verification failed. Please contact support.');
    }
  }, []);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const status = searchParams.get('status');
    if (reference || status) {
      handleCallback(reference, status);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFeesSelected = (ids, fees) => {
    setSelectedFeeIds(ids);
    setSelectedFees(fees);
    setStep(2);
  };

  const handleProviderSelected = (providerName) => {
    setProvider(providerName);
    setStep(3);
  };

  const handleConfirmPayment = async () => {
    setInitLoading(true);
    try {
      const data = await initializePayment({
        feeAssignmentIds: selectedFeeIds,
        studentId,
        providerName: provider,
      });
      const checkoutUrl = data?.checkoutUrl || data?.data?.checkoutUrl || data?.authorization_url;
      if (!checkoutUrl) throw new Error('No checkout URL returned');
      // Redirect to provider checkout
      window.location.href = checkoutUrl;
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to initialize payment. Please try again.');
      setInitLoading(false);
    }
  };

  const handleRetry = () => {
    setVerifyStatus(null);
    setVerifyRef('');
    setVerifyMessage('');
    setStep(1);
  };

  const handleDone = () => {
    navigate('/payments', { replace: true });
  };

  // Render payment result screen when verifying/done
  if (verifyStatus) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <PaymentResult
            status={verifyStatus}
            message={verifyMessage}
            reference={verifyRef}
            onRetry={handleRetry}
            onDone={handleDone}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label={step > 1 ? 'Go to previous payment step' : 'Back to payments'}
            title={step > 1 ? 'Previous step' : 'Back to payments'}
            onClick={() => (step > 1 ? setStep(step - 1) : navigate('/payments'))}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#003366]/30"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-800">Make Payment</h1>
            <p className="text-xs text-gray-400">Step {step} of 3</p>
          </div>
        </div>
        <span className="hidden shrink-0 rounded-full bg-[#003366]/10 px-3 py-1 text-xs font-semibold text-[#003366] sm:inline-flex">
          {STEP_LABELS[step - 1]}
        </span>
      </div>

      {/* Step Indicator */}
      <StepIndicator step={step} total={3} />

      {/* Step Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-800 mb-1">
          {step === 1 && 'Select Fees to Pay'}
          {step === 2 && 'Choose Payment Provider'}
          {step === 3 && 'Review & Confirm'}
        </h2>

        {step === 1 && (
          <SelectFeesStep
            studentId={studentId}
            preSelected={selectedFeeIds}
            onNext={handleFeesSelected}
          />
        )}
        {step === 2 && (
          <ChooseProviderStep
            onNext={handleProviderSelected}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <ReviewStep
            selectedFees={selectedFees}
            provider={provider}
            studentName={studentName}
            onConfirm={handleConfirmPayment}
            onBack={() => setStep(2)}
            loading={initLoading}
          />
        )}
      </div>

      {/* Security footer */}
      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
        <ShieldCheck size={13} className="text-green-500" />
        <span>256-bit SSL encryption · PCI DSS compliant</span>
      </div>
    </div>
  );
}
