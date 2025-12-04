"use client";
import { useState, useEffect } from "react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from "@mui/material";
import { IoCloseCircleOutline } from "react-icons/io5";
import { LuThumbsUp } from "react-icons/lu";
import { useStoreContext } from "@/context/StoreContext";
import { PiCodesandboxLogoFill } from "react-icons/pi";
import { createClient } from "@/app/utils/supabase/client";
import { IssueRow } from "@/app/utils/types";
import { formatDate } from "@/app/utils/date";

export default function Inventory() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const { selectedStore, userinfo, setChatOpen } = useStoreContext();
  const storeUrl = selectedStore ? selectedStore.store_url : null;

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // Default 20 items per page

  const fetchInventoryData = async () => {
    // if (!storeUrl) {
    //   return;
    // }

    setLoading(true);
    try {
      const { data: fetchedData, error: inventoryError } = await supabase
        .from("issues")
        .select("*")
        .eq("user_id", userinfo!.id)
        .order("created_at", { ascending: false });

      if (inventoryError) {
        console.error("Error fetching inventory data:", inventoryError);
        setLoading(false);
      } else {
        setIssues(fetchedData);
      }
    } catch (error) {
      console.error("Error in fetchOrders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchData = () => {
    fetchInventoryData();
  };

  useEffect(() => {
    handleFetchData();
    setChatOpen(true);
  }, [selectedStore]);

  const getStockStatusClass = (status: boolean) => {
    switch (status) {
      case true:
        return "bg-green-100 text-green-700";
      case false:
        return "bg-red-100 text-red-700";
      default:
        return "";
    }
  };

  const getStatusIcon = (status: boolean) => {
    switch (status) {
      case true:
        return <LuThumbsUp size={20} />;
      case false:
        return <IoCloseCircleOutline size={20} />;
      default:
        return <PiCodesandboxLogoFill size={20} />;
    }
  };

  const filteredData = issues;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  return (
    <main>
      <TableContainer
        component={Paper}
        sx={{ maxHeight: "100%", overflowY: "auto" }}
        className="custom-scrollbar"
      >
        <Table>
          <TableHead
            style={{
              backgroundColor: "#f4f4f7",
              fontWeight: "bold",
              color: "black",
              padding: "4px",
            }}
          >
            <TableRow
              style={{
                backgroundColor: "#f4f4f7",
                padding: "4px",
              }}
            >
              <TableCell
                sx={{ fontWeight: "bold", color: "black", width: "120px" }}
              >
                Date
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: "black", width: "130px" }}
              >
                Name / Email
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: "black", width: "100px" }}
              >
                Store Url
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "black" }}>
                Description
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: "black", width: "100px" }}
              >
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{formatDate(item.created_at)}</TableCell>
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {item.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{item.store_url}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        textOverflow: "ellipsis",
                        width: "100%",
                        maxHeight: "40px",
                        overflow: "hidden",
                      }}
                    >
                      {item.issue}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <p
                      className={`flex items-center gap-2 w-max py-2 px-4 rounded-md ${getStockStatusClass(
                        item.confirmed
                      )}`}
                    >
                      <span>{getStatusIcon(item.confirmed)}</span>{" "}
                      {item.confirmed}
                    </p>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} style={{ textAlign: "center" }}>
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination UI */}
      <div className="flex justify-between items-center mt-4">
        <select
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className="border-2 rounded p-1"
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </select>

        <div className="flex gap-2 items-center">
          <Button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(1)}
          >
            First
          </Button>
          <Button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </Button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </Button>
          <Button
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(totalPages)}
          >
            Last
          </Button>
        </div>
      </div>
    </main>
  );
}
