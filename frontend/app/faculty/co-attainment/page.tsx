"use client";

import { useState, forwardRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";

const Textarea = forwardRef<HTMLTextAreaElement, any>(({ label, ...props }, ref) => (
  <div className="field">
    {label && <div className="field-label"><span>{label}</span></div>}
    <textarea ref={ref} className="textarea" rows={3} {...props} />
  </div>
));
Textarea.displayName = "Textarea";

export default function COAttainmentPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, watch, reset } = useForm();

  const direct = parseFloat((watch("direct_attainment_pct") as any) || 0);
  const indirect = parseFloat((watch("indirect_attainment_pct") as any) || 0);
  const computedFinal = direct && indirect ? (direct * 0.8 + indirect * 0.2).toFixed(1) : "—";

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get("/api/v1/courses").then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/api/v1/faculty/co-attainment", data),
    onSuccess: () => { setSuccess(true); reset(); setTimeout(() => setSuccess(false), 3000); },
    onError: (e: any) => setError(e.response?.data?.detail || "Submission failed"),
  });

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Faculty · CO attainment</span>
          <h1 className="serif">Lodge an attainment return.</h1>
          <p className="lede">
            Record direct and indirect attainment for a single Course Outcome. The system
            computes the final figure using your institution's standard weighting.
          </p>
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
          <p style={{ margin: 0, fontSize: 13, color: "var(--ok)" }}>Report received and entered on the rolls.</p>
        </div>
      )}
      {error && (
        <div style={{
          borderLeft: "2px solid var(--danger)",
          background: "var(--danger-soft)",
          padding: "10px 14px",
          borderRadius: 4,
          marginBottom: 14,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
        <Card padded title="New CO entry" subtitle="One row per CO per term per class">
          <div className="co-grid">
            <Select
              label="Course" required placeholder="Select a course"
              options={(courses || []).map((c: any) => ({ value: c.id, label: `${c.course_code} · ${c.course_name}` }))}
              {...register("course_id", { required: true })}
            />
            <Input label="Academic year" required placeholder="2025-26" {...register("academic_year", { required: true })} />
            <Input label="Semester" type="number" min={1} max={8} required {...register("semester")} />
            <Input label="CO code" required placeholder="CO1" {...register("co_code", { required: true })} />
          </div>

          <div className="form-grid">
            <Input label="Direct attainment %" type="number" step="0.1" min={0} max={100} {...register("direct_attainment_pct")} />
            <Input label="Indirect attainment %" type="number" step="0.1" min={0} max={100} {...register("indirect_attainment_pct")} />
            <Input label="Final attainment %" type="number" step="0.1" min={0} max={100} {...register("final_attainment_pct")} hint={`auto: ${computedFinal}%`} />
            <div className="co-final">
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>computed final</span>
              <span className="co-final-num serif">{computedFinal}<small>%</small></span>
            </div>
          </div>

          <Textarea label="Remarks" {...register("remarks")} />
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <Button type="submit" loading={mutation.isPending}>Submit report</Button>
        </div>
      </form>
    </div>
  );
}
