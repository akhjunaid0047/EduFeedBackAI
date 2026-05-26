"use client";

import { usePathname } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { NavGroup } from "@/components/layout/Sidebar";
import {
  Home, GitCompareArrows, BookOpen, Lightbulb,
  Files, GraduationCap, Users, Download, Settings,
} from "lucide-react";

const groups: NavGroup[] = [
  {
    title: "Curriculum",
    items: [
      { href: "/admin/overview",        label: "Overview",         icon: <Home size={17} strokeWidth={1.6} /> },
      { href: "/admin/skill-gaps",      label: "Skill gaps",       icon: <GitCompareArrows size={17} strokeWidth={1.6} /> },
      { href: "/admin/courses",         label: "Courses",          icon: <BookOpen size={17} strokeWidth={1.6} /> },
      { href: "/admin/recommendations", label: "Recommendations",  icon: <Lightbulb size={17} strokeWidth={1.6} /> },
    ],
  },
  {
    title: "Data",
    items: [
      { href: "/admin/syllabus", label: "Syllabi",              icon: <Files size={17} strokeWidth={1.6} /> },
      { href: "/admin/alumni",   label: "Alumni records",       icon: <GraduationCap size={17} strokeWidth={1.6} /> },
      { href: "/admin/faculty",  label: "Faculty submissions",  icon: <Users size={17} strokeWidth={1.6} /> },
      { href: "/admin/reports",  label: "Reports",              icon: <Download size={17} strokeWidth={1.6} /> },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/admin/settings", label: "Settings", icon: <Settings size={17} strokeWidth={1.6} /> },
    ],
  },
];

const labels: Record<string, string[]> = {
  "/admin/overview":        ["Overview"],
  "/admin/skill-gaps":      ["Skill gaps"],
  "/admin/courses":         ["Courses"],
  "/admin/recommendations": ["Recommendations"],
  "/admin/syllabus":        ["Syllabi"],
  "/admin/reports":         ["Reports"],
  "/admin/alumni":          ["Alumni records"],
  "/admin/faculty":         ["Faculty submissions"],
  "/admin/settings":        ["Settings"],
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  let suffix = labels[pathname];
  if (!suffix && pathname.startsWith("/admin/syllabus/")) suffix = ["Syllabi", "Revision diff"];
  if (!suffix) suffix = ["—"];
  const crumbs = ["Administrator", ...suffix];

  return (
    <Shell groups={groups} crumbs={crumbs}>
      {children}
    </Shell>
  );
}
