import { AFFILIATE_STATUS, roleOptions } from "@/app/utils/constants";
import { createClient } from "@/app/utils/supabase/client";
import { Database } from "@/app/utils/supabase/database.types";
import {
  AffiliateRow,
  ReferralSummaryRow,
  StoreRow,
  UserRow,
} from "@/app/utils/types";
import CustomButton from "@/components/ui/custom-button";
import InputField from "@/components/ui/custom-inputfild";
import CustomModal from "@/components/ui/modal";
import { useStoreContext } from "@/context/StoreContext";
import {
  Autocomplete,
  Checkbox,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { FC, useEffect, useState } from "react";

type AffiliateUpdateModalProps = {
  selectedUser: AffiliateRow;
  onClose: () => void;
  fetchUsers: () => Promise<void>;
};

export const AffiliateUpdateModal: FC<AffiliateUpdateModalProps> = ({
  selectedUser,
  onClose,
  fetchUsers,
}) => {
  const supabase = createClient();

  const [selectedRole, setSelectedRole] = useState(selectedUser.status);
  const [saving, setSaving] = useState(false);
  const [customerID, setCustomerID] = useState(selectedUser.affiliate_id);
  const [formURL, setFormURL] = useState(selectedUser.form_url);
  const [allCustomers, setAllCustomers] = useState<string[]>([]);

  const handleUpdate = async () => {
    console.log("selectedRole :>> ", selectedRole);
    setSaving(true);

    const { error } = await supabase
      .from("affiliates")
      .update({
        status: selectedRole!,
        affiliate_id: customerID,
        form_url: formURL,
      })
      .eq("id", selectedUser.id!);

    console.log("error :>> ", error);
    await fetchUsers();
    setSaving(false);
  };

  const handleOnSelectChange = (
    event: React.SyntheticEvent,
    value: string[]
  ) => {
    console.log("value :>> ", value);
  };

  useEffect(() => {
    const getAllCustomers = async () => {
      const { data } = await supabase.from("customer_ids_view").select();
      const ids = data?.map((item) => item.customer_number!) || [];
      setAllCustomers(ids);
    };
    getAllCustomers();
  }, []);

  return (
    <CustomModal maxWidth={"max-w-[600px]"} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold">
          Update Affiliate ({selectedUser.user?.email})
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <InputField
            name="customer_id"
            placeholder="Enter customer id"
            type="text"
            className="mt-[8px]"
            label="Affiliate ID"
            value={customerID || ""}
            onChange={(e: any) => setCustomerID(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <label>Status</label>
            <Select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value! as any)}
              sx={{
                "& .MuiInputBase-input": { padding: "8px 10px" },
              }}
            >
              {AFFILIATE_STATUS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <InputField
            name="form_url"
            placeholder="Enter Google Form URL"
            type="text"
            className="mt-[8px]"
            label="Google Form URL"
            value={formURL || ""}
            onChange={(e: any) => setFormURL(e.target.value)}
          />
        </div>

        <div className="flex justify-end w-full">
          <CustomButton
            label={"Save"}
            callback={handleUpdate}
            className="bg-[#6B5FD1] text-[#E5E1FF]"
            interactingAPI={saving}
            disabled={saving}
          />
        </div>
      </div>
    </CustomModal>
  );
};
