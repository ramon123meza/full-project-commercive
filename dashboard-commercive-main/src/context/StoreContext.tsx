"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { redirect, usePathname } from "next/navigation";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import LabelBottomNavigation from "@/components/bottom-navigation";
import { Flip, ToastContainer } from "react-toastify";
import { AffiliateRequestRow, StoreRow, UserRow } from "@/app/utils/types";

// LocalStorage key for persisting selected store
const SELECTED_STORE_KEY = "commercive_selected_store_id";

interface StoreContextProps {
  userinfo?: UserRow;
  updateUserinfo: () => Promise<void>;
  updateAffiliate: () => Promise<void>;
  fetchStoreData: () => Promise<void>;
  selectedStore: StoreRow | null;
  setSelectedStore: React.Dispatch<React.SetStateAction<StoreRow | null>>;
  stores: StoreRow[] | null;
  allStores: StoreRow[];
  chatOpen: boolean;
  setChatOpen: (data: boolean) => void;
  affiliate: AffiliateRequestRow | null;
}

const StoreContext = createContext<StoreContextProps | undefined>(undefined);

// Helper to get stored store ID from localStorage
const getStoredStoreId = (): number | null => {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SELECTED_STORE_KEY);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
};

// Helper to save store ID to localStorage
const saveStoreId = (storeId: number | null) => {
  if (typeof window === "undefined") return;
  try {
    if (storeId !== null) {
      localStorage.setItem(SELECTED_STORE_KEY, storeId.toString());
    } else {
      localStorage.removeItem(SELECTED_STORE_KEY);
    }
  } catch {
    // Ignore localStorage errors
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

      // Try to restore previously selected store from localStorage
      const storedStoreId = getStoredStoreId();
      if (storedStoreId !== null) {
        const previouslySelected = userStores.find((s: StoreRow) => s.id === storedStoreId);
        if (previouslySelected) {
          setSelectedStore(previouslySelected);
          return;
        }
      }

      // Fall back to first store if no stored selection or stored store not found
      setSelectedStore(userStores[0]);
      saveStoreId(userStores[0].id);
    } else {
      setStores([]);
      // Don't redirect if on admin pages - admin users might not have stores
      if (!pathName.startsWith('/admin')) {
        redirect("/support");
      }
    }
  };

  useEffect(() => {
    // Only fetch store data if user is authenticated
    if (userinfo) {
      fetchStoreData();
    }
  }, [userinfo?.id]);

  // Persist selected store to localStorage when it changes
  useEffect(() => {
    if (selectedStore?.id) {
      saveStoreId(selectedStore.id);
    }
  }, [selectedStore?.id]);

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
          stores,
          allStores,
          chatOpen,
          setChatOpen,
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
        stores,
        allStores,
        chatOpen,
        setChatOpen,
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
      stores: null,
      allStores: [],
      chatOpen: false,
      setChatOpen: () => {},
      affiliate: null,
    };
  }

  return context;
};
