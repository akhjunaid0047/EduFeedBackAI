"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const typeColors: Record<string, "green" | "red" | "orange" | "blue" | "gray"> = {
  ADD: "green", REDUCE: "orange", MODIFY: "blue", REVIEW: "gray", OVERHAUL: "red",
};

const statusColors: Record<string, "green" | "red" | "orange" | "blue" | "gray"> = {
  PENDING: "gray", ACCEPTED: "green", REJECTED: "red", DEFERRED: "orange",
};

export default function RecommendationsPage() {
  const queryClient = useQueryClient();
  const { data: recs, isLoading } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => api.get("/api/v1/analytics/recommendations").then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/v1/analytics/recommendations/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Curriculum Recommendations</h1>
      {(!recs || recs.length === 0) ? (
        <Card>
          <p className="text-center text-gray-500 py-8">No recommendations yet. Run analytics to generate them.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {recs.map((rec: any) => (
            <Card key={rec.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color={typeColors[rec.recommendation_type] || "gray"}>
                      {rec.recommendation_type}
                    </Badge>
                    <h3 className="font-semibold text-gray-900">{rec.target_topic}</h3>
                    <Badge color={statusColors[rec.status] || "gray"} size="sm">
                      {rec.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{rec.evidence_summary}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-400">Priority:</span>
                    <div className="w-24 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-blue-500"
                        style={{ width: `${Math.round(rec.priority_score * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 font-mono">{rec.priority_score.toFixed(2)}</span>
                  </div>
                </div>
                {rec.status === "PENDING" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      onClick={() => mutation.mutate({ id: rec.id, status: "ACCEPTED" })}
                      loading={mutation.isPending}
                    >
                      ✓ Accept
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => mutation.mutate({ id: rec.id, status: "REJECTED" })}
                      loading={mutation.isPending}
                    >
                      ✗ Reject
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => mutation.mutate({ id: rec.id, status: "DEFERRED" })}
                      loading={mutation.isPending}
                    >
                      ⏸ Defer
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
