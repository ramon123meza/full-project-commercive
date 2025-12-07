"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { redirect, usePathname } from "next/navigation";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import LabelBottomNavigation from "@/components/bottom-navigation";
import { Flip, ToastContainer } from "react-toastify";
import { AffiliateRequestRow, StoreRow, UserRow } from "@/app/utils/types";

// LocalStorage keys for persisting state
const SELECTED_STORE_KEY = "commercive_selected_store_id";
const STORE_RESTORATION_FLAG = "commercive_store_restored";
const DATE_RANGE_KEY = "commercive_date_range";

// Lambda URL for DynamoDB persistence
const LAMBDA_URL = process.env.NEXT_PUBLIC_AWS_LAMBDA_URL || "";

// Date range type for persistence
interface DateRangeState {
  startDate: string; // ISO string for storage
  endDate: string;
}

// DynamoDB preferences type
interface UserPreferences {
  user_id: string;
  selected_store_id?: number;
  selected_store_url?: string;
  selected_store_name?: string;
  date_range_start?: string;
  date_range_end?: string;
}

interface StoreContextProps {
  userinfo?: UserRow;
  updateUserinfo: () => Promise<void>;
  updateAffiliate: () => Promise<void>;
  fetchStoreData: () => Promise<void>;
  selectedStore: StoreRow | null;
  setSelectedStore: React.Dispatch<React.SetStateAction<StoreRow | null>>;
  selectStore: (store: StoreRow) => void; // New: explicit store selection with immediate save
  stores: StoreRow[] | null;
  allStores: StoreRow[];
  chatOpen: boolean;
  setChatOpen: (data: boolean) => void;
  affiliate: AffiliateRequestRow | null;
  // Date range persistence
  dateRange: { startDate: Date; endDate: Date } | null;
  setDateRange: (range: { startDate: Date; endDate: Date }) => void;
}

const StoreContext = createContext<StoreContextProps | undefined>(undefined);

// Helper to get stored store ID from localStorage - with robust error handling
const getStoredStoreId = (): number | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SELECTED_STORE_KEY);
    if (!stored) return null;
    const parsed = parseInt(stored, 10);
    // Validate it's a valid number
    if (isNaN(parsed) || parsed <= 0) {
      console.warn("[StoreContext] Invalid stored store ID, clearing:", stored);
      localStorage.removeItem(SELECTED_STORE_KEY);
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("[StoreContext] Error reading store ID from localStorage:", error);
    return null;
  }
};

// Helper to save store ID to localStorage - with robust error handling
const saveStoreId = (storeId: number | null) => {
  if (typeof window === "undefined") return;
  try {
    if (storeId !== null && storeId > 0) {
      localStorage.setItem(SELECTED_STORE_KEY, storeId.toString());
      console.log("[StoreContext] Saved store ID to localStorage:", storeId);
    } else {
      localStorage.removeItem(SELECTED_STORE_KEY);
      console.log("[StoreContext] Removed store ID from localStorage");
    }
  } catch (error) {
    console.error("[StoreContext] Error saving store ID to localStorage:", error);
  }
};

// Helper to check if we've already restored (sessionStorage to persist across page navigations but not browser close)
const hasRestoredInSession = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORE_RESTORATION_FLAG) === "true";
  } catch {
    return false;
  }
};

// Helper to mark that we've restored in this session
const markRestoredInSession = () => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORE_RESTORATION_FLAG, "true");
  } catch {
    // Ignore errors
  }
};

// Helper to get default date range (current week)
const getDefaultDateRange = (): { startDate: Date; endDate: Date } => {
  const today = new Date();
  const day = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - day);
  sunday.setHours(0, 0, 0, 0);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  return { startDate: sunday, endDate: saturday };
};

// Helper to get stored date range from localStorage
const getStoredDateRange = (): { startDate: Date; endDate: Date } | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(DATE_RANGE_KEY);
    if (!stored) return null;
    const parsed: DateRangeState = JSON.parse(stored);
    const startDate = new Date(parsed.startDate);
    const endDate = new Date(parsed.endDate);
    // Validate dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn("[StoreContext] Invalid stored date range, clearing");
      localStorage.removeItem(DATE_RANGE_KEY);
      return null;
    }
    // Check if the dates are not too old (more than 90 days old)
    const now = new Date();
    const daysDiff = Math.abs((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      console.log("[StoreContext] Stored date range too old, using defaults");
      localStorage.removeItem(DATE_RANGE_KEY);
      return null;
    }
    console.log("[StoreContext] Restored date range from localStorage:", parsed);
    return { startDate, endDate };
  } catch (error) {
    console.error("[StoreContext] Error reading date range from localStorage:", error);
    return null;
  }
};

// Helper to save date range to localStorage
const saveDateRange = (range: { startDate: Date; endDate: Date }) => {
  if (typeof window === "undefined") return;
  try {
    const toStore: DateRangeState = {
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
    };
    localStorage.setItem(DATE_RANGE_KEY, JSON.stringify(toStore));
    console.log("[StoreContext] Saved date range to localStorage");
  } catch (error) {
    console.error("[StoreContext] Error saving date range to localStorage:", error);
  }
};

// =============================================================================
// DynamoDB SYNC FUNCTIONS (Cross-device persistence)
// =============================================================================

// Fetch user preferences from DynamoDB
const fetchPreferencesFromDynamoDB = async (userId: string): Promise<UserPreferences | null> => {
  if (!LAMBDA_URL) {
    console.log("[StoreContext] Lambda URL not configured, skipping DynamoDB fetch");
    return null;
  }
  try {
    const response = await fetch(`${LAMBDA_URL}?action=preferences/get&user_id=${encodeURIComponent(userId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.warn("[StoreContext] Failed to fetch preferences from DynamoDB:", response.status);
      return null;
    }

    const data = await response.json();
    if (data.success && data.preferences) {
      console.log("[StoreContext] Fetched preferences from DynamoDB:", data.preferences);
      return data.preferences;
    }
    return null;
  } catch (error) {
    console.error("[StoreContext] Error fetching preferences from DynamoDB:", error);
    return null;
  }
};

// Save store preference to DynamoDB (async, fire-and-forget)
const saveStorePreferenceToDynamoDB = async (userId: string, store: StoreRow) => {
  if (!LAMBDA_URL) return;
  try {
    const response = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "preferences/store",
        user_id: userId,
        store_id: store.id,
        store_url: store.store_url || "",
        store_name: store.store_name || "",
      }),
    });

    if (response.ok) {
      console.log("[StoreContext] Saved store preference to DynamoDB");
    }
  } catch (error) {
    console.error("[StoreContext] Error saving store preference to DynamoDB:", error);
  }
};

// Save date range preference to DynamoDB (async, fire-and-forget)
const saveDateRangePreferenceToDynamoDB = async (userId: string, range: { startDate: Date; endDate: Date }) => {
  if (!LAMBDA_URL) return;
  try {
    const response = await fetch(LAMBDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "preferences/date-range",
        user_id: userId,
        date_range_start: range.startDate.toISOString(),
        date_range_end: range.endDate.toISOString(),
      }),
    });

    if (response.ok) {
      console.log("[StoreContext] Saved date range preference to DynamoDB");
    }
  } catch (error) {
    console.error("[StoreContext] Error saving date range preference to DynamoDB:", error);
  }
};

export const StoreProvider: React.FC<{
  initialUserinfo?: UserRow;
  initialAffiliateRow: AffiliateRequestRow | null;
  initialAllStore: StoreRow[];
  children: React.ReactNode;
}> = ({
  initialUserinfo,
  initialAffiliateRow: iniitialAffilateRow,
  initialAllStore,
  children,
}) => {
  const supabase = createClient();
  const pathName = usePathname();

  const [stores, setStores] = useState<StoreRow[] | null>(null);
  const [allStores, setAllStores] = useState<StoreRow[]>(initialAllStore);
  const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userinfo, setUserinfo] = useState(initialUserinfo);
  const [affiliate, setAffiliate] = useState(iniitialAffilateRow);

  // State-based tracking for restoration (more reliable than refs across re-mounts)
  const [isRestorationComplete, setIsRestorationComplete] = useState(false);
  // Track the initial stored ID at mount time
  const initialStoredId = useRef<number | null>(null);
  // Prevent double-restoration
  const restorationAttempted = useRef(false);
  // Track if we've fetched from DynamoDB
  const dynamoDBFetchAttempted = useRef(false);
  // Store DynamoDB preferences for use during restoration
  const dynamoDBPreferences = useRef<UserPreferences | null>(null);

  // Date range state with persistence
  const [dateRange, setDateRangeInternal] = useState<{ startDate: Date; endDate: Date } | null>(null);
  const dateRangeInitialized = useRef(false);

  const updateUserinfo = async () => {
    if (!userinfo) return;
    const { data } = await supabase
      .from("user")
      .select()
      .eq("id", userinfo.id)
      .single();
    setUserinfo(data!);
  };

  const updateAffiliate = async () => {
    if (!userinfo) return;
    const { data: affilate } = await supabase
      .from("affiliates")
      .select()
      .eq("user_id", userinfo.id)
      .single();
    setAffiliate(affilate);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Explicit store selection handler - saves immediately to localStorage AND DynamoDB
  const selectStore = useCallback((store: StoreRow) => {
    console.log("[StoreContext] User explicitly selected store:", store.store_name);
    // Save to localStorage IMMEDIATELY (synchronously)
    saveStoreId(store.id);
    // Then update state
    setSelectedStore(store);
    // Save to DynamoDB for cross-device persistence (async, fire-and-forget)
    if (userinfo?.id) {
      saveStorePreferenceToDynamoDB(userinfo.id, store);
    }
  }, [userinfo?.id]);

  // Date range setter with immediate localStorage save AND DynamoDB sync
  const setDateRange = useCallback((range: { startDate: Date; endDate: Date }) => {
    console.log("[StoreContext] Setting date range:", range);
    // Save to localStorage immediately
    saveDateRange(range);
    // Update state
    setDateRangeInternal(range);
    // Save to DynamoDB for cross-device persistence (async, fire-and-forget)
    if (userinfo?.id) {
      saveDateRangePreferenceToDynamoDB(userinfo.id, range);
    }
  }, [userinfo?.id]);

  const fetchStoreData = async () => {
    const { data: storeData, error } = await supabase
      .from("store_to_user")
      .select("*, stores(*)");
    const { data: allStoreData } = await supabase.from("stores").select();
    setAllStores(allStoreData || []);
    if (error) {
      console.error("Error fetching stores:", error.message);
      return;
    }

    const userStores =
      userinfo?.role == "user"
        ? storeData.map((row) => row.stores)
        : allStoreData;

    if (userStores && userStores?.length > 0) {
      setStores(userStores);

      // Only attempt restoration once per component lifecycle
      if (!restorationAttempted.current) {
        restorationAttempted.current = true;

        // Read the stored ID from localStorage (use cached value if available)
        let storedStoreId = initialStoredId.current ?? getStoredStoreId();
        console.log("[StoreContext] Attempting restoration, localStorage ID:", storedStoreId);

        // If no localStorage, check DynamoDB preferences (cross-device)
        if (storedStoreId === null && dynamoDBPreferences.current?.selected_store_id) {
          storedStoreId = dynamoDBPreferences.current.selected_store_id;
          console.log("[StoreContext] Using DynamoDB store ID:", storedStoreId);
          // Save to localStorage for future local access
          saveStoreId(storedStoreId);
        }

        if (storedStoreId !== null) {
          const previouslySelected = userStores.find((s: StoreRow) => s.id === storedStoreId);
          if (previouslySelected) {
            console.log("[StoreContext] Successfully restored store:", previouslySelected.store_name);
            setSelectedStore(previouslySelected);
            setIsRestorationComplete(true);
            return;
          }
          // Store ID in localStorage but not found in user's stores
          console.log("[StoreContext] Stored store ID", storedStoreId, "not found in user stores, falling back to first store");
        }

        // Fall back to first store only if no stored selection OR stored store not found
        console.log("[StoreContext] Setting default store:", userStores[0].store_name);
        setSelectedStore(userStores[0]);
        saveStoreId(userStores[0].id);
        // Also save to DynamoDB for cross-device persistence
        if (userinfo?.id) {
          saveStorePreferenceToDynamoDB(userinfo.id, userStores[0]);
        }
        setIsRestorationComplete(true);
      } else if (!selectedStore) {
        // If we've already attempted but selectedStore is null, set to first
        setSelectedStore(userStores[0]);
      }
    } else {
      setStores([]);
      setIsRestorationComplete(true);
      // Don't redirect if on admin pages - admin users might not have stores
      if (!pathName.startsWith('/admin')) {
        redirect("/support");
      }
    }
  };

  // Initialize: Read stored ID immediately on mount (before any async operations)
  useEffect(() => {
    if (typeof window !== "undefined" && initialStoredId.current === null) {
      initialStoredId.current = getStoredStoreId();
      console.log("[StoreContext] Initial stored ID read on mount:", initialStoredId.current);
    }
  }, []);

  // Fetch preferences from DynamoDB on mount (for cross-device persistence)
  useEffect(() => {
    const fetchDynamoDBPreferences = async () => {
      if (!userinfo?.id || dynamoDBFetchAttempted.current) return;
      dynamoDBFetchAttempted.current = true;

      const prefs = await fetchPreferencesFromDynamoDB(userinfo.id);
      if (prefs) {
        dynamoDBPreferences.current = prefs;

        // If localStorage is empty but DynamoDB has preferences, apply them
        const localStoreId = getStoredStoreId();
        const localDateRange = getStoredDateRange();

        // Apply date range from DynamoDB if no local date range
        if (!localDateRange && prefs.date_range_start && prefs.date_range_end) {
          console.log("[StoreContext] Applying date range from DynamoDB");
          const range = {
            startDate: new Date(prefs.date_range_start),
            endDate: new Date(prefs.date_range_end),
          };
          // Validate dates
          if (!isNaN(range.startDate.getTime()) && !isNaN(range.endDate.getTime())) {
            setDateRangeInternal(range);
            saveDateRange(range); // Cache locally
          }
        }

        // Store preferences will be applied in fetchStoreData when stores are loaded
        console.log("[StoreContext] DynamoDB preferences loaded, local store:", localStoreId, "DynamoDB store:", prefs.selected_store_id);
      }
    };

    fetchDynamoDBPreferences();
  }, [userinfo?.id]);

  // Initialize: Restore date range from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !dateRangeInitialized.current) {
      dateRangeInitialized.current = true;
      const storedRange = getStoredDateRange();
      if (storedRange) {
        console.log("[StoreContext] Restoring date range from localStorage");
        setDateRangeInternal(storedRange);
      } else {
        // Set default date range (current week)
        const defaultRange = getDefaultDateRange();
        console.log("[StoreContext] Using default date range (current week)");
        setDateRangeInternal(defaultRange);
        saveDateRange(defaultRange);
      }
    }
  }, []);

  // Fetch store data when userinfo changes
  useEffect(() => {
    // Only fetch store data if user is authenticated
    if (userinfo) {
      fetchStoreData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userinfo]);

  // Persist selected store to localStorage when user changes selection
  // IMPORTANT: Only save AFTER restoration is complete to prevent overwriting
  useEffect(() => {
    // Guard conditions:
    // 1. Restoration must be complete (prevents saving during initialization)
    // 2. Must have a valid store selected
    // 3. Must have stores loaded
    if (!isRestorationComplete) {
      return;
    }

    if (selectedStore?.id && stores && stores.length > 0) {
      // Only save if it's different from what's already stored (prevents unnecessary writes)
      const currentStoredId = getStoredStoreId();
      if (currentStoredId !== selectedStore.id) {
        saveStoreId(selectedStore.id);
        console.log("[StoreContext] User changed store, saved to localStorage:", selectedStore.store_name);
      }
    }
  }, [selectedStore, stores, isRestorationComplete]);

  // For public pages (no user), just render children with minimal context
  if (!userinfo) {
    return (
      <StoreContext.Provider
        value={{
          affiliate,
          updateAffiliate,
          userinfo,
          updateUserinfo,
          selectedStore,
          fetchStoreData,
          setSelectedStore,
          selectStore,
          stores,
          allStores,
          chatOpen,
          setChatOpen,
          dateRange,
          setDateRange,
        }}
      >
        {children}
      </StoreContext.Provider>
    );
  }

  return (
    <StoreContext.Provider
      value={{
        affiliate,
        updateAffiliate,
        userinfo,
        updateUserinfo,
        selectedStore,
        fetchStoreData,
        setSelectedStore,
        selectStore,
        stores,
        allStores,
        chatOpen,
        setChatOpen,
        dateRange,
        setDateRange,
      }}
    >
      <div className="flex flex-col h-screen w-full">
        <div className="sticky flex top-0 z-5">
          {!pathName?.includes("/login") &&
            !pathName?.includes("/signUp") &&
            !pathName?.includes("/error") &&
            !pathName?.includes("/admin") && (
              <Header toggleSidebar={toggleSidebar} />
            )}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className={`flex w-full h-full ${
              pathName?.includes("/admin") && "bg-[#1b1838] p-4"
            }`}
          >
            {!pathName?.includes("/login") &&
              !pathName?.includes("/signUp") &&
              !pathName?.includes("/error") && (
                <Sidebar
                  isOpen={isSidebarOpen}
                  handleToggleSidebar={toggleSidebar}
                />
              )}
            {children}
          </div>
          <div className="flex md:hidden sticky bottom-0 z-50">
            {!pathName?.includes("/login") &&
              !pathName?.includes("/signUp") &&
              !pathName?.includes("/error") && <LabelBottomNavigation />}
          </div>
        </div>
      </div>
      <ToastContainer position="top-right" transition={Flip} />
    </StoreContext.Provider>
  );
};

export const useStoreContext = () => {
  const context = useContext(StoreContext);

  // In development, warn if context is missing, but don't crash the app
  if (!context) {
    if (process.env.NODE_ENV === 'development') {
      console.warn("useStoreContext called outside of StoreProvider - using default values");
    }
    // Return a safe default that won't crash the app
    return {
      userinfo: undefined,
      updateUserinfo: async () => {},
      updateAffiliate: async () => {},
      fetchStoreData: async () => {},
      selectedStore: null,
      setSelectedStore: () => {},
      selectStore: () => {},
      stores: null,
      allStores: [],
      chatOpen: false,
      setChatOpen: () => {},
      affiliate: null,
      dateRange: null,
      setDateRange: () => {},
    };
  }

  return context;
};
