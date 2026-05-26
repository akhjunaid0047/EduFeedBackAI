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

  // The SplashGate at the root layout has already played for this session;
  // by the time we reach here we just blank-frame for the redirect tick.
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--paper)" }}>
      <span
        className="spin"
        style={{ width: 24, height: 24, display: "inline-block" }}
      />
    </div>
  );
}
