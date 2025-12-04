import { Database } from "./supabase/database.types";

export type StoreRow = Database["public"]["Tables"]["stores"]["Row"];
export type UserRow = Database["public"]["Tables"]["user"]["Row"];
export type IssueRow = Database["public"]["Tables"]["issues"]["Row"];
export type RequestRow = Database["public"]["Tables"]["signup_request"]["Row"];

export type AffiliateRequestRow =
  Database["public"]["Tables"]["affiliates"]["Row"];
export type PayoutRow = Database["public"]["Tables"]["payouts"]["Row"];
export type PayoutInsert = Database["public"]["Tables"]["payouts"]["Insert"];
export type ReferralRow = Database["public"]["Tables"]["referrals"]["Row"];
export type ReferralViewRow =
  Database["public"]["Views"]["referral_view"]["Row"];
export type WalletRow = Database["public"]["Views"]["referral_summary"]["Row"];
export type ReferralSummaryRow =
  Database["public"]["Views"]["referral_summary"]["Row"] & {
    user: UserRow | null;
  };
export type AffiliateRow = Database["public"]["Tables"]["affiliates"]["Row"] & {
  user: UserRow | null;
};
export type PayoutUserRow = PayoutRow & {
  user: UserRow;
};
export type PayoutViewRow =
  Database["public"]["Views"]["payout_view"]["Row"] & {
    user: UserRow | null;
  };

export type AffiliateSettingViewRow =
  Database["public"]["Views"]["affiliate_setting_view"]["Row"];
