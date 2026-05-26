"use client";

import { ReactNode, useState } from "react";
import { Sidebar, NavGroup } from "./Sidebar";
import { Topbar } from "./Topbar";

interface ShellProps {
  groups: NavGroup[];
  crumbs: string[];
  status?: ReactNode;
  children: ReactNode;
}

export function Shell({ groups, crumbs, status, children }: ShellProps) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className={`app ${drawer ? "drawer-open" : ""}`}>
      <div className="app-sidebar">
        <Sidebar groups={groups} />
      </div>
      <div className="app-topbar">
        <Topbar
          crumbs={crumbs}
          status={status}
          onDrawer={() => setDrawer((d) => !d)}
        />
      </div>
      <main className="app-main">{children}</main>
    </div>
  );
}
