"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ProgressBar } from "@/components/ui/Stat";
import { Check, X, History, ChevronLeft, ChevronRight, Download, Info } from "lucide-react";

const typeTone: Record<string, "green" | "orange" | "blue" | "gray" | "purple"> = {
  ADD: "green", REDUCE: "orange", MODIFY: "blue", REVIEW: "gray", OVERHAUL: "purple",
};

export default function DiffViewerPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState(0);

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
        a.href = url; a.download = "revised_syllabus.pdf"; a.click();
      }
    },
  });

  if (isLoading) return <div className="page page-wide diff-page"><LoadingSpinner /></div>;
  if (!diff) {
    return (
      <div className="page page-wide diff-page">
        <p style={{ color: "var(--ink-3)", textAlign: "center", padding: "40px 16px" }}>
          Revision not ready yet — still in composition.
        </p>
      </div>
    );
  }

  const changes = (diff.changes || []) as any[];
  const accepted = changes.filter((c) => c.status === "ACCEPTED").length;
  const cur = changes[current];

  return (
    <div className="page page-wide diff-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Curriculum · syllabus diff</span>
          <h1 className="serif">AI-proposed revisions</h1>
          <p className="lede">
            Walk each proposed change side-by-side with what's currently in the syllabus.
            Accept, reject, or defer. Once you've decided enough of them, print the revised PDF.
          </p>
        </div>
        <div className="actions">
          <Badge tone="blue" size="sm">AI revision · pending review</Badge>
          <Button variant="ghost" icon={<Download size={14} />}>Export change log</Button>
          <Button
            icon={<Download size={14} />}
            disabled={accepted === 0}
            loading={finalizeMutation.isPending}
            onClick={() => finalizeMutation.mutate()}
          >
            Download revised PDF
          </Button>
        </div>
      </div>

      {changes.length === 0 ? (
        <Card>
          <p style={{ textAlign: "center", padding: 32, color: "var(--ink-3)" }}>
            No changes proposed yet.
          </p>
        </Card>
      ) : (
        <div className="diff-layout">
          {/* Left rail */}
          <aside className="diff-rail">
            <div className="diff-rail-head">
              <span className="eyebrow mono">{changes.length} proposed changes</span>
              <div className="diff-rail-actions">
                <Button size="sm" variant="ghost">Accept all hi-priority</Button>
              </div>
            </div>
            <ul className="diff-rail-list scroll">
              {changes.map((c, i) => (
                <li
                  key={c.change_id}
                  className={`diff-rail-item ${i === current ? "is-current" : ""}`}
                  onClick={() => setCurrent(i)}
                >
                  <Badge tone={typeTone[c.type] || "gray"} size="sm">{c.type}</Badge>
                  <div className="diff-rail-meta">
                    <span className="diff-rail-unit mono">{c.unit}</span>
                    <span className="diff-rail-topic">{c.proposed_text || c.original_text || c.evidence}</span>
                  </div>
                  {c.status === "ACCEPTED" ? <Check size={14} style={{ color: "var(--ok)" }} />
                   : c.status === "REJECTED" ? <X size={14} style={{ color: "var(--danger)" }} />
                   : c.status === "DEFERRED" ? <History size={14} style={{ color: "var(--ink-3)" }} />
                   : <span className="diff-rail-dot" />}
                </li>
              ))}
            </ul>
          </aside>

          {/* Main */}
          <main className="diff-main">
            {/* Current change header */}
            <div className="diff-cur-head">
              <Badge tone={typeTone[cur.type] || "gray"} size="md">{cur.type}</Badge>
              <span className="mono diff-cur-unit">{cur.unit}</span>
              <h2 className="serif diff-cur-topic">{cur.proposed_text || cur.original_text || "(change)"}</h2>
              <div className="diff-cur-tail">
                <span className="eyebrow mono">priority</span>
                <ProgressBar
                  value={cur.priority_score || 0}
                  tone={(cur.priority_score || 0) >= 0.8 ? "var(--accent)" : (cur.priority_score || 0) >= 0.5 ? "var(--warn)" : "var(--ink-3)"}
                  height={5}
                />
                <span className="mono diff-cur-priority">{(cur.priority_score || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* 3D-tilted panels */}
            <div className="diff-panels">
              <div className={`diff-panel diff-panel-original ${!cur.original_text ? "is-empty" : ""}`}>
                <header>
                  <span className="eyebrow mono">current syllabus</span>
                  <span className="diff-panel-meta">existing</span>
                </header>
                <div className="diff-content">
                  {cur.original_text ? (
                    <p className="diff-content-body">{cur.original_text}</p>
                  ) : (
                    <div className="diff-empty-placeholder">
                      <span className="mono">— nothing here, this is a new unit —</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`diff-panel diff-panel-proposed ${!cur.proposed_text ? "is-empty" : ""}`}>
                <header>
                  <span className="eyebrow mono">proposed</span>
                  <span className="diff-panel-meta">AI-generated · review carefully</span>
                </header>
                <div className="diff-content">
                  {cur.proposed_text ? (
                    <p className="diff-content-body">{cur.proposed_text}</p>
                  ) : (
                    <div className="diff-empty-placeholder">
                      <span className="mono">— remove this section entirely —</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Evidence */}
            {cur.evidence && (
              <Card padded className="diff-evidence">
                <header className="diff-evidence-head">
                  <Info size={14} />
                  <span className="eyebrow mono">why this change</span>
                </header>
                <p>{cur.evidence}</p>
              </Card>
            )}

            {/* Actions */}
            <footer className="diff-actions">
              <div>
                <Button variant="ghost" icon={<ChevronLeft size={14} />} onClick={() => setCurrent(Math.max(0, current - 1))}>
                  Previous change
                </Button>
                <span className="mono diff-progress">{current + 1} / {changes.length}</span>
                <Button variant="ghost" icon={<ChevronRight size={14} />} iconPos="right" onClick={() => setCurrent(Math.min(changes.length - 1, current + 1))}>
                  Next change
                </Button>
              </div>
              {cur.status === "PENDING" || !cur.status ? (
                <div className="diff-actions-decide">
                  <Button size="sm" variant="ghost" icon={<History size={13} />}
                    loading={changeMutation.isPending}
                    onClick={() => changeMutation.mutate({ changeId: cur.change_id, status: "DEFERRED" })}>
                    Defer
                  </Button>
                  <Button size="sm" variant="ghost" icon={<X size={13} />}
                    loading={changeMutation.isPending}
                    onClick={() => changeMutation.mutate({ changeId: cur.change_id, status: "REJECTED" })}>
                    Reject
                  </Button>
                  <Button size="sm" icon={<Check size={13} />}
                    loading={changeMutation.isPending}
                    onClick={() => changeMutation.mutate({ changeId: cur.change_id, status: "ACCEPTED" })}>
                    Accept change
                  </Button>
                </div>
              ) : (
                <span className="mono rec-decided">decided · {cur.status.toLowerCase()}</span>
              )}
            </footer>
          </main>
        </div>
      )}
    </div>
  );
}
