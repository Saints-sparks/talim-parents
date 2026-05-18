import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  ChevronRight,
  Edit3,
  Info,
  LockKeyhole,
  Mail,
  Plus,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { useAuth, API_BASE_URL } from "../services/auth.services";
import { getParentByUserId } from "../services/parent.services";
import { useSchool } from "../hooks/useSchools";
import { useParentOnboarding } from "../contexts/ParentOnboardingContext";
import { useSelectedStudent } from "../contexts/SelectedStudentContext";
import { Avatar, AvatarFallback, AvatarImage } from "../lib/ui/avatar";
import { toast } from "../Components/CustomToast";

const CLOUDINARY_CLOUD_NAME = "ddbs7m7nt";
const CLOUDINARY_UPLOAD_PRESET = "presetOne";

const getFullName = (person, fallback = "Parent") =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ") ||
  person?.fullName ||
  person?.name ||
  fallback;

const getInitials = (person, fallback = "P") => {
  const name = getFullName(person, fallback);
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const getStudentName = (student) => getFullName(student?.userId, "Unnamed child");

const getStudentMeta = (student) => {
  const grade = student?.gradeLevel || student?.grade || student?.classId?.gradeLevel;
  const className = student?.classId?.name || student?.className || "Class not assigned";
  return [grade, className].filter(Boolean).join(" - ");
};

const getEntityId = (entity) =>
  entity?._id || entity?.id || entity?.userId?._id || entity?.userId?.id || entity?.userId?.userId;

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const getSchoolAddress = (school) => {
  if (!school) return "Not available";
  if (typeof school.address === "string" && school.address.trim()) return school.address;
  if (typeof school.location === "string" && school.location.trim()) return school.location;

  const location = school.address || school.location || {};
  const parts = [
    location.street,
    location.city,
    location.state,
    location.country,
  ].filter(Boolean);

  return parts.join(", ") || "Not available";
};

const getSchoolPhone = (school) =>
  school?.phoneNumber ||
  school?.phone ||
  school?.contactPhone ||
  school?.primaryContact?.phoneNumber ||
  school?.contact?.phoneNumber ||
  "Not available";

function VerifiedBadge({ label = "Verified" }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F8EF] px-2.5 py-1 text-xs font-bold text-[#159947]">
      <Check className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function InfoRow({ label, value, verified }) {
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center">
      <p className="text-sm font-medium text-[#667085]">{label}</p>
      <p className="min-w-0 break-words text-sm font-bold text-[#101828]">{value || "Not available"}</p>
      {verified && <VerifiedBadge />}
    </div>
  );
}

function ProfileCard({ user, linkedCount, memberSince, onAvatarChange, avatarUploading }) {
  const fileInputRef = useRef(null);
  const parentName = getFullName(user);

  return (
    <section className="rounded-xl border border-[#E5EAF2] bg-white p-5 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Avatar className="h-28 w-28 border-4 border-white shadow-sm">
            {user?.userAvatar ? (
              <AvatarImage src={user.userAvatar} alt={parentName} />
            ) : (
              <AvatarFallback className="bg-[#F5E9E2] text-3xl font-bold text-[#7A4B33]">
                {getInitials(user)}
              </AvatarFallback>
            )}
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute bottom-1 right-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#DCE5F2] bg-white text-[#0A4EA3] shadow-sm hover:bg-[#F4F8FF] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Upload profile photo"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarChange}
          />
        </div>

        <h2 className="mt-4 text-2xl font-bold text-[#101828]">{parentName}</h2>
        <p className="mt-1 text-sm font-medium text-[#667085]">Parent Account</p>
        <div className="mt-3">
          <VerifiedBadge />
        </div>
      </div>

      <div className="my-6 h-px bg-[#EEF2F7]" />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-[#667085]">Member since</span>
          <span className="text-right text-sm font-bold text-[#101828]">{memberSince}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-[#667085]">Account Type</span>
          <span className="text-sm font-bold text-[#101828]">Parent</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-[#667085]">Linked Children</span>
          <span className="text-sm font-bold text-[#101828]">{linkedCount}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => toast.info("Password changes are not available in the parent portal yet.")}
        className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#DCE5F2] bg-white px-4 text-sm font-bold text-[#0A4EA3] hover:bg-[#F8FAFD]"
      >
        <LockKeyhole className="h-4 w-4" />
        Change Password
      </button>
    </section>
  );
}

function AccountSupportCard() {
  return (
    <section className="rounded-xl border border-[#E5EAF2] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#101828]">Account Support</h2>
      <p className="mt-1 text-sm text-[#667085]">
        Notification preferences will be added later. For now, your school manages key account details.
      </p>

      <div className="mt-6 space-y-3">
        <div className="flex gap-3 rounded-lg bg-[#F4F8FF] p-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#0A4EA3]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#101828]">School-managed profile</h3>
            <p className="mt-1 text-sm leading-5 text-[#667085]">
              Contact your school administrator to correct name, email, phone, or child links.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => toast.info("Please contact your school administrator for account updates.")}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#DCE5F2] bg-white px-4 text-sm font-bold text-[#0A4EA3] hover:bg-[#F8FAFD]"
        >
          <Mail className="h-4 w-4" />
          Contact School Admin
        </button>
      </div>
    </section>
  );
}

function ChildRow({ student, isDefault, onSelect }) {
  const studentUser = student?.userId || {};
  const isActive = student?.isActive !== false && studentUser?.isActive !== false;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#EEF2F7] px-3 py-4 text-left last:border-b-0 hover:bg-[#F8FAFD] sm:px-4"
    >
      <Avatar className="h-12 w-12">
        {studentUser.userAvatar ? (
          <AvatarImage src={studentUser.userAvatar} alt={getStudentName(student)} />
        ) : (
          <AvatarFallback className="bg-[#EAF2FB] font-bold text-[#003366]">
            {getInitials(studentUser, "C")}
          </AvatarFallback>
        )}
      </Avatar>

      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[#101828]">{getStudentName(student)}</p>
        <p className="mt-1 truncate text-xs font-medium text-[#667085]">{getStudentMeta(student)}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden rounded-full bg-[#E8F8EF] px-3 py-1 text-xs font-bold text-[#159947] sm:inline-flex">
          {isActive ? "Active" : "Inactive"}
          {isDefault ? " (Default)" : ""}
        </span>
        {isDefault && <Star className="h-4 w-4 fill-[#FDB022] text-[#FDB022]" />}
        <ChevronRight className="h-5 w-5 text-[#667085]" />
      </div>
    </button>
  );
}

export default function Profile() {
  const { user, parentId, authToken, updateUser } = useAuth();
  const { school, loading: schoolLoading } = useSchool();
  const { wards = [], wardsLoading, refreshWards } = useParentOnboarding();
  const { selectedStudent, updateSelectedStudent } = useSelectedStudent();
  const [parentProfile, setParentProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!parentId) return;

    let isMounted = true;
    setProfileLoading(true);
    getParentByUserId(parentId)
      .then((profile) => {
        if (isMounted) setParentProfile(profile);
      })
      .catch(() => {
        if (isMounted) {
          toast.warning("We could not load the extended parent profile. Showing account details instead.");
        }
      })
      .finally(() => {
        if (isMounted) setProfileLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [parentId]);

  const mergedUser = useMemo(() => {
    const populatedUser = parentProfile?.userId;
    return typeof populatedUser === "object" && populatedUser ? { ...user, ...populatedUser } : user;
  }, [parentProfile, user]);

  const selectedStudentId = getEntityId(selectedStudent);
  const memberSince = formatDate(parentProfile?.createdAt || mergedUser?.createdAt);

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !authToken) return;

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadData.secure_url) {
        throw new Error(uploadData?.error?.message || "Image upload failed");
      }

      const avatarResponse = await fetch(`${API_BASE_URL}/auth/profile/avatar`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ avatarUrl: uploadData.secure_url }),
      });
      const avatarData = await avatarResponse.json().catch(() => ({}));
      if (!avatarResponse.ok) {
        throw new Error(avatarData?.message || "Profile photo update failed");
      }

      updateUser({ userAvatar: avatarData?.userAvatar || uploadData.secure_url });
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error.message || "Could not update profile photo.");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handleSelectDefaultChild = (student) => {
    updateSelectedStudent(student);
    toast.success(`${getStudentName(student)} is now your default child.`);
  };

  const handleRefreshChildren = async () => {
    await refreshWards();
    toast.info("Linked children refreshed.");
  };

  return (
    <main className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-normal text-[#101828]">My Profile</h1>
          <p className="mt-1 text-sm text-[#667085]">
            Manage your personal information and account settings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast.info("Some profile details are managed by your school administrator.")}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#DCE5F2] bg-white px-5 text-sm font-bold text-[#101828] shadow-sm hover:bg-[#F8FAFD]"
        >
          <Edit3 className="h-4 w-4" />
          Edit Profile
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)_360px]">
        <ProfileCard
          user={mergedUser}
          linkedCount={wards.length}
          memberSince={memberSince}
          onAvatarChange={handleAvatarChange}
          avatarUploading={avatarUploading}
        />

        <section className="rounded-xl border border-[#E5EAF2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#101828]">Personal Information</h2>
            {(profileLoading || schoolLoading) && (
              <span className="text-xs font-semibold text-[#667085]">Refreshing...</span>
            )}
          </div>

          <div className="mt-5 divide-y divide-[#EEF2F7]">
            <InfoRow label="Full Name" value={getFullName(mergedUser)} verified />
            <InfoRow label="Email Address" value={mergedUser?.email} verified />
            <InfoRow label="Phone Number" value={mergedUser?.phoneNumber} verified />
          </div>

          <div className="my-5 h-px bg-[#EEF2F7]" />

          <h2 className="text-lg font-bold text-[#101828]">School Information</h2>
          <div className="mt-5 divide-y divide-[#EEF2F7]">
            <InfoRow label="School Name" value={school?.name} />
            <InfoRow label="Address" value={getSchoolAddress(school)} />
            <InfoRow label="School Phone" value={getSchoolPhone(school)} />
          </div>

          <div className="mt-5 flex gap-3 rounded-lg bg-[#EEF6FF] p-4 text-sm text-[#0A4EA3]">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="font-semibold">
              Some profile details are managed by your school and cannot be changed.
            </p>
          </div>
        </section>

        <AccountSupportCard />
      </div>

      <section className="mt-5 rounded-xl border border-[#E5EAF2] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#101828]">Connected Children</h2>
            <p className="mt-1 text-sm text-[#667085]">Manage children linked to your account.</p>
          </div>
          <button
            type="button"
            onClick={handleRefreshChildren}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[#DCE5F2] bg-white px-4 text-sm font-bold text-[#0A4EA3] hover:bg-[#F8FAFD]"
          >
            Refresh
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-[#E5EAF2]">
          {wardsLoading ? (
            <div className="flex items-center gap-3 px-4 py-6 text-sm font-semibold text-[#667085]">
              <UserRound className="h-5 w-5" />
              Loading linked children...
            </div>
          ) : wards.length > 0 ? (
            wards.map((student) => {
              const id = getEntityId(student);
              return (
                <ChildRow
                  key={id}
                  student={student}
                  isDefault={id && id === selectedStudentId}
                  onSelect={() => handleSelectDefaultChild(student)}
                />
              );
            })
          ) : (
            <div className="px-4 py-6 text-sm text-[#667085]">
              No children are linked to this parent account yet.
            </div>
          )}

          <button
            type="button"
            onClick={() => toast.info("Please contact your school administrator to link another child.")}
            className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-4 text-left hover:bg-[#F8FAFD] sm:px-4"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#F4F8FF] text-[#0A4EA3]">
              <Plus className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[#101828]">Link Another Child</span>
              <span className="mt-1 block truncate text-xs text-[#667085]">
                Contact your school administrator to link another child to your account.
              </span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#667085]" />
          </button>
        </div>
      </section>
    </main>
  );
}
