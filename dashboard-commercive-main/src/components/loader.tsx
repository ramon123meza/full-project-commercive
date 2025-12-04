import React from "react";
import Box from "@mui/material/Box";
import { CircularProgress } from "@mui/material";

interface LoaderProps {
  show: boolean;
  sx?: any;
}

const Loader = ({ show, sx }: LoaderProps) => {
  const bars = Array.from({ length: 12 }, (_, i) => ({
    style: {
      transform: `rotate(${i * 30}deg) translate(0, -100%)`,
      animationDelay: `${-1.1 * (i / 12)}s`,
    },
    key: `bar-${i}`,
  }));

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.6)",
        display: show ? "flex" : "none",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        ...sx,
      }}
    >
      {show && <CircularProgress sx={{ color: "#4F11C9" }} />}
    </Box>
  );
};

export default Loader;
