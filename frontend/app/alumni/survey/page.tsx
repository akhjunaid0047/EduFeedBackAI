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

const schema = z.object({
  gender: z.string().optional(),
  degree_program: z.string().optional(),
  department: z.string().optional(),
  graduation_year: z.preprocess(v => (v === "" || v === null || v === undefined) ? undefined : Number(v), z.number().optional()),
  employment_status: z.string().optional(),
  job_role_designation: z.string().optional(),
  company_name: z.string().optional(),
  industry_domain: z.string().optional(),
  work_mode: z.string().optional(),
  job_responsibilities: z.string().optional(),
  tools_software: z.string().optional(),
  skills_helped_land_job: z.string().optional(),
  course_relevance_rating: z.preprocess(v => (v === "" || v === null || v === undefined) ? undefined : Number(v), z.number().min(1).max(5).optional()),
  unused_subjects: z.string().optional(),
  skills_missing_from_curriculum: z.string().optional(),
  has_changed_jobs: z.union([z.boolean(), z.enum(["true", "false"]).transform(v => v === "true")]).optional(),
  previous_designations: z.string().optional(),
  skills_acquired_after_graduation: z.string().optional(),
  certifications_completed: z.string().optional(),
  career_growth_satisfaction: z.preprocess(v => (v === "" || v === null || v === undefined) ? undefined : Number(v), z.number().min(1).max(5).optional()),
  placement_preparation: z.string().optional(),
  helpful_platforms: z.string().optional(),
  placement_training_helped: z.string().optional(),
  job_search_difficulties: z.string().optional(),
  suggestions_for_improvement: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const Textarea = forwardRef<HTMLTextAreaElement, any>(({ label, error, ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <textarea
      ref={ref}
      className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? "border-red-400" : "border-gray-300"}`}
      rows={3}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
));
Textarea.displayName = "Textarea";

export default function AlumniSurveyPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      // Strip empty strings so optional fields are omitted (backend expects null, not "")
      const payload = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== "" && v !== undefined)
      );
      await api.post("/api/v1/alumni/survey", payload);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Submission failed.");
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-green-600 text-5xl mb-4">✓</div>
        <h2 className="text-xl font-semibold text-gray-900">Survey Submitted!</h2>
        <p className="text-gray-500 mt-2 text-sm">Thank you for contributing to curriculum improvement.</p>
        <a href="/alumni/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">← Back to dashboard</a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Career Outcome Survey</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section A */}
        <Card title="Section A — Personal & Academic Background">
          <div className="space-y-4">
            <Select label="Gender" options={[{value:"Male",label:"Male"},{value:"Female",label:"Female"},{value:"Other",label:"Other"},{value:"Prefer not to say",label:"Prefer not to say"}]} placeholder="Select" {...register("gender")} />
            <Input label="Degree / Program" {...register("degree_program")} />
            <Select label="Department" options={[{value:"CSE",label:"CSE"},{value:"IT",label:"IT"},{value:"ECE",label:"ECE"},{value:"ME",label:"ME"},{value:"Civil",label:"Civil"},{value:"Chemical",label:"Chemical"},{value:"Other",label:"Other"}]} placeholder="Select" {...register("department")} />
            <Input label="Graduation Year" type="number" {...register("graduation_year")} />
          </div>
        </Card>

        {/* Section B */}
        <Card title="Section B — Employment Status & Role">
          <div className="space-y-4">
            <Select label="Employment Status" options={[{value:"Employed",label:"Employed"},{value:"Higher Studies",label:"Higher Studies"},{value:"Unemployed",label:"Unemployed"},{value:"Self-employed",label:"Self-employed"},{value:"Freelance",label:"Freelance"}]} placeholder="Select" {...register("employment_status")} />
            <Input label="Job Role / Designation" {...register("job_role_designation")} />
            <Input label="Company / Organization" {...register("company_name")} />
            <Input label="Industry Domain" {...register("industry_domain")} />
            <Select label="Mode of Work" options={[{value:"Remote",label:"Remote"},{value:"On-site",label:"On-site"},{value:"Hybrid",label:"Hybrid"}]} placeholder="Select" {...register("work_mode")} />
          </div>
        </Card>

        {/* Section C */}
        <Card title="Section C — Role Details">
          <div className="space-y-4">
            <Textarea label="Job Responsibilities" {...register("job_responsibilities")} />
            <Textarea label="Tools / Software used in current role" {...register("tools_software")} />
            <Textarea label="Skills that helped you land the job" {...register("skills_helped_land_job")} />
          </div>
        </Card>

        {/* Section D */}
        <Card title="Section D — Curriculum Relevance">
          <div className="space-y-4">
            <Input label="Course Relevance Rating (1–5)" type="number" min={1} max={5} {...register("course_relevance_rating")} />
            <Textarea label="Subjects you never used in your job" {...register("unused_subjects")} />
            <Textarea label="Skills you wish were taught during college" {...register("skills_missing_from_curriculum")} />
          </div>
        </Card>

        {/* Section E */}
        <Card title="Section E — Career Progression">
          <div className="space-y-4">
            <Select label="Have you changed jobs after graduation?" options={[{value:"true",label:"Yes"},{value:"false",label:"No"}]} placeholder="Select" {...register("has_changed_jobs")} />
            <Textarea label="Previous designations" {...register("previous_designations")} />
            <Textarea label="Skills acquired after graduation" {...register("skills_acquired_after_graduation")} />
            <Textarea label="Certifications completed" {...register("certifications_completed")} />
            <Input label="Career Growth Satisfaction (1–5)" type="number" min={1} max={5} {...register("career_growth_satisfaction")} />
          </div>
        </Card>

        {/* Section F */}
        <Card title="Section F — Placement & Readiness">
          <div className="space-y-4">
            <Textarea label="How did you prepare for job placement?" {...register("placement_preparation")} />
            <Textarea label="Most helpful platforms / resources" {...register("helpful_platforms")} />
            <Select label="Did placement training programs help?" options={[{value:"Yes",label:"Yes"},{value:"Partially",label:"Partially"},{value:"No",label:"No"}]} placeholder="Select" {...register("placement_training_helped")} />
            <Textarea label="Difficulties faced while searching for job" {...register("job_search_difficulties")} />
            <Textarea label="Suggestions to improve student job readiness" {...register("suggestions_for_improvement")} />
          </div>
        </Card>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <Button type="submit" loading={isSubmitting} className="w-full">Submit Survey</Button>
      </form>
    </div>
  );
}
