"use client";

import { ReactNode } from "react";
import { ChevronRight, Search, Bell, Menu } from "lucide-react";

interface TopbarProps {
  crumbs: string[];
  status?: ReactNode;
  right?: ReactNode;
  onDrawer?: () => void;
}

export function Topbar({ crumbs, status, right, onDrawer }: TopbarProps) {
  return (
    <header className="topbar" style={{ height: "var(--topbar-h)" }}>
      <button
        type="button"
        className="iconbtn topbar-burger"
        onClick={onDrawer}
        aria-label="Toggle navigation"
      >
        <Menu size={18} />
      </button>

      <nav className="crumbs">
        {crumbs.map((c, i) => (
          <span key={i} className="crumb">
            {i > 0 && <ChevronRight size={12} />}
            <span className={i === crumbs.length - 1 ? "crumb-current" : ""}>{c}</span>
          </span>
        ))}
      </nav>

      <div className="topbar-spacer" />

      <div className="topbar-search">
        <Search size={15} />
        <input placeholder="Search courses, alumni, skills…" />
        <kbd>⌘K</kbd>
      </div>

      {status}
      <button type="button" className="iconbtn" aria-label="Notifications">
        <Bell size={17} />
      </button>
      {right}
    </header>
  );
}
