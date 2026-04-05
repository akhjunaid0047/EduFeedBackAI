"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function AdminAlumniPage() {
  const [department, setDepartment] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-alumni", department, graduationYear, page],
    queryFn: () => {
      const params = new URLSearchParams({ skip: String(page * limit), limit: String(limit) });
      if (department) params.append("department", department);
      if (graduationYear) params.append("graduation_year", graduationYear);
      return api.get(`/api/v1/alumni/all?${params}`).then((r) => r.data);
    },
  });

  const statusColor: Record<string, "green" | "blue" | "gray" | "orange"> = {
    Employed: "green", "Higher Studies": "blue", Unemployed: "gray",
    "Self-employed": "orange", Freelance: "orange",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Alumni Records</h1>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={department}
          onChange={(e) => { setDepartment(e.target.value); setPage(0); }}
        >
          <option value="">All Departments</option>
          {["CSE","IT","ECE","ME","Civil","Chemical","Other"].map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Graduation Year"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40"
          value={graduationYear}
          onChange={(e) => { setGraduationYear(e.target.value); setPage(0); }}
        />
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <Card title={`${data?.total || 0} alumni total`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Dept.</th>
                  <th className="pb-2 pr-4">Grad Year</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2">Relevance ★</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.items || []).map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium">—</td>
                    <td className="py-2 pr-4 text-gray-600">{a.department || "—"}</td>
                    <td className="py-2 pr-4">{a.graduation_year || "—"}</td>
                    <td className="py-2 pr-4">
                      <Badge color={statusColor[a.employment_status] || "gray"} size="sm">
                        {a.employment_status || "Unknown"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 text-gray-600 truncate max-w-xs">{a.job_role_designation || "—"}</td>
                    <td className="py-2">{a.course_relevance_rating ? `${a.course_relevance_rating}/5` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
            <span>Page {page + 1}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">←</button>
              <button onClick={() => setPage(p => p + 1)} disabled={(data?.items || []).length < limit}
                className="px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">→</button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
