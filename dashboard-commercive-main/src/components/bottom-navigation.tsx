"use client";
import * as React from "react";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import HouseIcon from "./images/home";
import InventoryIcon from "./images/inventory";
import ShipmentIcon from "./images/shipment";
import UnionIcon from "./images/union";
import { usePathname, useRouter } from "next/navigation";
interface LabelBottomNavigationProps {
  route?: string;
}

export default function LabelBottomNavigation({
  route,
}: LabelBottomNavigationProps) {
  const router = useRouter();
  const pathName = usePathname();

  // Determine which route is active
  const currentRoute = React.useMemo(() => pathName, [pathName]);

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    // Navigate to the new route
    router.push(newValue);
  };

  const getIconColor = (route: string) =>
    currentRoute === route
      ? "#4f11c9"
      : pathName?.includes("/admin")
      ? "#ffffff"
      : "#000000";

  const getIconBgColor = (route: string) =>
    currentRoute === route
      ? "#E5DCFB"
      : pathName?.includes("/admin")
      ? "#1b1838"
      : "#ffffff";

  const data = [
    {
      value: "/home",
      icon: <HouseIcon width={20} height={20} color={getIconColor("/home")} />,
    },
    {
      value: "/inventory",
      icon: (
        <InventoryIcon
          width={20}
          height={20}
          color={getIconColor("/inventory")}
        />
      ),
    },
    {
      value: "/shipments",
      icon: (
        <ShipmentIcon
          width={20}
          height={20}
          color={getIconColor("/shipment")}
        />
      ),
    },
    {
      value: "/commercive-partners",
      icon: (
        <UnionIcon
          width={20}
          height={20}
          color={getIconColor("/commercive-partners")}
        />
      ),
    },
  ];

  const adminData = [
    {
      value: "/admin/home",
      icon: (
        <HouseIcon width={20} height={20} color={getIconColor("/admin/home")} />
      ),
    },
    {
      value: "/admin/inventory",
      icon: (
        <InventoryIcon
          width={20}
          height={20}
          color={getIconColor("/admin/inventory")}
        />
      ),
    },
    {
      value: "/admin/partners",
      icon: (
        <UnionIcon
          width={20}
          height={20}
          color={getIconColor("/admin/partners")}
        />
      ),
    },
    {
      value: "/admin/roles",
      icon: (
        <ShipmentIcon
          width={20}
          height={20}
          color={getIconColor("/admin/roles")}
        />
      ),
    },
  ];

  const linkData = pathName?.includes("/admin") ? adminData : data;

  return (
    <BottomNavigation
      sx={{
        width: "100%",
        background: pathName?.includes("/admin") ? "#1b1838" : "#ffffff",
        borderTop: "2px solid #ebebeb",
        paddingX: "18px",
      }}
      value={currentRoute}
      onChange={handleChange}
    >
      {linkData.map((item, index) => (
        <BottomNavigationAction
          key={index}
          value={item.value}
          icon={
            <div
              style={{
                backgroundColor: getIconBgColor(item.value),
                borderRadius: "50%",
                padding: "10px",
              }}
            >
              {item.icon}
            </div>
          }
        />
      ))}
    </BottomNavigation>
  );
}
