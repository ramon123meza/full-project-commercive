import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export interface ChartProps {
  data: number[];
  stokeColor: string;
  fillColor: string;
}

const SparklineChart = (props: ChartProps) => {
  const options: ApexOptions = {
    chart: {
      id: "sparkline-chart",
      group: "sparklines",
      type: "area",
      width: "100%",
      sparkline: {
        enabled: true,
      },
    },
    stroke: {
      curve: "straight",
      width: 2,
      colors: [props.stokeColor],
    },
    fill: {
      type: "solid",
      colors: [props.fillColor],
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: false,
    },
    colors: ["#008FFB"],
  };

  const series = [
    {
      name: "Sparkline",
      data: props.data || [],
    },
  ];

  return (
    <div className="flex justify-center w-full h-full">
      <ReactApexChart
        options={options}
        series={series}
        type="area"
        height="36px"
        width="100%"
      />
    </div>
  );
};

export default SparklineChart;
