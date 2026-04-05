"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUserRole } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const role = getUserRole();
    if (role === "alumni") router.replace("/alumni/dashboard");
    else if (role === "faculty") router.replace("/faculty/co-attainment");
    else if (role === "admin" || role === "superadmin") router.replace("/admin/overview");
    else router.replace("/login");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );
}
