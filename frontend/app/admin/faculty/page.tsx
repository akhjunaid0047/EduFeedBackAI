"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Download } from "lucide-react";

export default function AdminFacultyPage() {
  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <span className="eyebrow">Data · faculty submissions</span>
          <h1 className="serif">Faculty submissions, org-wide.</h1>
          <p className="lede">
            CO attainment and feedback from every faculty member, in one place. Enable the
            faculty module in <a className="link" href="/admin/settings">Settings</a> to start
            collecting submissions.
          </p>
        </div>
        <div className="actions">
          <Button variant="ghost" icon={<Download size={14} />}>Export</Button>
        </div>
      </div>

      <div className="tabs">
        <button className="tab is-active">CO attainment <span className="tab-count">0</span></button>
        <button className="tab">Course feedback <span className="tab-count">0</span></button>
      </div>

      <Card padded={false}>
        <div className="filter-bar">
          <div className="field" style={{ minWidth: 200 }}>
            <Select placeholder="All departments" options={["CSE", "IT", "ECE", "ME"]} />
          </div>
          <div className="field" style={{ minWidth: 200 }}>
            <Select placeholder="All courses" options={["TIU-UCS-T201", "TIU-UCS-T305"]} />
          </div>
          <div className="field" style={{ minWidth: 160 }}>
            <Select placeholder="All terms" options={["2025-26 Even", "2025-26 Odd"]} />
          </div>
        </div>
        <div className="empty">
          <div className="empty-icon" />
          <h4>Faculty module is currently disabled</h4>
          <p>
            Enable it in <a className="link" href="/admin/settings">Settings → Faculty module</a>{" "}
            to start collecting CO attainment reports and course feedback from faculty.
          </p>
        </div>
      </Card>
    </div>
  );
}
