"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function KPICard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data: alumniData, isLoading: loadingAlumni } = useQuery({
    queryKey: ["admin-alumni"],
    queryFn: () => api.get("/api/v1/alumni/all?limit=1000").then((r) => r.data),
  });

  const { data: relevanceData, isLoading: loadingRelevance } = useQuery({
    queryKey: ["relevance-scores"],
    queryFn: () => api.get("/api/v1/analytics/relevance").then((r) => r.data),
  });

  if (loadingAlumni || loadingRelevance) return <LoadingSpinner />;

  const alumni = alumniData?.items || [];
  const totalAlumni = alumniData?.total || 0;

  // Derived stats
  const employed = alumni.filter((a: any) => a.employment_status === "Employed").length;
  const employabilityRate = totalAlumni > 0 ? Math.round((employed / alumni.length) * 100) : 0;
  const avgRelevance = relevanceData?.length > 0
    ? (relevanceData.reduce((s: number, r: any) => s + (r.relevance_score || 0), 0) / relevanceData.length).toFixed(2)
    : "—";

  // Employment by year
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
    .map(([year, v]) => ({
      year,
      rate: Math.round((v.employed / v.total) * 100),
    }));

  // Top job roles
  const roleMap: Record<string, number> = {};
  alumni.forEach((a: any) => {
    if (a.job_role_designation) {
      const k = a.job_role_designation.trim();
      roleMap[k] = (roleMap[k] || 0) + 1;
    }
  });
  const topRoles = Object.entries(roleMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Industry distribution
  const industryMap: Record<string, number> = {};
  alumni.forEach((a: any) => {
    if (a.industry_domain) industryMap[a.industry_domain] = (industryMap[a.industry_domain] || 0) + 1;
  });
  const industryData = Object.entries(industryMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Overview Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard title="Total Alumni" value={totalAlumni} subtitle="submitted surveys" />
        <KPICard title="Employability Rate" value={`${employabilityRate}%`} subtitle="currently employed" />
        <KPICard title="Avg Course Relevance" value={avgRelevance} subtitle="out of 1.0" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Employability by Year */}
        <Card title="Employability Rate by Year">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={employmentByYear}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Job Roles */}
        <Card title="Top Job Roles">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topRoles} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Industry Distribution */}
        <Card title="Industry Domain Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={industryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {industryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Course Relevance Scores */}
        <Card title="Course Relevance Scores">
          <div className="space-y-3 max-h-56 overflow-y-auto">
            {(relevanceData || []).map((r: any) => (
              <div key={r.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 shrink-0 truncate">{r.course_id?.slice(0,8)}…</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${Math.round((r.relevance_score || 0) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-10 text-right">{(r.relevance_score || 0).toFixed(2)}</span>
              </div>
            ))}
            {(!relevanceData || relevanceData.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">Run analytics to see scores</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
