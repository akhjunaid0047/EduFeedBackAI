"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Upload, Eye, RefreshCw } from "lucide-react";

export default function SyllabusPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get("/api/v1/courses").then((r) => r.data),
  });

  const { data: syllabi, isLoading } = useQuery({
    queryKey: ["syllabi"],
    queryFn: () => api.get("/api/v1/syllabus/").then((r) => r.data),
    refetchInterval: (q) => {
      const rows = (q.state.data as any[]) || [];
      return rows.some((s) => !s.is_processed) ? 3000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file || !courseId) throw new Error("Select a course and a PDF first");
      const fd = new FormData();
      fd.append("course_id", courseId);
      fd.append("academic_year", academicYear);
      fd.append("file", file);
      return api.post("/api/v1/syllabus/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabi"] });
      setUploadError("");
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => setUploadError(e.message || "Upload failed"),
  });

  const parseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/syllabus/${id}/parse`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["syllabi"] }),
  });

  const revisionMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/revision/run/${id}`).then((r) => r.data),
    onSuccess: (data) => router.push(`/admin/syllabus/${data.id}/diff`),
  });

  const viewMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.get(`/api/v1/syllabus/${id}/file`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });

  const courseMap = new Map((courses || []).map((c: any) => [c.id, c]));

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div>
          <span className="eyebrow">Curriculum · syllabi</span>
          <h1 className="serif">Upload, parse, revise.</h1>
          <p className="lede">
            Every syllabus PDF on file. Upload a new one or trigger a fresh AI revision pass
            against the current alumni signal.
          </p>
        </div>
      </div>

      {/* Upload */}
      <Card
        padded
        title="Upload a new syllabus"
        subtitle="PDF only · we'll parse units, learning outcomes, and assessments automatically."
      >
        <div className="syllabi-upload">
          <div className="form-grid" style={{ flex: 1 }}>
            <Select
              label="Course"
              required
              placeholder="Select a course"
              options={(courses || []).map((c: any) => ({ value: c.id, label: `${c.course_code} · ${c.course_name}` }))}
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            />
            <Input
              label="Academic year"
              required
              placeholder="2025-26"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
            <div className="field-span-2" style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                icon={<Upload size={14} />}
                onClick={() => uploadMutation.mutate()}
                loading={uploadMutation.isPending}
              >
                Upload syllabus
              </Button>
            </div>
          </div>
          <label className="dropzone" htmlFor="syllabus-file">
            <Upload size={20} />
            <span className="dropzone-title">{fileName || "Click or drop a PDF here"}</span>
            <span className="dropzone-hint">.pdf, up to ~10 MB</span>
            <input
              id="syllabus-file"
              ref={fileRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
            />
          </label>
        </div>
        {uploadError && <p className="field-error" style={{ marginTop: 10 }}>{uploadError}</p>}
      </Card>

      {/* Table */}
      <Card padded={false} title="Syllabi on file" subtitle={`${syllabi?.length || 0} documents`}>
        {isLoading ? (
          <LoadingSpinner />
        ) : (!syllabi || syllabi.length === 0) ? (
          <div className="empty">
            <h4>No syllabi yet</h4>
            <p>Upload a PDF above. We'll parse it for you, then you can run an AI revision.</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Course</th>
                  <th style={{ width: 110 }}>Year</th>
                  <th style={{ width: 130 }}>Lodged</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 280, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {syllabi.map((s: any) => {
                  const course: any = courseMap.get(s.course_id);
                  const pendingParse    = parseMutation.isPending    && parseMutation.variables    === s.id;
                  const pendingRevision = revisionMutation.isPending && revisionMutation.variables === s.id;
                  const pendingView     = viewMutation.isPending     && viewMutation.variables     === s.id;
                  return (
                    <tr key={s.id}>
                      <td>
                        <span className="mono" style={{ color: "var(--ink-2)" }}>
                          {course?.course_code || s.course_id?.slice(0, 12)}
                        </span>
                        <br />
                        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                          {course?.course_name || "—"}
                        </span>
                      </td>
                      <td><span className="mono">{s.academic_year || "—"}</span></td>
                      <td className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                        {s.uploaded_at ? new Date(s.uploaded_at).toLocaleDateString() : "—"}
                      </td>
                      <td>
                        {s.is_processed
                          ? <Badge tone="green" size="sm" dot>Parsed</Badge>
                          : <Badge tone="orange" size="sm" dot>Pending parse</Badge>}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <Button size="sm" variant="ghost" icon={<Eye size={13} />}
                            onClick={() => viewMutation.mutate(s.id)} loading={pendingView}>
                            View
                          </Button>
                          {!s.is_processed ? (
                            <Button size="sm" variant="ghost" icon={<RefreshCw size={13} />}
                              onClick={() => parseMutation.mutate(s.id)} loading={pendingParse}>
                              Parse
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => revisionMutation.mutate(s.id)} loading={pendingRevision}>
                              Run revision
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
