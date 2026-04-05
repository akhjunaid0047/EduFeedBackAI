import { Sidebar } from "@/components/layout/Sidebar";
import {
  LayoutDashboard, TrendingUp, BookOpen, Lightbulb,
  FileText, BarChart2, Users, GraduationCap, Settings
} from "lucide-react";

const navItems = [
  { href: "/admin/overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { href: "/admin/skill-gaps", label: "Skill Gaps", icon: <TrendingUp size={18} /> },
  { href: "/admin/courses", label: "Courses", icon: <BookOpen size={18} /> },
  { href: "/admin/recommendations", label: "Recommendations", icon: <Lightbulb size={18} /> },
  { href: "/admin/syllabus", label: "Syllabus", icon: <FileText size={18} /> },
  { href: "/admin/reports", label: "Reports", icon: <BarChart2 size={18} /> },
  { href: "/admin/alumni", label: "Alumni", icon: <GraduationCap size={18} /> },
  { href: "/admin/faculty", label: "Faculty", icon: <Users size={18} /> },
  { href: "/admin/settings", label: "Settings", icon: <Settings size={18} /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar navItems={navItems} title="Admin Panel" />
      <main className="flex-1 bg-slate-50 p-8 overflow-auto">{children}</main>
    </div>
  );
}
