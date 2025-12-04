import { createClient } from "@/app/utils/supabase/client";
import { AffiliateRow } from "@/app/utils/types";
import CustomButton from "@/components/ui/custom-button";
import CustomModal from "@/components/ui/modal";
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import { FC, useState } from "react";
import { toast } from "react-toastify";

type ApprovalModalProps = {
  selectedUser: AffiliateRow;
  onClose: () => void;
  fetchUsers: () => Promise<void>;
};

export const ApprovalModal: FC<ApprovalModalProps> = ({
  selectedUser,
  onClose,
  fetchUsers,
}) => {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  // Permission states
  const [permissions, setPermissions] = useState({
    inventory: false,
    dashboard: true, // Default to true - everyone should see dashboard
    partners: false,
    support: true, // Default to true - everyone should access support
  });

  const handlePermissionChange = (permission: keyof typeof permissions) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }));
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      // Build visible_pages array based on selected permissions
      const visiblePages: string[] = [];
      if (permissions.inventory) visiblePages.push("inventory");
      if (permissions.dashboard) visiblePages.push("dashboard", "home");
      if (permissions.partners) visiblePages.push("partners");
      if (permissions.support) visiblePages.push("support");

      // Update affiliate status to Approved
      const { error: affiliateError } = await supabase
        .from("affiliates")
        .update({ status: "Approved" })
        .eq("id", selectedUser.id!);

      if (affiliateError) {
        throw affiliateError;
      }

      // Update user's visible_pages
      const { error: userError } = await supabase
        .from("user")
        .update({ visible_pages: visiblePages })
        .eq("id", selectedUser.user_id);

      if (userError) {
        throw userError;
      }

      toast.success(
        `Account approved for ${selectedUser.user?.email}! User can now access the dashboard.`
      );
      await fetchUsers();
      onClose();
    } catch (error: any) {
      console.error("Error approving account:", error);
      toast.error(error?.message || "Failed to approve account");
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = async () => {
    setSaving(true);
    try {
      // Update affiliate status to Declined
      const { error } = await supabase
        .from("affiliates")
        .update({ status: "Declined" })
        .eq("id", selectedUser.id!);

      if (error) {
        throw error;
      }

      toast.success(`Account declined for ${selectedUser.user?.email}`);
      await fetchUsers();
      onClose();
    } catch (error: any) {
      console.error("Error declining account:", error);
      toast.error(error?.message || "Failed to decline account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModal maxWidth={"max-w-[600px]"} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Approve Account</h2>
          <p className="text-sm text-gray-300">
            Review and approve access for {selectedUser.user?.email}
          </p>
        </div>

        {/* User Information */}
        <div className="bg-[#2D2657] rounded-lg p-4 space-y-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Name:</span>
              <p className="text-white font-medium">
                {selectedUser.user?.first_name} {selectedUser.user?.last_name}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Email:</span>
              <p className="text-white font-medium">{selectedUser.user?.email}</p>
            </div>
            <div>
              <span className="text-gray-400">Phone:</span>
              <p className="text-white font-medium">
                {selectedUser.user?.phone_number || "N/A"}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Affiliate ID:</span>
              <p className="text-white font-medium">{selectedUser.affiliate_id}</p>
            </div>
          </div>
        </div>

        {/* Permissions Section */}
        <div>
          <h3 className="text-md font-semibold mb-3">Assign Permissions</h3>
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
                    Only for clients who hold stock - manage inventory levels and products
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
                    View analytics, orders, and main dashboard features
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
                    Manage affiliate links, commissions, and partner programs
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <CustomButton
            label={"Decline"}
            callback={handleDecline}
            className="bg-red-600 hover:bg-red-700 text-white"
            interactingAPI={saving}
            disabled={saving}
          />
          <CustomButton
            label={"Approve & Grant Access"}
            callback={handleApprove}
            className="bg-[#6B5FD1] text-[#E5E1FF]"
            interactingAPI={saving}
            disabled={saving}
          />
        </div>
      </div>
    </CustomModal>
  );
};
