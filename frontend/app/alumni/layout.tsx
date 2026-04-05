import { Sidebar } from "@/components/layout/Sidebar";
import { LayoutDashboard, FileText, RefreshCw } from "lucide-react";

const navItems = [
  { href: "/alumni/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/alumni/survey", label: "Career Survey", icon: <FileText size={18} /> },
  { href: "/alumni/update", label: "Update Profile", icon: <RefreshCw size={18} /> },
];

export default function AlumniLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar navItems={navItems} title="Alumni Portal" />
      <main className="flex-1 bg-slate-50 p-8 overflow-auto">{children}</main>
    </div>
  );
}
