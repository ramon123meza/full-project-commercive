import { roleOptions } from "@/app/utils/constants";
import { createClient } from "@/app/utils/supabase/client";
import { Database } from "@/app/utils/supabase/database.types";
import { StoreRow, UserRow } from "@/app/utils/types";
import CustomButton from "@/components/ui/custom-button";
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

type UserModalProps = {
  selectedUser: UserRow;
  onClose: () => void;
  fetchUsers: () => void;
};

export const UserModal: FC<UserModalProps> = ({
  selectedUser,
  onClose,
  fetchUsers,
}) => {
  const supabase = createClient();

  const [selectedRole, setSelectedRole] = useState(
    roleOptions.find((role) => role.value === selectedUser.role) ||
      roleOptions[0]
  );
  const [storeFilter, setStoreFilter] = useState<StoreRow[]>([]);
  const [saving, setSaving] = useState(false);
  const { allStores } = useStoreContext();

  const handleStoreChange = (_: any, newValue: StoreRow[]) => {
    const isSelectAllClicked = newValue.some(
      (item) => item.id === "all_stores"
    );

    if (isSelectAllClicked) {
      const allStoresSelected = allStores.length === storeFilter.length;
      const updatedSelection = allStoresSelected ? [] : allStores;
      setStoreFilter(updatedSelection);
    } else {
      setStoreFilter(newValue);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    await supabase
      .from("user")
      .update({ role: selectedRole.value })
      .eq("id", selectedUser.id);
    await supabase
      .from("store_to_user")
      .delete()
      .eq("user_id", selectedUser.id);
    if (selectedRole.value == "user") {
      const storeToUserRows: Database["public"]["Tables"]["store_to_user"]["Insert"][] =
        storeFilter.map((store) => ({
          user_id: selectedUser.id,
          store_id: store.id,
          uuid: `${selectedUser.id}-${store.id}`,
        }));
      await supabase
        .from("store_to_user")
        .upsert(storeToUserRows, { onConflict: "uuid" });
    }
    await fetchUsers();
    setSaving(false);
  };

  useEffect(() => {
    const getUserStores = async () => {
      const { data } = await supabase
        .from("store_to_user")
        .select("*, stores(*)")
        .eq("user_id", selectedUser.id);
      if (data) {
        setStoreFilter(data.map((row) => row.stores));
      }
    };
    getUserStores();
  }, []);

  return (
    <CustomModal maxWidth={"max-w-[400px]"} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold">Update Roles</h2>
        <div className="flex flex-col gap-4">
          <Select
            value={selectedRole?.value || ""}
            onChange={(event) =>
              setSelectedRole(
                roleOptions.find((role) => role.value === event.target.value)!
              )
            }
          >
            {roleOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </div>
        {selectedRole.value == "user" && (
          <div>
            <Autocomplete
              multiple
              options={allStores}
              disableCloseOnSelect
              getOptionLabel={(option) =>
                option.store_name === "satish-dev"
                  ? "Golf Pro"
                  : option.store_name
              }
              value={storeFilter}
              onChange={handleStoreChange}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              clearOnEscape
              renderOption={(props, option, { selected }) => (
                <MenuItem {...props} key={option.id}>
                  <Checkbox
                    key={option.id}
                    checked={
                      option.id === "all_stores"
                        ? storeFilter.length === allStores.length
                        : selected
                    }
                  />
                  {option.store_name === "satish-dev"
                    ? "Golf Pro"
                    : option.store_name}
                </MenuItem>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select store"
                  variant="outlined"
                  fullWidth
                />
              )}
            />
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
