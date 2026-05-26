"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProgressBar, tierColor } from "@/components/ui/Stat";
import { Filter, Plus, MoreHorizontal } from "lucide-react";

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ course_code: "", course_name: "", semester: "", credits: "" });

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get("/api/v1/courses").then((r) => r.data),
  });

  const { data: relevance } = useQuery({
    queryKey: ["relevance-scores"],
    queryFn: () => api.get("/api/v1/analytics/relevance").then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (payload: any) => api.post("/api/v1/courses", payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setModalOpen(false);
      setForm({ course_code: "", course_name: "", semester: "", credits: "" });
    },
  });

  if (isLoading) return <div className="page page-wide"><LoadingSpinner /></div>;

  const scoreMap = new Map((relevance || []).map((r: any) => [r.course_id, r.relevance_score]));

  // Group by semester
  const semGroups = new Map<string, any[]>();
  (courses || []).forEach((c: any) => {
    const k = c.semester ? `Semester ${c.semester}` : "Unassigned";
    if (!semGroups.has(k)) semGroups.set(k, []);
    semGroups.get(k)!.push(c);
  });
  const sems = Array.from(semGroups.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <span className="eyebrow">Curriculum · course catalogue</span>
          <h1 className="serif">All {courses?.length || 0} courses, grouped by semester.</h1>
          <p className="lede">
            Every course on file, with its current relevance score where one has been computed.
            Add a new course or click any row to open its syllabus history.
          </p>
        </div>
        <div className="actions">
          <Button variant="ghost" icon={<Filter size={14} />}>Filter</Button>
          <Button icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>Add course</Button>
        </div>
      </div>

      {sems.length === 0 ? (
        <Card>
          <p style={{ textAlign: "center", color: "var(--ink-3)", padding: 32 }}>No courses on file yet.</p>
        </Card>
      ) : (
        sems.map(([sem, rows]) => {
          const totalCredits = rows.reduce((s: number, r: any) => s + (r.credits || 0), 0);
          return (
            <Card key={sem} padded={false} className="semester-card">
              <header className="semester-head">
                <div>
                  <h3 className="serif semester-name">{sem}</h3>
                  <span className="mono semester-year">2025-26</span>
                </div>
                <div className="semester-stats">
                  <span><b>{rows.length}</b> courses</span>
                  <span>·</span>
                  <span><b>{totalCredits}</b> credits</span>
                </div>
              </header>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 170 }}>Code</th>
                      <th>Course</th>
                      <th style={{ width: 100, textAlign: "right" }}>Credits</th>
                      <th style={{ width: 240 }}>Relevance</th>
                      <th style={{ width: 160, textAlign: "right" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => {
                      const score: any = scoreMap.get(r.id);
                      return (
                        <tr key={r.id}>
                          <td><span className="mono" style={{ color: "var(--ink-2)" }}>{r.course_code}</span></td>
                          <td><span style={{ fontWeight: 500 }}>{r.course_name}</span></td>
                          <td style={{ textAlign: "right" }}><span className="mono">{r.credits || "—"}</span></td>
                          <td>
                            {score == null ? (
                              <Badge tone="gray" size="sm">Not yet computed</Badge>
                            ) : (
                              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 160 }}>
                                <ProgressBar value={score} tone={tierColor(score)} height={6} />
                                <span className="mono" style={{ width: 46, textAlign: "right", color: "var(--ink-2)" }}>
                                  {score.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                              <Button variant="ghost" size="sm">Syllabi</Button>
                              <Button variant="ghost" size="sm" icon={<MoreHorizontal size={14} />} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })
      )}

      {/* Add course modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Add a new course</h3>
              <button className="iconbtn" onClick={() => setModalOpen(false)}>✕</button>
            </header>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMutation.mutate({
                  course_code: form.course_code,
                  course_name: form.course_name,
                  semester: form.semester ? parseInt(form.semester) : null,
                  credits: form.credits ? parseInt(form.credits) : null,
                });
              }}
            >
              <div className="modal-body">
                <div className="form-grid">
                  <Input
                    label="Course code" required
                    placeholder="TIU-UCS-T504"
                    hint="Format: TIU-UCS-T###"
                    value={form.course_code}
                    onChange={(e) => setForm({ ...form, course_code: e.target.value })}
                  />
                  <Input
                    label="Credits" type="number" required min={1} max={6}
                    value={form.credits}
                    onChange={(e) => setForm({ ...form, credits: e.target.value })}
                  />
                  <div className="field-span-2">
                    <Input
                      label="Course name" required
                      placeholder="Distributed Systems"
                      value={form.course_name}
                      onChange={(e) => setForm({ ...form, course_name: e.target.value })}
                    />
                  </div>
                  <Select
                    label="Semester" required
                    placeholder="Pick a semester"
                    options={[1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({ value: String(s), label: `Semester ${s}` }))}
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                  />
                  <Select
                    label="Academic year" required
                    placeholder="Pick year"
                    options={["2025-26", "2026-27"]}
                  />
                </div>
              </div>
              <footer className="modal-foot">
                <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" loading={addMutation.isPending}>Add course</Button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
