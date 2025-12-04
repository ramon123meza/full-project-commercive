"use client";

import CustomButton from "@/components/ui/custom-button";
import InputField from "@/components/ui/custom-inputfild";
import { useState } from "react";
import { toast } from "react-toastify";
import { createClient } from "../utils/supabase/client";

export default function ResetPassword() {
  const supabase = createClient();
  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = (e: any) => {
    const { name, value } = e.target;
    setPasswords((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!passwords.password || !passwords.confirmPassword) {
      toast.error("Please fill in both fields.");
      return;
    }

    if (passwords.password !== passwords.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: passwords.password,
      });
      if (error) {
        toast.error(error.message);
      } else {
        if (data) {
          toast.success("Password updated successfully!");
        }
        setPasswords({ password: "", confirmPassword: "" });
      }
    } catch (err) {
      toast.error("Something went wrong! Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-screen p-4 md:p-8 max-h-full gap-5 border-l-none md:border-l-2 border-t-2 border-[#F4F4F7] rounded-tl-0 md:rounded-tl-[24px] bg-[#FAFAFA] overflow-auto custom-scrollbar">
      <div className="flex flex-col gap-5 max-w-[400px] w-full">
        <InputField
          name="password"
          placeholder="Enter new password"
          type="password"
          className="mt-[8px]"
          label="Password"
          value={passwords?.password}
          onChange={handlePasswordChange}
          showPasswordSuffix={true}
        />
        <InputField
          name="confirmPassword"
          placeholder="Enter confirm password"
          type="password"
          className="mt-[8px]"
          label="Confirm Password"
          value={passwords?.confirmPassword}
          onChange={handlePasswordChange}
          showPasswordSuffix={true}
        />

        <CustomButton
          type="button"
          interactingAPI={loading}
          label="Save"
          className="max-w-[100px]"
          callback={handleSubmit}
        />
      </div>
    </div>
  );
}
