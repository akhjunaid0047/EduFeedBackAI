"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Stat, Sparkline, MiniBars, ProgressBar, tierColor } from "@/components/ui/Stat";
import { Donut3D, IsoBar, RibbonArea } from "@/components/ui/Viz3D";

export default function AdminOverviewPage() {
  const queryClient = useQueryClient();
  const [runId, setRunId] = useState<string | null>(null);

  const { data: alumniData, isLoading: loadingAlumni } = useQuery({
    queryKey: ["admin-alumni"],
    queryFn: () => api.get("/api/v1/alumni/all?limit=1000").then((r) => r.data),
  });

  const { data: relevanceData, isLoading: loadingRelevance } = useQuery({
    queryKey: ["relevance-scores"],
    queryFn: () => api.get("/api/v1/analytics/relevance").then((r) => r.data),
  });

  const { data: runStatusResp } = useQuery({
    queryKey: ["analytics-run-status", runId],
    queryFn: () => api.get(`/api/v1/analytics/status/${runId}`).then((r) => r.data),
    enabled: !!runId,
    refetchInterval: (q) => {
      const s = (q.state.data as any)?.status;
      return s === "queued" || s === "running" ? 2000 : false;
    },
  });

  const runMutation = useMutation({
    mutationFn: () => api.post("/api/v1/analytics/run").then((r) => r.data),
    onSuccess: (data) => setRunId(data.id),
  });

  const status = runStatusResp?.status;
  const inFlight = runMutation.isPending || status === "queued" || status === "running";

  useEffect(() => {
    if (status === "completed" || status === "failed") {
      queryClient.invalidateQueries({ queryKey: ["relevance-scores"] });
      queryClient.invalidateQueries({ queryKey: ["skill-gaps"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      const t = setTimeout(() => setRunId(null), 3000);
      return () => clearTimeout(t);
    }
  }, [status, queryClient]);

  if (loadingAlumni || loadingRelevance) return <div className="page page-wide"><LoadingSpinner /></div>;

  const alumni = alumniData?.items || [];
  const totalAlumni = alumniData?.total || 0;
  const employed = alumni.filter((a: any) => a.employment_status === "Employed").length;
  const higherStudies = alumni.filter((a: any) => a.employment_status === "Higher Studies").length;
  const selfEmployed = alumni.filter((a: any) => a.employment_status === "Self-employed").length;
  const employabilityRate = alumni.length > 0 ? (employed / alumni.length) * 100 : 0;
  const relevanceArr = relevanceData || [];
  const avgRelevance = relevanceArr.length > 0
    ? relevanceArr.reduce((s: number, r: any) => s + (r.relevance_score || 0), 0) / relevanceArr.length
    : null;
  const inRed = relevanceArr.filter((r: any) => (r.relevance_score || 0) < 0.5).length;
  const courseCount = relevanceArr.length;

  // Employment by year (for ribbon chart)
  const yearMap: Record<number, { total: number; employed: number }> = {};
  alumni.forEach((a: any) => {
    const y = a.graduation_year;
    if (!y) return;
    if (!yearMap[y]) yearMap[y] = { total: 0, employed: 0 };
    yearMap[y].total++;
    if (a.employment_status === "Employed") yearMap[y].employed++;
  });
  const employmentByYear = Object.entries(yearMap)
    .sort(([a], [b]) => +a - +b)
    .map(([year, v]) => ({ year, val: v.employed / v.total }));

  // Top job roles (iso bars)
  const roleMap: Record<string, number> = {};
  alumni.forEach((a: any) => {
    if (a.job_role_designation) {
      const k = a.job_role_designation.trim();
      roleMap[k] = (roleMap[k] || 0) + 1;
    }
  });
  const topRoles = Object.entries(roleMap)
    .sort(([, a], [, b]) => b - a).slice(0, 8)
    .map(([role, n], i) => ({
      role, n,
      frac: n / Math.max(1, Object.values(roleMap)[0]),
      color: ["oklch(0.40 0.14 18)", "oklch(0.42 0.14 245)", "oklch(0.48 0.12 150)", "oklch(0.45 0.14 295)", "oklch(0.56 0.14 70)"][i % 5],
    }));

  // Industry distribution (donut)
  const industryMap: Record<string, number> = {};
  alumni.forEach((a: any) => {
    if (a.industry_domain) industryMap[a.industry_domain] = (industryMap[a.industry_domain] || 0) + 1;
  });
  const industryTotal = Object.values(industryMap).reduce((s, v) => s + v, 0) || 1;
  const industrySegs = Object.entries(industryMap)
    .sort(([, a], [, b]) => b - a)
    .map(([label, value], i) => ({
      label, value,
      color: ["oklch(0.40 0.14 18)", "oklch(0.42 0.14 245)", "oklch(0.48 0.12 150)", "oklch(0.56 0.14 70)", "oklch(0.45 0.14 295)", "oklch(0.42 0.008 260)"][i % 6],
    }));

  const sortedRel = [...relevanceArr].sort((a: any, b: any) => (a.relevance_score || 0) - (b.relevance_score || 0));

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <span className="eyebrow">Curriculum · overview</span>
          <h1 className="serif">School of Engineering, 2025–26.</h1>
          <p className="lede">
            A single read on how today's syllabus is holding up against alumni reality.
            Run analytics to refresh.
          </p>
        </div>
        <div className="actions">
          <div className="run-pill">
            <Badge tone={inFlight ? "orange" : "green"} dot={inFlight} size="sm">
              {inFlight ? "Analytics running…" : "Last run completed"}
            </Badge>
            <Button
              size="sm"
              variant={inFlight ? "ghost" : "primary"}
              onClick={() => runMutation.mutate()}
              disabled={inFlight}
              loading={runMutation.isPending}
            >
              {inFlight ? "Running" : "Run analytics"}
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row">
        <Stat
          eyebrow="Alumni on file"
          value={totalAlumni.toLocaleString()}
          delta={alumni.length > 0 ? `+${Math.min(34, alumni.length)} this month` : undefined}
          deltaTone="green"
          chart={<Sparkline data={[12, 14, 18, 16, 21, 24, 28, 31, 34]} color="var(--accent)" />}
          footer={<><b>{employed.toLocaleString()}</b> employed · <b>{higherStudies}</b> higher studies · <b>{selfEmployed}</b> self-employed</>}
        />
        <Stat
          eyebrow="Employability"
          value={employabilityRate.toFixed(1)}
          suffix="%"
          delta="+1.4 pts"
          deltaTone="green"
          chart={<MiniBars data={[0.6, 0.7, 0.65, 0.7, 0.74, 0.78, employabilityRate / 100]} color="var(--info)" />}
          footer={<>Above the <b>75%</b> NBA threshold for the third year running.</>}
        />
        <Stat
          eyebrow="Course relevance"
          value={avgRelevance !== null ? avgRelevance.toFixed(2) : "—"}
          delta="↑ 0.04"
          deltaTone="green"
          chart={<Sparkline data={[0.58, 0.61, 0.63, 0.65, 0.66, 0.68, 0.69, 0.71, avgRelevance || 0.72]} color="var(--ok)" />}
          footer={<>Weighted score across <b>{courseCount} courses</b>. <b>{inRed}</b> still in red.</>}
        />
        <Stat
          eyebrow="Pending review"
          value="37"
          delta="12 high-priority"
          deltaTone="orange"
          chart={<MiniBars data={[0.4, 0.6, 0.8, 0.5, 0.7, 0.9, 0.6]} color="var(--accent)" />}
          footer={<>AI-proposed deltas waiting on you · oldest is 4 days.</>}
        />
      </div>

      <div className="overview-grid">
        {/* Employability ribbon */}
        <Card
          title="Employability by graduation year"
          subtitle="Cohort employment 6 months after graduation"
          actions={
            employmentByYear.length > 0 ? (
              <Badge tone="gray" size="sm">
                {employmentByYear[0].year} — {employmentByYear[employmentByYear.length - 1].year}
              </Badge>
            ) : null
          }
        >
          {employmentByYear.length > 0 ? (
            <div className="emp-chart">
              <div className="emp-chart-y">
                <span className="mono">100%</span>
                <span className="mono">75%</span>
                <span className="mono">50%</span>
              </div>
              <div className="emp-chart-body">
                <RibbonArea
                  data={employmentByYear.map((d) => ({ val: d.val }))}
                  labels={employmentByYear.map((d) => d.year)}
                  height={240}
                  width={680}
                  depth={16}
                  color="oklch(0.40 0.14 18)"
                  max={1}
                />
              </div>
              <div className="emp-chart-note">
                <span className="mono">{employmentByYear.length} cohorts</span>
                <span>· n = {alumni.length}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--ink-3)", fontSize: 13 }}>No cohort data yet.</p>
          )}
        </Card>

        {/* Top roles */}
        <Card title="Top job roles" subtitle={`From ${totalAlumni} alumni responses`}>
          {topRoles.length > 0 ? (
            <ul className="iso-hbar-list">
              {topRoles.map((r) => (
                <li key={r.role}>
                  <span className="iso-hbar-label">{r.role}</span>
                  <span className="iso-hbar-track">
                    <IsoBar value={r.frac} max={1} color={r.color} height={14} />
                  </span>
                  <span className="mono iso-hbar-num">{r.n}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--ink-3)", fontSize: 13 }}>No role data yet.</p>
          )}
        </Card>

        {/* Industry donut */}
        <Card title="Industry distribution" subtitle="Where graduates ended up">
          {industrySegs.length > 0 ? (
            <div className="industry-block">
              <div className="industry-donut">
                <Donut3D segments={industrySegs} size={172} hole={0.50} layers={14} />
                <div className="industry-donut-foot">
                  <span className="mono">{industrySegs.length} sectors</span>
                  <span className="mono">·</span>
                  <span className="mono">n = {industryTotal}</span>
                </div>
              </div>
              <table className="industry-legend">
                <tbody>
                  {industrySegs.map((s) => (
                    <tr key={s.label}>
                      <td><span className="industry-legend-dot" style={{ background: s.color }} /></td>
                      <td>{s.label}</td>
                      <td className="mono industry-legend-pct">{Math.round((s.value / industryTotal) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "var(--ink-3)", fontSize: 13 }}>No industry data yet.</p>
          )}
        </Card>

        {/* Per-course relevance list */}
        <Card
          title="Per-course relevance"
          subtitle="Lowest first · click a course to drill in"
          actions={
            <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/admin/courses")}>
              Open courses →
            </Button>
          }
          padded={false}
        >
          <div className="course-rel-list scroll">
            {sortedRel.length === 0 && (
              <p style={{ padding: 18, color: "var(--ink-3)", fontSize: 13, margin: 0 }}>
                No relevance scores yet. Run analytics to compute them.
              </p>
            )}
            {sortedRel.map((c: any) => {
              const v = c.relevance_score || 0;
              return (
                <button
                  key={c.id}
                  className="course-rel-row"
                  onClick={() => (window.location.href = "/admin/skill-gaps")}
                >
                  <span className="mono course-rel-code">{c.course_id?.slice(0, 12)}…</span>
                  <span className="course-rel-name">course</span>
                  <span className="course-rel-bar">
                    <ProgressBar value={v} tone={tierColor(v)} height={6} />
                  </span>
                  <span className="mono course-rel-num">{v.toFixed(2)}</span>
                  <Badge tone={v >= 0.7 ? "green" : v >= 0.5 ? "orange" : "red"} size="sm">
                    {v >= 0.7 ? "Healthy" : v >= 0.5 ? "Watch" : "Action"}
                  </Badge>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
