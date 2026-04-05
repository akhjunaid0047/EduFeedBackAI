"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

const Textarea = ({ label, ...props }: any) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <textarea className="block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} {...props} />
  </div>
);

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
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Course Feedback</h1>
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">Feedback submitted!</div>}
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Card>
          <div className="space-y-4">
            <Select
              label="Course"
              options={(courses || []).map((c: any) => ({ value: c.id, label: `${c.course_code} — ${c.course_name}` }))}
              placeholder="Select course"
              {...register("course_id", { required: true })}
            />
            <Textarea label="Topics to add (industry-aligned)" {...register("topics_to_add")} />
            <Textarea label="Topics to reduce or remove" {...register("topics_to_remove")} />
            <Textarea label="Topics students find most difficult" {...register("student_difficulties")} />
            <Textarea label="General comments on curriculum currency" {...register("general_comments")} />
          </div>
        </Card>
        <Button type="submit" loading={mutation.isPending} className="w-full">Submit Feedback</Button>
      </form>
    </div>
  );
}
