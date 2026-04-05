"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function SkillGapsPage() {
  const [gapOnly, setGapOnly] = useState(false);

  const { data: gaps, isLoading } = useQuery({
    queryKey: ["skill-gaps", gapOnly],
    queryFn: () =>
      api.get(`/api/v1/analytics/skill-gaps${gapOnly ? "?gap_only=true" : ""}`).then((r) => r.data),
  });

  if (isLoading) return <LoadingSpinner />;

  const data = gaps || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Skill Gap Analysis</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={gapOnly}
            onChange={(e) => setGapOnly(e.target.checked)}
            className="rounded"
          />
          Show gaps only
        </label>
      </div>

      {data.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500 py-8">No data yet. Run an analytics job first.</p>
        </Card>
      ) : (
        <Card title={`${data.length} skill records`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4">Skill</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Coverage</th>
                  <th className="pb-2 pr-4">Alumni Mentions</th>
                  <th className="pb-2 pr-4">Demand %</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((g: any) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-900">{g.skill_name}</td>
                    <td className="py-2 pr-4 text-gray-500">{g.skill_category || "—"}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${g.gap_flag ? "bg-red-500" : "bg-green-500"}`}
                            style={{ width: `${Math.round((g.max_similarity_score || 0) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs">{((g.max_similarity_score || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4">{g.alumni_mention_count}</td>
                    <td className="py-2 pr-4">{((g.alumni_mention_pct || 0) * 100).toFixed(1)}%</td>
                    <td className="py-2">
                      {g.gap_flag ? (
                        <Badge color="red">Gap</Badge>
                      ) : (
                        <Badge color="green">Covered</Badge>
                      )}
                      {g.is_post_grad_skill && (
                        <Badge color="purple" size="sm">Emerging</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
