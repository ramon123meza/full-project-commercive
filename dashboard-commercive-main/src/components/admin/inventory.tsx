"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { Autocomplete, TextField } from "@mui/material";
import CustomTable from "../ui/custom-table";
import CustomButton from "../ui/custom-button";
import { FiPlus } from "react-icons/fi";
import CustomModal from "../ui/modal";
import InputField from "../ui/custom-inputfild";
import { MdOutlineFileUpload } from "react-icons/md";
import { RiLoader2Fill } from "react-icons/ri";
import Image from "next/image";
import { toast } from "react-toastify";
import { Database } from "@/app/utils/supabase/database.types";
interface FormDataType {
  id?: string;
  sku: string;
  product_id: string;
  inventory_id: string;
  store_url: string;
  inventory_level: {
    node: {
      quantities: { name: string; quantity: string | number }[];
    };
  }[];
  product_image: string | null; // <-- Ensure it's explicitly File | null
}
export default function Inventory() {
  const supabase = createClient();
  const [inventoryData, setInventoryData] = useState<
    Database["public"]["Tables"]["inventory"]["Row"][]
  >([]);
  const [filteredData, setFilteredData] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storeFilter, setStoreFilter] = useState("");
  const [uniqueStores, setUniqueStores] = useState<string[]>([]);
  const [storeNameMap, setStoreNameMap] = useState<Record<string, string>>({}); // FIX Issue 11: Map store URLs to names
  const [totalRecords, setTotalRecords] = useState(0);
  const [addNewModalOpen, setAddNewModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;

  const initialFormData: FormDataType = {
    sku: "",
    inventory_id: "",
    product_id: "",
    store_url: "",
    product_image: null,
    inventory_level: [
      {
        node: {
          quantities: [
            {
              quantity: "",
              name: "available",
            },
            {
              quantity: "",
              name: "committed",
            },
            {
              quantity: "",
              name: "incoming",
            },
            {
              quantity: "",
              name: "on_hand",
            },
            {
              quantity: "",
              name: "reserved",
            },
          ],
        },
      },
    ],
  };

  const [formData, setFormData] = useState(initialFormData);
  const initialError = {
    sku: "",
    product_id: "",
    store_url: "",
    product_image: "",
    inventory_level: [
      {
        node: {
          quantities: [
            {
              quantity: "",
              name: "Available",
            },
            {
              quantity: "",
              name: "Committed",
            },
            {
              quantity: "",
              name: "Incoming",
            },
            {
              quantity: "",
              name: "On Hand",
            },
            {
              quantity: "",
              name: "Reserved",
            },
          ],
        },
      },
    ],
  };

  const [errors, setErrors] = useState(initialError);
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isFileName, setIsFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  // FIX 6: Corrected validation error field name
  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.sku.trim()) newErrors.sku = "SKU is required";

    if (!formData.product_id.trim())
      newErrors.product_id = "Product ID is required";

    if (!formData.store_url.trim())
      newErrors.store_url = "Store URL is required";

    if (
      !formData.inventory_level?.[0]?.node?.quantities?.length ||
      formData.inventory_level[0].node.quantities.some((q) => q.quantity === "")
    ) {
      newErrors.inventory_level = [
        {
          node: {
            quantities: formData.inventory_level?.[0]?.node?.quantities.map(
              (q) => ({
                quantity: q.quantity === "" ? "Quantity is required" : "",
                name: q.name,
              })
            ),
          },
        },
      ];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // FIX: Fetch inventory and stores separately (no foreign key relationship exists)
  const fetchInventoryData = async () => {
    setIsLoading(true);
    try {
      // Fetch inventory data
      const { data: inventoryItems, error: inventoryError } = await supabase
        .from("inventory")
        .select("*");

      if (inventoryError) {
        console.error("Error fetching inventory data:", inventoryError);
        toast.error("Failed to load inventory data");
        setIsLoading(false);
        return;
      }

      // Fetch stores data separately
      const { data: storesData, error: storesError } = await supabase
        .from("stores")
        .select("store_name, store_url");

      if (storesError) {
        console.warn("Error fetching stores data:", storesError);
        // Continue without store names
      }

      // Create mapping of store URLs to store names
      const nameMap: Record<string, string> = {};
      if (storesData) {
        storesData.forEach((store) => {
          nameMap[store.store_url] = store.store_name;
        });
      }
      setStoreNameMap(nameMap);

      // Merge inventory with store names
      const enrichedData = (inventoryItems || []).map((item) => ({
        ...item,
        stores: {
          store_name: nameMap[item.store_url] || item.store_url,
          store_url: item.store_url,
        },
      }));

      console.log("Inventory data loaded:", enrichedData.length, "items");
      setInventoryData(enrichedData || []);

      // Extract unique store URLs
      const stores = [
        ...new Set(enrichedData.map((item) => item.store_url).filter(Boolean)),
      ];
      setUniqueStores(stores);

      applyFilter(enrichedData, storeFilter, 1);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = (data: any[], filter: string, currentPage: number) => {
    let filtered = filter
      ? data.filter((item) => item.store_url === filter)
      : data;
    setFilteredData(filtered);
    setTotalRecords(filtered.length);
    setPage(currentPage);
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  useEffect(() => {
    applyFilter(inventoryData, storeFilter, 1);
  }, [storeFilter]);

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

  const handleNewOpenModal = (rowData?: any) => {
    setAddNewModalOpen(true);
    setIsEdit(false);
    if (rowData) {
      // FIX Issue 12: Transform nested data to match FormDataType structure
      const transformedData: FormDataType = {
        id: rowData.id,
        sku: rowData.sku || "",
        product_id: rowData.product_id || "",
        inventory_id: rowData.inventory_id || "",
        store_url: rowData.store_url || "",
        product_image: rowData.product_image || null,
        inventory_level: rowData.inventory_level || initialFormData.inventory_level,
      };
      setFormData(transformedData);
      setIsEdit(true);
    }
  };

  const closeNewModal = () => {
    setAddNewModalOpen(false);
    setFormData(initialFormData);
    setErrors(initialError);
    setIsFileName("");
    setFileUrl("");
  };

  const handleAddNewInventory = async () => {
    const isValid = validateForm();
    if (!isValid) {
      return;
    }
    const { data, error } = await supabase
      .from("inventory")
      .insert([formData])
      .select();
    if (error) {
      toast.error("Error inserting inventory data: " + error.message);
    } else {
      toast.success("Inventory data inserted successfully");
      setAddNewModalOpen(false);
      setFormData(initialFormData);
      fetchInventoryData();
      setIsFileName("");
      setFileUrl("");
    }
  };

  // FIX 7: Add try-catch error handling for inventory updates
  const handleUpdateInventory = async () => {
    try {
      const isValid = validateForm();
      if (!isValid) {
        return;
      }
      const { data, error } = await supabase
        .from("inventory")
        .update(formData)
        .eq("id", formData.id!)
        .select();
      if (error) {
        toast.error("Error updating inventory data: " + error.message);
      } else {
        toast.success("Inventory data updated successfully");
        setAddNewModalOpen(false);
        setFormData(initialFormData);
        fetchInventoryData();
        setIsFileName("");
        setFileUrl("");
      }
    } catch (error: any) {
      toast.error("Unexpected error: " + (error?.message || "Please try again"));
      console.error("Update inventory error:", error);
    }
  };

  const handleInventoryChange = (e: any, fieldName: string) => {
    setFormData((prevData) => ({
      ...prevData,
      [fieldName]: e.target.value,
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [fieldName]: "",
    }));
  };

  const handleQuantityChange = (e: any, fieldName: string) => {
    const newQuantity = e.target.value;
    setFormData((prevData) => ({
      ...prevData,
      inventory_level: prevData.inventory_level.map((level) => ({
        ...level,
        node: {
          ...level.node,
          quantities: level.node.quantities.map((q) =>
            q.name === fieldName ? { ...q, quantity: newQuantity } : q
          ),
        },
      })),
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      inventory_level: prevErrors.inventory_level.map((level) => ({
        ...level,
        node: {
          ...level.node,
          quantities: level.node.quantities.map((q) =>
            q.name === fieldName ? { ...q, quantity: newQuantity } : q
          ),
        },
      })),
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setIsFileName(file?.name || "");
    setIsInventoryLoading(true);
    if (file) {
      const fileName = file;
      const filePath = `inventory/${Date.now()}-${fileName?.name}`;
      const { error } = await supabase.storage
        .from("commercive")
        .upload(filePath, file);
      if (error) {
        toast.error(`Error uploading file: ${error.message}`);
        return;
      } else {
        toast.success("File uploaded successfully");
      }
      const { data: publicUrlData } = supabase.storage
        .from("commercive")
        .getPublicUrl(filePath);
      if (publicUrlData) {
        setFormData((prev) => ({
          ...prev,
          product_image: publicUrlData.publicUrl,
        }));
        setFileUrl(publicUrlData.publicUrl);
        setErrors((prevErrors) => ({
          ...prevErrors,
          product_image: "",
        }));
      }
    }
    setIsInventoryLoading(false);
  };

  const paginatedData = filteredData.slice((page - 1) * limit, page * limit);

  const tableConfig = {
    notFoundData: "No Data found",
    columns: [
      {
        field: "product_image",
        headerName: "Product Image",
        customRender: (row: any) => {
          const hasImage = !!row?.product_image;
          return hasImage ? (
            <img
              src={row.product_image}
              alt="Product"
              className="w-[50px] h-[50px] object-contain"
            />
          ) : (
            <div className="text-gray-500 w-[50px] h-[50px] border text-sm"></div>
          );
        },
      },
      {
        field: "sku",
        headerName: "SKU",
        customRender: (row: any) => <span>{row?.sku}</span>,
      },
      {
        field: "product_id",
        headerName: "Product ID",
        customRender: (row: any) => (
          <span>
            {row?.product_name} ({row?.product_id})
          </span>
        ),
      },
      {
        field: "store_name",
        headerName: "Store Name",
        customRender: (row: any) => (
          <span>{row?.stores?.store_name || row?.store_url}</span>
        ),
      },
      {
        field: "inventory_level[0].node.quantities[0].quantity",
        headerName: "Available",
        customRender: (row: any) => (
          <span>
            {row?.inventory_level?.[0]?.node?.quantities?.[0]?.quantity}
          </span>
        ),
      },
      {
        field: "inventory_level[0].node.quantities[1].quantity",
        headerName: "Committed",
        customRender: (row: any) => (
          <span>
            {row?.inventory_level?.[0]?.node?.quantities?.[1]?.quantity}
          </span>
        ),
      },
      {
        field: "inventory_level[0].node.quantities[2].quantity",
        headerName: "Incoming",
        customRender: (row: any) => (
          <span>
            {row?.inventory_level?.[0]?.node?.quantities?.[2]?.quantity}
          </span>
        ),
      },
      {
        field: "inventory_level[0].node.quantities[3].quantity",
        headerName: "On Hand",
        customRender: (row: any) => (
          <span>
            {row?.inventory_level?.[0]?.node?.quantities?.[3]?.quantity}
          </span>
        ),
      },
      {
        field: "inventory_level[0].node.quantities[4].quantity",
        headerName: "Reserved",
        customRender: (row: any) => (
          <span>
            {row?.inventory_level?.[0]?.node?.quantities?.[4]?.quantity}
          </span>
        ),
      },
      {
        field: "actions",
        headerName: "Actions",
        customRender: (row: any) => (
          <span>
            <CustomButton
              label={"Edit"}
              className="bg-[#6B5FD1] text-[#E5E1FF]"
              callback={() => handleNewOpenModal(row)}
            />
          </span>
        ),
      },
    ],
    rows: paginatedData || [],
  };

  return (
    <div className="flex flex-col w-full gap-5">
      <h1 className="text-2xl font-bold text-white">Inventory</h1>
      <div className="flex">
        <CustomButton
          label={"Add New"}
          className="w-max"
          prefixIcon={<FiPlus size={24} />}
          callback={handleNewOpenModal}
        />
        {addNewModalOpen && (
          <CustomModal onClose={closeNewModal} maxWidth={"max-w-[800px]"}>
            <div className="flex flex-col gap-6">
              <h2 className="text-lg font-semibold">
                {isEdit ? "Edit Inventory" : "Add Inventory"}
              </h2>
              <div className="flex flex-col gap-6 max-sm:overflow-y-auto max-sm:max-h-[60vh] custom-scrollbar">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-col relative w-full">
                    <InputField
                      name="sku"
                      placeholder="Enter your sku"
                      type="text"
                      className="mt-[8px]"
                      label={`SKU`}
                      value={formData.sku || ""}
                      onChange={(e: any) => handleInventoryChange(e, "sku")}
                    />
                    {errors?.sku && (
                      <p className="text-red-500 absolute text-sm -bottom-[20px] message">
                        {errors?.sku}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col relative w-full">
                    <InputField
                      name="product_id"
                      placeholder="Enter your product id"
                      type="text"
                      className="mt-[8px]"
                      label={`Product ID`}
                      value={formData.product_id || ""}
                      onChange={(e: any) =>
                        handleInventoryChange(e, "product_id")
                      }
                    />
                    {errors?.product_id && (
                      <p className="text-red-500 absolute text-sm -bottom-[20px] message">
                        {errors?.product_id}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-col relative w-full">
                    <InputField
                      name="store_url"
                      placeholder="Enter store URL"
                      type="text"
                      className="mt-[8px]"
                      label={`Store URL`}
                      value={formData.store_url || ""}
                      onChange={(e: any) =>
                        handleInventoryChange(e, "store_url")
                      }
                    />
                    {errors?.store_url && (
                      <p className="text-red-500 absolute text-sm bottom-[2px] message">
                        {errors?.store_url}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col relative w-full">
                    <InputField
                      name="available"
                      placeholder="Enter available"
                      type="number"
                      className="mt-[8px]"
                      label={`Available`}
                      value={String(
                        formData.inventory_level[0].node.quantities.find(
                          (q) => q.name === "available"
                        )?.quantity || ""
                      )}
                      onChange={(e: any) =>
                        handleQuantityChange(e, "available")
                      }
                    />
                    {errors.inventory_level?.[0]?.node?.quantities.find(
                      (e) => e.name.toLowerCase() === "available"
                    )?.quantity && (
                      <p className="text-red-500 text-sm">
                        {
                          errors.inventory_level[0].node.quantities.find(
                            (e) => e.name.toLowerCase() === "available"
                          )?.quantity
                        }
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-col relative w-full">
                    <InputField
                      name="committed"
                      placeholder="Enter committed"
                      type="number"
                      className="mt-[8px]"
                      label={`Committed`}
                      value={String(
                        formData.inventory_level[0].node.quantities[1]
                          .quantity || ""
                      )}
                      onChange={(e: any) =>
                        handleQuantityChange(e, "committed")
                      }
                    />
                    {errors?.inventory_level?.[0]?.node?.quantities.find(
                      (e) => e.name.toLowerCase() === "committed"
                    )?.quantity && (
                      <p className="text-red-500 text-sm">
                        {
                          errors.inventory_level[0].node.quantities.find(
                            (e) => e.name.toLowerCase() === "committed"
                          )?.quantity
                        }
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col relative w-full">
                    <InputField
                      name="incoming"
                      placeholder="Enter incoming"
                      type="number"
                      className="mt-[8px]"
                      label={`Incoming`}
                      value={String(
                        formData.inventory_level[0].node.quantities[2]
                          .quantity || ""
                      )}
                      onChange={(e: any) => handleQuantityChange(e, "incoming")}
                    />
                    {errors?.inventory_level?.[0]?.node?.quantities.find(
                      (e) => e.name.toLowerCase() === "incoming"
                    )?.quantity && (
                      <p className="text-red-500 text-sm">
                        {
                          errors.inventory_level[0].node.quantities.find(
                            (e) => e.name.toLowerCase() === "incoming"
                          )?.quantity
                        }
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-col relative w-full">
                    <InputField
                      name="on_hand"
                      placeholder="Enter on hand"
                      type="number"
                      className="mt-[8px]"
                      label={`On Hand`}
                      value={String(
                        formData.inventory_level[0].node.quantities[3]
                          .quantity || ""
                      )}
                      onChange={(e: any) => handleQuantityChange(e, "on_hand")}
                    />
                    {errors?.inventory_level?.[0]?.node?.quantities.find(
                      (e) => e.name.toLowerCase() === "on_hand"
                    )?.quantity && (
                      <p className="text-red-500 text-sm">
                        {
                          errors.inventory_level[0].node.quantities.find(
                            (e) => e.name.toLowerCase() === "on_hand"
                          )?.quantity
                        }
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col relative w-full">
                    <InputField
                      name="reserved"
                      placeholder="Enter reserved"
                      type="number"
                      className="mt-[8px]"
                      label={`Reserved`}
                      value={String(
                        formData.inventory_level[0].node.quantities[4]
                          .quantity || ""
                      )}
                      onChange={(e: any) => handleQuantityChange(e, "reserved")}
                    />
                    {errors?.inventory_level?.[0]?.node?.quantities.find(
                      (e) => e.name.toLowerCase() === "reserved"
                    )?.quantity && (
                      <p className="text-red-500 text-sm">
                        {
                          errors.inventory_level[0].node.quantities.find(
                            (e) => e.name.toLowerCase() === "reserved"
                          )?.quantity
                        }
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col relative w-full">
                    <input
                      id="product_image"
                      name="product_image"
                      placeholder="Enter product image"
                      type="file"
                      accept="image/*"
                      className="hidden mt-[8px]"
                      onChange={(e: any) => handleFileChange(e)}
                    />
                    <label
                      htmlFor="product_image"
                      className="flex cursor-pointer bg-[#4F11C9] text-[#F4F4F4] font-semibold py-2 px-4 rounded-[8px] mt-[30px]"
                    >
                      {isInventoryLoading ? (
                        <RiLoader2Fill
                          className="animate-spin"
                          size={24}
                          color="#F4F4F4"
                        />
                      ) : (
                        <span>
                          <MdOutlineFileUpload size={24} color="#F4F4F4" />
                        </span>
                      )}{" "}
                      {isInventoryLoading ? "Uploading..." : "Upload Image"}
                    </label>
                    {isFileName && !isEdit && (
                      <span className="text-black text-sm font-semibold">
                        {isFileName}
                      </span>
                    )}
                    {errors?.product_image && (
                      <p className="text-red-500 absolute text-sm bottom-[1px] message">
                        {errors?.product_image}
                      </p>
                    )}
                  </div>
                  {isEdit && formData.product_image && (
                    <Image
                      src={
                        typeof formData.product_image === "string"
                          ? formData.product_image
                          : URL.createObjectURL(formData.product_image) ||
                            fileUrl
                      }
                      alt="Product"
                      width={60}
                      height={60}
                      className="object-contain mt-[20px] rounded-[50px]"
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-end w-full">
                {!isEdit && (
                  <CustomButton
                    label="Save"
                    callback={handleAddNewInventory}
                    className="bg-[#6B5FD1] text-[#E5E1FF] w-max"
                    interactingAPI={isLoading}
                  />
                )}
                {isEdit && (
                  <CustomButton
                    label="Update"
                    className="bg-[#6B5FD1] text-[#E5E1FF] w-max"
                    callback={handleUpdateInventory}
                    interactingAPI={isLoading}
                  />
                )}
              </div>
            </div>
          </CustomModal>
        )}
      </div>
      <div className="flex flex-col sm:flex-row w-full justify-between">
        <Autocomplete
          options={uniqueStores}
          // FIX Issue 11: Use dynamic store name mapping instead of hardcoded value
          getOptionLabel={(option) =>
            storeNameMap[option] || option
          }
          value={storeFilter}
          onChange={(event, newValue) => setStoreFilter(newValue || "")}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Filter by Store"
              variant="outlined"
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "white",
                  "& fieldset": { borderColor: "#8B7FE5" },
                  "&:hover fieldset": { borderColor: "#8B7FE5" },
                  "&.Mui-focused fieldset": { borderColor: "#8B7FE5" },
                },
                "& .MuiInputLabel-root": { color: "white" },
                "& .MuiInputLabel-root.Mui-focused": { color: "white" },
              }}
            />
          )}
          clearOnEscape
          className="w-full md:w-1/2"
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-[#E5E1FF]">
            Showing {(page - 1) * limit + 1}-
            {Math.min(page * limit, totalRecords)} of {totalRecords}
          </p>
          <div className="flex items-center gap-3">
            <CustomButton
              label="Previous"
              className="bg-[#6B5FD1] text-[#E5E1FF]"
              callback={handlePrevious}
              disabled={page === 1}
            />
            <CustomButton
              label="Next"
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
      />
    </div>
  );
}
