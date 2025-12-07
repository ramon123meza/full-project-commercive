"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { DateRangePicker, Range } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { useStoreContext } from "@/context/StoreContext";
import { createClient } from "@/app/utils/supabase/client";
import { Database } from "@/app/utils/supabase/database.types";
import {
  FiPackage,
  FiTruck,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiFilter,
  FiChevronDown,
  FiChevronRight,
  FiMapPin,
  FiArrowRight,
} from "react-icons/fi";

type TrackingStatus = "all" | "in_transit" | "delivered" | "pending";

interface CarrierInfo {
  name: string;
  logo: string;
  color: string;
}

const carrierLogos: Record<string, CarrierInfo> = {
  "DHL Express": { name: "DHL", logo: "/icons/dhl.png", color: "#FFCC00" },
  DHL: { name: "DHL", logo: "/icons/dhl.png", color: "#FFCC00" },
  USPS: { name: "USPS", logo: "/icons/usps.png", color: "#004B87" },
  UPS: { name: "UPS", logo: "/svgs/ups-icon.svg", color: "#351C15" },
  FedEx: { name: "FedEx", logo: "/icons/fedex.png", color: "#4D148C" },
  SDH: { name: "SDH", logo: "/icons/sdh.png", color: "#FF6B00" },
  YANWEN: { name: "YANWEN", logo: "/svgs/yanwen.svg", color: "#E60012" },
  "Yun Express": { name: "Yun Express", logo: "/svgs/yun-express.svg", color: "#FF6600" },
};

const getCarrierInfo = (company: string | null): CarrierInfo => {
  if (!company) return { name: "Unknown", logo: "/icons/Layer.png", color: "#6B7280" };
  return carrierLogos[company] || { name: company, logo: "/icons/Layer.png", color: "#6B7280" };
};

const getStatusInfo = (status: string | null) => {
  const normalizedStatus = status?.toUpperCase() || "";

  if (["SUCCESS", "DELIVERED", "COMPLETED"].includes(normalizedStatus)) {
    return { label: "Delivered", badge: "badge-success", color: "#10B981" };
  }
  if (["IN_TRANSIT", "SHIPPED", "TRANSIT"].includes(normalizedStatus)) {
    return { label: "In Transit", badge: "badge-info", color: "#3B82F6" };
  }
  if (["PENDING", "OPEN", "PROCESSING"].includes(normalizedStatus)) {
    return { label: "Pending", badge: "badge-warning", color: "#F59E0B" };
  }
  if (["CANCELLED", "ERROR", "FAILURE", "FAILED"].includes(normalizedStatus)) {
    return { label: "Failed", badge: "badge-error", color: "#EF4444" };
  }
  return { label: "Unknown", badge: "badge-neutral", color: "#6B7280" };
};

export default function ShipmentTracking() {
  const supabase = createClient();
  const { selectedStore, dateRange: contextDateRange, setDateRange: setContextDateRange } = useStoreContext();
  const [trackingData, setTrackingData] = useState<
    Database["public"]["Tables"]["trackings"]["Row"][]
  >([]);
  const storeUrl = selectedStore ? selectedStore.store_url : null;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TrackingStatus>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  // Set current date only on client side to prevent hydration mismatch
  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setCurrentDate(now);
  }, []);

  const getStartOfWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    return new Date(now.setDate(diff - 7)); // Start from previous week
  };

  const getEndOfWeek = (startOfWeek: Date) => {
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 20);
    return endOfWeek;
  };

  const [tmpCurrentDateRange, setTmpCurrentDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  const [localDateRange, setLocalDateRange] = useState<Range[]>([
    {
      startDate: undefined,
      endDate: undefined,
      key: "selection",
    },
  ]);

  // Sync with context date range
  useEffect(() => {
    if (contextDateRange) {
      setLocalDateRange([{ startDate: contextDateRange.startDate, endDate: contextDateRange.endDate, key: "selection" }]);
      setTmpCurrentDateRange([{ startDate: contextDateRange.startDate, endDate: contextDateRange.endDate, key: "selection" }]);
    } else {
      // Fall back to default if context not ready
      const start = getStartOfWeek();
      const end = getEndOfWeek(start);
      setLocalDateRange([{ startDate: start, endDate: end, key: "selection" }]);
      setTmpCurrentDateRange([{ startDate: start, endDate: end, key: "selection" }]);
    }
  }, [contextDateRange]);

  // Use local date range synced with context
  const dateRange = localDateRange;

  const formatDateForQuery = (date: Date) => date.toISOString().split("Z")[0];

  const fetchTrackings = async () => {
    if (!dateRange[0].startDate || !dateRange[0].endDate || !storeUrl) return;

    const formattedStartDate = formatDateForQuery(dateRange[0].startDate);
    const formattedEndDate = formatDateForQuery(dateRange[0].endDate);

    const { data: trackingsData, error: trackingsError } = await supabase
      .from("trackings")
      .select("*")
      .gte("created_at", formattedStartDate)
      .lt("created_at", formattedEndDate)
      .eq("store_url", storeUrl);

    if (trackingsError) {
      console.error("Error fetching trackings:", trackingsError.message);
    } else {
      setTrackingData(trackingsData || []);
    }
  };

  useEffect(() => {
    fetchTrackings();
  }, [dateRange, storeUrl]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTmpSelect = (ranges: any) => {
    setTmpCurrentDateRange([ranges.selection]);
  };

  const handleApplyTmpDateRange = () => {
    setLocalDateRange(tmpCurrentDateRange);
    // Persist to context (and localStorage)
    if (tmpCurrentDateRange[0].startDate && tmpCurrentDateRange[0].endDate) {
      setContextDateRange({ startDate: tmpCurrentDateRange[0].startDate, endDate: tmpCurrentDateRange[0].endDate });
    }
    setShowDatePicker(false);
  };

  // Filter tracking data based on status
  const filteredTrackingData = trackingData.filter((tracking) => {
    if (statusFilter === "all") return true;
    const status = tracking.status?.toUpperCase() || "";

    switch (statusFilter) {
      case "delivered":
        return ["SUCCESS", "DELIVERED", "COMPLETED"].includes(status);
      case "in_transit":
        return ["IN_TRANSIT", "SHIPPED", "TRANSIT"].includes(status);
      case "pending":
        return ["PENDING", "OPEN", "PROCESSING"].includes(status);
      default:
        return true;
    }
  });

  // Calculate stats
  const stats = {
    total: trackingData.length,
    inTransit: trackingData.filter((t) =>
      ["IN_TRANSIT", "SHIPPED", "TRANSIT"].includes(t.status?.toUpperCase() || "")
    ).length,
    delivered: trackingData.filter((t) =>
      ["SUCCESS", "DELIVERED", "COMPLETED"].includes(t.status?.toUpperCase() || "")
    ).length,
    pending: trackingData.filter((t) =>
      ["PENDING", "OPEN", "PROCESSING"].includes(t.status?.toUpperCase() || "")
    ).length,
  };

  // Calculate days in transit
  const calculateDaysInTransit = (tracking: any) => {
    if (!currentDate) return 0;
    const createdDate = new Date(tracking.created_at);
    const status = tracking.status?.toUpperCase() || "";

    if (["SUCCESS", "DELIVERED", "COMPLETED"].includes(status)) {
      // For delivered shipments, calculate actual transit time
      const updatedDate = new Date(tracking.updated_at);
      const days = Math.ceil((updatedDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
      // Return actual days, including 0 for same-day delivery
      return days >= 0 ? days : 0;
    }
    // For in-transit shipments, calculate from creation to now
    const days = Math.ceil((currentDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
    return days >= 0 ? days : 0;
  };

  const formatDateRange = () => {
    if (!dateRange[0].startDate || !dateRange[0].endDate) return "Select dates";
    const start = dateRange[0].startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const end = dateRange[0].endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    return `${start} - ${end}`;
  };

  const isToday = (date: Date) => {
    if (!currentDate) return false;
    return (
      date.getFullYear() === currentDate.getFullYear() &&
      date.getMonth() === currentDate.getMonth() &&
      date.getDate() === currentDate.getDate()
    );
  };

  const statusFilterOptions = [
    { value: "all", label: "All Shipments", icon: FiPackage },
    { value: "in_transit", label: "In Transit", icon: FiTruck },
    { value: "delivered", label: "Delivered", icon: FiCheckCircle },
    { value: "pending", label: "Pending", icon: FiClock },
  ];

  return (
    <main className="flex flex-col h-full w-full border-l-none md:border-l-2 border-t-2 border-[#F4F4F7] rounded-tl-0 md:rounded-tl-[24px] bg-[#F4F5F7] overflow-hidden">
      {/* Header Section */}
      <div className="bg-white px-6 py-5 border-b border-[#E5E7EB]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B1F3B] to-[#3A6EA5] flex items-center justify-center">
              <FiTruck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-h3 text-[#1B1F3B]">Shipment Tracking</h1>
              <p className="text-small text-[#4B5563]">Monitor and track all your shipments</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Selector */}
            <div className="relative" ref={datePickerRef}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="btn btn-ghost flex items-center gap-2 border-2 border-[#E5E7EB] bg-white hover:bg-[#F4F5F7] !py-2 !px-4"
              >
                <FiCalendar className="w-4 h-4 text-[#4B5563]" />
                <span className="text-small text-[#1B1F3B] font-medium">{formatDateRange()}</span>
                <FiChevronDown className="w-4 h-4 text-[#4B5563]" />
              </button>

              {showDatePicker && (
                <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-xl shadow-xl border border-[#E5E7EB] overflow-hidden animate-fade-in-down">
                  <DateRangePicker
                    ranges={tmpCurrentDateRange}
                    onChange={handleTmpSelect}
                    moveRangeOnFirstSelection={false}
                    maxDate={new Date()}
                    rangeColors={["#3A6EA5"]}
                  />
                  <div className="flex justify-end gap-3 p-4 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="btn btn-ghost !py-2 !px-4"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyTmpDateRange}
                      className="btn btn-primary !py-2 !px-4"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="btn btn-ghost flex items-center gap-2 border-2 border-[#E5E7EB] bg-white hover:bg-[#F4F5F7] !py-2 !px-4"
              >
                <FiFilter className="w-4 h-4 text-[#4B5563]" />
                <span className="text-small text-[#1B1F3B] font-medium">
                  {statusFilterOptions.find((o) => o.value === statusFilter)?.label}
                </span>
                <FiChevronDown className="w-4 h-4 text-[#4B5563]" />
              </button>

              {showFilterDropdown && (
                <div className="dropdown-menu animate-fade-in-down">
                  {statusFilterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setStatusFilter(option.value as TrackingStatus);
                        setShowFilterDropdown(false);
                      }}
                      className={`dropdown-item w-full ${
                        statusFilter === option.value ? "bg-[#D7E8FF]" : ""
                      }`}
                    >
                      <option.icon className="w-4 h-4" />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="px-6 py-4 bg-white border-b border-[#E5E7EB]">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Shipments */}
          <div className="stat-card stat-card-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Total Shipments</p>
                <p className="stat-value">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <FiPackage className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* In Transit */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">In Transit</p>
                <p className="stat-value text-[#3B82F6]">{stats.inTransit}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#DBEAFE] flex items-center justify-center">
                <FiTruck className="w-6 h-6 text-[#3B82F6]" />
              </div>
            </div>
          </div>

          {/* Delivered */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Delivered</p>
                <p className="stat-value text-[#10B981]">{stats.delivered}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                <FiCheckCircle className="w-6 h-6 text-[#10B981]" />
              </div>
            </div>
          </div>

          {/* Pending */}
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">Pending</p>
                <p className="stat-value text-[#F59E0B]">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#FEF3C7] flex items-center justify-center">
                <FiClock className="w-6 h-6 text-[#F59E0B]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shipments List Section - Vertical Card Layout */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-[#F4F5F7] p-4 md:p-6">
        {filteredTrackingData.length > 0 ? (
          <div className="space-y-4">
            {/* Group shipments by date */}
            {(() => {
              // Group trackings by date
              const groupedByDate: Record<string, typeof filteredTrackingData> = {};
              filteredTrackingData.forEach((tracking) => {
                const dateKey = new Date(tracking.created_at).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                if (!groupedByDate[dateKey]) {
                  groupedByDate[dateKey] = [];
                }
                groupedByDate[dateKey].push(tracking);
              });

              // Sort dates in descending order (newest first)
              const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
                return new Date(b).getTime() - new Date(a).getTime();
              });

              return sortedDates.map((dateKey, dateIndex) => {
                const trackingsForDate = groupedByDate[dateKey];
                const dateObj = new Date(trackingsForDate[0].created_at);
                const isTodayDate = isToday(dateObj);

                return (
                  <div key={dateKey} className="animate-fade-in-up" style={{ animationDelay: `${dateIndex * 0.05}s` }}>
                    {/* Date Header */}
                    <div className={`flex items-center gap-3 mb-3 px-2 ${isTodayDate ? "text-[#3A6EA5]" : "text-[#4B5563]"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isTodayDate ? "bg-[#D7E8FF]" : "bg-[#E5E7EB]"}`}>
                        <FiCalendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1B1F3B]">{dateKey}</p>
                        <p className="text-small">
                          {trackingsForDate.length} shipment{trackingsForDate.length !== 1 ? "s" : ""}
                          {isTodayDate && <span className="ml-2 text-[#3A6EA5] font-medium">Today</span>}
                        </p>
                      </div>
                    </div>

                    {/* Shipment Cards for this date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {trackingsForDate.map((tracking, trackingIndex) => {
                        const carrier = getCarrierInfo(tracking.tracking_company);
                        const statusInfo = getStatusInfo(tracking.status);
                        const daysInTransit = calculateDaysInTransit(tracking);

                        return (
                          <Link
                            key={tracking.id}
                            href={`/shipments/${tracking.order_id}`}
                            className="block animate-fade-in-up"
                            style={{ animationDelay: `${(dateIndex * 0.05) + (trackingIndex * 0.02)}s` }}
                          >
                            <div
                              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-200 border border-[#E5E7EB] hover:border-[#3A6EA5] cursor-pointer group"
                            >
                              {/* Top Row: Carrier & Status */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${carrier.color}15` }}
                                  >
                                    <Image
                                      src={carrier.logo}
                                      alt={carrier.name}
                                      width={24}
                                      height={24}
                                      className="object-contain"
                                    />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-[#1B1F3B]">{carrier.name}</p>
                                    <p className="text-small text-[#4B5563]">
                                      #{tracking.tracking_number || "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <span className={`badge ${statusInfo.badge}`}>
                                  {statusInfo.label}
                                </span>
                              </div>

                              {/* Middle Row: Order Info */}
                              <div className="flex items-center gap-4 mb-3 text-small text-[#4B5563]">
                                <div className="flex items-center gap-1">
                                  <FiPackage className="w-4 h-4" />
                                  <span>Order #{tracking.order_id ? String(tracking.order_id).slice(-8) : "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <FiClock className="w-4 h-4" />
                                  <span>{daysInTransit} day{daysInTransit !== 1 ? "s" : ""} in transit</span>
                                </div>
                              </div>

                              {/* Bottom Row: Route & Action */}
                              <div className="flex items-center justify-between pt-3 border-t border-[#E5E7EB]">
                                <div className="flex items-center gap-2 text-small text-[#4B5563]">
                                  <FiMapPin className="w-4 h-4 text-[#10B981]" />
                                  <span>Origin</span>
                                  <FiArrowRight className="w-4 h-4" />
                                  <span>Destination</span>
                                </div>
                                <div className="flex items-center gap-1 text-small text-[#3A6EA5] font-medium group-hover:gap-2 transition-all">
                                  <span>View Details</span>
                                  <FiChevronRight className="w-4 h-4" />
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          /* Empty State */
          <div className="h-full flex items-center justify-center bg-white rounded-xl">
            <div className="empty-state">
              <div className="empty-state-icon">
                <FiPackage className="w-8 h-8" />
              </div>
              <h3 className="empty-state-title">No Shipments Found</h3>
              <p className="empty-state-description">
                There are no shipments for the selected date range and filters.
                <br />
                Try adjusting your filters or selecting a different date range.
              </p>
              <button
                onClick={() => {
                  setStatusFilter("all");
                  const start = getStartOfWeek();
                  const end = getEndOfWeek(start);
                  setLocalDateRange([{ startDate: start, endDate: end, key: "selection" }]);
                  setContextDateRange({ startDate: start, endDate: end });
                }}
                className="btn btn-primary"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
