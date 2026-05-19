// payments.services.js
import axios from 'axios';
import { API_BASE_URL } from './auth.services';

const getAuthConfig = () => {
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) throw new Error('No access token found');
  return { headers: { Authorization: `Bearer ${accessToken}` } };
};

// ─── Due Fees ─────────────────────────────────────────────────────────────────

export const getDueFees = async (studentId, params = {}) => {
  const qs = new URLSearchParams({ studentId, ...params }).toString();
  const res = await axios.get(`${API_BASE_URL}/payments/parent/due-fees?${qs}`, getAuthConfig());
  return res.data;
};

export const getPaymentSummary = async () => {
  const res = await axios.get(`${API_BASE_URL}/payments/parent/summary`, getAuthConfig());
  return res.data;
};

// ─── Initialize & Verify ──────────────────────────────────────────────────────

export const initializePayment = async (payload) => {
  const res = await axios.post(`${API_BASE_URL}/payments/parent/initialize`, payload, getAuthConfig());
  return res.data;
};

export const verifyPayment = async (reference) => {
  const res = await axios.get(`${API_BASE_URL}/payments/parent/verify/${reference}`, getAuthConfig());
  return res.data;
};

// ─── Payment History ──────────────────────────────────────────────────────────

export const getPaymentHistory = async (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
  ).toString();
  const res = await axios.get(`${API_BASE_URL}/payments/parent/history?${qs}`, getAuthConfig());
  return res.data;
};

// ─── Receipts ─────────────────────────────────────────────────────────────────

export const getReceipts = async (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
  ).toString();
  const res = await axios.get(`${API_BASE_URL}/payments/parent/receipts?${qs}`, getAuthConfig());
  return res.data;
};

export const getReceiptById = async (receiptId) => {
  const res = await axios.get(`${API_BASE_URL}/payments/parent/receipts/${receiptId}`, getAuthConfig());
  return res.data;
};

export const downloadReceipt = async (receiptId) => {
  const res = await axios.get(`${API_BASE_URL}/payments/parent/receipts/${receiptId}/download`, getAuthConfig());
  return res.data;
};

// ─── Payment Providers ────────────────────────────────────────────────────────

export const getPaymentProviders = async () => {
  const res = await axios.get(`${API_BASE_URL}/payments/parent/providers`, getAuthConfig());
  return res.data;
};

// ─── Verify callback (after redirect from provider) ───────────────────────────

export const verifyPaymentCallback = async (reference) => {
  return verifyPayment(reference);
};
