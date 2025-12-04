"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionResponse } from "@/components/type-identifiers";
import {
  createAdminClient,
  createServerSideClient,
  createSuperAdminClient,
} from "../utils/supabase/server";

export const signup = async (
  prevState: any,
  formData: FormData
): Promise<ActionResponse<void>> => {
  const supabase = await createServerSideClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const referral = formData.get("referral") as string | null;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const userName = formData.get("userName") as string;
  const phoneNumber = formData.get("phoneNumber") as string;

  if (
    !email ||
    !password ||
    !firstName ||
    !lastName ||
    !userName ||
    !phoneNumber
  ) {
    console.error(
      "Email, password, first name, last name, username and phone number is missing"
    );
    return {
      success: false,
      errors:
        "Email, password, first name, last name, username and phone number is missing",
    };
  }

  const { data: existingUser } = await supabase
    .from("user")
    .select("id")
    .eq("email", email)
    .single();

  if (existingUser) {
    return {
      success: false,
      errors: "User_already_exists",
    };
  }

  const { data: user, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_CLIENT_URL}/login`,
      data: {
        referral_code: Math.random().toString(36).substr(2, 8),
        first_name: firstName,
        last_name: lastName,
        user_name: userName,
        phone_number: phoneNumber,
        role: "user",
        visible_store: [],
      },
    },
  });

  if (error) {
    console.error("Error during sign-up:", error.message);
    return {
      success: false,
      errors: error ? error.message : "Error logging in",
    };
  }

  // if (referral && user?.user?.id) {
  //   const { error: referralError } = await supabase.from("referrals").insert({
  //     referred_by: referral,
  //     user_id: user.user.id,
  //   });

  //   if (referralError) {
  //     console.error("Error adding referral:", referralError);
  //     return {
  //       success: false,
  //       errors: "referral_creation_failed",
  //     };
  //   }

  //   if (user) {
  //     return { success: true, message: "SignUp Successfully" };
  //   }
  // }

  revalidatePath("/", "layout");
  return redirect("/login");
};

export const requestSignup = async (
  prevState: any,
  formData: FormData
): Promise<ActionResponse<void>> => {
  const supabase = await createSuperAdminClient();
  const email = formData.get("email") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const userName = formData.get("userName") as string;
  const phoneNumber = formData.get("phoneNumber") as string;

  const { data: existing } = await supabase
    .from("signup_request")
    .select()
    .eq("email", email)
    .single();
  if (existing) {
    return {
      success: false,
      errors: "Already Requested",
    };
  }

  const { data: existingUser } = await supabase
    .from("user")
    .select()
    .eq("email", email)
    .single();

  if (existingUser) {
    return {
      success: false,
      errors: "Already Signed Up",
    };
  }

  const { error } = await supabase.from("signup_request").insert({
    first_name: firstName,
    last_name: lastName,
    user_name: userName,
    phone_number: phoneNumber,
    email: email,
  });
  console.log("error :>> ", error);
  return { success: true };
};
