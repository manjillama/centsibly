"use client";
import { getGreeting } from "@/utils";
import { useSession } from "next-auth/react";

export default function Greeting() {
  const { data: session } = useSession();

  return (
    <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
      {getGreeting()}{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}.
    </h1>
  );
}
