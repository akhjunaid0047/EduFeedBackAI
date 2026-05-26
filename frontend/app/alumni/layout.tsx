"use client";

import { usePathname } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { NavGroup } from "@/components/layout/Sidebar";
import { Home, ClipboardList, Edit } from "lucide-react";

const groups: NavGroup[] = [
  {
    title: "Alumni",
    items: [
      { href: "/alumni/dashboard", label: "Dashboard",      icon: <Home size={17} strokeWidth={1.6} /> },
      { href: "/alumni/survey",    label: "Career survey",  icon: <ClipboardList size={17} strokeWidth={1.6} /> },
      { href: "/alumni/update",    label: "Update profile", icon: <Edit size={17} strokeWidth={1.6} /> },
    ],
  },
];

const labels: Record<string, string[]> = {
  "/alumni/dashboard": ["Dashboard"],
  "/alumni/survey":    ["Career survey"],
  "/alumni/update":    ["Update profile"],
};

export default function AlumniLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const crumbs = ["Alumni portal", ...(labels[pathname] || ["—"])];
  return <Shell groups={groups} crumbs={crumbs}>{children}</Shell>;
}
