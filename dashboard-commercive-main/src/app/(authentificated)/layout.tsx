import { ReactNode } from "react";
import { createServerSideClient } from "../utils/supabase/server";
import { redirect } from "next/navigation";
import LockedScreen from "@/components/ui/LockedScreen";

export default async function Layout({ children }: { children: ReactNode }) {
  const supabase = await createServerSideClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user role
  const { data: userData } = await supabase
    .from("user")
    .select("role")
    .eq("id", user.id)
    .single();

  // Check if user has a connected Shopify store
  // (Admins are exempt from this check)
  if (userData?.role !== "admin") {
    const { data: userStores } = await supabase
      .from("store_to_user")
      .select("store_id")
      .eq("user_id", user.id);

    // If user has no connected stores, show Shopify app installation screen
    if (!userStores || userStores.length === 0) {
      return <LockedScreen type="install_shopify_app" />;
    }
  }

  // Check if user has an affiliate record and their approval status
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("status")
    .eq("user_id", user.id)
    .single();

  // If not an admin and affiliate status is Pending, show approval screen
  if (userData?.role !== "admin" && affiliate?.status === "Pending") {
    return <LockedScreen type="pending_approval" />;
  }

  return <>{children}</>;
}
