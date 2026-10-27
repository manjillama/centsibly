import { getServerSession } from "next-auth";
import React from "react";
import { options } from "../api/auth/[...nextauth]/options";
import BudgetWorkspace from "@/components/budget-workspace";
import Greeting from "@/components/greeting";

export default async function DashboardPage() {
  const session = await getServerSession(options);

  return (
    <div className="container mx-auto px-[15px] py-4">
      <Greeting />
      <BudgetWorkspace />
    </div>
  );
}
