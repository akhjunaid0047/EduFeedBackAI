"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect, useState, forwardRef } from "react";
import api from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const Textarea = forwardRef<HTMLTextAreaElement, any>(({ label, ...props }, ref) => (
  <div className="field">
    {label && <div className="field-label"><span>{label}</span></div>}
    <textarea ref={ref} className="textarea" {...props} />
  </div>
));
Textarea.displayName = "Textarea";

export default function AlumniUpdatePage() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const { data: profile, isLoading } = useQuery({
    queryKey: ["alumni-me"],
    queryFn: () => api.get("/api/v1/alumni/me").then((r) => r.data),
  });

  const { register, handleSubmit, reset } = useForm();
  useEffect(() => { if (profile) reset(profile); }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (data: any) => api.put("/api/v1/alumni/survey", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alumni-me"] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  if (isLoading) return <div className="page page-narrow"><LoadingSpinner /></div>;

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Alumni · update profile</span>
          <h1 className="serif">Amend the record.</h1>
          <p className="lede">
            Should circumstances have shifted since your last reply, set them down here.
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
          <p style={{ margin: 0, fontSize: 13, color: "var(--ok)" }}>Profile updated.</p>
        </div>
      )}

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <Card padded title="Career update" subtitle="Latest employment, skills, certifications">
          <div className="form-grid">
            <Select label="Employment status" {...register("employment_status")}
              options={["Employed", "Higher Studies", "Unemployed", "Self-employed", "Freelance"]} />
            <Input label="Designation" {...register("job_role_designation")} />
            <Input label="Company" {...register("company_name")} />
            <Input label="Industry" {...register("industry_domain")} />
            <div className="field-span-2"><Textarea label="Skills acquired since graduation" {...register("skills_acquired_after_graduation")} /></div>
            <div className="field-span-2"><Textarea label="New certifications" {...register("certifications_completed")} /></div>
            <Input label="Career-growth satisfaction (1–5)" type="number" min={1} max={5} {...register("career_growth_satisfaction")} />
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <Button type="submit" loading={mutation.isPending}>Save changes</Button>
        </div>
      </form>
    </div>
  );
}
