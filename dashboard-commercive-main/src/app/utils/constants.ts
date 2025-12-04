import { Database } from "./supabase/database.types";

export const roleOptions = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "employee", label: "Employee" },
];

export const AFFILIATE_STATUS: Database["public"]["Enums"]["AFFILIATE_STATUS"][] =
  ["Pending", "Approved", "Declined"];

export const methodOptions = [
  { value: 1, label: "Per Order" },
  { value: 2, label: "% of Total" },
  { value: 0, label: "None" },
];
