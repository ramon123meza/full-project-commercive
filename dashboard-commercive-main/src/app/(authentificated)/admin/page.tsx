"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Partner from "@/components/admin/partner/partner";
import Ticket from "@/components/admin/ticket";
import Roles from "@/components/admin/roles/roles";
import Inventory from "@/components/admin/inventory";
import Home from "@/components/admin/home";
import { createClient } from "@/app/utils/supabase/client";

export default function AdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [visiblePages, setVisiblePages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserDetails = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: fetchedUserData, error } = await supabase
        .from("user")
        .select("visible_pages")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user data:", error);
        return;
      }

      let pages = fetchedUserData?.visible_pages;

      if (Array.isArray(pages) && typeof pages[0] === "string") {
        try {
          pages = JSON.parse(pages[0]); // Handle JSON parsing if needed
        } catch (err) {
          console.error("Error parsing visible_pages:", err);
          pages = [];
        }
      }

      setVisiblePages(pages || []);
      setLoading(false);
    };

    getUserDetails();
  }, [router]);

  useEffect(() => {
    if (loading) return;

    const pageName = pathname.replace("/admin/", "");

    if (pathname === "/admin" || !visiblePages.includes(pageName)) {
      if (!visiblePages || visiblePages.length === 0) {
        router.replace("/admin/home");
      } else {
        router.replace(`/admin/${visiblePages[0]}`);
      }
    }
  }, [pathname, visiblePages, loading, router]);

  if (loading || !visiblePages.includes(pathname.replace("/admin/", ""))) {
    return <div className="text-white">Loading...</div>;
  }

  return (
    <div className="flex flex-col w-full gap-4 border-2 border-[#373163] rounded-[24px] bg-[#231e45] p-4 md:p-8 overflow-auto custom-scrollbar">
      {pathname === "/admin/home" && <Home />}
      {pathname === "/admin/inventory" && <Inventory />}
      {pathname === "/admin/partners" && <Partner />}
      {pathname === "/admin/tickets" && <Ticket />}
      {pathname === "/admin/roles" && <Roles />}
    </div>
  );
}
