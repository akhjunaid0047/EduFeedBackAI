"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type ChangeStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "DEFERRED";

const typeColors: Record<string, "green" | "red" | "orange" | "blue"> = {
  ADD: "green", REDUCE: "orange", MODIFY: "blue", OVERHAUL: "red",
};

export default function DiffViewerPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: diff, isLoading } = useQuery({
    queryKey: ["diff", id],
    queryFn: () => api.get(`/api/v1/revision/${id}/diff`).then((r) => r.data),
    refetchInterval: (data) => (!data ? 3000 : false),
  });

  const changeMutation = useMutation({
    mutationFn: ({ changeId, status }: { changeId: string; status: string }) =>
      api.patch(`/api/v1/revision/${id}/changes/${changeId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diff", id] }),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => api.post(`/api/v1/revision/${id}/finalize`).then((r) => r.data),
    onSuccess: async (data) => {
      if (data.revised_pdf_path) {
        const res = await api.get(`/api/v1/revision/${id}/download`, { responseType: "blob" });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = "revised_syllabus.pdf";
        a.click();
      }
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (!diff) return <p className="text-gray-500 text-center py-16">Revision not ready yet. It may still be processing…</p>;

  const changes = diff.changes || [];
  const acceptedCount = changes.filter((c: any) => c.status === "ACCEPTED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Syllabus Diff Viewer</h1>
          <p className="text-sm text-gray-500 mt-1">{changes.length} proposed changes · {acceptedCount} accepted</p>
        </div>
        <Button
          onClick={() => finalizeMutation.mutate()}
          loading={finalizeMutation.isPending}
          disabled={acceptedCount === 0}
        >
          Download Revised PDF
        </Button>
      </div>

      {changes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No changes proposed. The syllabus may already be well-aligned.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {changes.map((change: any) => (
            <div key={change.change_id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-700">{change.unit}</span>
                  <Badge color={typeColors[change.type] || "gray"}>{change.type}</Badge>
                  <span className="text-xs text-gray-400">priority: {change.priority_score?.toFixed(2)}</span>
                </div>
                <Badge color={change.status === "ACCEPTED" ? "green" : change.status === "REJECTED" ? "red" : change.status === "DEFERRED" ? "orange" : "gray"} size="sm">
                  {change.status}
                </Badge>
              </div>

              {/* Side-by-side diff */}
              <div className="grid grid-cols-2 divide-x divide-gray-100">
                <div className="p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Original</p>
                  {change.original_text ? (
                    <p className="text-sm bg-red-50 border border-red-100 rounded p-2 text-red-800">
                      {change.original_text}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">— (new topic)</p>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Proposed</p>
                  {change.proposed_text ? (
                    <p className="text-sm bg-green-50 border border-green-100 rounded p-2 text-green-800">
                      {change.proposed_text}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">— (remove)</p>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between">
                <p className="text-xs text-gray-500 flex-1 mr-4">{change.evidence}</p>
                {change.status === "PENDING" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      onClick={() => changeMutation.mutate({ changeId: change.change_id, status: "ACCEPTED" })}
                      loading={changeMutation.isPending}
                    >
                      ✓ Accept
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => changeMutation.mutate({ changeId: change.change_id, status: "REJECTED" })}
                      loading={changeMutation.isPending}
                    >
                      ✗ Reject
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => changeMutation.mutate({ changeId: change.change_id, status: "DEFERRED" })}
                      loading={changeMutation.isPending}
                    >
                      ⏸ Defer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
