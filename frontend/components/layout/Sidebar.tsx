"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { logout, getTokenPayload } from "@/lib/auth";
import { ChevronDown, LogOut } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
}
export interface NavGroup {
  title?: string;
  items: NavItem[];
}

interface SidebarProps {
  groups: NavGroup[];
}

function Logomark({ size = 26 }: { size?: number }) {
  // Two stacked rhombi — exactly the design's logomark.
  return (
    <span className="logomark" style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
      <span className="logomark-a" />
      <span className="logomark-b" />
    </span>
  );
}

function BrandLockup() {
  return (
    <div className="brand-lockup">
      <Logomark size={26} />
      <div className="brand-text">
        <span className="brand-name serif">EduFeedback <em>AI</em></span>
        <span className="brand-tag mono">curriculum intelligence</span>
      </div>
    </div>
  );
}

export function Sidebar({ groups }: SidebarProps) {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const p = getTokenPayload();
    setUserEmail(p?.email || "guest@institution.edu");
    setUserRole(p?.role || "guest");
  }, [pathname]);

  const initials = (userEmail.split("@")[0] || "u").slice(0, 2).toUpperCase();
  const roleLabel =
    userRole === "alumni" ? "Alumni" :
    userRole === "faculty" ? "Faculty" :
    userRole === "superadmin" ? "Super-admin" :
    userRole === "admin" ? "Administrator" : "Guest";

  return (
    <aside className="sidenav">
      <div className="sidenav-brand">
        <BrandLockup />
      </div>

      <nav className="sidenav-body scroll">
        {groups.map((group, gi) => (
          <div key={gi} className="sidenav-group">
            {group.title && <span className="sidenav-title">{group.title}</span>}
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidenav-item ${isActive ? "is-active" : ""}`}
                >
                  <span style={{ width: 17, height: 17, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    {item.icon}
                  </span>
                  <span className="sidenav-label">{item.label}</span>
                  {item.badge != null && <span className="sidenav-badge">{item.badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidenav-foot">
        <div className="sidenav-user">
          <div className="sidenav-avatar">{initials}</div>
          <div className="sidenav-user-meta">
            <span className="sidenav-user-name">{userEmail}</span>
            <button className="sidenav-role" type="button">
              {roleLabel}
              <ChevronDown size={11} />
            </button>
          </div>
        </div>
        <button className="sidenav-signout" onClick={logout} type="button">
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
