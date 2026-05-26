"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Settings as SettingsIcon, Check, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get("/api/v1/settings").then((r) => r.data),
  });

  const { register, handleSubmit, watch, reset } = useForm<any>();
  useEffect(() => { if (cfg) reset(cfg); }, [cfg, reset]);

  const w1 = parseFloat(watch("relevance_weight_alumni")       || cfg?.relevance_weight_alumni       || 0);
  const w2 = parseFloat(watch("relevance_weight_skill_match")  || cfg?.relevance_weight_skill_match  || 0);
  const w3 = parseFloat(watch("relevance_weight_co_attainment") || cfg?.relevance_weight_co_attainment || 0);
  const sum = (w1 + w2 + w3);
  const ok = Math.abs(sum - 1) < 0.01;

  const mutation = useMutation({
    mutationFn: (data: any) => api.put("/api/v1/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  if (isLoading) return <div className="page page-narrow"><LoadingSpinner /></div>;

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Admin · system settings</span>
          <h1 className="serif">How the system thinks.</h1>
          <p className="lede">
            Three knobs that change how relevance is computed and gaps surface. Super-admin only.
          </p>
        </div>
        <div className="actions">
          <Badge tone="purple" size="sm">
            <SettingsIcon size={12} style={{ marginRight: 4 }} />
            Super-admin only
          </Badge>
        </div>
      </div>

      {success && (
        <div style={{
          borderLeft: "2px solid var(--ok)",
          background: "var(--ok-soft)",
          padding: "10px 14px",
          borderRadius: 4,
          marginBottom: 14,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ok)" }}>Settings saved.</p>
        </div>
      )}

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <Card
          padded
          title="Faculty module"
          subtitle="Whether faculty can submit CO attainment & feedback at all."
        >
          <label className="toggle-row">
            <span>
              <strong>Enable the faculty portal</strong>
              <p>
                When off, faculty accounts can still sign in but the CO and feedback forms
                are hidden. Existing submissions remain in admin views.
              </p>
            </span>
            <label className="switch">
              <input type="checkbox" {...register("faculty_module_enabled")} />
              <span className="switch-track"><span className="switch-knob" /></span>
            </label>
          </label>
        </Card>

        <Card
          padded
          title="Relevance score weights"
          subtitle="How much each signal contributes to a course's relevance score. The three should sum to 1.00."
        >
          <div className="weight-grid">
            <div className="weight-row">
              <div>
                <strong>w₁ · alumni rating</strong>
                <p>How alumni rated the course on a 1–5 scale.</p>
              </div>
              <div className="weight-row-input">
                <input
                  type="range" step="0.01" min="0" max="1"
                  {...register("relevance_weight_alumni")}
                />
                <span className="mono weight-num">{w1.toFixed(2)}</span>
              </div>
            </div>
            <div className="weight-row">
              <div>
                <strong>w₂ · skill match</strong>
                <p>Cosine similarity between syllabus skills and what alumni actually use.</p>
              </div>
              <div className="weight-row-input">
                <input
                  type="range" step="0.01" min="0" max="1"
                  {...register("relevance_weight_skill_match")}
                />
                <span className="mono weight-num">{w2.toFixed(2)}</span>
              </div>
            </div>
            <div className="weight-row">
              <div>
                <strong>w₃ · CO attainment</strong>
                <p>Faculty-reported direct &amp; indirect CO attainment averaged across COs.</p>
              </div>
              <div className="weight-row-input">
                <input
                  type="range" step="0.01" min="0" max="1"
                  {...register("relevance_weight_co_attainment")}
                />
                <span className="mono weight-num">{w3.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className={`weight-sum ${ok ? "is-ok" : "is-warn"}`}>
            <span>Sum:</span>
            <span className="mono weight-sum-num">{sum.toFixed(2)} / 1.00</span>
            {ok
              ? <Badge tone="green" size="sm"><Check size={11} style={{ marginRight: 3 }} /> Valid</Badge>
              : <Badge tone="orange" size="sm"><AlertTriangle size={11} style={{ marginRight: 3 }} /> Doesn't sum to 1.00</Badge>}
          </div>
        </Card>

        <Card
          padded
          title="Analysis thresholds"
          subtitle="When the system flags a skill as a gap."
        >
          <div className="form-grid">
            <Input
              label="Gap threshold"
              hint="Coverage below this counts as a gap (0–1)."
              type="number" step="0.01" min="0" max="1"
              {...register("gap_threshold")}
            />
            <Input
              label="Min. alumni mention"
              hint="Below this we ignore a skill as anecdotal (0–1)."
              type="number" step="0.01" min="0" max="1"
              {...register("min_alumni_mention_pct")}
            />
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <Button type="submit" loading={mutation.isPending}>Save settings</Button>
        </div>
      </form>
    </div>
  );
}
