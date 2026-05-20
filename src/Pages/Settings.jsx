import React, { useEffect, useState, useRef } from "react";
import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  Globe,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Moon,
  Phone,
  Shield,
  ShieldCheck,
  Sun,
  SunMoon,
  User,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth, API_BASE_URL } from "../services/auth.services";
import { Avatar, AvatarFallback, AvatarImage } from "../lib/ui/avatar";
import { toast } from "../Components/CustomToast";
import {
  getParentSettings,
  updateParentSettingsProfile,
  changeParentPassword,
  sendPhoneChangeOtp,
  verifyPhoneChangeOtp,
  updateNotificationPreferences,
  updateThemePreference,
} from "../services/settings.services";

const CLOUDINARY_CLOUD_NAME = "ddbs7m7nt";
const CLOUDINARY_UPLOAD_PRESET = "presetOne";

const APP_VERSION = "2.0.0";

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "P";

function SettingsRow({ icon, label, description, onClick, badge, disabled }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#EEF2F7] px-4 py-4 text-left last:border-b-0 hover:bg-[#F8FAFD] disabled:cursor-default disabled:opacity-60"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F8FF] text-[#0A4EA3]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#101828]">{label}</p>
        {description && (
          <p className="mt-0.5 truncate text-xs text-[#667085]">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="rounded-full bg-[#ECFDF3] px-2 py-0.5 text-xs font-bold text-[#067647]">
            {badge}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-[#98A2B3]" />
      </div>
    </button>
  );
}

function ModalShell({ title, onClose, children, maxWidth = "max-w-md" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${maxWidth} rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-[#EEF2F7] px-6 py-4">
          <h2 className="text-base font-bold text-[#101828]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#667085] hover:bg-[#F4F8FF]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ id, label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-[#344054]" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-[#DCE5F2] bg-white px-4 pr-10 text-sm text-[#101828] placeholder:text-[#98A2B3] focus:border-[#0A4EA3] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085]"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function EditProfileModal({ profile, onClose, onSave }) {
  const { authToken, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ fullName: profile?.fullName || "" });
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar;

      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);
        fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: fd },
        );
        const data = await res.json();
        if (!res.ok || !data.secure_url) throw new Error(data?.error?.message || "Upload failed");
        avatarUrl = data.secure_url;

        await fetch(`${API_BASE_URL}/auth/profile/avatar`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ avatarUrl }),
        });
        updateUser({ userAvatar: avatarUrl });
      }

      await onSave({ fullName: form.fullName.trim(), avatar: avatarUrl });
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Edit Profile" onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5">
        <div className="flex justify-center">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-[#DCE5F2]">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} alt="Avatar" />
              ) : (
                <AvatarFallback className="bg-[#F5E9E2] text-xl font-bold text-[#7A4B33]">
                  {getInitials(form.fullName || profile?.fullName)}
                </AvatarFallback>
              )}
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#DCE5F2] bg-white text-[#0A4EA3] shadow-sm hover:bg-[#F4F8FF]"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#344054]" htmlFor="edit-fullname">
              Full Name
            </label>
            <input
              id="edit-fullname"
              type="text"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              placeholder="Enter your full name"
              className="h-11 w-full rounded-lg border border-[#DCE5F2] bg-white px-4 text-sm text-[#101828] placeholder:text-[#98A2B3] focus:border-[#0A4EA3] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#344054]">
              Email Address
            </label>
            <input
              type="email"
              value={profile?.email || ""}
              readOnly
              className="h-11 w-full cursor-not-allowed rounded-lg border border-[#EEF2F7] bg-[#F9FAFB] px-4 text-sm text-[#98A2B3]"
            />
            <p className="mt-1 text-xs text-[#667085]">Email is managed by your school</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#344054]">
              Phone Number
            </label>
            <input
              type="tel"
              value={profile?.phoneNumber || ""}
              readOnly
              className="h-11 w-full cursor-not-allowed rounded-lg border border-[#EEF2F7] bg-[#F9FAFB] px-4 text-sm text-[#98A2B3]"
            />
            <p className="mt-1 text-xs text-[#667085]">Use "Change Phone Number" to update</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#DCE5F2] bg-white px-5 text-sm font-semibold text-[#344054] hover:bg-[#F8FAFD]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-lg bg-[#0A4EA3] px-5 text-sm font-bold text-white hover:bg-[#083D82] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await changeParentPassword(form);
      toast.success("Password updated successfully");
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Change Password" onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <PasswordInput
          id="cp-current"
          label="Current Password"
          value={form.currentPassword}
          onChange={set("currentPassword")}
          placeholder="Enter current password"
        />
        <PasswordInput
          id="cp-new"
          label="New Password"
          value={form.newPassword}
          onChange={set("newPassword")}
          placeholder="Min 8 chars, upper/lower/digit/special"
        />
        <PasswordInput
          id="cp-confirm"
          label="Confirm New Password"
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          placeholder="Re-enter new password"
        />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#DCE5F2] bg-white px-5 text-sm font-semibold text-[#344054] hover:bg-[#F8FAFD]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-lg bg-[#0A4EA3] px-5 text-sm font-bold text-white hover:bg-[#083D82] disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ChangePhoneModal({ currentPhone, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPhoneChangeOtp({ newPhoneNumber: newPhone });
      toast.success("OTP sent to your registered email");
      setStep(2);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyPhoneChangeOtp({ newPhoneNumber: newPhone, otp });
      toast.success("Phone number updated successfully");
      onSuccess(newPhone);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Change Phone Number" onClose={onClose}>
      <div className="px-6 py-5">
        <div className="mb-4 flex gap-2">
          {[1, 2].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                step >= n ? "bg-[#0A4EA3]" : "bg-[#E5EAF2]"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <p className="text-sm text-[#667085]">
              Current: <span className="font-semibold text-[#101828]">{currentPhone || "Not set"}</span>
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#344054]" htmlFor="new-phone">
                New Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
                <input
                  id="new-phone"
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+234 801 234 5678"
                  required
                  className="h-11 w-full rounded-lg border border-[#DCE5F2] bg-white pl-9 pr-4 text-sm text-[#101828] placeholder:text-[#98A2B3] focus:border-[#0A4EA3] focus:outline-none"
                />
              </div>
              <p className="mt-1 text-xs text-[#667085]">An OTP will be sent to your registered email</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-lg border border-[#DCE5F2] bg-white px-5 text-sm font-semibold text-[#344054] hover:bg-[#F8FAFD]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !newPhone.trim()}
                className="h-10 rounded-lg bg-[#0A4EA3] px-5 text-sm font-bold text-white hover:bg-[#083D82] disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="rounded-lg bg-[#EEF6FF] p-3 text-sm text-[#0A4EA3]">
              OTP sent to your registered email. Enter the 6-digit code below.
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#344054]" htmlFor="otp-input">
                6-Digit OTP
              </label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter OTP"
                required
                className="h-11 w-full rounded-lg border border-[#DCE5F2] bg-white px-4 text-center text-lg font-bold tracking-widest text-[#101828] placeholder:text-[#98A2B3] focus:border-[#0A4EA3] focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(""); }}
                className="h-10 rounded-lg border border-[#DCE5F2] bg-white px-5 text-sm font-semibold text-[#344054] hover:bg-[#F8FAFD]"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="h-10 rounded-lg bg-[#0A4EA3] px-5 text-sm font-bold text-white hover:bg-[#083D82] disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify & Update"}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalShell>
  );
}

const NOTIFICATION_FIELDS = [
  { key: "attendanceAlerts", label: "Attendance Alerts", description: "Get notified about your child's attendance" },
  { key: "academicUpdates", label: "Academic Updates", description: "Receive updates on results and grades" },
  { key: "schoolAnnouncements", label: "School Announcements", description: "Important announcements from school" },
  { key: "messages", label: "Messages", description: "Get notified about new messages" },
  { key: "paymentReminders", label: "Payment Reminders", description: "Fee due dates and payment confirmations" },
  { key: "feeDueDateReminders", label: "Fee Due Date Reminders", description: "Reminders before fee deadlines" },
  { key: "resultsPublishedAlerts", label: "Results Published", description: "When academic results are released" },
  { key: "leaveRequestUpdates", label: "Leave Request Updates", description: "Status updates on leave requests" },
];

function NotificationPreferencesModal({ notifications, onClose, onSave }) {
  const [prefs, setPrefs] = useState({ ...notifications });
  const [saving, setSaving] = useState(false);

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(prefs);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Notification Preferences" onClose={onClose} maxWidth="max-w-lg">
      <div className="px-6 py-5">
        <div className="space-y-3">
          {NOTIFICATION_FIELDS.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-[#EEF2F7] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#101828]">{label}</p>
                <p className="text-xs text-[#667085]">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(key)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  prefs[key] ? "bg-[#0A4EA3]" : "bg-[#D0D5DD]"
                }`}
                role="switch"
                aria-checked={prefs[key]}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                    prefs[key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#DCE5F2] bg-white px-5 text-sm font-semibold text-[#344054] hover:bg-[#F8FAFD]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-10 rounded-lg bg-[#0A4EA3] px-5 text-sm font-bold text-white hover:bg-[#083D82] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

const THEME_OPTIONS = [
  { value: "light", label: "Light Mode", icon: <Sun className="h-5 w-5" /> },
  { value: "dark", label: "Dark Mode", icon: <Moon className="h-5 w-5" /> },
  { value: "system", label: "System Default", icon: <SunMoon className="h-5 w-5" /> },
];

function ThemePreferenceModal({ currentTheme, onClose, onSave }) {
  const [selected, setSelected] = useState(currentTheme || "system");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Theme Preference" onClose={onClose}>
      <div className="px-6 py-5">
        <div className="space-y-3">
          {THEME_OPTIONS.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelected(value)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                selected === value
                  ? "border-[#0A4EA3] bg-[#EEF6FF]"
                  : "border-[#EEF2F7] hover:bg-[#F8FAFD]"
              }`}
            >
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                  selected === value ? "bg-[#0A4EA3] text-white" : "bg-[#F4F8FF] text-[#0A4EA3]"
                }`}
              >
                {icon}
              </span>
              <span className="text-sm font-semibold text-[#101828]">{label}</span>
              {selected === value && (
                <Check className="ml-auto h-4 w-4 text-[#0A4EA3]" />
              )}
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#DCE5F2] bg-white px-5 text-sm font-semibold text-[#344054] hover:bg-[#F8FAFD]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-10 rounded-lg bg-[#0A4EA3] px-5 text-sm font-bold text-white hover:bg-[#083D82] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Preference"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function HelpSupportModal({ onClose }) {
  return (
    <ModalShell title="Help & Support" onClose={onClose}>
      <div className="px-6 py-5 space-y-4">
        <div className="rounded-xl border border-[#EEF2F7] bg-[#F8FAFD] p-4">
          <p className="text-sm font-bold text-[#101828]">School Support</p>
          <p className="mt-1 text-sm text-[#667085]">
            For issues related to your child's records, attendance, or grades, contact your
            school administrator directly.
          </p>
        </div>
        <div className="rounded-xl border border-[#EEF2F7] bg-[#F8FAFD] p-4">
          <p className="text-sm font-bold text-[#101828]">Talim Support</p>
          <p className="mt-1 text-sm text-[#667085]">
            For app-related issues or account questions, reach out via:
          </p>
          <p className="mt-2 text-sm font-semibold text-[#0A4EA3]">support@mytalim.com</p>
        </div>
        <div className="rounded-lg bg-[#EEF6FF] p-4 text-sm text-[#0A4EA3]">
          <p className="font-semibold">Response times are typically 24–48 hours on business days.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full h-10 rounded-lg bg-[#0A4EA3] text-sm font-bold text-white hover:bg-[#083D82]"
        >
          Got it
        </button>
      </div>
    </ModalShell>
  );
}

function AboutTalimModal({ onClose }) {
  return (
    <ModalShell title="About Talim" onClose={onClose}>
      <div className="px-6 py-5 space-y-4">
        <div className="flex flex-col items-center py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#003366] text-white text-2xl font-black shadow-md">
            T
          </div>
          <h3 className="mt-3 text-xl font-black text-[#101828]">Talim</h3>
          <p className="text-sm text-[#667085]">School Management Platform</p>
          <span className="mt-2 rounded-full bg-[#EEF6FF] px-3 py-1 text-xs font-bold text-[#0A4EA3]">
            Version {APP_VERSION}
          </span>
        </div>

        <div className="divide-y divide-[#EEF2F7] rounded-xl border border-[#EEF2F7]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-[#667085]">Version</span>
            <span className="text-sm font-bold text-[#101828]">{APP_VERSION}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-[#667085]">Platform</span>
            <span className="text-sm font-bold text-[#101828]">Parent Portal</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-[#667085]">Support</span>
            <span className="text-sm font-bold text-[#0A4EA3]">support@mytalim.com</span>
          </div>
        </div>

        <p className="text-center text-xs text-[#98A2B3]">
          © {new Date().getFullYear()} Talim. All rights reserved.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full h-10 rounded-lg border border-[#DCE5F2] bg-white text-sm font-semibold text-[#344054] hover:bg-[#F8FAFD]"
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}

function SettingsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-8 w-32 rounded-lg bg-[#EEF2F7]" />
        <div className="mt-2 h-4 w-72 rounded-lg bg-[#EEF2F7]" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-[#E5EAF2] bg-white p-5 shadow-sm">
            <div className="h-5 w-40 rounded bg-[#EEF2F7]" />
            <div className="mt-4 space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-12 rounded-lg bg-[#F4F8FF]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const MODALS = {
  editProfile: "editProfile",
  changePassword: "changePassword",
  changePhone: "changePhone",
  notifications: "notifications",
  theme: "theme",
  help: "help",
  about: "about",
};

export default function Settings() {
  const { user: authUser, updateUser, logout } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);

  const closeModal = () => setActiveModal(null);

  const fetchSettings = async () => {
    try {
      const data = await getParentSettings();
      setSettings(data);
    } catch (err) {
      toast.error("Could not load settings. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const profile = settings?.profile || {};
  const children = settings?.children || [];
  const notifications = settings?.preferences?.notifications || {};
  const theme = settings?.preferences?.theme || "system";

  const handleSaveProfile = async (payload) => {
    const result = await updateParentSettingsProfile(payload);
    if (result?.profile?.fullName) {
      const parts = result.profile.fullName.split(" ");
      updateUser({ firstName: parts[0], lastName: parts.slice(1).join(" ") });
    }
    if (payload.avatar) updateUser({ userAvatar: payload.avatar });
    toast.success("Profile updated successfully");
    await fetchSettings();
    closeModal();
  };

  const handlePhoneSuccess = (newPhone) => {
    setSettings((s) =>
      s ? { ...s, profile: { ...s.profile, phoneNumber: newPhone } } : s,
    );
    updateUser({ phoneNumber: newPhone });
  };

  const handleSaveNotifications = async (prefs) => {
    await updateNotificationPreferences(prefs);
    setSettings((s) =>
      s ? { ...s, preferences: { ...s.preferences, notifications: prefs } } : s,
    );
    toast.success("Notification preferences saved");
  };

  const handleSaveTheme = async (newTheme) => {
    await updateThemePreference({ theme: newTheme });
    setSettings((s) =>
      s ? { ...s, preferences: { ...s.preferences, theme: newTheme } } : s,
    );
    toast.success("Theme preference saved");
  };

  const themeLabel = { light: "Light mode", dark: "Dark mode", system: "System default" }[theme] || "System default";

  if (loading) return <SettingsSkeleton />;

  return (
    <main className="mx-auto w-full max-w-7xl">
      {activeModal === MODALS.editProfile && (
        <EditProfileModal profile={profile} onClose={closeModal} onSave={handleSaveProfile} />
      )}
      {activeModal === MODALS.changePassword && (
        <ChangePasswordModal onClose={closeModal} />
      )}
      {activeModal === MODALS.changePhone && (
        <ChangePhoneModal
          currentPhone={profile.phoneNumber}
          onClose={closeModal}
          onSuccess={handlePhoneSuccess}
        />
      )}
      {activeModal === MODALS.notifications && (
        <NotificationPreferencesModal
          notifications={notifications}
          onClose={closeModal}
          onSave={handleSaveNotifications}
        />
      )}
      {activeModal === MODALS.theme && (
        <ThemePreferenceModal currentTheme={theme} onClose={closeModal} onSave={handleSaveTheme} />
      )}
      {activeModal === MODALS.help && <HelpSupportModal onClose={closeModal} />}
      {activeModal === MODALS.about && <AboutTalimModal onClose={closeModal} />}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#101828]">Settings</h1>
        <p className="mt-1 text-sm text-[#667085]">
          Manage your account, security and app preferences.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <section className="rounded-xl border border-[#E5EAF2] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
              <h2 className="text-base font-bold text-[#101828]">Profile Information</h2>
              <button
                type="button"
                onClick={() => setActiveModal(MODALS.editProfile)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#DCE5F2] bg-white px-3 text-xs font-bold text-[#0A4EA3] hover:bg-[#F4F8FF]"
              >
                Edit Profile
              </button>
            </div>
            <div className="flex items-start gap-4 px-5 py-5">
              <Avatar className="h-16 w-16 shrink-0 border-2 border-[#DCE5F2]">
                {profile.avatar || authUser?.userAvatar ? (
                  <AvatarImage src={profile.avatar || authUser?.userAvatar} alt={profile.fullName} />
                ) : (
                  <AvatarFallback className="bg-[#F5E9E2] text-xl font-bold text-[#7A4B33]">
                    {getInitials(profile.fullName || `${authUser?.firstName} ${authUser?.lastName}`)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-[#101828]">
                  {profile.fullName || `${authUser?.firstName} ${authUser?.lastName}`}
                </p>
                <p className="mt-0.5 text-sm text-[#667085]">{profile.email || authUser?.email}</p>
                <p className="mt-0.5 text-sm text-[#667085]">{profile.phoneNumber || "No phone number"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF6FF] px-2.5 py-1 text-xs font-bold text-[#0A4EA3]">
                    <User className="h-3 w-3" />
                    Parent
                  </span>
                  {profile.isEmailVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-2.5 py-1 text-xs font-bold text-[#067647]">
                      <Check className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#E5EAF2] bg-white shadow-sm">
            <div className="border-b border-[#EEF2F7] px-5 py-4">
              <h2 className="text-base font-bold text-[#101828]">My Children</h2>
              <p className="mt-0.5 text-xs text-[#667085]">
                {children.length} {children.length === 1 ? "child" : "children"} linked to your account
              </p>
            </div>

            <div className="divide-y divide-[#EEF2F7]">
              {children.length > 0 ? (
                children.map((child) => (
                  <div
                    key={child.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4"
                  >
                    <Avatar className="h-11 w-11">
                      {child.avatar ? (
                        <AvatarImage src={child.avatar} alt={child.fullName} />
                      ) : (
                        <AvatarFallback className="bg-[#EAF2FB] font-bold text-[#003366]">
                          {getInitials(child.fullName)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#101828]">{child.fullName}</p>
                      <p className="mt-0.5 truncate text-xs text-[#667085]">
                        {[child.grade, child.className].filter(Boolean).join(" · ")}
                      </p>
                      {child.schoolName && (
                        <p className="mt-0.5 truncate text-xs text-[#98A2B3]">{child.schoolName}</p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        child.status === "Active"
                          ? "bg-[#ECFDF3] text-[#067647]"
                          : "bg-[#FEF3F2] text-[#B42318]"
                      }`}
                    >
                      {child.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-3 px-5 py-5">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#667085]" />
                  <p className="text-sm text-[#667085]">
                    No children linked to your account. Please contact your school administrator.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-[#E5EAF2] bg-white shadow-sm">
            <div className="border-b border-[#EEF2F7] px-5 py-4">
              <h2 className="text-base font-bold text-[#101828]">Security</h2>
            </div>
            <div>
              <SettingsRow
                icon={<Lock className="h-4 w-4" />}
                label="Change Password"
                description="Update your account password"
                onClick={() => setActiveModal(MODALS.changePassword)}
              />
              <SettingsRow
                icon={<Phone className="h-4 w-4" />}
                label="Change Phone Number"
                description="Update your registered phone number"
                onClick={() => setActiveModal(MODALS.changePhone)}
              />
              <SettingsRow
                icon={<Shield className="h-4 w-4" />}
                label="Two-Factor Authentication"
                description="Add extra security to your account"
                badge="New"
                onClick={() => toast.info("Two-factor authentication coming soon.")}
              />
            </div>
          </section>

          <section className="rounded-xl border border-[#E5EAF2] bg-white shadow-sm">
            <div className="border-b border-[#EEF2F7] px-5 py-4">
              <h2 className="text-base font-bold text-[#101828]">Preferences</h2>
            </div>
            <div>
              <SettingsRow
                icon={<Bell className="h-4 w-4" />}
                label="Notification Preferences"
                description="Choose what updates you want to receive"
                onClick={() => setActiveModal(MODALS.notifications)}
              />
              <SettingsRow
                icon={<SunMoon className="h-4 w-4" />}
                label="Theme"
                description={themeLabel}
                onClick={() => setActiveModal(MODALS.theme)}
              />
            </div>
          </section>

          <section className="rounded-xl border border-[#E5EAF2] bg-white shadow-sm">
            <div className="border-b border-[#EEF2F7] px-5 py-4">
              <h2 className="text-base font-bold text-[#101828]">General</h2>
            </div>
            <div>
              <SettingsRow
                icon={<Globe className="h-4 w-4" />}
                label="Language"
                description="English (US)"
                onClick={() => toast.info("Language settings coming soon.")}
              />
              <SettingsRow
                icon={<HelpCircle className="h-4 w-4" />}
                label="Help & Support"
                description="Get help and contact support"
                onClick={() => setActiveModal(MODALS.help)}
              />
              <SettingsRow
                icon={<Info className="h-4 w-4" />}
                label="About Talim"
                description={`Version ${APP_VERSION}`}
                onClick={() => setActiveModal(MODALS.about)}
              />
            </div>
          </section>

          <section className="rounded-xl border border-[#FECDCA] bg-white shadow-sm">
            <div>
              <button
                type="button"
                onClick={() => logout()}
                className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-4 py-4 text-left hover:bg-[#FEF3F2]"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF3F2] text-[#B42318]">
                  <LogOut className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#B42318]">Logout</p>
                  <p className="mt-0.5 text-xs text-[#667085]">Sign out of your account</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#98A2B3]" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
