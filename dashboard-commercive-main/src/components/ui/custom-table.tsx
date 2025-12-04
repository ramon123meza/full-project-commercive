import React, { useState } from "react";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import {
  IconButton,
  ListItemIcon,
  TableFooter,
  Menu,
  MenuItem,
  Checkbox,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { MdOutlineEdit, MdOutlineMoreVert } from "react-icons/md";
import { RiDeleteBinLine } from "react-icons/ri";
import { GrView } from "react-icons/gr";
import Image from "next/image";
import Loader from "../loader";

interface ColumnConfig<T> {
  field: keyof T;
  headerName: string;
  minWidth?: number;
  align?: "right" | "left" | "center";
  customRender?: (row: T) => React.ReactNode;
}

interface CustomTableProps<T> {
  tableConfig?: any;
  isLoading?: boolean;
  fixRow?: boolean;
  pagination?: any;
  limit?: any;
  showEdit?: boolean;
  showDelete?: boolean;
  showCheckbox?: boolean;
  onCheckboxClick?: (id: any) => void;
  onDelete?: (id: any) => void;
}

export default function CustomTable<T>({
  tableConfig,
  isLoading,
  pagination,
  limit,
  showEdit = false,
  showDelete = false,
  showCheckbox = false,
  onCheckboxClick,
  onDelete,
}: CustomTableProps<T>) {
  const { columns, rows, handlePagination, fixRow, handleRowLimit } =
    tableConfig;
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(limit ? limit : 5);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [menuKey, setMenuKey] = React.useState(null);

  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    menuKey: any
  ) => {
    setAnchorEl(event.currentTarget);
    setMenuKey(menuKey);
  };

  const handleClose = (type: any, item: any) => {
    tableConfig.onActionClick(type, item);
    setAnchorEl(null);
  };

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    if (fixRow) {
      handlePagination(newPage);
    }
    setPage(newPage);
  };
  const handleCheckboxClick = (id: any) => {
    if (onCheckboxClick) {
      onCheckboxClick(id);
    }
  };

  const updatedColumns = [...columns];
  if (showEdit || showDelete || showCheckbox) {
    updatedColumns.push({ field: "action", headerName: "Action" });
  }

  return (
    <Paper sx={{ width: "100%", overflow: "hidden", background: "none" }}>
      <TableContainer
        sx={{
          // maxHeight: 440,
          border: "2px solid #403a6b",
          borderRadius: "8px",
        }}
        className="w-full overflow-x-auto custom-scrollbar"
        component={Paper}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ background: "#342d5f" }}>
              {/* {updatedColumns.map((column: any) => (
                <TableCell
                  key={column.field}
                  sx={{
                    color: "#5C5491",
                    fontSize: "14px",
                    fontWeight: 600,
                    borderBottom: "2px solid #403a6b",
                    display:
                      column.headerName === "Action" && isLoading
                        ? "none"
                        : "table-cell",
                  }}
                >
                  {column.headerName === "Action" ? "" : column.headerName}
                </TableCell>
              ))} */}
              {updatedColumns.map((column: any, idx) => {
                const shouldHideActionColumn =
                  column.headerName === "Action" &&
                  (isLoading || rows.length === 0);

                return (
                  !shouldHideActionColumn && (
                    <TableCell
                      key={column.field + idx}
                      sx={{
                        color: "#7067aa",
                        fontSize: "13px",
                        fontWeight: 500,
                        borderBottom: "2px solid #403a6b",
                      }}
                    >
                      {column.headerName === "Action" ? "" : column.headerName}
                    </TableCell>
                  )
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow sx={{ background: "#342d5f" }}>
                <TableCell
                  colSpan={tableConfig.columns.length}
                  align="center"
                  sx={{
                    height: "200px",
                    position: "relative",
                    background: "#342d5f",
                    borderBottom: "2px solid #403a6b",
                    color: "#7067aa",
                  }}
                >
                  <Loader show={true} sx={{ position: "absolute" }} />
                </TableCell>
              </TableRow>
            ) : tableConfig?.rows?.length === 0 ? (
              <TableRow sx={{ background: "#342d5f" }}>
                <TableCell
                  colSpan={tableConfig.columns.length}
                  align="center"
                  sx={{
                    fontSize: "20px",
                    fontWeight: 400,
                    height: "200px",
                    color: "#7067aa",
                    border: "#403a6b",
                  }}
                >
                  {tableConfig.notFoundData}
                </TableCell>
              </TableRow>
            ) : (
              (fixRow
                ? rows
                : rows?.slice((page - 1) * rowsPerPage, page * rowsPerPage)
              ).map((row: any, index: number) => {
                return (
                  <TableRow key={index} sx={{ background: "#342d5f" }}>
                    {updatedColumns.map((column: any) => {
                      const cellKey = `Datatable-row-${index}-${column.field}`;

                      if (
                        column.field === "action" &&
                        tableConfig.actionPresent
                      ) {
                        return (
                          <TableCell
                            key={cellKey}
                            sx={{
                              minWidth: "100px",
                              fontSize: "14px",
                              color: "#7067aa",
                              borderBottom: "2px solid #403a6b",
                              textAlign: "center", // Optional for alignment
                              background: "#342d5f",
                              display:
                                column.field === "action" && isLoading
                                  ? "none"
                                  : "table-cell",
                              padding: "7px 15px",
                            }}
                          >
                            {showEdit && (
                              <IconButton
                                onClick={() => {
                                  tableConfig.onActionClick("edit", row);
                                }}
                              >
                                <Image
                                  src="/icons/edit.png"
                                  alt="edit"
                                  width={18}
                                  height={18}
                                />
                              </IconButton>
                            )}
                            {showDelete && (
                              <IconButton
                                onClick={() => {
                                  tableConfig.onActionClick("delete", row);
                                }}
                              >
                                <Image
                                  src="/icons/delete.png"
                                  alt="delete"
                                  width={18}
                                  height={18}
                                />
                              </IconButton>
                            )}
                            <div className="flex">
                              {showCheckbox && (
                                <IconButton
                                  // checked={row.confirmed || row.completed}
                                  onClick={() => handleCheckboxClick(row)}
                                  color="inherit"
                                >
                                  <EditIcon />
                                </IconButton>
                              )}
                              {showCheckbox && onDelete && (
                                <IconButton
                                  // checked={row.confirmed || row.completed}
                                  onClick={() => onDelete(row)}
                                  color="inherit"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              )}
                            </div>
                          </TableCell>
                        );
                      } else if (column.customRender) {
                        return (
                          <TableCell
                            key={cellKey}
                            sx={{
                              // fontFamily: "Montserrat, sans-serif",
                              fontSize: "14px",
                              borderBottom: "2px solid #403a6b",
                              color: "#ffffff",
                              padding: "7px 15px",
                            }}
                          >
                            {column.customRender(row)}
                          </TableCell>
                        );
                      } else {
                        return (
                          <TableCell
                            key={cellKey}
                            sx={{
                              // fontFamily: "Montserrat, sans-serif",
                              fontSize: "14px",
                              borderBottom: "2px solid #403a6b",
                              color: "#ffffff",
                              padding: "7px 15px",
                            }}
                          >
                            {row[column.field] ? row[column.field] : "-"}
                          </TableCell>
                        );
                      }
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination && (
        <TablePagination
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[]} // Hides the rows per page selector
        />
      )}
    </Paper>
  );
}
