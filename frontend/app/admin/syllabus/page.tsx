"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function SyllabusPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get("/api/v1/courses").then((r) => r.data),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file || !courseId) throw new Error("Select course and file");
      const fd = new FormData();
      fd.append("course_id", courseId);
      fd.append("academic_year", academicYear);
      fd.append("file", file);
      return api.post("/api/v1/syllabus/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabi"] });
      setUploadError("");
    },
    onError: (e: any) => setUploadError(e.message || "Upload failed"),
  });

  const parseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/syllabus/${id}/parse`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["syllabi"] }),
  });

  const revisionMutation = useMutation({
    mutationFn: (syllabusId: string) =>
      api.post(`/api/v1/revision/run/${syllabusId}`).then((r) => r.data),
    onSuccess: (data) => router.push(`/admin/syllabus/${data.id}/diff`),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Syllabus Management</h1>

      <Card title="Upload Syllabus PDF">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Course</label>
            <select
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select a course…</option>
              {(courses || []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.course_code} — {c.course_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Academic Year (e.g., 2024-25)</label>
            <input
              className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">PDF File</label>
            <input ref={fileRef} type="file" accept=".pdf" className="mt-1 block text-sm" />
          </div>
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          <Button onClick={() => uploadMutation.mutate()} loading={uploadMutation.isPending}>
            Upload Syllabus
          </Button>
        </div>
      </Card>

      <Card title="Note">
        <p className="text-sm text-gray-500">
          After uploading, click <strong>Parse</strong> to extract content, then <strong>Run AI Revision</strong> to generate recommendations and diff.
        </p>
      </Card>
    </div>
  );
}
