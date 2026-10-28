"use client";
import { getTransactionType } from "@/utils/transactionTypes";
import { TransactionType } from "@/types";
import { ITransaction } from "@/interfaces/ITransaction";
import { formatCurrency, transformIndexToMonth } from "@/utils";
import { memo, useMemo } from "react";
import dynamic from "next/dynamic";
import DeferredChart from "../deferred-chart";
import type { Props } from "react-apexcharts";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

function YearlyChart({
  transactions,
  currency,
}: {
  transactions: ITransaction[];
  currency: string;
}) {
  const yearlyData = useMemo<Props>(() => {
    const monthlyTotalExpense = new Array(12).fill(0);
    const monthlyTotalIncome = new Array(12).fill(0);
    const monthlySavings = new Array(12).fill(0);

    transactions.forEach((transaction) => {
      const currMonth = new Date(transaction.transactionDate).getUTCMonth();
      const type = getTransactionType(transaction);
      const series = type === TransactionType.Income ? monthlyTotalIncome : type === TransactionType.Savings ? monthlySavings : monthlyTotalExpense;
      series[currMonth] = +(series[currMonth] + Number(transaction.amount)).toFixed(2);
    });

    return {
      options: {
        legend: {
          labels: {
            colors: "rgba(225, 225, 225, 0.443)",
          },
        },
        fill: {
          gradient: {
            shade: "dark",
            type: "vertical",
            shadeIntensity: 0,
            gradientToColors: undefined,
            inverseColors: false,
            opacityFrom: 0.5,
            opacityTo: 0,
          },
        },
        stroke: {
          width: 2,
          curve: "straight",
        },
        dataLabels: {
          style: {
            colors: ["rgba(225, 225, 225, 0.443)"],
            fontWeight: "normal",
          },
          background: {
            enabled: false,
          },
          formatter(val, opts) {
            return `${formatCurrency(currency)}${val}`;
          },
        },
        grid: {
          borderColor: "#525252",
          strokeDashArray: 2,
        },
        chart: {
          id: "basic-bar",
          animations: { enabled: false },
          toolbar: {
            show: false,
          },
        },
        xaxis: {
          categories: new Array(12)
            .fill(0)
            .map((i, index) => transformIndexToMonth(index)),
          axisBorder: {
            color: "#525252",
          },
          labels: {
            style: {
              colors: "rgba(225, 225, 225, 0.443)",
            },
          },
        },
        yaxis: {
          labels: {
            style: {
              colors: "rgba(225, 225, 225, 0.443)",
            },
          },
        },
      },
      series: [
        { name: "Set aside", data: monthlySavings },
        {
          name: "Expense",
          data: monthlyTotalExpense,
        },
        {
          name: "Income",
          data: monthlyTotalIncome,
        },
      ],
      stroke: {
        width: 1,
      },
    };
  }, [transactions, currency]);

  return (
    <div className="text-black">
      <DeferredChart height={350}>
      <ApexChart
        options={yearlyData.options}
        series={yearlyData.series}
        type="area"
        height={350}
      />
      </DeferredChart>
    </div>
  );
}

export default memo(YearlyChart);
