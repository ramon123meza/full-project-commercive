import { roleOptions } from "@/app/utils/constants";
import { createClient } from "@/app/utils/supabase/client";
import { Database } from "@/app/utils/supabase/database.types";
import { ReferralSummaryRow, StoreRow, UserRow } from "@/app/utils/types";
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
import { toast } from "react-toastify";

type UserModalProps = {
  onClose: () => void;
  setAgentID: (id: string | undefined) => void;
  handleUpload: () => void;
};

export const UploadModal: FC<UserModalProps> = ({
  onClose,
  setAgentID,
  handleUpload,
}) => {
  const supabase = createClient();

  const [allAffiliates, setAllAffiliates] = useState<ReferralSummaryRow[]>([]);
  const [affiliateFilter, setAffiliateFilter] = useState<string>();
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    if (affiliateFilter) {
      setAgentID(affiliateFilter);
      handleUpload();
    } else {
      toast.error("Please Select an Affiliate.");
    }
  };

  useEffect(() => {
    // const getAllAffiliates = async () => {
    //   const { data } = await supabase
    //     .from("affiliate_with_customerid_list")
    //     .select("*, user(*)")
    //     .eq("status", "Approved")
    //     .not("customer_id", "is", null);
    //   setAllAffiliates(data || []);
    // };
    // getAllAffiliates();
    setAgentID(undefined);
  }, []);

  return (
    <CustomModal maxWidth={"max-w-[400px]"} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold">Select Agent</h2>

        <div>
          <InputField
            name="customer_id"
            placeholder="Enter Agent Name"
            type="text"
            className="mt-[8px]"
            label="Agent Name"
            onChange={(e: any) => {
              setAgentID(e.target.value);
              setAffiliateFilter(e.target.value);
            }}
          />
        </div>
        <div className="flex justify-end w-full">
          <CustomButton
            label={"Select a File"}
            callback={handleUpdate}
            className="bg-[#6B5FD1] text-[#E5E1FF]"
            interactingAPI={saving}
            disabled={saving || !affiliateFilter}
          />
        </div>
      </div>
    </CustomModal>
  );
};
