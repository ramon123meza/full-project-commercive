import { methodOptions, roleOptions } from "@/app/utils/constants";
import { createClient } from "@/app/utils/supabase/client";
import { Database } from "@/app/utils/supabase/database.types";
import {
  AffiliateSettingViewRow,
  ReferralSummaryRow,
  StoreRow,
  UserRow,
} from "@/app/utils/types";
import CustomButton from "@/components/ui/custom-button";
import InputField from "@/components/ui/custom-inputfild";
import CustomTable from "@/components/ui/custom-table";
import CustomModal from "@/components/ui/modal";
import { Checkbox, FormControlLabel, MenuItem, Select } from "@mui/material";
import { FC, useEffect, useState } from "react";
import { toast } from "react-toastify";

type UpdateSettingMap = Record<
  string,
  | {
      uid: string;
      affiliate: string;
      customer_id: string;
      commission_method: number;
      commission_rate: number;
    }
  | undefined
>;

type UserModalProps = {
  affiliate: ReferralSummaryRow;
  onClose: () => void;
  updateTables: () => void;
};

let limit = 5;

export const AffiliateSettingModal: FC<UserModalProps> = ({
  affiliate,
  onClose,
  updateTables,
}) => {
  const supabase = createClient();

  const [allCustomers, setAllCustomers] = useState<AffiliateSettingViewRow[]>(
    []
  );
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [updatedSettings, setUpdatedSettings] = useState<UpdateSettingMap>({});
  const [matchArray, setMatchArray] = useState([1, 2]);

  const getAllCustomers = async () => {
    setIsLoading(true);

    const start = (page - 1) * limit;
    console.log(
      ' `(${matchArray.join(",")})` :>> ',
      `(${matchArray.join(",")})`
    );
    const { data, count } = await supabase
      .from("affiliate_setting_view")
      .select("*", { count: "exact" })
      .match({ affiliate_id: affiliate.affiliate_id })
      .or(
        `commission_method.is.null,commission_method.not.in.(${matchArray.join(
          ","
        )})`
      )
      .order("customer_number")
      .range(start, start + limit - 1);
    setAllCustomers(data || []);
    setTotalRecords(count || 0); // Update total records
    setIsLoading(false);
  };
  const handlePagination = (curPage: number) => {
    setPage(curPage);
  };
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

  const updateSetting = async (
    row: AffiliateSettingViewRow,
    setting: { commission_method?: number; commission_rate?: number }
  ) => {
    const uid = `${row.affiliate_id}:${row.customer_number}`;
    const init = { ...updatedSettings };
    const prevSetting = init[uid];
    if (!prevSetting) {
      init[uid] = {
        uid: uid,
        affiliate: row.affiliate_id!,
        customer_id: row.customer_number!,
        commission_method:
          row.commission_method || setting.commission_method || 0,
        commission_rate: row.commission_rate || setting.commission_rate || 0,
      };
    } else {
      init[uid] = {
        ...prevSetting,
        commission_method:
          prevSetting.commission_method || setting.commission_method || 0,
        commission_rate:
          prevSetting.commission_rate || setting.commission_rate || 0,
      };
    }
    setUpdatedSettings(init);
  };

  const saveUpdates = async () => {
    setSaving(true);
    const updatedRows = Object.values(updatedSettings).map((item) => item!);
    const { error } = await supabase
      .from("affiliate_customer_setting")
      .upsert(updatedRows);
    if (error) {
      toast.error("Update Failed!");
    } else {
      setUpdatedSettings({});
      await updateTables();
      toast.success("Update Success!");
    }
    setSaving(false);
  };

  const tableConfig = {
    handlePagination: handlePagination,
    notFoundData: "No Data found",
    actionPresent: true,
    actionList: ["edit", "delete"],
    columns: [
      {
        field: "customer_number",
        headerName: "Customer",
        customRender: (row: AffiliateSettingViewRow) => (
          <p>{row.customer_number}</p>
        ),
      },
      {
        field: "commission_method",
        headerName: "Commission Method",
        customRender: (row: AffiliateSettingViewRow) => {
          return (
            <Select
              name="Role"
              id=""
              className="p-0 rounded-md focus-within:outline-none bg-[#5B4BB5]"
              defaultValue={row.commission_method || 0}
              onChange={(e) => {
                updateSetting(row, {
                  commission_method: e.target.value as number,
                });
              }}
              sx={{
                "& .MuiInputBase-input": {
                  padding: "5px 10px",
                  color: "#fff",
                },
                "& .MuiSelect-icon": {
                  color: "#fff", // change arrow color
                },
              }}
            >
              {methodOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  value={option.value}
                  className="focus-within:outline-none"
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          );
        },
      },
      {
        field: "commission_rate",
        headerName: "Commission Rate",
        customRender: (row: AffiliateSettingViewRow) => {
          return (
            <input
              className="bg-transparent"
              type="number"
              defaultValue={row.commission_rate?.toString() || 0}
              onChange={(e) => {
                updateSetting(row, { commission_rate: Number(e.target.value) });
              }}
            />
          );
        },
      },
    ],
    rows: allCustomers || [],
  };

  useEffect(() => {
    getAllCustomers();
    setUpdatedSettings({});
  }, [page, matchArray]);

  return (
    <CustomModal maxWidth={"max-w-[800px]"} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold">
          Update Settings for {affiliate.affiliate_id}
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex justify-between">
            <div className="flex items-center gap-3">
              <p className="text-[#E5E1FF]">
                Showing {(page - 1) * limit + 1}-
                {Math.min(page * limit, totalRecords)} of {totalRecords}
              </p>
              <CustomButton
                label={"Previous"}
                className="bg-[#6B5FD1] text-[#E5E1FF]"
                callback={handlePrevious}
                disabled={page === 1}
              />
              <CustomButton
                className="bg-[#6B5FD1] text-[#E5E1FF]"
                label={"Next"}
                callback={handleNext}
                disabled={page >= Math.ceil(totalRecords / limit)}
              />
            </div>
          </div>
          <FormControlLabel
            control={
              <Checkbox
                defaultChecked
                onChange={(e) => {
                  if (e.target.checked) {
                    setMatchArray([1, 2]);
                  } else {
                    setMatchArray([]);
                  }
                }}
              />
            }
            label="Show unmapped"
          />
        </div>
        <CustomTable tableConfig={tableConfig} isLoading={isLoading} />

        <div className="flex justify-end w-full">
          <CustomButton
            label={"Update"}
            callback={saveUpdates}
            className="bg-[#6B5FD1] text-[#E5E1FF]"
            interactingAPI={saving}
            disabled={Object.keys(updatedSettings).length == 0 || saving}
          />
        </div>
      </div>
    </CustomModal>
  );
};
