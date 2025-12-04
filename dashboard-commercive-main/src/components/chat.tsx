"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Image from "next/image";
import { Button, CircularProgress, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { createClient } from "@/app/utils/supabase/client";
import { useStoreContext } from "@/context/StoreContext";
import { usePathname } from "next/navigation";

export default function Chat() {
  const supabase = createClient();
  const { chatOpen, setChatOpen, userinfo, selectedStore } = useStoreContext();

  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState(userinfo?.user_name || "");
  const [email, setEmail] = useState(userinfo?.email || "");
  const [phone, setPhone] = useState(userinfo?.phone_number || "");
  const [storeUrl, setStoreUrl] = useState(selectedStore?.store_url || "");
  const [issue, setIssue] = useState("");
  const [isNameValid, setNameValid] = useState(true);
  const [isEmailValid, setEmailValid] = useState(true);
  const [isStoreUrlValid, setStoreUrlValid] = useState(true);
  const [isIssueValid, setIssueValid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const pathname = usePathname();

  const handleSubmit = async () => {
    if (name === "") {
      setNameValid(false);
      return;
    }
    if (email === "") {
      setEmailValid(false);
      return;
    }
    if (storeUrl === "") {
      setStoreUrlValid(false);
      return;
    }
    if (issue === "") {
      setIssueValid(false);
      return;
    }
    setIsSaving(true);
    const { data, error } = await supabase
      .from("issues")
      .insert({
        name: name,
        email: email || user?.email,
        store_url: storeUrl,
        issue: issue,
        user_id: userinfo!.id,
        phone_number: phone,
      })
      .select();

    if (data) {
      if (pathname === "/support") window.location.reload();
      toast.success("Submitted sucessfully");
      setChatOpen(false);
    } else {
      toast.error(error.message);
    }
    setIsSaving(false);
  };

  const handleClose = () => {
    setChatOpen(false);
    setIssue("");
    setUser(null);
  };

  useEffect(() => {
    if (user && window.location.pathname.includes("support")) {
      setChatOpen(true);
    }
  }, [user]);

  useEffect(() => {
    if (name !== "") {
      setNameValid(true);
    }
    if (email !== "") {
      setEmailValid(true);
    }
    if (storeUrl !== "") {
      setStoreUrlValid(true);
    }
    if (issue !== "") {
      setIssueValid(true);
    }
  }, [name, email, storeUrl, issue]);

  useEffect(() => {
    setStoreUrl(selectedStore?.store_url || "");
  }, [selectedStore]);

  return (
    <div className="fixed bottom-16 sm:bottom-5 right-5 z-20">
      <div className="relative">
        <button
          className="p-3 border-4 rounded-full border-white chat-bg shadow-sm shadow-[#3E3E3E]"
          onClick={() => setChatOpen(!chatOpen)}
        >
          <Image
            className="w-5"
            src="/icons/logo-icon.png"
            width={153}
            height={162}
            alt="logo"
          />
        </button>

        {chatOpen && (
          <form className="absolute z-20 bottom-16 right-0 w-80 sm:w-96 px-6 py-8 rounded-md bg-white shadow-md shadow-purple-500/50 ring-1 ring-purple-300">
            <div className="relative flex flex-col gap-3">
              <IconButton
                size="small"
                className="!absolute -top-5 -right-3 !bg-gray-100 hover:!bg-gray-200"
                onClick={handleClose}
              >
                <CloseIcon />
              </IconButton>

              <div className="flex flex-col gap-1">
                <label className="font-semibold" htmlFor="name">
                  Name
                </label>
                <input
                  className="px-2 py-1 border rounded"
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value.trim())}
                />
                {!isNameValid && (
                  <p className="text-sm text-red-500">Please input name</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold" htmlFor="email">
                  Email
                </label>
                <input
                  className="px-2 py-1 border rounded"
                  type="email"
                  name="email"
                  placeholder="example@email.com"
                  value={email || user?.email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                />
                {!isEmailValid && (
                  <p className="text-sm text-red-500">
                    Please input your email
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold" htmlFor="email">
                  Phone
                </label>
                <input
                  className="px-2 py-1 border rounded"
                  name="phone"
                  placeholder="12345678"
                  value={phone}
                  type="tel"
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  pattern="[0-9]{8,}"
                />
                {!isEmailValid && (
                  <p className="text-sm text-red-500">
                    Please input your email
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold" htmlFor="storeUrl">
                  Store URL
                </label>
                <input
                  className="px-2 py-1 border rounded"
                  type="text"
                  name="storeUrl"
                  placeholder="example.myshopify.com"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value.trim())}
                />
                {!isStoreUrlValid && (
                  <p className="text-sm text-red-500">
                    Please input your store url
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold" htmlFor="issue">
                  Request a Quote or Help
                </label>
                <textarea
                  className="w-full px-2 py-1 border"
                  rows={5}
                  name="issue"
                  placeholder="Tell us what you'd like a quote for, or how we can help."
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                />
                {!isIssueValid && (
                  <p className="text-sm text-red-500">
                    Please input your issue
                  </p>
                )}
              </div>

              <Button
                variant="contained"
                className="!bg-[#4F12CA]"
                onClick={handleSubmit}
                disabled={isSaving}
                loading={isSaving}
                color="info"
                loadingIndicator={
                  <CircularProgress size={20} sx={{ color: "#fff" }} />
                }
              >
                Submit
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
