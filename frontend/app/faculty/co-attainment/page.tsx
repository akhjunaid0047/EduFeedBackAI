"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

export default function COAttainmentPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

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
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">CO Attainment Report</h1>
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">Report submitted successfully!</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Card>
          <div className="space-y-4">
            <Select
              label="Course"
              options={(courses || []).map((c: any) => ({ value: c.id, label: `${c.course_code} — ${c.course_name}` }))}
              placeholder="Select course"
              {...register("course_id", { required: true })}
            />
            <Input label="Academic Year (e.g., 2024-25)" {...register("academic_year", { required: true })} />
            <Input label="Semester" type="number" min={1} max={8} {...register("semester")} />
            <Input label="CO Code (e.g., CO1)" {...register("co_code", { required: true })} />
            <Input label="Direct Attainment %" type="number" step="0.1" min={0} max={100} {...register("direct_attainment_pct")} />
            <Input label="Indirect Attainment %" type="number" step="0.1" min={0} max={100} {...register("indirect_attainment_pct")} />
            <Input label="Final Attainment %" type="number" step="0.1" min={0} max={100} {...register("final_attainment_pct")} />
            <div>
              <label className="text-sm font-medium text-gray-700">Remarks</label>
              <textarea className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} {...register("remarks")} />
            </div>
          </div>
        </Card>
        <Button type="submit" loading={mutation.isPending} className="w-full">Submit Report</Button>
      </form>
    </div>
  );
}
