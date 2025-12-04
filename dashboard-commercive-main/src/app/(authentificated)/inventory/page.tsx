"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  HiOutlineCube,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowDownTray,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronUpDown,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
} from "react-icons/hi2";
import { useStoreContext } from "@/context/StoreContext";
import { createClient } from "@/app/utils/supabase/client";

type InventoryItem = {
  image: string | null;
  sku: string;
  name: string;
  stockMeter: number | string | null;
  stockStatus: string;
  backorders: number;
  lastUpdated: string;
  variantName: string;
};

type SortField = "name" | "stockMeter" | "backorders" | "lastUpdated";
type SortDirection = "asc" | "desc";
type FilterTab = "all" | "inStock" | "lowStock" | "outOfStock";

export default function InventoryPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const { selectedStore } = useStoreContext();
  const storeUrl = selectedStore ? selectedStore.store_url : null;

  // Filter and Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sort state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const fetchInventoryData = async () => {
    if (!storeUrl) return;

    setLoading(true);
    try {
      const { data: fetchedData, error: inventoryError } = await supabase
        .from("inventory")
        .select("*")
        .eq("store_url", storeUrl);

      if (inventoryError) {
        console.error("Error fetching inventory data:", inventoryError);
      } else {
        const transformedData: InventoryItem[] = fetchedData.map((item) => {
          const inventory_level = item.inventory_level as any;
          const inventoryQuantities =
            inventory_level?.[0]?.node?.quantities || [];

          const isTracked =
            inventoryQuantities.length > 0 &&
            inventory_level?.[0]?.node?.id != null;

          const available =
            inventoryQuantities.find((q: any) => q.name === "available")
              ?.quantity || 0;
          const committed =
            inventoryQuantities.find((q: any) => q.name === "committed")
              ?.quantity || 0;

          const backOrders = item.back_orders || 0;

          let stockStatus = "Enough Stock";
          let stockMeter: number | string = available + committed;

          if (!isTracked) {
            stockStatus = "Not Tracked";
            stockMeter = "Not tracked";
          } else if (available === 0) {
            stockStatus = "No Stock";
          } else if (available < 50) {
            stockStatus = "Low Stock";
          }

          let urlObj: any = {};
          try {
            urlObj = JSON.parse(item.product_image || "{}");
          } catch (e) {
            urlObj = {};
          }

          return {
            image: urlObj.url || item?.product_image,
            sku: item.sku || "NOSKU",
            name: item.product_name || "",
            variantName: item.variant_name || "",
            stockMeter,
            stockStatus,
            backorders: backOrders,
            lastUpdated: item.updated_at || item.created_at || "",
          };
        });

        setInventoryData(transformedData);
      }
    } catch (error) {
      console.error("Error in fetchInventoryData:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [selectedStore]);

  // Filter data based on active tab
  const filteredByTab = useMemo(() => {
    switch (activeTab) {
      case "inStock":
        return inventoryData.filter((item) => item.stockStatus === "Enough Stock");
      case "lowStock":
        return inventoryData.filter((item) => item.stockStatus === "Low Stock");
      case "outOfStock":
        return inventoryData.filter((item) => item.stockStatus === "No Stock");
      default:
        return inventoryData;
    }
  }, [inventoryData, activeTab]);

  // Filter data based on search query
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return filteredByTab;
    const query = searchQuery.toLowerCase();
    return filteredByTab.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.variantName.toLowerCase().includes(query)
    );
  }, [filteredByTab, searchQuery]);

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...filteredBySearch].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "stockMeter":
          const aStock = typeof a.stockMeter === "number" ? a.stockMeter : -1;
          const bStock = typeof b.stockMeter === "number" ? b.stockMeter : -1;
          comparison = aStock - bStock;
          break;
        case "backorders":
          comparison = a.backorders - b.backorders;
          break;
        case "lastUpdated":
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredBySearch, sortField, sortDirection]);

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, itemsPerPage]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: inventoryData.length,
    inStock: inventoryData.filter((item) => item.stockStatus === "Enough Stock").length,
    lowStock: inventoryData.filter((item) => item.stockStatus === "Low Stock").length,
    outOfStock: inventoryData.filter((item) => item.stockStatus === "No Stock").length,
  }), [inventoryData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <HiOutlineChevronUpDown className="w-4 h-4 text-slate" />;
    }
    return sortDirection === "asc" ? (
      <HiOutlineChevronUp className="w-4 h-4 text-primary" />
    ) : (
      <HiOutlineChevronDown className="w-4 h-4 text-primary" />
    );
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "Enough Stock":
        return "badge-success";
      case "Low Stock":
        return "badge-warning";
      case "No Stock":
        return "badge-error";
      default:
        return "badge-neutral";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "Enough Stock":
        return "In Stock";
      case "Low Stock":
        return "Low Stock";
      case "No Stock":
        return "Out of Stock";
      default:
        return "Not Tracked";
    }
  };

  const getStockMeterClass = (status: string): string => {
    switch (status) {
      case "Enough Stock":
        return "high";
      case "Low Stock":
        return "medium";
      case "No Stock":
        return "low";
      default:
        return "";
    }
  };

  const getStockPercentage = (stockMeter: number | string | null): number => {
    if (stockMeter === null || typeof stockMeter === "string") return 0;
    return Math.min(100, Math.max(0, (stockMeter / 100) * 100));
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const handleExport = () => {
    const csvContent = [
      ["Product Name", "SKU", "Variant", "Available Stock", "Status", "Backorders", "Last Updated"],
      ...sortedData.map((item) => [
        item.name,
        item.sku,
        item.variantName,
        typeof item.stockMeter === "number" ? item.stockMeter : "N/A",
        getStatusLabel(item.stockStatus),
        item.backorders,
        formatDate(item.lastUpdated),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <main className="flex flex-col h-full max-h-full w-full gap-6 border-l-none md:border-l-2 border-t-2 border-[#F4F4F7] rounded-tl-0 md:rounded-tl-[24px] bg-[#FAFAFA] p-4 md:p-8 overflow-auto custom-scrollbar">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="loader" />
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            <HiOutlineCube className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-h2 text-primary">Inventory Management</h1>
            <p className="text-small text-slate">
              {inventoryData.length} products in stock
            </p>
          </div>
        </div>

        <button
          onClick={handleExport}
          className="btn btn-secondary flex items-center gap-2"
        >
          <HiOutlineArrowDownTray className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Filter Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All ({tabCounts.all})
          </button>
          <button
            className={`tab ${activeTab === "inStock" ? "active" : ""}`}
            onClick={() => setActiveTab("inStock")}
          >
            In Stock ({tabCounts.inStock})
          </button>
          <button
            className={`tab ${activeTab === "lowStock" ? "active" : ""}`}
            onClick={() => setActiveTab("lowStock")}
          >
            Low Stock ({tabCounts.lowStock})
          </button>
          <button
            className={`tab ${activeTab === "outOfStock" ? "active" : ""}`}
            onClick={() => setActiveTab("outOfStock")}
          >
            Out of Stock ({tabCounts.outOfStock})
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-container flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "70px" }}>Image</th>
                <th>
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Product Name & SKU
                    {getSortIcon("name")}
                  </button>
                </th>
                <th style={{ width: "200px" }}>
                  <button
                    onClick={() => handleSort("stockMeter")}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Available Stock
                    {getSortIcon("stockMeter")}
                  </button>
                </th>
                <th style={{ width: "130px" }}>Status</th>
                <th style={{ width: "100px" }}>
                  <button
                    onClick={() => handleSort("backorders")}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Backorders
                    {getSortIcon("backorders")}
                  </button>
                </th>
                <th style={{ width: "120px" }}>
                  <button
                    onClick={() => handleSort("lastUpdated")}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    Last Updated
                    {getSortIcon("lastUpdated")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, index) => (
                  <tr key={`${item.sku}-${index}`}>
                    {/* Product Image */}
                    <td>
                      <div
                        className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ background: "var(--neutral-gray)" }}
                      >
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <HiOutlineCube className="w-6 h-6 text-slate" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Product Name & SKU */}
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium text-primary line-clamp-2">
                          {item.name}
                        </span>
                        <span className="text-tiny text-slate">
                          SKU: {item.sku}
                          {item.variantName && ` | ${item.variantName}`}
                        </span>
                      </div>
                    </td>

                    {/* Stock Meter */}
                    <td>
                      <div className="stock-meter">
                        <span className="text-small font-medium text-primary min-w-[40px]">
                          {typeof item.stockMeter === "number"
                            ? item.stockMeter
                            : "N/A"}
                        </span>
                        <div className="stock-meter-bar flex-1">
                          <div
                            className={`stock-meter-fill ${getStockMeterClass(item.stockStatus)}`}
                            style={{ width: `${getStockPercentage(item.stockMeter)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span className={`badge ${getStatusBadgeClass(item.stockStatus)}`}>
                        {getStatusLabel(item.stockStatus)}
                      </span>
                    </td>

                    {/* Backorders */}
                    <td>
                      <span
                        className={`font-medium ${
                          item.backorders > 0 ? "text-error" : "text-slate"
                        }`}
                      >
                        {item.backorders}
                      </span>
                    </td>

                    {/* Last Updated */}
                    <td>
                      <span className="text-small text-slate">
                        {formatDate(item.lastUpdated)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state py-12">
                      <div className="empty-state-icon">
                        <HiOutlineCube className="w-10 h-10" />
                      </div>
                      <p className="empty-state-title">No inventory items found</p>
                      <p className="empty-state-description">
                        {searchQuery
                          ? "Try adjusting your search or filters"
                          : "Start by adding products to your inventory"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {sortedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-gray-100">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-small text-slate">Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="input py-1 px-2 w-auto text-small"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-small text-slate">per page</span>
            </div>

            {/* Page info */}
            <div className="text-small text-slate">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, sortedData.length)} of{" "}
              {sortedData.length} items
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="btn btn-ghost btn-sm disabled:opacity-50"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn btn-ghost btn-sm disabled:opacity-50"
              >
                <HiOutlineChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-small font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-primary text-white"
                          : "hover:bg-sky text-slate"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-ghost btn-sm disabled:opacity-50"
              >
                <HiOutlineChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="btn btn-ghost btn-sm disabled:opacity-50"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
