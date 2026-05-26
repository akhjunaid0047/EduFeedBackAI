"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Search, Download, Plus, ChevronLeft, ChevronRight, Eye, Star } from "lucide-react";

export default function AdminAlumniPage() {
  const [dept, setDept] = useState("");
  const [year, setYear] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-alumni-rec", dept, year, page],
    queryFn: () => {
      const params = new URLSearchParams({ skip: String(page * limit), limit: String(limit) });
      if (dept) params.append("department", dept);
      if (year) params.append("graduation_year", year);
      return api.get(`/api/v1/alumni/all?${params}`).then((r) => r.data);
    },
  });

  const items = ((data?.items as any[]) || []).filter((a) =>
    !search || (a.job_role_designation || "").toLowerCase().includes(search.toLowerCase())
  );
  const total = data?.total || 0;

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <span className="eyebrow">Data · alumni records</span>
          <h1 className="serif">{total.toLocaleString()} alumni on file.</h1>
          <p className="lede">
            Every alumnus who has submitted a survey, with their current employment snapshot and
            how they rated us.
          </p>
        </div>
        <div className="actions">
          <Button variant="ghost" icon={<Download size={14} />}>Export CSV</Button>
          <Button variant="ghost" icon={<Plus size={14} />}>Invite alumni</Button>
        </div>
      </div>

      <Card padded={false}>
        <div className="filter-bar">
          <span className="input-wrap has-icon" style={{ width: 280 }}>
            <Search size={14} />
            <input
              className="input"
              placeholder="Search by role…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </span>
          <div className="field" style={{ minWidth: 200 }}>
            <Select
              placeholder="All departments"
              value={dept}
              onChange={(e) => { setDept(e.target.value); setPage(0); }}
              options={["CSE", "IT", "ECE", "ME", "Civil", "Chemical", "Other"]}
            />
          </div>
          <div className="field" style={{ minWidth: 140 }}>
            <Select
              placeholder="All grad years"
              value={year}
              onChange={(e) => { setYear(e.target.value); setPage(0); }}
              options={["2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"]}
            />
          </div>
          <span className="filter-bar-meta mono">
            Showing {items.length} of {total.toLocaleString()}
          </span>
        </div>

        {isLoading ? <LoadingSpinner /> : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Alumnus</th>
                  <th>Department</th>
                  <th style={{ width: 100 }}>Grad year</th>
                  <th style={{ width: 160 }}>Status</th>
                  <th>Current role</th>
                  <th style={{ width: 170 }}>Course relevance</th>
                  <th style={{ width: 90, textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a: any) => {
                  const initials = (a.job_role_designation || a.department || "AL").slice(0, 2).toUpperCase();
                  return (
                    <tr key={a.id}>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="avatar-sm">{initials}</span>
                          <span>
                            <span style={{ fontWeight: 500 }}>Alumnus #{a.id?.slice(0, 6)}</span>
                            <br />
                            <span className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>{a.industry_domain || "—"}</span>
                          </span>
                        </span>
                      </td>
                      <td><span style={{ fontSize: 12.5 }}>{a.department || "—"}</span></td>
                      <td><span className="mono">{a.graduation_year || "—"}</span></td>
                      <td>{statusBadge(a.employment_status)}</td>
                      <td>
                        {a.job_role_designation
                          ? <span style={{ fontSize: 12.5 }}>{a.job_role_designation}</span>
                          : <span style={{ color: "var(--ink-3)" }}>—</span>}
                      </td>
                      <td>
                        {a.course_relevance_rating
                          ? <StarRow value={a.course_relevance_rating} />
                          : <span style={{ color: "var(--ink-3)" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Button variant="ghost" size="sm" icon={<Eye size={13} />}>View</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="tbl-foot">
              <span>Page {page + 1} · {limit} per page · {total.toLocaleString()} total</span>
              <div style={{ display: "flex", gap: 4 }}>
                <Button size="sm" variant="ghost" icon={<ChevronLeft size={13} />}
                  onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  Prev
                </Button>
                <Button size="sm" variant="ghost" icon={<ChevronRight size={13} />} iconPos="right"
                  onClick={() => setPage((p) => p + 1)} disabled={items.length < limit}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function statusBadge(status?: string) {
  const tone: Record<string, "green" | "blue" | "orange" | "purple" | "gray"> = {
    Employed: "green", "Higher Studies": "blue", "Self-employed": "purple",
    Freelance: "orange", Unemployed: "gray",
  };
  return <Badge tone={tone[status || ""] || "gray"} size="sm" dot={status === "Employed"}>{status || "Unknown"}</Badge>;
}

function StarRow({ value }: { value: number }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i} size={12}
          style={{ color: i <= value ? "var(--accent)" : "var(--line)", fill: i <= value ? "var(--accent)" : "transparent" }}
        />
      ))}
      <span className="stars-num mono">{value}.0</span>
    </span>
  );
}
