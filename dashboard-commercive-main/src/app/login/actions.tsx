"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createServerSideClient,
  createSuperAdminClient,
} from "../utils/supabase/server";
import { ActionResponse } from "@/components/type-identifiers";

export const login = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const supabase = await createServerSideClient();

  if (!email || !password) {
    console.error("Email or password is missing");
    return { success: false, errors: "Email or password is missing" };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !user) {
    return { success: false, errors: error?.message ?? "Error logging in" };
  }

  const { data: profile, error: profErr } = await supabase
    .from("user")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr || !profile?.role) {
    return { success: false, errors: "User role not found" };
  }

  const role = profile.role;
  return { success: true, message: "Login successful", role };

  if (role === "admin") {
    redirect("/admin");
  } else {
    revalidatePath("/");
    redirect("/");
  }

  // fallback just in case
};

export const checkEmail = async (email: string) => {
  const supabase = await createSuperAdminClient();
  const { data: userRow } = await supabase
    .from("user")
    .select()
    .eq("email", email)
    .single();
  const { data: request } = await supabase
    .from("signup_request")
    .select()
    .eq("email", email)
    .single();
  if (userRow) {
    return { status: true, request };
  }
  if (request) {
    return {
      status: false,
      request: request,
    };
  } else {
    return {
      status: false,
      request: undefined,
    };
  }
};
