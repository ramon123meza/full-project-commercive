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

  // Get user role from user table
  const { data: userData } = await supabase
    .from("user")
    .select("role")
    .eq("id", user.id)
    .single();

  // If user doesn't exist in user table yet, create the record
  // This handles cases where auth user was created but user table record wasn't
  if (!userData) {
    const userMetadata = user.user_metadata || {};
    await supabase.from("user").insert({
      id: user.id,
      email: user.email,
      first_name: userMetadata.first_name || userMetadata.firstName || null,
      last_name: userMetadata.last_name || userMetadata.lastName || null,
      user_name: userMetadata.user_name || userMetadata.userName || null,
      phone_number: userMetadata.phone_number || userMetadata.phoneNumber || null,
      role: "user",
      referral_code: userMetadata.referral_code || userMetadata.referralCode || null,
    });
  }

  // IMPORTANT: Check approval status FIRST (before store check)
  // This ensures pending users see "Pending Approval" not "Connect Store"
  if (userData?.role !== "admin") {
    // Check if user has an affiliate record and their approval status
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("status")
      .eq("user_id", user.id)
      .single();

    // If affiliate status is Pending, show approval screen
    if (affiliate?.status === "Pending") {
      return <LockedScreen type="pending_approval" />;
    }

    // Check if user has a connected Shopify store (only after approval check)
    const { data: userStores } = await supabase
      .from("store_to_user")
      .select("store_id")
      .eq("user_id", user.id);

    // If user has no connected stores, show Shopify app installation screen
    if (!userStores || userStores.length === 0) {
      return <LockedScreen type="install_shopify_app" />;
    }
  }

  return <>{children}</>;
}
