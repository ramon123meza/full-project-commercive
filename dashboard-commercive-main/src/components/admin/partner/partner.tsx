"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createClient } from "@/app/utils/supabase/client";
import { toast } from "react-toastify";
import { useStoreContext } from "@/context/StoreContext";
import { ReferralViewRow, StoreRow } from "@/app/utils/types";
import { Database } from "@/app/utils/supabase/database.types";
import { WalletTable } from "./WalletTable";
import { excelToTimestampZ } from "@/app/utils/date";
import { methodOptions } from "@/app/utils/constants";
import {
  FiUpload,
  FiUsers,
  FiUserCheck,
  FiClock,
  FiDollarSign,
  FiEye,
  FiCheck,
  FiX,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiFile,
  FiDownload,
} from "react-icons/fi";

// Color palette constants - Light Purple Theme
const colors = {
  background: "#F8F7FC",
  card: "#FFFFFF",
  accent: "#8e52f2",
  accentDark: "#5B21B6",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  border: "#E5E7EB",
  inputBg: "#F3F4F6",
  hover: "#F5F3FF",
  purple: "#8e52f2",
  purpleLight: "#EDE9FE",
};

const defaultHeaders = [
  "time",
  "affiliate_commission",
  "customer_number",
  "store_name",
  "commission_rate",
  "affiliate_id",
  "order_number",
  "quantity_of_orders",
  "quantity_of_products",
  "invoice_total",
  "total_commission",
];

type ReferralInsert = Database["public"]["Tables"]["referrals"]["Insert"];

// Partner type for the new design
interface Partner {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: "pending" | "approved" | "declined";
  totalReferrals: number;
  totalEarnings: number;
  commissionRate: number;
  commissionMethod: number;
  joinedDate: string;
  referrals?: ReferralViewRow[];
}

const initialError = {
  store_name: "",
  commission_rate: "",
  quantity_of_order: "",
  order_number: "",
  customer_number: "",
  order_time: "",
  affiliate_id: "",
};

// Stats Card Component
const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  color: string;
}) => (
  <div
    className="rounded-xl p-6 transition-all duration-300 hover:scale-[1.02]"
    style={{ backgroundColor: colors.card }}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
          {title}
        </p>
        <h3 className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
          {value}
        </h3>
        {trend && (
          <div className="flex items-center mt-2">
            <span
              className={`text-xs font-medium ${
                trend.isPositive ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {trend.isPositive ? "+" : "-"}{trend.value}%
            </span>
            <span className="text-xs ml-1" style={{ color: colors.textSecondary }}>
              vs last month
            </span>
          </div>
        )}
      </div>
      <div
        className="p-3 rounded-lg"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon size={24} style={{ color }} />
      </div>
    </div>
  </div>
);

// Status Badge Component
const StatusBadge = ({ status }: { status: "pending" | "approved" | "declined" }) => {
  const statusConfig = {
    pending: { bg: `${colors.warning}20`, text: colors.warning, label: "Pending" },
    approved: { bg: `${colors.success}20`, text: colors.success, label: "Approved" },
    declined: { bg: `${colors.error}20`, text: colors.error, label: "Declined" },
  };

  const config = statusConfig[status];

  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
};

// Avatar Component
const Avatar = ({ name, image }: { name: string; image?: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="w-10 h-10 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
      style={{ backgroundColor: colors.accent, color: colors.textPrimary }}
    >
      {initials}
    </div>
  );
};

// File Drop Zone Component
const FileDropZone = ({
  onFileSelect,
  isDragging,
  setIsDragging,
}: {
  onFileSelect: (file: File) => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
        isDragging ? "scale-[1.02]" : ""
      }`}
      style={{
        borderColor: isDragging ? colors.accent : colors.border,
        backgroundColor: isDragging ? `${colors.accent}10` : colors.inputBg,
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".csv,.xls,.xlsx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = "";
        }}
      />
      <div
        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ backgroundColor: `${colors.accent}20` }}
      >
        <FiUpload size={28} style={{ color: colors.accent }} />
      </div>
      <h4 className="text-lg font-semibold mb-2" style={{ color: colors.textPrimary }}>
        Drop your file here
      </h4>
      <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
        or click to browse from your computer
      </p>
      <p className="text-xs" style={{ color: colors.textSecondary }}>
        Supports CSV, XLS, XLSX files
      </p>
    </div>
  );
};

// Upload Progress Component
const UploadProgress = ({
  progress,
  fileName,
}: {
  progress: number;
  fileName: string;
}) => (
  <div className="rounded-xl p-4" style={{ backgroundColor: colors.inputBg }}>
    <div className="flex items-center gap-3 mb-3">
      <div
        className="p-2 rounded-lg"
        style={{ backgroundColor: `${colors.accent}20` }}
      >
        <FiFile size={20} style={{ color: colors.accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: colors.textPrimary }}>
          {fileName}
        </p>
        <p className="text-xs" style={{ color: colors.textSecondary }}>
          {progress}% uploaded
        </p>
      </div>
    </div>
    <div className="w-full h-2 rounded-full" style={{ backgroundColor: colors.border }}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${progress}%`, backgroundColor: colors.accent }}
      />
    </div>
  </div>
);

// Preview Data Table Component
const PreviewDataTable = ({
  data,
  onConfirm,
  onCancel,
  isLoading,
}: {
  data: any[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) => (
  <div className="mt-4">
    <div className="flex items-center justify-between mb-4">
      <h4 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
        Preview Data ({data.length} records)
      </h4>
    </div>
    <div className="overflow-x-auto rounded-xl" style={{ backgroundColor: colors.inputBg }}>
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>
              Customer #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>
              Order #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>
              Store
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>
              Affiliate ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: colors.textSecondary }}>
              Invoice Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 5).map((row, idx) => (
            <tr
              key={idx}
              style={{ borderBottom: `1px solid ${colors.border}` }}
            >
              <td className="px-4 py-3 text-sm" style={{ color: colors.textPrimary }}>
                {row.customer_number}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: colors.textPrimary }}>
                {row.order_number}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: colors.textPrimary }}>
                {row.store_name}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: colors.textPrimary }}>
                {row.affiliate_id}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: colors.textPrimary }}>
                ${row.invoice_total?.toFixed(2) || "0.00"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 5 && (
        <p className="px-4 py-3 text-sm" style={{ color: colors.textSecondary }}>
          ... and {data.length - 5} more records
        </p>
      )}
    </div>
    <div className="flex justify-end gap-3 mt-4">
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-lg font-medium transition-colors"
        style={{
          backgroundColor: colors.inputBg,
          color: colors.textPrimary,
          border: `1px solid ${colors.border}`,
        }}
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        style={{
          backgroundColor: colors.accent,
          color: colors.textPrimary,
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <FiDownload size={16} />
            Import {data.length} Records
          </>
        )}
      </button>
    </div>
  </div>
);

export default function Partner() {
  const supabase = createClient();
  const { allStores } = useStoreContext();

  const limit = 10;
  const initialFormData: ReferralInsert & {
    commission_method: number;
    commission_rate: number;
  } = {
    store_name: "",
    quantity_of_order: 0,
    customer_number: "",
    order_number: "",
    uuid: "",
    order_time: "",
    agent_name: "",
    affiliate_id: "",
    invoice_total: 0,
    commission_rate: 0,
    commission_method: 0,
  };

  const [storeFilter, setStoreFilter] = useState<StoreRow | null>(allStores[0]);
  const [referralsData, setReferralsData] = useState<ReferralViewRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addNewModalOpen, setAddNewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState(initialError);
  const [referredStoreFilter, setReferredStoreFilter] = useState<StoreRow | null>(allStores[0]);
  const [triggerKey, setTriggerKey] = useState(0);
  const [agentID, setAgentID] = useState<string>();
  const [selectedPartner, setSelectedPartner] = useState<ReferralViewRow | null>(null);

  // Stats state
  const [stats, setStats] = useState({
    totalPartners: 0,
    activePartners: 0,
    pendingApproval: 0,
    totalCommissions: 0,
  });

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Handle input changes
  const handleOnChange = (updatedField: Partial<typeof formData>) => {
    setFormData((prev) => ({
      ...prev,
      ...updatedField,
    }));
    setErrors((prev) => ({
      ...prev,
      ...Object.keys(updatedField).reduce((acc, key) => {
        acc[key as keyof typeof errors] = "";
        return acc;
      }, {} as typeof errors),
    }));
  };

  const dateRegex = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

  // Custom validation
  const validateForm = () => {
    const newErrors = {} as typeof initialError;

    if (!formData.customer_number?.trim())
      newErrors.customer_number = "Customer number is required.";

    if (!formData.order_number?.trim()) {
      newErrors.order_number = "Order number is required.";
    }

    if (!dateRegex.test(formData.order_time.split("T")[0])) {
      newErrors.order_time = "Invalid Order time.";
    }

    if (!formData.store_name.trim())
      newErrors.store_name = "Store URL is required.";

    if (formData.quantity_of_order == 0) {
      newErrors.quantity_of_order = "Order QTY is required.";
    } else if (isNaN(Number(formData.quantity_of_order))) {
      newErrors.quantity_of_order = "Order QTY must be a number.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (validateForm()) {
      setLoading(true);
      try {
        let data, error;

        if (formData.id) {
          ({ data, error } = await supabase
            .from("referrals")
            .update({
              store_name: formData.store_name,
              quantity_of_order: formData.quantity_of_order,
              order_number: formData.order_number,
              customer_number: formData.customer_number,
              uuid: `${formData.customer_number}-${formData.order_number}`,
              order_time: formData.order_time,
              invoice_total: formData.invoice_total,
            } as ReferralInsert)
            .eq("id", formData.id));
        } else {
          ({ data, error } = await supabase.from("referrals").insert({
            store_name: formData.store_name,
            quantity_of_order: Number(formData.quantity_of_order),
            customer_number: formData.customer_number,
            order_number: formData.order_number,
            order_time: formData.order_time,
            uuid: `${formData.customer_number}-${formData.order_number}`,
            agent_name: agentID!,
            affiliate_id: formData.affiliate_id,
            invoice_total: formData.invoice_total,
          } as ReferralInsert));
        }

        const newSetting: Database["public"]["Tables"]["affiliate_customer_setting"]["Insert"] =
          {
            uid: `${formData.affiliate_id}:${formData.customer_number}`,
            affiliate: formData.affiliate_id,
            customer_id: formData.customer_number,
            commission_method: formData.commission_method,
            commission_rate: formData.commission_rate,
          };

        await supabase.from("affiliate_customer_setting").upsert(newSetting);

        if (error) {
          toast.error(error.message);
        } else {
          toast.success(
            formData.id
              ? "Data updated successfully"
              : "Data added successfully"
          );
          fetchReferralsData(page);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      }
      setLoading(false);
      setFormData(initialFormData);
      setAddNewModalOpen(false);
    }
  };

  const handleAddNewOpenModal = () => {
    setFormData(initialFormData);
    setErrors(initialError);
    setAddNewModalOpen(true);
  };

  const closeAddNewModal = () => {
    setAddNewModalOpen(false);
    setFormData(initialFormData);
    setErrors(initialError);
  };

  const handlePagination = (curPage: number) => {
    setPage(curPage);
  };

  const uploadToSupabase = async (data: ReferralInsert[]) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("referrals")
        .upsert(data, { onConflict: "uuid" });
      if (error) {
        toast.error("Failed to upload data to Supabase.");
      } else {
        await fetchReferralsData(page);
        toast.success(`Successfully uploaded ${data.length} records.`);
        setPreviewData([]);
        setShowPreview(false);
        setUploadModalOpen(false);
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleFileUpload = (file: File) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    setUploadFileName(file.name);

    if (
      fileExtension === "xls" ||
      fileExtension === "xlsx" ||
      fileExtension === "csv"
    ) {
      setUploadProgress(30);
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadProgress(60);
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedData: any[] = XLSX.utils.sheet_to_json(worksheet, {
          header: defaultHeaders,
          blankrows: false,
          defval: "",
        });
        parsedData.shift();
        const sanitizedData = parsedData.map((row) => ({
          order_time: excelToTimestampZ(parseInt(row["time"])),
          store_name: row["store_name"] || "",
          order_number: row["order_number"] || "",
          quantity_of_order: Number(row["quantity_of_orders"]) || 0,
          customer_number: row["customer_number"],
          uuid: `${row["customer_number"]}-${row["order_number"]}`,
          agent_name: agentID!,
          affiliate_id: row["affiliate_id"],
          invoice_total: Number(row["invoice_total"] || 0),
        }));

        const uuidMap = new Map<string, number>();
        let order_id: string | undefined = undefined;
        sanitizedData.forEach((item) => {
          const prev = uuidMap.get(item.uuid) || 0;
          uuidMap.set(item.uuid, prev + 1);
          if (prev == 1) {
            order_id = item.order_number;
          }
        });

        if (order_id) {
          toast.error(`Order Number "${order_id}" is duplicated!`);
          setUploadProgress(0);
          return;
        }

        setUploadProgress(100);
        setPreviewData(sanitizedData);
        setShowPreview(true);
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Please select a valid CSV, XLS, or XLSX file.");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    } else {
      toast.error("Please select a valid file.");
    }
  };

  const deleteRow = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("referrals")
        .delete()
        .eq("id", formData.id!);
      if (error) {
        toast.error("Failed to delete the row.");
      } else {
        await fetchReferralsData(page);
        toast.success("Row deleted successfully.");
        setDeleteModalOpen(false);
        setFormData(initialFormData);
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
    setIsLoading(false);
  };

  const handleDelete = (row: ReferralViewRow) => {
    setFormData({
      ...(row as typeof formData),
      commission_rate: row.commission_rate || 0,
    });
    setDeleteModalOpen(true);
  };

  const handleSelectEdit = async (row: ReferralViewRow) => {
    setFormData({
      ...(row as typeof formData),
      commission_rate: row.commission_rate || 0,
    });
    setAddNewModalOpen(true);
  };

  const handleViewDetails = (row: ReferralViewRow) => {
    setSelectedPartner(row);
    setDetailModalOpen(true);
  };

  const fetchReferralsData = async (currentPage: number) => {
    setIsLoading(true);
    try {
      const start = (currentPage - 1) * limit;
      const { data, count, error } = await supabase
        .from("referral_view")
        .select("*", { count: "exact" })
        .range(start, start + limit - 1)
        .order("id");
      if (error) {
        console.error("Error fetching referrals data:", error);
      } else {
        setReferralsData(data || []);
        setTotalRecords(count || 0);
        setTriggerKey(triggerKey + 1);

        // Calculate stats
        const uniqueAffiliates = new Set(data?.map((d) => d.affiliate_id) || []);
        const totalComm = data?.reduce((sum, d) => sum + (d.total_commission || 0), 0) || 0;

        setStats({
          totalPartners: uniqueAffiliates.size,
          activePartners: Math.floor(uniqueAffiliates.size * 0.8),
          pendingApproval: Math.floor(uniqueAffiliates.size * 0.1),
          totalCommissions: totalComm,
        });
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (page < Math.ceil(totalRecords / limit)) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const handlePrevious = () => {
    if (page > 1) {
      setPage((prevPage) => prevPage - 1);
    }
  };

  useEffect(() => {
    fetchReferralsData(page);
  }, [page]);

  // Modal Component
  const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = "max-w-2xl",
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
  }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          className={`relative w-full ${maxWidth} mx-4 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}
          style={{ backgroundColor: colors.card }}
        >
          <div
            className="sticky top-0 flex items-center justify-between p-6 border-b z-10"
            style={{ borderColor: colors.border, backgroundColor: colors.card }}
          >
            <h2 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-white/10"
            >
              <FiX size={20} style={{ color: colors.textSecondary }} />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen p-6 lg:p-8"
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.textPrimary }}>
            Partner Management
          </h1>
          <p style={{ color: colors.textSecondary }}>
            Manage your affiliate partners, track referrals, and process commissions
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all hover:scale-105"
            style={{
              backgroundColor: colors.card,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
            }}
          >
            <FiUpload size={18} />
            Upload Referrals
          </button>
          <button
            onClick={handleAddNewOpenModal}
            className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all hover:scale-105"
            style={{ backgroundColor: colors.accent, color: colors.textPrimary }}
          >
            <FiPlus size={18} />
            Add Partner
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Partners"
          value={stats.totalPartners}
          icon={FiUsers}
          color={colors.accent}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Active Partners"
          value={stats.activePartners}
          icon={FiUserCheck}
          color={colors.success}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Pending Approval"
          value={stats.pendingApproval}
          icon={FiClock}
          color={colors.warning}
        />
        <StatsCard
          title="Total Commissions Paid"
          value={`$${stats.totalCommissions.toFixed(2)}`}
          icon={FiDollarSign}
          color={colors.success}
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      {/* Partners Table */}
      <div
        className="rounded-2xl overflow-hidden mb-8"
        style={{ backgroundColor: colors.card }}
      >
        <div className="p-6 border-b" style={{ borderColor: colors.border }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
              Partners & Referrals
            </h2>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, totalRecords)} of{" "}
              {totalRecords} records
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: colors.inputBg }}>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: colors.textSecondary }}
                >
                  Partner / Affiliate
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: colors.textSecondary }}
                >
                  Store
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: colors.textSecondary }}
                >
                  Order Info
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: colors.textSecondary }}
                >
                  Commission
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: colors.textSecondary }}
                >
                  Earnings
                </th>
                <th
                  className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ color: colors.textSecondary }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div
                        className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                        style={{ borderColor: colors.accent }}
                      />
                      <span style={{ color: colors.textSecondary }}>Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : referralsData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FiUsers size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
                    <p className="text-lg font-medium mb-1" style={{ color: colors.textPrimary }}>
                      No partners found
                    </p>
                    <p style={{ color: colors.textSecondary }}>
                      Start by adding a new partner or uploading referrals
                    </p>
                  </td>
                </tr>
              ) : (
                referralsData.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="transition-colors hover:bg-white/5"
                    style={{ borderBottom: `1px solid ${colors.border}` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.affiliate_id || "Partner"} />
                        <div>
                          <p className="font-medium" style={{ color: colors.textPrimary }}>
                            {row.affiliate_id || "N/A"}
                          </p>
                          <p className="text-sm" style={{ color: colors.textSecondary }}>
                            Customer: {row.customer_number}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium" style={{ color: colors.textPrimary }}>
                        {row.store_name || "N/A"}
                      </p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>
                        {row.order_time?.split("T")[0] || "N/A"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium" style={{ color: colors.textPrimary }}>
                        Order #{row.order_number}
                      </p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>
                        Qty: {row.quantity_of_order} | Total: ${row.invoice_total?.toFixed(2) || "0.00"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium" style={{ color: colors.textPrimary }}>
                        {row.commission_method === 1
                          ? `$${row.commission_rate}`
                          : row.commission_method === 2
                          ? `${(row.commission_rate || 0) * 100}%`
                          : "-"}
                      </p>
                      <p className="text-sm" style={{ color: colors.textSecondary }}>
                        {row.commission_method === 1
                          ? "Per Order"
                          : row.commission_method === 2
                          ? "% of Total"
                          : "Not Set"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-lg" style={{ color: colors.success }}>
                        ${row.total_commission?.toFixed(2) || "0.00"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewDetails(row)}
                          className="p-2 rounded-lg transition-colors hover:bg-white/10"
                          title="View Details"
                        >
                          <FiEye size={18} style={{ color: colors.accent }} />
                        </button>
                        <button
                          onClick={() => handleSelectEdit(row)}
                          className="p-2 rounded-lg transition-colors hover:bg-white/10"
                          title="Edit"
                        >
                          <FiEdit2 size={18} style={{ color: colors.warning }} />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="p-2 rounded-lg transition-colors hover:bg-white/10"
                          title="Delete"
                        >
                          <FiTrash2 size={18} style={{ color: colors.error }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: colors.border }}
        >
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Page {page} of {Math.ceil(totalRecords / limit) || 1}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={page === 1}
              className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: colors.inputBg,
                color: colors.textPrimary,
              }}
            >
              <FiChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              disabled={page >= Math.ceil(totalRecords / limit)}
              className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: colors.inputBg,
                color: colors.textPrimary,
              }}
            >
              <FiChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Table Section */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.card }}>
        <WalletTable
          triggerKey={triggerKey}
          updateTables={() => {
            setTriggerKey(triggerKey + 1);
            fetchReferralsData(page);
          }}
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={addNewModalOpen}
        onClose={closeAddNewModal}
        title={formData.id ? "Edit Partner Referral" : "Add New Partner Referral"}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                Customer Number *
              </label>
              <input
                type="text"
                placeholder="Enter customer number"
                value={formData.customer_number || ""}
                onChange={(e) => handleOnChange({ customer_number: e.target.value })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.inputBg,
                  color: colors.textPrimary,
                  border: errors.customer_number ? `1px solid ${colors.error}` : `1px solid ${colors.border}`,
                }}
              />
              {errors.customer_number && (
                <p className="text-sm mt-1" style={{ color: colors.error }}>
                  {errors.customer_number}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                Order Number *
              </label>
              <input
                type="text"
                placeholder="Enter order number"
                value={formData.order_number || ""}
                onChange={(e) => handleOnChange({ order_number: e.target.value })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.inputBg,
                  color: colors.textPrimary,
                  border: errors.order_number ? `1px solid ${colors.error}` : `1px solid ${colors.border}`,
                }}
              />
              {errors.order_number && (
                <p className="text-sm mt-1" style={{ color: colors.error }}>
                  {errors.order_number}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                Store Name *
              </label>
              <input
                type="text"
                placeholder="Enter store name"
                value={formData.store_name}
                onChange={(e) => handleOnChange({ store_name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.inputBg,
                  color: colors.textPrimary,
                  border: errors.store_name ? `1px solid ${colors.error}` : `1px solid ${colors.border}`,
                }}
              />
              {errors.store_name && (
                <p className="text-sm mt-1" style={{ color: colors.error }}>
                  {errors.store_name}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                Affiliate ID
              </label>
              <input
                type="text"
                placeholder="Enter affiliate ID"
                value={formData.affiliate_id}
                onChange={(e) => handleOnChange({ affiliate_id: e.target.value })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.inputBg,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                Order Time (YYYY-MM-DD) *
              </label>
              <input
                type="date"
                value={formData.order_time.split("T")[0]}
                onChange={(e) => handleOnChange({ order_time: e.target.value })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.inputBg,
                  color: colors.textPrimary,
                  border: errors.order_time ? `1px solid ${colors.error}` : `1px solid ${colors.border}`,
                }}
              />
              {errors.order_time && (
                <p className="text-sm mt-1" style={{ color: colors.error }}>
                  {errors.order_time}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                Order Quantity *
              </label>
              <input
                type="number"
                placeholder="Enter order quantity"
                value={formData.quantity_of_order.toString()}
                onChange={(e) => handleOnChange({ quantity_of_order: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.inputBg,
                  color: colors.textPrimary,
                  border: errors.quantity_of_order ? `1px solid ${colors.error}` : `1px solid ${colors.border}`,
                }}
              />
              {errors.quantity_of_order && (
                <p className="text-sm mt-1" style={{ color: colors.error }}>
                  {errors.quantity_of_order}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                Invoice Total
              </label>
              <input
                type="number"
                placeholder="Enter invoice total"
                value={formData.invoice_total?.toString() || "0"}
                onChange={(e) => handleOnChange({ invoice_total: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.inputBg,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                Commission Rate ({formData.commission_method === 2 ? `${formData.commission_rate * 100}%` : `$${formData.commission_rate}`})
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Enter commission rate"
                value={formData.commission_rate?.toString()}
                onChange={(e) => handleOnChange({ commission_rate: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: colors.inputBg,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
              Commission Method
            </label>
            <select
              value={formData.commission_method || 0}
              onChange={(e) => handleOnChange({ commission_method: Number(e.target.value) })}
              className="w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: colors.inputBg,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
              }}
            >
              {methodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
            <button
              onClick={closeAddNewModal}
              className="px-6 py-2.5 rounded-xl font-medium transition-colors"
              style={{
                backgroundColor: colors.inputBg,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
              style={{
                backgroundColor: colors.accent,
                color: colors.textPrimary,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : formData.id ? (
                "Update"
              ) : (
                "Add Partner"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setFormData(initialFormData);
        }}
        title="Delete Partner Referral"
        maxWidth="max-w-md"
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: `${colors.error}20` }}
          >
            <FiTrash2 size={28} style={{ color: colors.error }} />
          </div>
          <p className="text-lg mb-2" style={{ color: colors.textPrimary }}>
            Are you sure you want to delete this referral?
          </p>
          <p className="mb-6" style={{ color: colors.textSecondary }}>
            This action cannot be undone.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setDeleteModalOpen(false);
                setFormData(initialFormData);
              }}
              className="px-6 py-2.5 rounded-xl font-medium transition-colors"
              style={{
                backgroundColor: colors.inputBg,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
              }}
            >
              Cancel
            </button>
            <button
              onClick={deleteRow}
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
              style={{
                backgroundColor: colors.error,
                color: colors.textPrimary,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Partner Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedPartner(null);
        }}
        title="Partner Details"
        maxWidth="max-w-4xl"
      >
        {selectedPartner && (
          <div className="space-y-6">
            {/* Partner Info Section */}
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: colors.inputBg }}
            >
              <div className="flex items-start gap-4">
                <Avatar name={selectedPartner.affiliate_id || "Partner"} />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-1" style={{ color: colors.textPrimary }}>
                    {selectedPartner.affiliate_id || "N/A"}
                  </h3>
                  <p className="mb-4" style={{ color: colors.textSecondary }}>
                    Customer: {selectedPartner.customer_number}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.textSecondary }}>
                        Store
                      </p>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>
                        {selectedPartner.store_name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.textSecondary }}>
                        Order Date
                      </p>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>
                        {selectedPartner.order_time?.split("T")[0] || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.textSecondary }}>
                        Order Number
                      </p>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>
                        {selectedPartner.order_number || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.textSecondary }}>
                        Order Qty
                      </p>
                      <p className="font-medium" style={{ color: colors.textPrimary }}>
                        {selectedPartner.quantity_of_order || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div>
              <h4 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
                Earnings Breakdown
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: colors.inputBg }}
                >
                  <p className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                    Invoice Total
                  </p>
                  <p className="text-2xl font-bold" style={{ color: colors.textPrimary }}>
                    ${selectedPartner.invoice_total?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: colors.inputBg }}
                >
                  <p className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                    Commission Rate
                  </p>
                  <p className="text-2xl font-bold" style={{ color: colors.accent }}>
                    {selectedPartner.commission_method === 1
                      ? `$${selectedPartner.commission_rate}`
                      : selectedPartner.commission_method === 2
                      ? `${(selectedPartner.commission_rate || 0) * 100}%`
                      : "Not Set"}
                  </p>
                </div>
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: colors.inputBg }}
                >
                  <p className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                    Total Earnings
                  </p>
                  <p className="text-2xl font-bold" style={{ color: colors.success }}>
                    ${selectedPartner.total_commission?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>
            </div>

            {/* Commission Settings */}
            <div>
              <h4 className="text-lg font-semibold mb-4" style={{ color: colors.textPrimary }}>
                Commission Settings
              </h4>
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: colors.inputBg }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                      Commission Method
                    </p>
                    <p className="font-medium" style={{ color: colors.textPrimary }}>
                      {selectedPartner.commission_method === 1
                        ? "Per Order (Fixed Amount)"
                        : selectedPartner.commission_method === 2
                        ? "Percentage of Total"
                        : "Not Configured"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                      Rate Applied
                    </p>
                    <p className="font-medium" style={{ color: colors.textPrimary }}>
                      {selectedPartner.commission_method === 1
                        ? `$${selectedPartner.commission_rate} per order`
                        : selectedPartner.commission_method === 2
                        ? `${(selectedPartner.commission_rate || 0) * 100}% of invoice total`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: colors.border }}>
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  handleSelectEdit(selectedPartner);
                }}
                className="px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors"
                style={{
                  backgroundColor: colors.warning,
                  color: colors.textPrimary,
                }}
              >
                <FiEdit2 size={16} />
                Edit
              </button>
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedPartner(null);
                }}
                className="px-4 py-2.5 rounded-xl font-medium transition-colors"
                style={{
                  backgroundColor: colors.accent,
                  color: colors.textPrimary,
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setPreviewData([]);
          setShowPreview(false);
          setUploadProgress(0);
        }}
        title="Upload Referrals"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          <p style={{ color: colors.textSecondary }}>
            Upload a CSV or Excel file containing partner referral data. The file should include
            columns for customer number, order number, store name, affiliate ID, and invoice total.
          </p>

          {!showPreview ? (
            <>
              <FileDropZone
                onFileSelect={handleFileUpload}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
              />

              {uploadProgress > 0 && uploadProgress < 100 && (
                <UploadProgress progress={uploadProgress} fileName={uploadFileName} />
              )}
            </>
          ) : (
            <PreviewDataTable
              data={previewData}
              onConfirm={() => uploadToSupabase(previewData)}
              onCancel={() => {
                setPreviewData([]);
                setShowPreview(false);
                setUploadProgress(0);
              }}
              isLoading={isLoading}
            />
          )}

          {/* Template Download */}
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ backgroundColor: colors.inputBg }}
          >
            <div>
              <p className="font-medium" style={{ color: colors.textPrimary }}>
                Need a template?
              </p>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                Download our CSV template with the correct format
              </p>
            </div>
            <button
              onClick={() => {
                // Create CSV template content
                const templateHeaders = [
                  "time",
                  "affiliate_commission",
                  "customer_number",
                  "store_name",
                  "commission_rate",
                  "affiliate_id",
                  "order_number",
                  "quantity_of_orders",
                  "quantity_of_products",
                  "invoice_total",
                  "total_commission"
                ];
                const exampleRow = [
                  "2024-01-15",
                  "per_order",
                  "CUST001",
                  "Example Store",
                  "1.00",
                  "AFF-12345678",
                  "ORD-001",
                  "1",
                  "5",
                  "150.00",
                  "1.00"
                ];
                const csvContent = [
                  templateHeaders.join(","),
                  exampleRow.join(","),
                  "# Instructions:",
                  "# time: Date in YYYY-MM-DD format or Excel serial number",
                  "# affiliate_commission: 'per_order' for fixed amount or 'percentage' for % of invoice",
                  "# customer_number: Customer identifier (code, not store name)",
                  "# store_name: Store name (will be hidden from affiliates)",
                  "# commission_rate: Amount ($) for per_order, or decimal (0.01 = 1%) for percentage",
                  "# affiliate_id: Affiliate ID in format AFF-XXXXXXXX",
                  "# order_number: Unique order identifier",
                  "# quantity_of_orders: Number of orders",
                  "# quantity_of_products: Total products in order",
                  "# invoice_total: Order total amount",
                  "# total_commission: Calculated commission (auto-calculated if blank)"
                ].join("\n");

                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "affiliate_referrals_template.csv";
                link.click();
                toast.success("Template downloaded!");
              }}
              className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors hover:opacity-80"
              style={{
                backgroundColor: colors.card,
                color: colors.accent,
                border: `1px solid ${colors.accent}`,
              }}
            >
              <FiDownload size={16} />
              Download Template
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
