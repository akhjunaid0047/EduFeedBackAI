"use client";

import { usePathname } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { NavGroup } from "@/components/layout/Sidebar";
import { BarChart3, Lightbulb, History } from "lucide-react";

const groups: NavGroup[] = [
  {
    title: "Faculty",
    items: [
      { href: "/faculty/co-attainment", label: "CO attainment",   icon: <BarChart3 size={17} strokeWidth={1.6} /> },
      { href: "/faculty/feedback",      label: "Course feedback", icon: <Lightbulb size={17} strokeWidth={1.6} /> },
      { href: "/faculty/history",       label: "My submissions",  icon: <History size={17} strokeWidth={1.6} /> },
    ],
  },
];

const labels: Record<string, string[]> = {
  "/faculty/co-attainment": ["CO attainment"],
  "/faculty/feedback":      ["Course feedback"],
  "/faculty/history":       ["My submissions"],
};

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const crumbs = ["Faculty portal", ...(labels[pathname] || ["—"])];
  return <Shell groups={groups} crumbs={crumbs}>{children}</Shell>;
}
