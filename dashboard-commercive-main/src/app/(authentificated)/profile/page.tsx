"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { toast } from "react-toastify";

// Icons
const LockIcon = () => (
  <svg className="w-4 h-4 text-[#4B5563]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const StoreIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const LoaderIcon = () => (
  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

interface UserData {
  email: string;
  first_name: string;
  last_name: string;
  user_name: string;
  phone_number: string;
  role?: string;
}

interface Store {
  id: string;
  name: string;
  status: "active" | "inactive" | "pending";
}

export default function Profile() {
  const supabase = createClient();
  const [userData, setUserData] = useState<UserData>({
    email: "",
    first_name: "",
    last_name: "",
    user_name: "",
    phone_number: "",
    role: "User",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [connectedStores, setConnectedStores] = useState<Store[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const getUserData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error("Unable to fetch user information.");
        return;
      }

      const { data, error } = await supabase
        .from("user")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        toast.error("Unable to get data.");
        return;
      }

      setUserData({
        email: data.email || "",
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        user_name: data.user_name || "",
        phone_number: data.phone_number || "",
        role: data.role || "User",
      });

      // Fetch connected stores
      try {
        const { data: storesData } = await supabase
          .from("store_to_user")
          .select("stores(id, store_name, store_url, is_store_listed)")
          .eq("user_id", user.id);

        if (storesData && storesData.length > 0) {
          const stores = storesData
            .filter((item: any) => item.stores)
            .map((item: any) => ({
              id: item.stores.id,
              name: item.stores.store_name,
              status: item.stores.is_store_listed ? "active" : "inactive",
            }));
          setConnectedStores(stores);
        }
      } catch {
        // Store fetch is optional, don't show error
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error("Unable to fetch user information.");
        return;
      }

      // Phone validation
      const phoneRegex = /^[\+]?[0-9]{1,15}$/;
      if (userData.phone_number && !phoneRegex.test(userData.phone_number)) {
        toast.error("Invalid phone number format. Use only numbers and optional + prefix.");
        return;
      }

      // Validate required fields
      if (!userData.first_name.trim()) {
        toast.error("First name is required.");
        return;
      }

      if (!userData.last_name.trim()) {
        toast.error("Last name is required.");
        return;
      }

      const { error } = await supabase
        .from("user")
        .update({
          first_name: userData.first_name.trim(),
          last_name: userData.last_name.trim(),
          user_name: userData.user_name.trim(),
          phone_number: userData.phone_number.trim(),
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to update profile.");
        return;
      }

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const first = userData.first_name?.charAt(0)?.toUpperCase() || "";
    const last = userData.last_name?.charAt(0)?.toUpperCase() || "";
    return first + last || "U";
  };

  const getFullName = () => {
    const name = `${userData.first_name} ${userData.last_name}`.trim();
    return name || "User";
  };

  useEffect(() => {
    getUserData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col w-full min-h-screen p-4 md:p-8 border-l-none md:border-l-2 border-t-2 border-[#F4F4F7] rounded-tl-0 md:rounded-tl-[24px] bg-[#F4F5F7]">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="loader"></div>
            <p className="text-[#4B5563] text-sm">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen p-4 md:p-8 border-l-none md:border-l-2 border-t-2 border-[#F4F4F7] rounded-tl-0 md:rounded-tl-[24px] bg-[#F4F5F7] overflow-auto custom-scrollbar">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Page Title */}
        <div className="mb-2">
          <h1 className="text-h3 text-[#1B1F3B]">Profile Settings</h1>
          <p className="text-small text-[#4B5563] mt-1">Manage your account information and preferences</p>
        </div>

        {/* Profile Header Card */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar with Initials */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1B1F3B] to-[#3A6EA5] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {getInitials()}
              </div>
              <div>
                <h2 className="text-h4 text-[#1B1F3B]">{getFullName()}</h2>
                <p className="text-small text-[#4B5563]">{userData.email}</p>
                <div className="mt-2">
                  <span className="badge badge-info">{userData.role}</span>
                </div>
              </div>
            </div>
            {/* Edit Profile Toggle */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`btn ${isEditing ? "btn-secondary" : "btn-primary"} transition-all`}
            >
              {isEditing ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel Editing
                </>
              ) : (
                <>
                  <EditIcon />
                  Edit Profile
                </>
              )}
            </button>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#D7E8FF] flex items-center justify-center text-[#3A6EA5]">
              <UserIcon />
            </div>
            <div>
              <h3 className="text-h4 text-[#1B1F3B]">Personal Information</h3>
              <p className="text-tiny text-[#4B5563]">Update your personal details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* First Name */}
            <div className="flex flex-col">
              <label className="input-label">First Name</label>
              <input
                type="text"
                name="first_name"
                value={userData.first_name}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Enter first name"
                className={`input ${!isEditing ? "bg-[#F4F5F7] cursor-not-allowed" : ""}`}
              />
            </div>

            {/* Last Name */}
            <div className="flex flex-col">
              <label className="input-label">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={userData.last_name}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Enter last name"
                className={`input ${!isEditing ? "bg-[#F4F5F7] cursor-not-allowed" : ""}`}
              />
            </div>

            {/* Email (Read-only) */}
            <div className="flex flex-col">
              <label className="input-label flex items-center gap-2">
                Email Address
                <LockIcon />
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={userData.email}
                  disabled
                  className="input bg-[#F4F5F7] cursor-not-allowed pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <LockIcon />
                </div>
              </div>
              <p className="text-tiny text-[#4B5563] mt-1">Email cannot be changed</p>
            </div>

            {/* Phone Number */}
            <div className="flex flex-col">
              <label className="input-label">Phone Number</label>
              <input
                type="tel"
                name="phone_number"
                value={userData.phone_number}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="+1234567890"
                className={`input ${!isEditing ? "bg-[#F4F5F7] cursor-not-allowed" : ""}`}
              />
              <p className="text-tiny text-[#4B5563] mt-1">Include country code (e.g., +1)</p>
            </div>

            {/* Username */}
            <div className="flex flex-col md:col-span-2">
              <label className="input-label">Username</label>
              <input
                type="text"
                name="user_name"
                value={userData.user_name}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Enter username"
                className={`input max-w-md ${!isEditing ? "bg-[#F4F5F7] cursor-not-allowed" : ""}`}
              />
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? (
                  <>
                    <LoaderIcon />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckIcon />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Account Settings Section */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#D7E8FF] flex items-center justify-center text-[#3A6EA5]">
              <ShieldIcon />
            </div>
            <div>
              <h3 className="text-h4 text-[#1B1F3B]">Account Settings</h3>
              <p className="text-tiny text-[#4B5563]">Manage your security and preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Change Password */}
            <div className="flex items-center justify-between p-4 bg-[#F4F5F7] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#1B1F3B]">
                  <KeyIcon />
                </div>
                <div>
                  <p className="font-medium text-[#1B1F3B]">Password</p>
                  <p className="text-tiny text-[#4B5563]">Change your account password</p>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm">
                Change Password
              </button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between p-4 bg-[#F4F5F7] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#1B1F3B]">
                  <ShieldIcon />
                </div>
                <div>
                  <p className="font-medium text-[#1B1F3B]">Two-Factor Authentication</p>
                  <p className="text-tiny text-[#4B5563]">Add an extra layer of security to your account</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => {
                    setTwoFactorEnabled(e.target.checked);
                    toast.info("Two-factor authentication coming soon!");
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#D7E8FF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3A6EA5]"></div>
              </label>
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 bg-[#F4F5F7] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#1B1F3B]">
                  <BellIcon />
                </div>
                <div>
                  <p className="font-medium text-[#1B1F3B]">Email Notifications</p>
                  <p className="text-tiny text-[#4B5563]">Receive updates and alerts via email</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => {
                    setEmailNotifications(e.target.checked);
                    toast.info("Notification preferences coming soon!");
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#D7E8FF] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3A6EA5]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Connected Stores Section */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#D7E8FF] flex items-center justify-center text-[#3A6EA5]">
              <StoreIcon />
            </div>
            <div>
              <h3 className="text-h4 text-[#1B1F3B]">Connected Stores</h3>
              <p className="text-tiny text-[#4B5563]">Stores you have access to</p>
            </div>
          </div>

          {connectedStores.length > 0 ? (
            <div className="space-y-3">
              {connectedStores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-4 bg-[#F4F5F7] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1B1F3B] to-[#3A6EA5] flex items-center justify-center text-white font-semibold">
                      {store.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-[#1B1F3B]">{store.name}</p>
                      <p className="text-tiny text-[#4B5563]">Store ID: {store.id}</p>
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      store.status === "active"
                        ? "badge-success"
                        : store.status === "pending"
                        ? "badge-warning"
                        : "badge-error"
                    }`}
                  >
                    {store.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state py-8">
              <div className="empty-state-icon mx-auto">
                <StoreIcon />
              </div>
              <p className="empty-state-title">No Stores Connected</p>
              <p className="empty-state-description">
                You are not currently connected to any stores.
              </p>
            </div>
          )}
        </div>

        {/* Footer Spacer */}
        <div className="h-4"></div>
      </div>
    </div>
  );
}
