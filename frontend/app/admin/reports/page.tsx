"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Download, FileText, Sheet } from "lucide-react";

async function downloadFile(url: string, filename: string) {
  const res = await api.get(url, { responseType: "blob" });
  const blob = new Blob([res.data]);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState("");

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get("/api/v1/courses").then((r) => r.data),
  });

  const handle = async (key: string, url: string, filename: string) => {
    setDownloading(key);
    try { await downloadFile(url, filename); }
    catch { alert("Download failed. Make sure analytics has been run."); }
    finally { setDownloading(null); }
  };

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <span className="eyebrow">Curriculum · reports</span>
          <h1 className="serif">Export the work, anywhere.</h1>
          <p className="lede">
            Three ready-to-go formats. Everything is regenerated against the latest analytics run.
          </p>
        </div>
      </div>

      <div className="reports-grid">
        <Card padded className="report-card">
          <div className="report-card-icon"><FileText size={22} /></div>
          <h3 className="serif report-card-title">Full curriculum report</h3>
          <p className="report-card-sub">
            Every course, every chart, every recommendation. The artefact you hand to the
            curriculum committee.
          </p>
          <div className="report-card-foot">
            <span className="mono report-card-meta">PDF · last generated today</span>
            <Button
              icon={<Download size={14} />}
              loading={downloading === "full-pdf"}
              onClick={() => handle("full-pdf", "/api/v1/reports/pdf", "edufeedback_report.pdf")}
            >
              Generate PDF
            </Button>
          </div>
        </Card>

        <Card padded className="report-card">
          <div className="report-card-icon"><FileText size={22} /></div>
          <h3 className="serif report-card-title">Per-course report</h3>
          <p className="report-card-sub">
            Pick one course. We'll generate a focused PDF — relevance score, skill matrix,
            alumni quotes, proposed deltas.
          </p>
          <Select
            label="Choose a course"
            placeholder="Select a course"
            options={(courses || []).map((c: any) => ({ value: c.id, label: `${c.course_code} · ${c.course_name}` }))}
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          />
          <div className="report-card-foot">
            <span className="mono report-card-meta">PDF · ~6 pages per course</span>
            <Button
              icon={<Download size={14} />}
              disabled={!selectedCourse}
              loading={downloading === "course-pdf"}
              onClick={() => handle("course-pdf", `/api/v1/reports/pdf/${selectedCourse}`, `course_${selectedCourse}_report.pdf`)}
            >
              Generate PDF
            </Button>
          </div>
        </Card>

        <Card padded className="report-card">
          <div className="report-card-icon"><Sheet size={22} /></div>
          <h3 className="serif report-card-title">Excel export</h3>
          <p className="report-card-sub">
            Raw data behind every chart. Every alumni response, every parsed skill, every proposed change.
          </p>
          <div className="report-card-foot">
            <span className="mono report-card-meta">XLSX</span>
            <Button
              icon={<Download size={14} />}
              loading={downloading === "excel"}
              onClick={() => handle("excel", "/api/v1/reports/excel", "edufeedback_analytics.xlsx")}
            >
              Download Excel
            </Button>
          </div>
        </Card>

      </div>
    </div>
  );
}
