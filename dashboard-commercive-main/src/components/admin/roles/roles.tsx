"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import CustomTable from "@/components/ui/custom-table";
import CustomButton from "../../ui/custom-button";
import { createClient } from "@/app/utils/supabase/client";
import CustomModal from "../../ui/modal";
import {
  Autocomplete,
  Checkbox,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { FiPlus } from "react-icons/fi";
import InputField from "../../ui/custom-inputfild";
import { useStoreContext } from "@/context/StoreContext";
import { StoreRow, UserRow } from "@/app/utils/types";
import { deleteUserByAdmin, signUpByAdmin } from "../action";
import { Database } from "@/app/utils/supabase/database.types";
import { roleOptions } from "@/app/utils/constants";
import { UserModal } from "./UserModal";
import Affiliate from "./Affiliate";

export default function Roles() {
  const supabase = createClient();
  const [usersData, setUsersData] = useState<UserRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow>();
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const { allStores: storeData } = useStoreContext();
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addNewModalOpen, setAddNewModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>({});

  const [storeFilter, setStoreFilter] = useState<StoreRow[]>([]);
  const [storePage, setPageFilter] = useState<
    { label: string; value: string }[]
  >([]);

  let limit = 10;

  const pageOptions = [
    { value: "inventory", label: "Inventory" },
    { value: "partners", label: "Partners" },
    { value: "roles", label: "Roles" },
    { value: "tickets", label: "Tickets" },
    { value: "payouts", label: "Payouts" },
  ];

  const initialFormData = {
    email: "",
    first_name: "",
    last_name: "",
    user: "",
    phone_number: "",
    role: "",
    store: [] as string[],
    pages: [] as string[],
    password: "",
  };
  const [formData, setFormData] = useState(initialFormData);
  const initialError = {
    email: "",
    first_name: "",
    last_name: "",
    user: "",
    phone_number: "",
    role: "",
    store: "",
    pages: "",
    password: "",
  };
  const [errors, setErrors] = useState(initialError);

  const handleAddNewUserChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>,
    updatedField: Partial<typeof formData>
  ) => {
    setFormData((prev) => ({
      ...prev,
      ...updatedField,
    }));
    setErrors((prev) => ({
      ...prev,
      ...Object.keys(updatedField).reduce((acc, key) => {
        acc[key as keyof typeof formData] = "";
        return acc;
      }, {} as typeof errors),
    }));
  };

  const handleStoreChange = (_: any, newValue: StoreRow[]) => {
    const isSelectAllClicked = newValue.some(
      (item) => item.id === "all_stores"
    );

    if (isSelectAllClicked) {
      const allStoresSelected = storeData.length === storeFilter.length;
      const updatedSelection = allStoresSelected ? [] : storeData;

      setStoreFilter(updatedSelection);
      const selectedStores = updatedSelection.map((store) => store.id);

      setFormData((prev) => ({ ...prev, store: selectedStores }));
      setErrors((prev) => ({
        ...prev,
        store:
          selectedStores.length === 0
            ? "Please select at least one store."
            : "",
      }));
    } else {
      setStoreFilter(newValue);
      const selectedStores = newValue.map((store) => store.id);

      setFormData((prev) => ({ ...prev, store: selectedStores }));
      setErrors((prev) => ({
        ...prev,
        store:
          selectedStores.length === 0
            ? "Please select at least one store."
            : "",
      }));
    }
  };
  const optionsWithSelectAll = [...storeData];

  const handlePageChange = (
    _: any,
    newValue: { label: string; value: string }[]
  ) => {
    setPageFilter(newValue);
    // Extract only store values
    const selectedPages = newValue.map((page) => page.value);
    setFormData((prev) => ({ ...prev, pages: selectedPages }));
  };

  const handleRoleOpenModal = () => {
    setRoleModalOpen(true);
  };

  const handleNewOpenModal = () => {
    setAddNewModalOpen(true);
  };

  const closeRoleModal = () => {
    setRoleModalOpen(false);
    setSelectedRole(null);
  };

  const closeNewModal = () => {
    setAddNewModalOpen(false);
    setErrors(initialError);
    setFormData(initialFormData);
    setStoreFilter([]);
  };

  const handlePagination = (curPage: number) => {
    setPage(curPage);
  };
  const handleCheckboxClick = (user: UserRow) => {
    handleRoleOpenModal();
    setSelectedUser(user);
  };
  const handleOnDelete = (user: UserRow) => {
    setDeleteModalOpen(true);
    setSelectedUser(user);
  };

  const handleRoleUpdate = async () => {
    setSaving(true);
    try {
      if (!selectedRole) {
        toast.error("Please select a role.");
        return;
      }
      await supabase
        .from("user")
        .update({ role: selectedRole.value })
        .eq("id", selectedUser!.id);

      toast.success("Roles updated successfully.");

      fetchUsersData();
      closeRoleModal();
      setSelectedUser(undefined);
    } catch (error) {
      console.error("Error updating roles:", error);
      toast.error("Failed to update roles. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    const { error } = await deleteUserByAdmin(selectedUser!.id);
    if (!error) {
      await fetchUsersData();
      toast.success("User deleted successfully!");
    } else {
      toast.error("Error");
    }
    setSaving(false);
    setDeleteModalOpen(false);
    setSelectedUser(undefined);
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Custom validation
  const validateForm = () => {
    const newErrors: any = {};

    if (!formData?.user?.trim()) newErrors.user = "User name is required.";

    if (!formData?.email?.trim()) {
      newErrors.email = "Email is required.";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    // FIX Issue 14: Uncomment store validation
    if (formData.role === "admin" && formData.store.length === 0) {
      newErrors.store = "Please select at least one store.";
    }

    if (!formData?.first_name?.trim())
      newErrors.first_name = "First name is required.";
    if (!formData?.last_name?.trim())
      newErrors.last_name = "Last name is required.";
    if (!formData?.password?.trim())
      newErrors.password = "Password is required.";

    if (!formData?.phone_number?.trim()) {
      newErrors.phone_number = "Phone number is required.";
    } else if (!/^\d{1,11}$/.test(formData.phone_number)) {
      newErrors.phone_number = "Phone number must be up to 11 digits.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (id: any) => {
    if (isLoading) return;
    if (validateForm()) {
      setSaving(true);
      try {
        // FIX Issue 14: Use formData.pages instead of empty array
        const { data, error } = await signUpByAdmin({
          email: formData.email,
          password: formData.password,
          referral_code: "",
          first_name: formData.first_name,
          last_name: formData.last_name,
          user_name: formData.user,
          phone_number: formData.phone_number,
          role: formData.role || "user",
          visible_store: formData.store,
          visible_pages: formData.pages || [],
        });
        if (error instanceof Error) {
          toast.error(
            error.message || "Failed to save data. Please try again."
          );
          setSaving(false);
          return;
        }

        // FIX Issue 14: Create store_to_user entries after user creation
        if (data?.user_id && formData.store.length > 0) {
          const storeLinks = formData.store.map((storeId: string) => ({
            user_id: data.user_id,
            store_id: storeId,
          }));

          const { error: linkError } = await supabase
            .from('store_to_user')
            .insert(storeLinks);

          if (linkError) {
            console.error('Error linking stores to user:', linkError);
            toast.error('User created but failed to link stores. Please edit the user to add stores.');
          }
        }

        toast(id ? "Data updated successfully" : "Data added successfully");
        fetchUsersData();
        setEditData({});
      } catch (error: unknown) {
        console.error("Unexpected error:", error);
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("An unexpected error occurred");
        }
      }
      setSaving(false);
      setStoreFilter([]);
      setFormData(initialFormData);
      setAddNewModalOpen(false);
    }
  };

  const tableConfig = {
    handlePagination: handlePagination,
    notFoundData: "No Data found",
    actionPresent: true,
    actionList: ["checkbox"],
    columns: [
      {
        field: "email",
        headerName: "Email",
        customRender: (row: any) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">{row?.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        field: "referral_code",
        headerName: "Referral Code",
        customRender: (row: any) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">{row?.referral_code}</p>
              </div>
            </div>
          );
        },
      },
      {
        field: "first_name",
        headerName: "First Name",
        customRender: (row: any) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">{row?.first_name}</p>
              </div>
            </div>
          );
        },
      },
      {
        field: "last_name",
        headerName: "Last Name",
        customRender: (row: any) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">{row?.last_name}</p>
              </div>
            </div>
          );
        },
      },
      {
        field: "user_name",
        headerName: "User Name",
        customRender: (row: any) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">{row?.user_name}</p>
              </div>
            </div>
          );
        },
      },
      {
        field: "phone_number",
        headerName: "Phone Number",
        customRender: (row: any) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">{row?.phone_number}</p>
              </div>
            </div>
          );
        },
      },
      {
        field: "role",
        headerName: "Role",
        customRender: (row: any) => {
          return (
            <div className="flex gap-2">
              <div>
                <p className="text-white">{row?.role}</p>
              </div>
            </div>
          );
        },
      },
    ],
    rows: usersData || [],
  };

  const fetchUsersData = async () => {
    setIsLoading(true);
    try {
      const start = (page - 1) * limit;
      const { data, count, error } = await supabase
        .from("user")
        .select("*", { count: "exact" }) // Fetch data with exact count
        .range(start, start + limit - 1);

      if (error) {
        console.error("Error fetching referrals data:", error);
      } else {
        setUsersData(data || []);
        setTotalRecords(count || 0); // Update total records
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle "Next" and "Previous" actions
  const handleNext = () => {
    if (page < Math.ceil(totalRecords / limit)) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const handlePrevious = () => {
    if (page > 1) {
      setPage((prevPage) => prevPage - 1);
    }
  };

  // Fetch data whenever the page changes
  useEffect(() => {
    fetchUsersData();
  }, [page]);

  return (
    <div className="flex flex-col w-full gap-5">
      <h1 className="text-2xl text-white">Roles</h1>

      {roleModalOpen && selectedUser && (
        <UserModal
          selectedUser={selectedUser}
          onClose={closeRoleModal}
          fetchUsers={fetchUsersData}
        />
      )}
      {addNewModalOpen && (
        <CustomModal onClose={closeNewModal} maxWidth={"max-w-[800px]"}>
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-semibold">Add New</h2>
            <div className="flex flex-col gap-6 max-sm:h-full max-sm:max-h-[350px] custom-scrollbar">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-col relative w-full">
                  <InputField
                    name="email"
                    placeholder="Enter your email"
                    type="email"
                    className="mt-[8px]"
                    label={`Email`}
                    value={formData.email || ""}
                    onChange={(e: any) =>
                      handleAddNewUserChange(e, { email: e.target.value })
                    }
                  />
                  {errors?.email && (
                    <p className="text-red-500 absolute text-sm -bottom-[20px] message">
                      {errors?.email}
                    </p>
                  )}
                </div>
                <div className="flex flex-col relative w-full">
                  <InputField
                    name="password"
                    placeholder="Enter Password"
                    type="text"
                    className="mt-[8px]"
                    label={`Password`}
                    value={formData.password || ""}
                    onChange={(e: any) =>
                      handleAddNewUserChange(e, { password: e.target.value })
                    }
                  />
                  {errors?.password && (
                    <p className="text-red-500 absolute text-sm -bottom-[20px] message">
                      {errors?.password}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-col relative w-full">
                  <InputField
                    name="first_name"
                    placeholder="Enter First name"
                    type="text"
                    className="mt-[8px]"
                    label={`First Name`}
                    value={formData.first_name || ""}
                    onChange={(e: any) =>
                      handleAddNewUserChange(e, { first_name: e.target.value })
                    }
                  />
                  {errors?.first_name && (
                    <p className="text-red-500 absolute text-sm -bottom-[20px] message">
                      {errors?.first_name}
                    </p>
                  )}
                </div>
                <div className="flex flex-col relative w-full">
                  <InputField
                    name="last_name"
                    placeholder="Enter last name"
                    type="text"
                    className="mt-[8px]"
                    label={`Last Name`}
                    value={formData.last_name || ""}
                    onChange={(e: any) =>
                      handleAddNewUserChange(e, { last_name: e.target.value })
                    }
                  />
                  {errors?.last_name && (
                    <p className="text-red-500 absolute text-sm -bottom-[20px] message">
                      {errors?.last_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-col relative w-full">
                  <InputField
                    name="user"
                    placeholder="Enter user name"
                    type="text"
                    className="mt-[8px]"
                    label={`User Name`}
                    value={formData.user || ""}
                    onChange={(e: any) =>
                      handleAddNewUserChange(e, { user: e.target.value })
                    }
                  />
                  {errors?.user && (
                    <p className="text-red-500 absolute text-sm -bottom-[20px] message">
                      {errors?.user}
                    </p>
                  )}
                </div>
                <div className="flex flex-col relative w-full">
                  <InputField
                    name="phone_number"
                    placeholder="Enter Phone Number"
                    type="text"
                    className="mt-[8px]"
                    label={`Phone Number`}
                    value={formData.phone_number || ""}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
                      if (value.length <= 11) {
                        handleAddNewUserChange(e, { phone_number: value });
                      }
                    }}
                  />
                  {errors?.phone_number && (
                    <p className="text-red-500 absolute text-sm -bottom-[20px] message">
                      {errors?.phone_number}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col relative w-full">
                <InputLabel>Role</InputLabel>
                <select
                  name="Role"
                  id=""
                  className="border border-color-[#D4D77D] border-opacity-5 p-[9px] mt-2.5 rounded-md focus-within:outline-none"
                  value={formData.role || ""}
                  onChange={(e) =>
                    handleAddNewUserChange(e, { role: e.target.value })
                  }
                >
                  {roleOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="focus-within:outline-none"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {(formData.role === "admin" || formData.role === "employee") && (
                <div className="flex flex-col sm:flex-row gap-3">
                  {formData.role === "admin" && (
                    <div className="flex flex-col relative w-full">
                      <Autocomplete
                        multiple
                        options={pageOptions}
                        disableCloseOnSelect
                        getOptionLabel={(option) => option.label || ""}
                        value={storePage}
                        onChange={handlePageChange}
                        isOptionEqualToValue={(option, value) =>
                          option.value === value.value
                        }
                        clearOnEscape
                        renderOption={(props, option, { selected }) => (
                          <MenuItem {...props} key={option.value}>
                            <Checkbox checked={selected} key={option.value} />
                            {option.label}
                          </MenuItem>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select pages"
                            variant="outlined"
                            fullWidth
                          />
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end w-full">
              <CustomButton
                label={"Save"}
                callback={() => {
                  handleSave(editData.id ? editData.id : undefined);
                }}
                className="bg-[#6B5FD1] text-[#E5E1FF]"
                interactingAPI={saving}
                disabled={saving}
              />
            </div>
          </div>
        </CustomModal>
      )}
      {deleteModalOpen && (
        <CustomModal
          onClose={() => setDeleteModalOpen(false)}
          maxWidth={"max-w-[400px]"}
        >
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-semibold">Delete User?</h2>

            <div className="flex justify-end w-full">
              <CustomButton
                label={"OK"}
                callback={handleDelete}
                className="bg-[#6B5FD1] text-[#E5E1FF]"
                interactingAPI={saving}
                disabled={saving}
              />
            </div>
          </div>
        </CustomModal>
      )}
      <div className="flex flex-col sm:flex-row w-full justify-between gap-3">
        <div className="flex">
          <CustomButton
            label={"Add New"}
            className="w-max"
            prefixIcon={<FiPlus size={24} />}
            callback={handleNewOpenModal}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-[#E5E1FF]">
            Showing {(page - 1) * limit + 1}-
            {Math.min(page * limit, totalRecords)} of {totalRecords}
          </p>
          <div className="flex items-center gap-3">
            <CustomButton
              label={"Previous"}
              className="bg-[#6B5FD1] text-[#E5E1FF]"
              callback={handlePrevious}
              disabled={page === 1}
            />
            <CustomButton
              label={"Next"}
              className="bg-[#6B5FD1] text-[#E5E1FF]"
              callback={handleNext}
              disabled={page >= Math.ceil(totalRecords / limit)}
            />
          </div>
        </div>
      </div>
      <CustomTable
        tableConfig={tableConfig}
        isLoading={isLoading}
        limit={limit}
        showCheckbox
        onCheckboxClick={handleCheckboxClick}
        onDelete={handleOnDelete}
      />
      <Affiliate />
    </div>
  );
}
