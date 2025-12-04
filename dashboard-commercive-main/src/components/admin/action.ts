"use server";

import { createAdminClient } from "@/app/utils/supabase/server";

export const signUpByAdmin = async (formData: {
  email: string;
  password: string;
  referral_code: string | null;
  first_name: string | null;
  last_name: string | null;
  user_name: string | null;
  phone_number: string | null;
  role: string | null;
  visible_store: string[] | null;
  visible_pages: string[] | null;
}) => {
  const supabase = await createAdminClient();
  if (!supabase) return { data: null, error: {} };
  const { data, error } = await supabase.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    user_metadata: formData,
    email_confirm: true,
  });
  console.log("new  user :>> ", data, error);
  return { data, error };
};

export const deleteUserByAdmin = async (id: string) => {
  const supabase = await createAdminClient();
  if (!supabase) return { data: null, error: {} };
  const { data, error } = await supabase.auth.admin.deleteUser(id);
  return { data, error };
};
