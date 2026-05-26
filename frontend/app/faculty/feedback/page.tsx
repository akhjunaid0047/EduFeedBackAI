"use client";

import { useState, forwardRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";

const Textarea = forwardRef<HTMLTextAreaElement, any>(({ label, ...props }, ref) => (
  <div className="field">
    {label && <div className="field-label"><span>{label}</span></div>}
    <textarea ref={ref} className="textarea" rows={4} {...props} />
  </div>
));
Textarea.displayName = "Textarea";

export default function FacultyFeedbackPage() {
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get("/api/v1/courses").then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/api/v1/faculty/feedback", data),
    onSuccess: () => { setSuccess(true); reset(); setTimeout(() => setSuccess(false), 3000); },
  });

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Faculty · course feedback</span>
          <h1 className="serif">What needs to change.</h1>
          <p className="lede">
            Notes from the chair: what to add, what to set aside, what students find vexing.
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
          <p style={{ margin: 0, fontSize: 13, color: "var(--ok)" }}>Your feedback is recorded.</p>
        </div>
      )}

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
        <Card padded>
          <Select
            label="Course" required placeholder="Select a course"
            options={(courses || []).map((c: any) => ({ value: c.id, label: `${c.course_code} · ${c.course_name}` }))}
            {...register("course_id", { required: true })}
          />
        </Card>

        <div className="feedback-grid">
          <Card padded title="＋ Topics to add" subtitle="Industry-aligned content the syllabus is missing">
            <Textarea {...register("topics_to_add")} />
          </Card>
          <Card padded title="− Topics to reduce" subtitle="Material whose return on student effort is poor">
            <Textarea {...register("topics_to_remove")} />
          </Card>
          <Card padded title="! Difficulties" subtitle="Topics students struggle with most">
            <Textarea {...register("student_difficulties")} />
          </Card>
          <Card padded title="✎ General comments" subtitle="Free-form notes on currency">
            <Textarea {...register("general_comments")} />
          </Card>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <Button type="submit" loading={mutation.isPending}>Submit feedback</Button>
        </div>
      </form>
    </div>
  );
}
