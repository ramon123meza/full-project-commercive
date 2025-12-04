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
  FormControlLabel,
  FormGroup,
} from "@mui/material";
import { FC, useEffect, useState } from "react";
import { toast } from "react-toastify";

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

  // Permission states
  const [permissions, setPermissions] = useState({
    inventory: false,
    dashboard: true,
    partners: false,
    support: true,
  });

  const handlePermissionChange = (permission: keyof typeof permissions) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }));
  };

  const handleUpdate = async () => {
    console.log("selectedRole :>> ", selectedRole);
    setSaving(true);

    try {
      // Build visible_pages array based on selected permissions
      const visiblePages: string[] = [];
      if (permissions.inventory) visiblePages.push("inventory");
      if (permissions.dashboard) visiblePages.push("dashboard", "home");
      if (permissions.partners) visiblePages.push("partners");
      if (permissions.support) visiblePages.push("support");

      // Update affiliate record
      const { error: affiliateError } = await supabase
        .from("affiliates")
        .update({
          status: selectedRole!,
          affiliate_id: customerID,
          form_url: formURL,
        })
        .eq("id", selectedUser.id!);

      if (affiliateError) {
        throw affiliateError;
      }

      // Update user's visible_pages if status is Approved
      if (selectedRole === "Approved") {
        const { error: userError } = await supabase
          .from("user")
          .update({ visible_pages: visiblePages })
          .eq("id", selectedUser.user_id);

        if (userError) {
          throw userError;
        }
      }

      toast.success("Affiliate updated successfully!");
      await fetchUsers();
      onClose();
    } catch (error: any) {
      console.error("error :>> ", error);
      toast.error(error?.message || "Failed to update affiliate");
    } finally {
      setSaving(false);
    }
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

    // Load current permissions from user's visible_pages
    const loadPermissions = async () => {
      const { data: userData } = await supabase
        .from("user")
        .select("visible_pages")
        .eq("id", selectedUser.user_id)
        .single();

      if (userData?.visible_pages) {
        const pages = userData.visible_pages;
        setPermissions({
          inventory: pages.includes("inventory"),
          dashboard: pages.includes("dashboard") || pages.includes("home"),
          partners: pages.includes("partners"),
          support: pages.includes("support"),
        });
      }
    };
    loadPermissions();
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

        {/* Permissions Section - Only show when status is Approved */}
        {selectedRole === "Approved" && (
          <div>
            <h3 className="text-md font-semibold mb-3">Access Permissions</h3>
            <p className="text-sm text-gray-400 mb-4">
              Select which sections this user can access:
            </p>

            <FormGroup className="space-y-2">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={permissions.inventory}
                    onChange={() => handlePermissionChange("inventory")}
                    sx={{
                      color: "#8e52f2",
                      "&.Mui-checked": {
                        color: "#8e52f2",
                      },
                    }}
                  />
                }
                label={
                  <div>
                    <div className="text-white font-medium">Inventory Access</div>
                    <div className="text-xs text-gray-400">
                      Only for clients who hold stock
                    </div>
                  </div>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={permissions.dashboard}
                    onChange={() => handlePermissionChange("dashboard")}
                    sx={{
                      color: "#8e52f2",
                      "&.Mui-checked": {
                        color: "#8e52f2",
                      },
                    }}
                  />
                }
                label={
                  <div>
                    <div className="text-white font-medium">Dashboard Access</div>
                    <div className="text-xs text-gray-400">
                      View analytics and main dashboard
                    </div>
                  </div>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={permissions.partners}
                    onChange={() => handlePermissionChange("partners")}
                    sx={{
                      color: "#8e52f2",
                      "&.Mui-checked": {
                        color: "#8e52f2",
                      },
                    }}
                  />
                }
                label={
                  <div>
                    <div className="text-white font-medium">Partners/Affiliate Access</div>
                    <div className="text-xs text-gray-400">
                      Manage affiliate links and commissions
                    </div>
                  </div>
                }
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={permissions.support}
                    onChange={() => handlePermissionChange("support")}
                    sx={{
                      color: "#8e52f2",
                      "&.Mui-checked": {
                        color: "#8e52f2",
                      },
                    }}
                  />
                }
                label={
                  <div>
                    <div className="text-white font-medium">Support Access</div>
                    <div className="text-xs text-gray-400">
                      Submit and manage support tickets
                    </div>
                  </div>
                }
              />
            </FormGroup>
          </div>
        )}

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
