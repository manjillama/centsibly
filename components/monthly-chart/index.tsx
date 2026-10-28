"use client";
import { memo, useMemo } from "react";
import dynamic from "next/dynamic";
import DeferredChart from "../deferred-chart";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const MonthlyChart = memo(function MonthlyChart({ series, labels }: { series: string; labels: string }) {
  const chartSeries = useMemo(() => JSON.parse(series), [series]);
  const chartOptions = useMemo<ApexCharts.ApexOptions>(() => ({
    colors: ["#e11d48", "#1982c4", "#4ade80", "#f59e0b", "#7c3aed", "#ffbe0b", "#fb5607", "#f472b6", "#014f86", "#14746f", "#d58936"],
    legend: { labels: { colors: "rgba(225, 225, 225, 0.443)" }, position: "right" },
    stroke: { width: 0 },
    labels: JSON.parse(labels),
    chart: { type: "donut", animations: { enabled: false } },
    responsive: [{ breakpoint: 1025, options: { legend: { position: "bottom" } } }],
  }), [labels]);

  return <div className="w-full max-w-[420px] mx-auto">
    <DeferredChart>
      <ReactApexChart options={chartOptions} series={chartSeries} type="donut" width="100%" height={320} />
    </DeferredChart>
  </div>;
});

export default MonthlyChart;
