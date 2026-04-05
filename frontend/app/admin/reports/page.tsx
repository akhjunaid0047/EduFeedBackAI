"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

async function downloadFile(url: string, filename: string, responseType: "blob" = "blob") {
  const res = await api.get(url, { responseType });
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

  const handleDownload = async (key: string, url: string, filename: string) => {
    setDownloading(key);
    try {
      await downloadFile(url, filename);
    } catch (e) {
      alert("Download failed. Make sure analytics has been run.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports & Exports</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card title="Full Analytics Report (PDF)">
          <p className="text-sm text-gray-500 mb-4">Complete analytics report including skill gaps, relevance scores, and recommendations.</p>
          <Button
            loading={downloading === "full-pdf"}
            onClick={() => handleDownload("full-pdf", "/api/v1/reports/pdf", "edufeedback_report.pdf")}
          >
            Download PDF
          </Button>
        </Card>

        <Card title="Per-Course PDF Report">
          <div className="mb-4">
            <select
              className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="">Select a course…</option>
              {(courses || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.course_code} — {c.course_name}</option>
              ))}
            </select>
          </div>
          <Button
            loading={downloading === "course-pdf"}
            disabled={!selectedCourse}
            onClick={() => handleDownload("course-pdf", `/api/v1/reports/pdf/${selectedCourse}`, `course_${selectedCourse}_report.pdf`)}
          >
            Download Course PDF
          </Button>
        </Card>

        <Card title="Excel Export">
          <p className="text-sm text-gray-500 mb-4">Raw analytics data: skill gaps, relevance scores, and recommendations in Excel format.</p>
          <Button
            variant="secondary"
            loading={downloading === "excel"}
            onClick={() => handleDownload("excel", "/api/v1/reports/excel", "edufeedback_analytics.xlsx")}
          >
            Download Excel
          </Button>
        </Card>

        <Card title="NAAC/NBA Summary">
          <p className="text-sm text-gray-500 mb-4">Formatted summary suitable for NAAC/NBA accreditation reporting.</p>
          <Button
            variant="secondary"
            loading={downloading === "naac"}
            onClick={() => handleDownload("naac", "/api/v1/reports/naac", "naac_summary.pdf")}
          >
            Download NAAC Summary
          </Button>
        </Card>
      </div>
    </div>
  );
}
