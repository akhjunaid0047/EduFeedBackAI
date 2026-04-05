import { Sidebar } from "@/components/layout/Sidebar";
import { BarChart2, MessageSquare, Clock } from "lucide-react";

const navItems = [
  { href: "/faculty/co-attainment", label: "CO Attainment", icon: <BarChart2 size={18} /> },
  { href: "/faculty/feedback", label: "Course Feedback", icon: <MessageSquare size={18} /> },
  { href: "/faculty/history", label: "History", icon: <Clock size={18} /> },
];

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar navItems={navItems} title="Faculty Portal" />
      <main className="flex-1 bg-slate-50 p-8 overflow-auto">{children}</main>
    </div>
  );
}
