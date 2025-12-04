import { Database } from "./supabase/database.types";

export const getStatusColor = (
  status: Database["public"]["Enums"]["AFFILIATE_STATUS"]
) => {
  return status == "Approved"
    ? "text-green-500"
    : status == "Pending"
    ? "text-yellow-400"
    : "text-white";
};
