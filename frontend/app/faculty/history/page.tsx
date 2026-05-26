"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProgressBar } from "@/components/ui/Stat";

export default function FacultyHistoryPage() {
  const [tab, setTab] = useState<"co" | "fb">("co");

  const { data: coReports, isLoading: l1 } = useQuery({
    queryKey: ["faculty-co"],
    queryFn: () => api.get("/api/v1/faculty/co-attainment").then((r) => r.data),
  });
  const { data: feedbacks, isLoading: l2 } = useQuery({
    queryKey: ["faculty-feedback"],
    queryFn: () => api.get("/api/v1/faculty/feedback").then((r) => r.data),
  });

  if (l1 || l2) return <div className="page page-narrow"><LoadingSpinner /></div>;

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Faculty · my submissions</span>
          <h1 className="serif">A chronicle of returns.</h1>
          <p className="lede">
            Every CO attainment report and feedback note you've lodged.
          </p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "co" ? "is-active" : ""}`} onClick={() => setTab("co")}>
          CO attainment <span className="tab-count">{coReports?.length || 0}</span>
        </button>
        <button className={`tab ${tab === "fb" ? "is-active" : ""}`} onClick={() => setTab("fb")}>
          Course feedback <span className="tab-count">{feedbacks?.length || 0}</span>
        </button>
      </div>

      {tab === "co" ? (
        <Card padded={false}>
          {!coReports || coReports.length === 0 ? (
            <div className="empty">
              <h4>No attainment reports yet</h4>
              <p>Lodge your first one from the <a className="link" href="/faculty/co-attainment">CO attainment</a> page.</p>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>CO</th>
                    <th>Term</th>
                    <th>Semester</th>
                    <th style={{ width: 220 }}>Final attainment</th>
                  </tr>
                </thead>
                <tbody>
                  {coReports.map((r: any) => (
                    <tr key={r.id}>
                      <td><span className="mono">{r.co_code}</span></td>
                      <td>{r.academic_year}</td>
                      <td>Sem {r.semester}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
                          <ProgressBar
                            value={(r.final_attainment_pct || 0) / 100}
                            tone={r.final_attainment_pct >= 70 ? "var(--ok)" : r.final_attainment_pct >= 60 ? "var(--warn)" : "var(--danger)"}
                            height={5}
                          />
                          <span className="mono" style={{ width: 60, textAlign: "right", color: "var(--ink-2)" }}>
                            {r.final_attainment_pct?.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card padded={false}>
          {!feedbacks || feedbacks.length === 0 ? (
            <div className="empty">
              <h4>No feedback yet</h4>
              <p>Add notes on what to add, what to reduce, and what students find difficult.</p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {feedbacks.map((f: any) => (
                <li key={f.id} style={{ padding: "16px 20px", borderBottom: "1px solid var(--line-2)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                      {new Date(f.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <Badge tone="gray" size="sm">{f.course_id?.slice(0, 12)}</Badge>
                  </div>
                  {f.topics_to_add && (
                    <p style={{ margin: "4px 0" }}><Badge tone="green" size="sm">add</Badge> {f.topics_to_add}</p>
                  )}
                  {f.topics_to_remove && (
                    <p style={{ margin: "4px 0" }}><Badge tone="orange" size="sm">reduce</Badge> {f.topics_to_remove}</p>
                  )}
                  {f.student_difficulties && (
                    <p style={{ margin: "4px 0" }}><Badge tone="red" size="sm">diff</Badge> {f.student_difficulties}</p>
                  )}
                  {f.general_comments && (
                    <p style={{ margin: "4px 0", color: "var(--ink-2)", fontStyle: "italic" }}>{f.general_comments}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
