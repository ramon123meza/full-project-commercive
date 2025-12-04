"use client";

import { ChangeEvent, useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { createClient } from "@/app/utils/supabase/client";
import { StoreRow, UserRow } from "@/app/utils/types";
import { deleteUserByAdmin, signUpByAdmin } from "../action";
import { roleOptions } from "@/app/utils/constants";
import { useStoreContext } from "@/context/StoreContext";
import { Database } from "@/app/utils/supabase/database.types";
import {
  FiPlus,
  FiSearch,
  FiFilter,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiUsers,
  FiUserCheck,
  FiClock,
  FiShield,
  FiChevronLeft,
  FiChevronRight,
  FiMail,
  FiUser,
} from "react-icons/fi";
import { IoMdClose } from "react-icons/io";

// Color palette for dark theme
const colors = {
  background: "#1B1F3B",
  cards: "#252A4A",
  accent: "#3A6EA5",
  textPrimary: "#FFFFFF",
  textSecondary: "#94A3B8",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  border: "#374151",
  inputBg: "#1E2642",
  hover: "#2D3456",
};

// Page options for permissions
const pageOptions = [
  { value: "inventory", label: "Inventory" },
  { value: "partners", label: "Partners" },
  { value: "roles", label: "Roles" },
  { value: "tickets", label: "Tickets" },
  { value: "payouts", label: "Payouts" },
  { value: "stores", label: "Stores" },
  { value: "home", label: "Home" },
];

// Status options
type UserStatus = "active" | "pending" | "suspended";

interface ExtendedUser extends UserRow {
  status?: UserStatus;
  last_active?: string;
  store_access?: StoreRow[];
}

// Stats Card Component
const StatsCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) => (
  <div
    className="rounded-xl p-5 transition-all duration-200 hover:scale-[1.02]"
    style={{ backgroundColor: colors.cards }}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
          {title}
        </p>
        <p className="text-3xl font-bold mt-1" style={{ color: colors.textPrimary }}>
          {value}
        </p>
      </div>
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={24} style={{ color }} />
      </div>
    </div>
  </div>
);

// Role Badge Component
const RoleBadge = ({ role }: { role: string }) => {
  const roleColors: Record<string, { bg: string; text: string }> = {
    admin: { bg: "#3A6EA520", text: "#3A6EA5" },
    user: { bg: "#10B98120", text: "#10B981" },
    employee: { bg: "#F59E0B20", text: "#F59E0B" },
  };
  const colorSet = roleColors[role] || roleColors.user;

  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
      style={{ backgroundColor: colorSet.bg, color: colorSet.text }}
    >
      {role}
    </span>
  );
};

// Status Badge Component
const StatusBadge = ({ status }: { status: UserStatus }) => {
  const statusColors: Record<UserStatus, { bg: string; text: string }> = {
    active: { bg: "#10B98120", text: colors.success },
    pending: { bg: "#F59E0B20", text: colors.warning },
    suspended: { bg: "#EF444420", text: colors.error },
  };
  const colorSet = statusColors[status] || statusColors.active;

  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
      style={{ backgroundColor: colorSet.bg, color: colorSet.text }}
    >
      {status}
    </span>
  );
};

// User Avatar Component
const UserAvatar = ({ name, email }: { name: string; email: string }) => {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm"
        style={{ backgroundColor: colors.accent, color: colors.textPrimary }}
      >
        {initials}
      </div>
      <div>
        <p className="font-medium" style={{ color: colors.textPrimary }}>
          {name || "Unknown User"}
        </p>
        <p className="text-sm" style={{ color: colors.textSecondary }}>
          {email}
        </p>
      </div>
    </div>
  );
};

// Dark Modal Component
const DarkModal = ({
  onClose,
  children,
  title,
  maxWidth = "max-w-[600px]",
}: {
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  maxWidth?: string;
}) => (
  <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
    <div
      className={`rounded-xl shadow-2xl w-full ${maxWidth} relative max-h-[90vh] overflow-hidden`}
      style={{ backgroundColor: colors.cards }}
    >
      <div
        className="flex items-center justify-between p-5 border-b"
        style={{ borderColor: colors.border }}
      >
        <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
          {title}
        </h2>
        <button
          onClick={onClose}
          className="p-1 rounded-lg transition-colors hover:bg-white/10"
        >
          <IoMdClose size={20} style={{ color: colors.textSecondary }} />
        </button>
      </div>
      <div className="p-5 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar">
        {children}
      </div>
    </div>
  </div>
);

// Dark Input Component
const DarkInput = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  required,
  disabled,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>
      {label}
      {required && <span style={{ color: colors.error }}> *</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="h-11 rounded-lg px-4 focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
      style={{
        backgroundColor: colors.inputBg,
        color: colors.textPrimary,
        border: `1px solid ${error ? colors.error : colors.border}`,
        // @ts-ignore
        "--tw-ring-color": colors.accent,
      }}
    />
    {error && (
      <p className="text-xs" style={{ color: colors.error }}>
        {error}
      </p>
    )}
  </div>
);

// Dark Select Component
const DarkSelect = ({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>
      {label}
      {required && <span style={{ color: colors.error }}> *</span>}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 rounded-lg px-4 focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer"
      style={{
        backgroundColor: colors.inputBg,
        color: colors.textPrimary,
        border: `1px solid ${colors.border}`,
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ backgroundColor: colors.inputBg }}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// Dark Button Component
const DarkButton = ({
  label,
  onClick,
  variant = "primary",
  icon: Icon,
  loading,
  disabled,
  size = "md",
}: {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success";
  icon?: React.ElementType;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) => {
  const variantStyles = {
    primary: { bg: colors.accent, hover: "#4A7EB5" },
    secondary: { bg: colors.border, hover: colors.hover },
    danger: { bg: colors.error, hover: "#DC2626" },
    success: { bg: colors.success, hover: "#059669" },
  };
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]}`}
      style={{
        backgroundColor: variantStyles[variant].bg,
        color: colors.textPrimary,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = variantStyles[variant].hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = variantStyles[variant].bg;
      }}
    >
      {loading ? (
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        Icon && <Icon size={18} />
      )}
      {label}
    </button>
  );
};

// Multi-select checkbox component
const CheckboxGroup = ({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>
      {label}
    </label>
    <div
      className="p-3 rounded-lg grid grid-cols-2 gap-2"
      style={{ backgroundColor: colors.inputBg, border: `1px solid ${colors.border}` }}
    >
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors"
        >
          <input
            type="checkbox"
            checked={selected.includes(opt.value)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...selected, opt.value]);
              } else {
                onChange(selected.filter((v) => v !== opt.value));
              }
            }}
            className="w-4 h-4 rounded accent-blue-500"
          />
          <span className="text-sm" style={{ color: colors.textPrimary }}>
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  </div>
);

// Store Multi-select Component
const StoreMultiSelect = ({
  label,
  stores,
  selected,
  onChange,
}: {
  label: string;
  stores: StoreRow[];
  selected: string[];
  onChange: (values: string[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleStore = (storeId: string) => {
    if (selected.includes(storeId)) {
      onChange(selected.filter((id) => id !== storeId));
    } else {
      onChange([...selected, storeId]);
    }
  };

  const selectAll = () => {
    if (selected.length === stores.length) {
      onChange([]);
    } else {
      onChange(stores.map((s) => s.id));
    }
  };

  return (
    <div className="flex flex-col gap-1.5 relative">
      <label className="text-sm font-medium" style={{ color: colors.textSecondary }}>
        {label}
      </label>
      <div
        className="min-h-11 rounded-lg px-4 py-2 cursor-pointer flex items-center justify-between"
        style={{ backgroundColor: colors.inputBg, border: `1px solid ${colors.border}` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: selected.length ? colors.textPrimary : colors.textSecondary }}>
          {selected.length ? `${selected.length} store(s) selected` : "Select stores..."}
        </span>
        <FiChevronRight
          size={18}
          style={{ color: colors.textSecondary, transform: isOpen ? "rotate(90deg)" : "none", transition: "0.2s" }}
        />
      </div>
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto"
          style={{ backgroundColor: colors.cards, border: `1px solid ${colors.border}` }}
        >
          <div
            className="p-2 border-b cursor-pointer hover:bg-white/5"
            style={{ borderColor: colors.border }}
            onClick={selectAll}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.length === stores.length && stores.length > 0}
                readOnly
                className="w-4 h-4 rounded accent-blue-500"
              />
              <span className="text-sm font-medium" style={{ color: colors.textPrimary }}>
                Select All
              </span>
            </label>
          </div>
          {stores.map((store) => (
            <div
              key={store.id}
              className="p-2 cursor-pointer hover:bg-white/5"
              onClick={() => toggleStore(store.id)}
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(store.id)}
                  readOnly
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <span className="text-sm" style={{ color: colors.textPrimary }}>
                  {store.store_name === "satish-dev" ? "Golf Pro" : store.store_name}
                </span>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// User Edit Modal Component
const UserEditModal = ({
  user,
  stores,
  onClose,
  onSave,
  saving,
}: {
  user: ExtendedUser;
  stores: StoreRow[];
  onClose: () => void;
  onSave: (data: {
    role: string;
    stores: string[];
    pages: string[];
  }) => Promise<void>;
  saving: boolean;
}) => {
  const [selectedRole, setSelectedRole] = useState(user.role || "user");
  const [selectedStores, setSelectedStores] = useState<string[]>(
    user.store_access?.map((s) => s.id) || user.visible_store || []
  );
  const [selectedPages, setSelectedPages] = useState<string[]>(user.visible_pages || []);

  const handleSave = () => {
    onSave({
      role: selectedRole,
      stores: selectedStores,
      pages: selectedPages,
    });
  };

  return (
    <DarkModal onClose={onClose} title="Edit User" maxWidth="max-w-[600px]">
      <div className="flex flex-col gap-5">
        {/* User Info Display */}
        <div
          className="p-4 rounded-lg flex items-center gap-4"
          style={{ backgroundColor: colors.inputBg }}
        >
          <UserAvatar
            name={`${user.first_name || ""} ${user.last_name || ""}`.trim()}
            email={user.email || ""}
          />
        </div>

        {/* Role Selector */}
        <DarkSelect
          label="Role"
          value={selectedRole}
          onChange={setSelectedRole}
          options={roleOptions}
          required
        />

        {/* Store Access - show for admin and employee */}
        {(selectedRole === "admin" || selectedRole === "employee" || selectedRole === "user") && (
          <StoreMultiSelect
            label="Store Access"
            stores={stores}
            selected={selectedStores}
            onChange={setSelectedStores}
          />
        )}

        {/* Page Permissions - show for admin */}
        {selectedRole === "admin" && (
          <CheckboxGroup
            label="Page Permissions"
            options={pageOptions}
            selected={selectedPages}
            onChange={setSelectedPages}
          />
        )}

        {/* Actions */}
        <div
          className="flex justify-end gap-3 pt-4 border-t"
          style={{ borderColor: colors.border }}
        >
          <DarkButton label="Cancel" variant="secondary" onClick={onClose} />
          <DarkButton
            label="Save Changes"
            variant="primary"
            icon={FiCheck}
            onClick={handleSave}
            loading={saving}
          />
        </div>
      </div>
    </DarkModal>
  );
};

// Add New User Modal Component
const AddUserModal = ({
  stores,
  onClose,
  onSave,
  saving,
}: {
  stores: StoreRow[];
  onClose: () => void;
  onSave: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    user_name: string;
    phone_number: string;
    role: string;
    stores: string[];
    pages: string[];
  }) => Promise<void>;
  saving: boolean;
}) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    user_name: "",
    phone_number: "",
    role: "user",
  });
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email?.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password?.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.first_name?.trim()) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name?.trim()) {
      newErrors.last_name = "Last name is required";
    }

    if (!formData.user_name?.trim()) {
      newErrors.user_name = "Username is required";
    }

    if (!formData.phone_number?.trim()) {
      newErrors.phone_number = "Phone number is required";
    } else if (!/^\d{1,11}$/.test(formData.phone_number)) {
      newErrors.phone_number = "Phone number must be up to 11 digits";
    }

    if (formData.role === "admin" && selectedStores.length === 0) {
      newErrors.stores = "Please select at least one store";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 11) {
      setFormData((prev) => ({ ...prev, phone_number: value }));
      if (errors.phone_number) {
        setErrors((prev) => ({ ...prev, phone_number: "" }));
      }
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSave({
        ...formData,
        stores: selectedStores,
        pages: selectedPages,
      });
    }
  };

  return (
    <DarkModal onClose={onClose} title="Invite New User" maxWidth="max-w-[700px]">
      <div className="flex flex-col gap-5">
        {/* Email & Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DarkInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="user@example.com"
            error={errors.email}
            required
          />
          <DarkInput
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Min 6 characters"
            error={errors.password}
            required
          />
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DarkInput
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="John"
            error={errors.first_name}
            required
          />
          <DarkInput
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Doe"
            error={errors.last_name}
            required
          />
        </div>

        {/* Username & Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DarkInput
            label="Username"
            name="user_name"
            value={formData.user_name}
            onChange={handleChange}
            placeholder="johndoe"
            error={errors.user_name}
            required
          />
          <DarkInput
            label="Phone Number"
            name="phone_number"
            value={formData.phone_number}
            onChange={handlePhoneChange}
            placeholder="1234567890"
            error={errors.phone_number}
            required
          />
        </div>

        {/* Role */}
        <DarkSelect
          label="Role"
          value={formData.role}
          onChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
          options={roleOptions}
          required
        />

        {/* Store Access */}
        {(formData.role === "admin" || formData.role === "employee") && (
          <div>
            <StoreMultiSelect
              label="Store Access"
              stores={stores}
              selected={selectedStores}
              onChange={setSelectedStores}
            />
            {errors.stores && (
              <p className="text-xs mt-1" style={{ color: colors.error }}>
                {errors.stores}
              </p>
            )}
          </div>
        )}

        {/* Page Permissions */}
        {formData.role === "admin" && (
          <CheckboxGroup
            label="Page Permissions"
            options={pageOptions}
            selected={selectedPages}
            onChange={setSelectedPages}
          />
        )}

        {/* Actions */}
        <div
          className="flex justify-end gap-3 pt-4 border-t"
          style={{ borderColor: colors.border }}
        >
          <DarkButton label="Cancel" variant="secondary" onClick={onClose} />
          <DarkButton
            label="Create User"
            variant="primary"
            icon={FiPlus}
            onClick={handleSubmit}
            loading={saving}
          />
        </div>
      </div>
    </DarkModal>
  );
};

// Delete Confirmation Modal
const DeleteModal = ({
  user,
  onClose,
  onConfirm,
  loading,
}: {
  user: ExtendedUser;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) => (
  <DarkModal onClose={onClose} title="Delete User" maxWidth="max-w-[400px]">
    <div className="flex flex-col gap-5">
      <p style={{ color: colors.textSecondary }}>
        Are you sure you want to delete{" "}
        <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
          {user.first_name} {user.last_name}
        </span>
        ? This action cannot be undone.
      </p>
      <div className="flex justify-end gap-3">
        <DarkButton label="Cancel" variant="secondary" onClick={onClose} />
        <DarkButton
          label="Delete"
          variant="danger"
          icon={FiTrash2}
          onClick={onConfirm}
          loading={loading}
        />
      </div>
    </div>
  </DarkModal>
);

// Main Component
export default function UserManagement() {
  const supabase = createClient();
  const { allStores: storeData } = useStoreContext();

  // State
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const limit = 10;

  // Fetch users
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const start = (page - 1) * limit;
      let query = supabase.from("user").select("*", { count: "exact" });

      // Apply role filter
      if (roleFilter !== "all") {
        query = query.eq("role", roleFilter);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(
          `email.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`
        );
      }

      const { data, count, error } = await query.range(start, start + limit - 1);

      if (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
      } else {
        // Fetch store access for each user
        const usersWithStores: ExtendedUser[] = await Promise.all(
          (data || []).map(async (user) => {
            const { data: storeLinks } = await supabase
              .from("store_to_user")
              .select("*, stores(*)")
              .eq("user_id", user.id);

            return {
              ...user,
              status: "active" as UserStatus,
              store_access: storeLinks?.map((link) => link.stores).filter(Boolean) || [],
            };
          })
        );

        setUsers(usersWithStores);
        setTotalRecords(count || 0);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Stats calculations
  const stats = useMemo(() => {
    return {
      total: totalRecords,
      active: users.filter((u) => u.status === "active").length,
      pending: users.filter((u) => u.status === "pending").length,
      admins: users.filter((u) => u.role === "admin").length,
    };
  }, [users, totalRecords]);

  // Handle add user
  const handleAddUser = async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    user_name: string;
    phone_number: string;
    role: string;
    stores: string[];
    pages: string[];
  }) => {
    setSaving(true);
    try {
      const { data: newUser, error } = await signUpByAdmin({
        email: data.email,
        password: data.password,
        referral_code: "",
        first_name: data.first_name,
        last_name: data.last_name,
        user_name: data.user_name,
        phone_number: data.phone_number,
        role: data.role,
        visible_store: data.stores,
        visible_pages: data.pages,
      });

      if (error instanceof Error) {
        toast.error(error.message || "Failed to create user");
        return;
      }

      // Create store_to_user entries
      if (newUser?.user?.id && data.stores.length > 0) {
        const storeLinks = data.stores.map((storeId: string) => ({
          user_id: newUser.user.id,
          store_id: storeId,
          uuid: `${newUser.user.id}-${storeId}`,
        }));

        const { error: linkError } = await supabase.from("store_to_user").insert(storeLinks);

        if (linkError) {
          console.error("Error linking stores:", linkError);
          toast.error("User created but failed to link stores");
        }
      }

      toast.success("User created successfully");
      setAddModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  // Handle edit user
  const handleEditUser = async (data: { role: string; stores: string[]; pages: string[] }) => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      // Update user role and pages
      const { error: userError } = await supabase
        .from("user")
        .update({ role: data.role, visible_pages: data.pages })
        .eq("id", selectedUser.id);

      if (userError) {
        toast.error("Failed to update user role");
        return;
      }

      // Update store access
      await supabase.from("store_to_user").delete().eq("user_id", selectedUser.id);

      if (data.stores.length > 0) {
        const storeLinks: Database["public"]["Tables"]["store_to_user"]["Insert"][] = data.stores.map(
          (storeId) => ({
            user_id: selectedUser.id,
            store_id: storeId,
            uuid: `${selectedUser.id}-${storeId}`,
          })
        );

        await supabase.from("store_to_user").upsert(storeLinks, { onConflict: "uuid" });
      }

      toast.success("User updated successfully");
      setEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const { error } = await deleteUserByAdmin(selectedUser.id);

      if (error) {
        toast.error("Failed to delete user");
        return;
      }

      toast.success("User deleted successfully");
      setDeleteModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  // Pagination handlers
  const handleNext = () => {
    if (page < Math.ceil(totalRecords / limit)) {
      setPage((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: colors.background }}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
              User Management
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              Manage user roles, permissions, and store access
            </p>
          </div>
          <DarkButton
            label="Invite User"
            icon={FiPlus}
            onClick={() => setAddModalOpen(true)}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Users" value={stats.total} icon={FiUsers} color={colors.accent} />
          <StatsCard title="Active Users" value={stats.active} icon={FiUserCheck} color={colors.success} />
          <StatsCard title="Pending Approval" value={stats.pending} icon={FiClock} color={colors.warning} />
          <StatsCard title="Admins" value={stats.admins} icon={FiShield} color={colors.accent} />
        </div>

        {/* Filters */}
        <div
          className="rounded-xl p-4 flex flex-col md:flex-row gap-4"
          style={{ backgroundColor: colors.cards }}
        >
          {/* Search */}
          <div className="flex-1 relative">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: colors.textSecondary }}
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 rounded-lg pl-10 pr-4 focus:outline-none focus:ring-2"
              style={{
                backgroundColor: colors.inputBg,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
              }}
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <FiFilter size={18} style={{ color: colors.textSecondary }} />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="h-11 rounded-lg px-4 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
              style={{
                backgroundColor: colors.inputBg,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                minWidth: "150px",
              }}
            >
              <option value="all" style={{ backgroundColor: colors.inputBg }}>
                All Roles
              </option>
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ backgroundColor: colors.inputBg }}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.cards }}>
          {/* Table Header */}
          <div
            className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1fr_auto] gap-4 p-4 text-sm font-medium"
            style={{ backgroundColor: colors.inputBg, color: colors.textSecondary }}
          >
            <div>User</div>
            <div>Role</div>
            <div>Status</div>
            <div>Store Access</div>
            <div>Page Permissions</div>
            <div>Created</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Table Body */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-8 w-8 animate-spin" style={{ color: colors.accent }} viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <FiUsers size={48} style={{ color: colors.textSecondary }} />
              <p style={{ color: colors.textSecondary }}>No users found</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: colors.border }}>
              {users.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1fr_auto] gap-4 p-4 items-center hover:bg-white/5 transition-colors"
                >
                  {/* User Info */}
                  <div>
                    <UserAvatar
                      name={`${user.first_name || ""} ${user.last_name || ""}`.trim()}
                      email={user.email || ""}
                    />
                  </div>

                  {/* Role */}
                  <div className="flex items-center gap-2 lg:block">
                    <span className="lg:hidden text-sm" style={{ color: colors.textSecondary }}>
                      Role:
                    </span>
                    <RoleBadge role={user.role || "user"} />
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 lg:block">
                    <span className="lg:hidden text-sm" style={{ color: colors.textSecondary }}>
                      Status:
                    </span>
                    <StatusBadge status={user.status || "active"} />
                  </div>

                  {/* Store Access */}
                  <div className="flex items-center gap-2 lg:block">
                    <span className="lg:hidden text-sm" style={{ color: colors.textSecondary }}>
                      Stores:
                    </span>
                    <span className="text-sm" style={{ color: colors.textPrimary }}>
                      {user.store_access?.length || 0} store(s)
                    </span>
                  </div>

                  {/* Page Permissions */}
                  <div className="flex items-center gap-2 lg:block">
                    <span className="lg:hidden text-sm" style={{ color: colors.textSecondary }}>
                      Pages:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {user.visible_pages && user.visible_pages.length > 0 ? (
                        user.visible_pages.slice(0, 2).map((page) => (
                          <span
                            key={page}
                            className="px-2 py-0.5 rounded text-xs capitalize"
                            style={{ backgroundColor: colors.inputBg, color: colors.textSecondary }}
                          >
                            {page}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm" style={{ color: colors.textSecondary }}>
                          -
                        </span>
                      )}
                      {user.visible_pages && user.visible_pages.length > 2 && (
                        <span
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ backgroundColor: colors.inputBg, color: colors.textSecondary }}
                        >
                          +{user.visible_pages.length - 2}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Created */}
                  <div className="flex items-center gap-2 lg:block">
                    <span className="lg:hidden text-sm" style={{ color: colors.textSecondary }}>
                      Created:
                    </span>
                    <span className="text-sm" style={{ color: colors.textSecondary }}>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setEditModalOpen(true);
                      }}
                      className="p-2 rounded-lg transition-colors hover:bg-white/10"
                      title="Edit"
                    >
                      <FiEdit2 size={18} style={{ color: colors.accent }} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setDeleteModalOpen(true);
                      }}
                      className="p-2 rounded-lg transition-colors hover:bg-white/10"
                      title="Delete"
                    >
                      <FiTrash2 size={18} style={{ color: colors.error }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t"
            style={{ borderColor: colors.border }}
          >
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Showing {Math.min((page - 1) * limit + 1, totalRecords)}-
              {Math.min(page * limit, totalRecords)} of {totalRecords} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                disabled={page === 1}
                className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10"
              >
                <FiChevronLeft size={20} style={{ color: colors.textPrimary }} />
              </button>
              <span className="px-4 py-2 text-sm" style={{ color: colors.textPrimary }}>
                Page {page} of {Math.ceil(totalRecords / limit) || 1}
              </span>
              <button
                onClick={handleNext}
                disabled={page >= Math.ceil(totalRecords / limit)}
                className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10"
              >
                <FiChevronRight size={20} style={{ color: colors.textPrimary }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {addModalOpen && (
        <AddUserModal
          stores={storeData}
          onClose={() => setAddModalOpen(false)}
          onSave={handleAddUser}
          saving={saving}
        />
      )}

      {editModalOpen && selectedUser && (
        <UserEditModal
          user={selectedUser}
          stores={storeData}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedUser(null);
          }}
          onSave={handleEditUser}
          saving={saving}
        />
      )}

      {deleteModalOpen && selectedUser && (
        <DeleteModal
          user={selectedUser}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedUser(null);
          }}
          onConfirm={handleDeleteUser}
          loading={saving}
        />
      )}
    </div>
  );
}
