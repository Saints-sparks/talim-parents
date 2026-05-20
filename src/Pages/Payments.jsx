/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, CheckCircle, Clock, CreditCard, Download, Eye,
  FileText, RefreshCw, ArrowRight, Filter, ChevronDown, TrendingUp,
  Receipt, Wallet, Phone,
} from 'lucide-react';
import { useSelectedStudent } from '../contexts/SelectedStudentContext';
import {
  getDueFees, getPaymentHistory, getReceipts, getPaymentSummary, getPaymentProviders,
} from '../services/payments.services';
import SkeletonLoader from '../Components/SkeletonLoader';
import { toast } from '../Components/CustomToast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NGN = (n) =>
  `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const PROVIDERS = {
  paystack: { name: 'Paystack', color: 'text-green-600', bg: 'bg-green-50', channels: 'Cards, Bank Transfer, USSD' },
  opay: { name: 'OPay', color: 'text-blue-600', bg: 'bg-blue-50', channels: 'Wallet, Transfer, Card' },
  stripe: { name: 'Stripe', color: 'text-purple-600', bg: 'bg-purple-50', channels: 'Card (Visa, Mastercard)' },
};

function StatusBadge({ status }) {
  const map = {
    overdue: 'bg-red-100 text-red-600',
    due: 'bg-orange-100 text-orange-600',
    pending: 'bg-yellow-100 text-yellow-700',
    successful: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-600',
    cancelled: 'bg-gray-100 text-gray-500',
    partial: 'bg-blue-100 text-blue-600',
    issued: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, color = 'text-[#003366]', onClick }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 p-5 flex gap-4 items-start shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      {Icon && (
        <div className="w-11 h-11 rounded-xl bg-[#E8EDF3] flex items-center justify-center shrink-0">
          <Icon size={20} className="text-[#003366]" />
        </div>
      )}
      <div className="min-w-0">
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        <p className="text-sm text-gray-600 font-medium">{label}</p>
        {sub && (
          <button className="mt-1 text-xs text-[#003366] flex items-center gap-1 hover:underline">
            {sub} <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Due Fees Tab ─────────────────────────────────────────────────────────────

function DueFeesTab({ fees, loading, studentId, onRefresh }) {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalSelected = fees
    .filter((f) => selectedIds.has(f._id))
    .reduce((s, f) => s + f.amount, 0);

  const handlePaySelected = () => {
    if (selectedIds.size === 0) return toast.error('Select at least one fee');
    navigate('/payments/pay', { state: { feeAssignmentIds: Array.from(selectedIds), studentId } });
  };

  const handlePayAll = () => {
    navigate('/payments/pay', { state: { feeAssignmentIds: fees.map((f) => f._id), studentId } });
  };

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonLoader key={i} />)}</div>;

  if (fees.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
        <p className="text-gray-700 font-semibold">All fees are paid!</p>
        <p className="text-sm text-gray-400 mt-1">No outstanding fees for this child.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{fees.length}</span> fee{fees.length !== 1 ? 's' : ''} outstanding
        </p>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handlePaySelected}
              className="px-4 py-2 text-sm bg-[#003366] text-white rounded-xl font-medium hover:bg-[#003366]/90"
            >
              Pay Selected ({NGN(totalSelected)})
            </button>
          )}
          <button
            onClick={handlePayAll}
            className="px-4 py-2 text-sm border-2 border-[#003366] text-[#003366] rounded-xl font-medium hover:bg-[#003366]/5"
          >
            Pay All
          </button>
        </div>
      </div>

      {fees.map((fee) => (
        <div
          key={fee._id}
          className={`bg-white rounded-2xl border-2 transition-all ${
            selectedIds.has(fee._id) ? 'border-[#003366]' : 'border-gray-100'
          } p-5`}
        >
          <div className="flex items-start gap-4">
            <input
              type="checkbox"
              checked={selectedIds.has(fee._id)}
              onChange={() => toggle(fee._id)}
              className="mt-1 w-4 h-4 accent-[#003366]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800">{fee.feeName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={fee.status} />
                    <span className="text-xs text-gray-400">{fee.category}</span>
                    {fee.isOverdue && (
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={11} /> Overdue
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#003366] text-lg">{NGN(fee.amount)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-xs text-gray-400">Due Date</p>
                  <p className="text-sm font-medium text-gray-700">{fmtDate(fee.dueDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedId(expandedId === fee._id ? null : fee._id)}
                    className="text-xs text-[#003366] flex items-center gap-1 hover:underline"
                  >
                    View Breakdown <ChevronDown size={12} className={expandedId === fee._id ? 'rotate-180' : ''} />
                  </button>
                  <button
                    onClick={() => navigate('/payments/pay', { state: { feeAssignmentIds: [fee._id], studentId } })}
                    className="px-4 py-1.5 bg-[#003366] text-white text-sm rounded-xl font-medium hover:bg-[#003366]/90"
                  >
                    Pay Now
                  </button>
                </div>
              </div>

              {expandedId === fee._id && (
                <div className="mt-3 bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>Fee Amount</span><span className="font-medium">{NGN(fee.amount)}</span>
                  </div>
                  {fee.lateFeeAmount > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>Late Fee</span><span className="font-medium">{NGN(fee.lateFeeAmount)}</span>
                    </div>
                  )}
                  {fee.description && (
                    <p className="text-xs text-gray-400 mt-1 pt-1 border-t border-gray-200">{fee.description}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Paid History Tab ──────────────────────────────────────────────────────────

function PaidHistoryTab({ history, loading }) {
  const { data: txns = [] } = history || {};

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonLoader key={i} />)}</div>;

  if (txns.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <Clock size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-semibold">No payment history yet</p>
        <p className="text-sm text-gray-400 mt-1">Your payments will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Date</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Fee Item</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Amount (₦)</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Payment Method</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Receipt No.</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Status</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {txns.map((txn) => (
            <tr key={txn._id} className="hover:bg-gray-50/50">
              <td className="px-5 py-3 text-gray-500">{fmtDate(txn.paidAt || txn.createdAt)}</td>
              <td className="px-5 py-3 font-medium text-gray-800">
                {txn.feeAssignmentIds?.length > 1 ? `${txn.feeAssignmentIds.length} items` : 'Fee Payment'}
              </td>
              <td className="px-5 py-3 font-semibold text-[#003366]">{NGN(txn.totalAmount)}</td>
              <td className="px-5 py-3 text-gray-500 capitalize">{txn.providerName || '—'}</td>
              <td className="px-5 py-3 text-gray-500 font-mono text-xs">{txn.internalReference}</td>
              <td className="px-5 py-3"><StatusBadge status={txn.status} /></td>
              <td className="px-5 py-3">
                <button className="text-[#003366] hover:underline text-xs flex items-center gap-1">
                  <Eye size={12} /> View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Receipts Tab ─────────────────────────────────────────────────────────────

function ReceiptsTab({ receipts, loading, onViewReceipt }) {
  const { data: receiptList = [] } = receipts || {};

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonLoader key={i} />)}</div>;

  if (receiptList.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <FileText size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-semibold">No receipts yet</p>
        <p className="text-sm text-gray-400 mt-1">Receipts will appear here after successful payments.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Receipt No.</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Amount Paid</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Payment Date</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Method</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Status</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {receiptList.map((r) => (
            <tr key={r._id} className="hover:bg-gray-50/50">
              <td className="px-5 py-3 font-mono text-xs font-semibold text-[#003366]">{r.receiptNumber}</td>
              <td className="px-5 py-3 font-semibold text-gray-800">{NGN(r.totalPaid)}</td>
              <td className="px-5 py-3 text-gray-500">{fmtDate(r.paymentDate)}</td>
              <td className="px-5 py-3 text-gray-500 capitalize">{r.paymentProvider || r.paymentMethod || '—'}</td>
              <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewReceipt(r)}
                    className="text-[#003366] hover:underline text-xs flex items-center gap-1"
                  >
                    <Eye size={12} /> View
                  </button>
                  <button className="text-gray-500 hover:text-[#003366] text-xs flex items-center gap-1">
                    <Download size={12} /> Download
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Payment Methods Tab ──────────────────────────────────────────────────────

function PaymentMethodsTab() {
  const providers = [
    {
      key: 'paystack',
      name: 'Paystack',
      desc: 'Pay with card or bank transfer',
      channels: 'Cards (Visa, Mastercard), Bank Transfer, USSD',
      icon: '🏦',
      color: 'border-green-200 bg-green-50',
      available: true,
      note: 'Most popular in Nigeria',
    },
    {
      key: 'opay',
      name: 'OPay',
      desc: 'Pay with OPay wallet or transfer',
      channels: 'OPay Wallet, Bank Transfer, Card',
      icon: '📱',
      color: 'border-blue-200 bg-blue-50',
      available: true,
      note: 'Fast and convenient',
    },
    {
      key: 'stripe',
      name: 'Stripe',
      desc: 'Pay with card (Visa, Mastercard)',
      channels: 'Credit/Debit Card',
      icon: '💳',
      color: 'border-purple-200 bg-purple-50',
      available: true,
      note: 'International cards supported',
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Select your preferred payment method when making a payment. All payments are secured and encrypted.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {providers.map((p) => (
          <div key={p.key} className={`rounded-2xl border-2 p-5 ${p.color}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{p.icon}</span>
              <div>
                <p className="font-semibold text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500">{p.desc}</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600">
              <p><span className="font-medium">Channels:</span> {p.channels}</p>
              <p className="text-gray-400 italic">{p.note}</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-green-600 font-medium">Available</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-800 border border-blue-100">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">100% Secure Payments</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Your payment information is safe. We do not store card details. All transactions are processed securely through certified payment gateways.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt Modal ─────────────────────────────────────────────────────────────

function ReceiptModal({ receipt, onClose, school }) {
  if (!receipt) return null;

  const amountInWords = (n) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const convert = (num) => {
      if (num < 20) return ones[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
      if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convert(num % 100) : '');
      if (num < 1000000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
      return convert(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + convert(num % 1000000) : '');
    };
    return convert(Math.round(n)) + ' Naira Only';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Receipt Header */}
        <div className="bg-[#003366] text-white p-6 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-lg uppercase tracking-wide">
                {school?.name || 'Easy Sparks Education Center'}
              </p>
              <p className="text-blue-200 text-xs mt-1">{school?.address || '12 Adewale Avenue, Ikeja, Lagos, Nigeria'}</p>
              <p className="text-blue-200 text-xs">{school?.phone} | {school?.email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-200">School Fees Receipt</p>
              <div className="mt-1 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                ✓ Payment Successful
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Transaction Info */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4 text-sm">
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-gray-500 w-32">Receipt No.</span>
                <span className="font-bold text-[#003366]">{receipt.receiptNumber}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-32">Transaction Ref.</span>
                <span className="font-medium text-xs">{receipt.transactionReference}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-32">Payment Date</span>
                <span className="font-medium">{fmtDate(receipt.paymentDate)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="text-gray-500 w-32">Payment Method</span>
                <span className="font-medium capitalize">{receipt.paymentProvider}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 w-32">Payment Status</span>
                <span className="font-semibold text-green-600">Successful</span>
              </div>
            </div>
          </div>

          {/* Fee Items */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fee Breakdown</p>
            <table className="w-full text-sm">
              <thead className="bg-[#003366] text-white">
                <tr>
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Fee Item</th>
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-right px-3 py-2">Amount (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(receipt.feeItems || []).map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{item.feeName}</td>
                    <td className="px-3 py-2 text-gray-500">{item.category}</td>
                    <td className="px-3 py-2 text-right">{NGN(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-between items-start">
            <div className="bg-blue-50 rounded-xl p-3 text-sm">
              <p className="text-gray-500 text-xs mb-1">Amount in Words</p>
              <p className="font-semibold text-gray-700 italic">{amountInWords(receipt.totalPaid)}</p>
            </div>
            <div className="space-y-1 text-sm text-right">
              <div className="flex justify-between gap-12">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{NGN(receipt.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-12">
                <span className="text-gray-500">Late Fee</span>
                <span className="font-medium">{NGN(receipt.lateFee)}</span>
              </div>
              <div className="flex justify-between gap-12 pt-1 border-t border-gray-200">
                <span className="font-bold text-gray-800">Total Paid</span>
                <span className="font-bold text-green-600 text-base">{NGN(receipt.totalPaid)}</span>
              </div>
            </div>
          </div>

          {/* Verification Code */}
          {receipt.verificationCode && (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Verification Code</p>
                <p className="font-mono font-bold text-[#003366]">{receipt.verificationCode}</p>
              </div>
              <div className="text-xs text-gray-400">Scan QR to verify online</div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50"
            >
              Close
            </button>
            <button className="px-4 py-2 text-sm bg-[#003366] text-white rounded-xl font-medium flex items-center gap-2 hover:bg-[#003366]/90">
              <Download size={14} /> Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Payments Page ────────────────────────────────────────────────────────

const TABS = ['Due Fees', 'Paid History', 'Receipts', 'Payment Methods'];

export default function Payments() {
  const navigate = useNavigate();
  const { selectedStudent } = useSelectedStudent();
  const [activeTab, setActiveTab] = useState('Due Fees');
  const [fees, setFees] = useState([]);
  const [history, setHistory] = useState(null);
  const [receipts, setReceipts] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingFees, setLoadingFees] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [viewReceipt, setViewReceipt] = useState(null);

  const studentId = selectedStudent?.childId || selectedStudent?._id;

  const loadAll = useCallback(async () => {
    if (!studentId) return;
    setLoadingFees(true); setLoadingHistory(true); setLoadingReceipts(true);
    try {
      const [f, h, r, s] = await Promise.all([
        getDueFees(studentId).catch(() => []),
        getPaymentHistory({ studentId }).catch(() => ({ data: [], total: 0 })),
        getReceipts({ studentId }).catch(() => ({ data: [], total: 0 })),
        getPaymentSummary().catch(() => null),
      ]);
      setFees(Array.isArray(f) ? f : f?.data || []);
      setHistory(h);
      setReceipts(r);
      setSummary(s);
    } finally {
      setLoadingFees(false); setLoadingHistory(false); setLoadingReceipts(false);
    }
  }, [studentId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const dueFeesBadge = fees.filter((f) => f.status !== 'paid').length;
  const totalOutstanding = fees.reduce((s, f) => s + f.amount, 0);
  const overdueAmount = fees.filter((f) => f.isOverdue).reduce((s, f) => s + f.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 font-manrope">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            View outstanding fees, make payments and manage receipts.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Outstanding"
            value={NGN(totalOutstanding)}
            sub="View Due Fees"
            icon={Wallet}
            color="text-[#003366]"
            onClick={() => setActiveTab('Due Fees')}
          />
          <StatCard
            label="Total Paid"
            value={NGN(summary?.totalPaid || 0)}
            sub="View Payment History"
            icon={CheckCircle}
            color="text-green-600"
            onClick={() => setActiveTab('Paid History')}
          />
          <StatCard
            label="Total Receipts"
            value={summary?.totalReceipts ?? '—'}
            sub="View Receipts"
            icon={Receipt}
            onClick={() => setActiveTab('Receipts')}
          />
          <StatCard
            label="Overdue Amount"
            value={NGN(overdueAmount)}
            sub="View Overdue"
            icon={AlertCircle}
            color={overdueAmount > 0 ? 'text-red-500' : 'text-gray-600'}
          />
        </div>

        {/* Children row (if summary has per-child data) */}
        {selectedStudent && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Children</p>
            <div className="flex items-center gap-3 p-3 border-2 border-[#003366] rounded-xl bg-[#003366]/5 w-fit">
              <div className="w-9 h-9 rounded-full bg-orange-400 flex items-center justify-center text-white text-sm font-bold">
                {(selectedStudent.firstName?.[0] || 'S').toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </p>
                <p className="text-xs text-gray-500">{selectedStudent.className}</p>
              </div>
              <div className="ml-2">
                <p className="text-xs text-gray-400">Outstanding</p>
                <p className="text-sm font-bold text-[#003366]">{NGN(totalOutstanding)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab
                  ? 'border-[#003366] text-[#003366]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'Due Fees' && dueFeesBadge > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {dueFeesBadge}
                </span>
              )}
            </button>
          ))}
          <div className="ml-auto flex items-center">
            <button className="flex items-center gap-1 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
              <Filter size={14} /> Filters
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'Due Fees' && (
          <DueFeesTab fees={fees} loading={loadingFees} studentId={studentId} onRefresh={loadAll} />
        )}
        {activeTab === 'Paid History' && (
          <PaidHistoryTab history={history} loading={loadingHistory} />
        )}
        {activeTab === 'Receipts' && (
          <ReceiptsTab receipts={receipts} loading={loadingReceipts} onViewReceipt={setViewReceipt} />
        )}
        {activeTab === 'Payment Methods' && <PaymentMethodsTab />}

        {/* Having issues */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700">Having issues with your payment?</p>
              <p className="text-xs text-gray-500">
                If you have made a payment and it is not reflected, kindly contact the school bursary or support team.
              </p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm text-[#003366] border border-[#003366]/30 rounded-xl px-3 py-2 hover:bg-[#003366]/5 whitespace-nowrap">
            <Phone size={14} /> Contact Support
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {viewReceipt && (
        <ReceiptModal receipt={viewReceipt} onClose={() => setViewReceipt(null)} />
      )}
    </div>
  );
}
