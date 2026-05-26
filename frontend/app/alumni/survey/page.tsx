"use client";

import { useState, forwardRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/Stat";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

const schema = z.object({
  gender: z.string().optional(),
  degree_program: z.string().optional(),
  department: z.string().optional(),
  graduation_year: z.preprocess((v) => (v === "" || v == null) ? undefined : Number(v), z.number().optional()),
  employment_status: z.string().optional(),
  job_role_designation: z.string().optional(),
  company_name: z.string().optional(),
  industry_domain: z.string().optional(),
  work_mode: z.string().optional(),
  job_responsibilities: z.string().optional(),
  tools_software: z.string().optional(),
  skills_helped_land_job: z.string().optional(),
  course_relevance_rating: z.preprocess((v) => (v === "" || v == null) ? undefined : Number(v), z.number().min(1).max(5).optional()),
  unused_subjects: z.string().optional(),
  skills_missing_from_curriculum: z.string().optional(),
  has_changed_jobs: z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")]).optional(),
  previous_designations: z.string().optional(),
  skills_acquired_after_graduation: z.string().optional(),
  certifications_completed: z.string().optional(),
  career_growth_satisfaction: z.preprocess((v) => (v === "" || v == null) ? undefined : Number(v), z.number().min(1).max(5).optional()),
  placement_preparation: z.string().optional(),
  helpful_platforms: z.string().optional(),
  placement_training_helped: z.string().optional(),
  job_search_difficulties: z.string().optional(),
  suggestions_for_improvement: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const Textarea = forwardRef<HTMLTextAreaElement, any>(({ label, hint, ...props }, ref) => (
  <div className="field">
    {label && <div className="field-label"><span>{label}</span></div>}
    <textarea ref={ref} className="textarea" {...props} />
    {hint && <span className="field-hint">{hint}</span>}
  </div>
));
Textarea.displayName = "Textarea";

const SECTIONS = [
  { id: 0, title: "Background",      sub: "About your time at the institute." },
  { id: 1, title: "Employment",      sub: "What you do today." },
  { id: 2, title: "Role detail",     sub: "Tools, responsibilities, and what got you hired." },
  { id: 3, title: "Curriculum fit",  sub: "What worked, what didn't." },
  { id: 4, title: "Progression",     sub: "How your career has evolved." },
  { id: 5, title: "Placement",       sub: "Reflections on getting placed." },
];

export default function AlumniSurveyPage() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, trigger, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const next = async () => {
    const ok = await trigger();
    if (ok) setStep((s) => Math.min(SECTIONS.length - 1, s + 1));
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      const payload = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== "" && v !== undefined));
      await api.post("/api/v1/alumni/survey", payload);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Submission failed.");
    }
  };

  if (success) {
    return (
      <div className="page page-narrow">
        <Card padded>
          <div className="alumni-empty">
            <div className="alumni-empty-mark">thank you.</div>
            <h3 className="serif">Survey submitted.</h3>
            <p>Your reply is on the rolls. The curriculum committee will see it in the next analytics run.</p>
            <div className="alumni-empty-actions">
              <Button onClick={() => (window.location.href = "/alumni/dashboard")}>Back to dashboard</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const progress = (step + 1) / SECTIONS.length;

  return (
    <div className="page page-wide survey-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Alumni · career survey</span>
          <h1 className="serif">Five minutes that shape the syllabus.</h1>
          <p className="lede">
            Six short sections. Skip anything you don't want to answer — every reply still helps.
          </p>
        </div>
      </div>

      <div className="survey-layout">
        {/* Left rail */}
        <aside className="survey-rail">
          <div className="survey-progress-shell">
            <ProgressBar value={progress} tone="var(--accent)" height={4} />
            <span className="survey-progress-num mono">
              Step {step + 1} of {SECTIONS.length} · {Math.round(progress * 100)}%
            </span>
          </div>
          <ul className="survey-rail-list">
            {SECTIONS.map((s) => {
              const cls = s.id === step ? "is-current" : s.id < step ? "is-done" : "";
              return (
                <li
                  key={s.id}
                  className={`survey-rail-item ${cls}`}
                  onClick={() => setStep(s.id)}
                >
                  <span className="survey-rail-step">
                    {s.id < step ? <Check size={11} /> : <span className="mono">{s.id + 1}</span>}
                  </span>
                  <span className="survey-rail-title">{s.title}</span>
                </li>
              );
            })}
          </ul>
          <div className="survey-rail-aside">
            <span className="eyebrow mono">a note</span>
            <p>
              All replies are stored against your account only. The curriculum committee sees
              <em> aggregated</em> results, never raw individuals.
            </p>
          </div>
        </aside>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="survey-form">
          <Card padded className="survey-card">
            <div className="survey-section-head">
              <span className="eyebrow mono">Section {step + 1}</span>
              <h2 className="serif">{SECTIONS[step].title}</h2>
              <p>{SECTIONS[step].sub}</p>
            </div>

            <div className="form-grid mt-3">
              {step === 0 && (
                <>
                  <Select label="Gender" placeholder="Select" {...register("gender")}
                    options={[
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" },
                      { value: "Prefer not to say", label: "Prefer not to say" },
                    ]} />
                  <Input label="Degree / Programme" {...register("degree_program")} />
                  <Select label="Department" placeholder="Select" {...register("department")}
                    options={["CSE", "IT", "ECE", "ME", "Civil", "Chemical", "Other"]} />
                  <Input label="Graduation year" type="number" {...register("graduation_year")} />
                </>
              )}

              {step === 1 && (
                <>
                  <Select label="Employment status" placeholder="Select" {...register("employment_status")}
                    options={["Employed", "Higher Studies", "Unemployed", "Self-employed", "Freelance"]} />
                  <Input label="Designation" placeholder="e.g. Software Engineer" {...register("job_role_designation")} />
                  <Input label="Company" {...register("company_name")} />
                  <Input label="Industry" {...register("industry_domain")} />
                  <Select label="Mode of work" placeholder="Select" {...register("work_mode")}
                    options={["Remote", "On-site", "Hybrid"]} />
                </>
              )}

              {step === 2 && (
                <>
                  <div className="field-span-2"><Textarea label="Day-to-day responsibilities" hint="As you might describe them to a colleague." {...register("job_responsibilities")} /></div>
                  <div className="field-span-2"><Textarea label="Tools & software employed" {...register("tools_software")} /></div>
                  <div className="field-span-2"><Textarea label="Skills that helped you land the job" {...register("skills_helped_land_job")} /></div>
                </>
              )}

              {step === 3 && (
                <>
                  <Input label="Course-relevance rating (1–5)" type="number" min={1} max={5} {...register("course_relevance_rating")} />
                  <div className="field-span-2"><Textarea label="Subjects you never used in practice" {...register("unused_subjects")} /></div>
                  <div className="field-span-2"><Textarea label="Skills you wish were taught" {...register("skills_missing_from_curriculum")} /></div>
                </>
              )}

              {step === 4 && (
                <>
                  <Select label="Have you changed posts since graduating?" placeholder="Select"
                    {...register("has_changed_jobs")}
                    options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]} />
                  <Input label="Career-growth satisfaction (1–5)" type="number" min={1} max={5} {...register("career_growth_satisfaction")} />
                  <div className="field-span-2"><Textarea label="Previous designations" {...register("previous_designations")} /></div>
                  <div className="field-span-2"><Textarea label="Skills acquired since graduation" {...register("skills_acquired_after_graduation")} /></div>
                  <div className="field-span-2"><Textarea label="Certifications completed" {...register("certifications_completed")} /></div>
                </>
              )}

              {step === 5 && (
                <>
                  <div className="field-span-2"><Textarea label="How did you prepare for placement?" {...register("placement_preparation")} /></div>
                  <div className="field-span-2"><Textarea label="Most helpful platforms / resources" {...register("helpful_platforms")} /></div>
                  <Select label="Did placement training help?" placeholder="Select" {...register("placement_training_helped")}
                    options={["Yes", "Partially", "No"]} />
                  <div className="field-span-2"><Textarea label="Difficulties faced while searching" {...register("job_search_difficulties")} /></div>
                  <div className="field-span-2"><Textarea label="Suggestions to improve student job readiness" {...register("suggestions_for_improvement")} /></div>
                </>
              )}
            </div>
          </Card>

          {error && (
            <div style={{
              borderLeft: "2px solid var(--danger)",
              background: "var(--danger-soft)",
              padding: "8px 12px",
              borderRadius: 4,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--danger)" }}>{error}</p>
            </div>
          )}

          <div className="survey-nav">
            <Button type="button" variant="ghost" onClick={prev} disabled={step === 0} icon={<ChevronLeft size={14} />}>
              Back
            </Button>
            <span className="survey-nav-meta">Step {step + 1} of {SECTIONS.length}</span>
            {step < SECTIONS.length - 1 ? (
              <Button type="button" onClick={next} icon={<ChevronRight size={14} />} iconPos="right">
                Next section
              </Button>
            ) : (
              <Button type="submit" loading={isSubmitting} icon={<Check size={14} />}>
                Submit survey
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
