"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProgressBar } from "@/components/ui/Stat";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

export default function SkillGapsPage() {
  const [gapsOnly, setGapsOnly] = useState(true);
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: gaps, isLoading } = useQuery({
    queryKey: ["skill-gaps"],
    queryFn: () => api.get(`/api/v1/analytics/skill-gaps`).then((r) => r.data),
  });

  if (isLoading) return <div className="page page-wide"><LoadingSpinner /></div>;

  const data = (gaps || []) as any[];

  // Group by course
  const groups = new Map<string, { code: string; name: string; rows: any[] }>();
  for (const g of data) {
    if (!groups.has(g.course_id)) {
      groups.set(g.course_id, {
        code: g.course_code || g.course_id.slice(0, 12) + "…",
        name: g.course_name || "Unknown course",
        rows: [],
      });
    }
    groups.get(g.course_id)!.rows.push(g);
  }
  const courseList = Array.from(groups.entries()).map(([id, g]) => {
    const gapCount = g.rows.filter((r) => r.gap_flag).length;
    const covered = g.rows.length - gapCount;
    const emerging = g.rows.filter((r) => r.is_post_grad_skill).length;
    const avgRelevance = g.rows.reduce((s, r) => s + (r.max_similarity_score || 0), 0) / Math.max(1, g.rows.length);
    return { id, ...g, gapCount, covered, emerging, relevance: avgRelevance };
  }).filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.code.localeCompare(b.code));

  const totalSkills = data.length;
  const totalGaps    = data.filter((d: any) => d.gap_flag).length;
  const totalCovered = totalSkills - totalGaps;
  const totalEmerging = data.filter((d: any) => d.is_post_grad_skill).length;

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <span className="eyebrow">Curriculum · skill gaps</span>
          <h1 className="serif">Where curriculum lags industry.</h1>
          <p className="lede">
            For each course, the skills alumni said they use most — versus what's in the
            parsed syllabus. Red bars are gaps worth addressing.
          </p>
        </div>
        <div className="actions">
          <span className="input-wrap has-icon" style={{ width: 240 }}>
            <Search size={14} />
            <input
              className="input"
              placeholder="Search courses or skills"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </span>
          <label className="switch">
            <input
              type="checkbox"
              checked={gapsOnly}
              onChange={(e) => setGapsOnly(e.target.checked)}
            />
            <span className="switch-track"><span className="switch-knob" /></span>
            <span>Show gaps only</span>
          </label>
        </div>
      </div>

      {data.length === 0 ? (
        <Card>
          <p style={{ textAlign: "center", color: "var(--ink-3)", padding: "32px 16px" }}>
            No skill-gap data yet. Run analytics to compute them.
          </p>
        </Card>
      ) : (
        <>
          <div className="gap-meta">
            <span><b>{courseList.length}</b> courses · <b>{totalSkills} skills</b> tracked</span>
            <span><b className="of-red">{totalGaps}</b> gaps</span>
            <span><b className="of-green">{totalCovered}</b> covered</span>
            <span><b className="of-blue">{totalEmerging}</b> emerging</span>
          </div>

          <div className="gap-groups">
            {courseList.map((c) => {
              const isOpen = openCourse === c.id;
              const visible = gapsOnly ? c.rows.filter((s: any) => s.gap_flag) : c.rows;
              return (
                <Card key={c.id} padded={false} className="gap-card">
                  <button
                    className="gap-head"
                    onClick={() => setOpenCourse(isOpen ? null : c.id)}
                  >
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="mono gap-head-code">{c.code}</span>
                    <span className="gap-head-name">{c.name}</span>
                    <div className="gap-head-meta">
                      <Badge tone="gray" size="sm">{c.rows.length} skills</Badge>
                      <Badge tone="red" size="sm">{c.gapCount} gaps</Badge>
                      <Badge tone="blue" size="sm">{c.emerging} emerging</Badge>
                      <Badge
                        tone={c.relevance >= 0.7 ? "green" : c.relevance >= 0.5 ? "orange" : "red"}
                        size="sm"
                        dot
                      >
                        {c.relevance.toFixed(2)} relevance
                      </Badge>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="tbl-wrap is-dense">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Skill</th>
                            <th style={{ width: 150 }}>Category</th>
                            <th style={{ width: 240 }}>Coverage</th>
                            <th style={{ width: 90, textAlign: "right" }}>Mentions</th>
                            <th style={{ width: 90, textAlign: "right" }}>Demand</th>
                            <th style={{ width: 120 }}>Status</th>
                            <th style={{ width: 110, textAlign: "right" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.length === 0 && (
                            <tr><td colSpan={7} style={{ color: "var(--ink-3)", textAlign: "center" }}>
                              No matching skills.
                            </td></tr>
                          )}
                          {visible.map((s: any) => (
                            <tr key={s.id}>
                              <td>
                                <span className="gap-skill">
                                  {s.skill_name}
                                  {s.is_post_grad_skill && <Badge tone="blue" size="sm">Emerging</Badge>}
                                </span>
                              </td>
                              <td><Badge tone="gray" size="sm">{s.skill_category || "—"}</Badge></td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
                                  <ProgressBar
                                    value={(s.max_similarity_score || 0)}
                                    tone={s.gap_flag ? "var(--danger)" : "var(--ok)"}
                                    height={6}
                                  />
                                  <span className="mono" style={{ width: 44, textAlign: "right", color: "var(--ink-2)" }}>
                                    {Math.round((s.max_similarity_score || 0) * 100)}%
                                  </span>
                                </div>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <span className="mono">{s.alumni_mention_count}</span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <span className="mono">{((s.alumni_mention_pct || 0) * 100).toFixed(1)}%</span>
                              </td>
                              <td>
                                {s.gap_flag
                                  ? <Badge tone="red" size="sm">Gap</Badge>
                                  : <Badge tone="green" size="sm">Covered</Badge>}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <Button variant="ghost" size="sm">Propose</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
