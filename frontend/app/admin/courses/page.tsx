"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState } from "react";

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [semester, setSemester] = useState("");
  const [credits, setCredits] = useState("");

  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => api.get("/api/v1/courses").then((r) => r.data),
  });

  const { data: relevanceScores } = useQuery({
    queryKey: ["relevance-scores"],
    queryFn: () => api.get("/api/v1/analytics/relevance").then((r) => r.data),
  });

  const addCourseMutation = useMutation({
    mutationFn: (newCourse: any) => api.post("/api/v1/courses", newCourse).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setIsModalOpen(false);
      setCourseCode("");
      setCourseName("");
      setSemester("");
      setCredits("");
    },
  });

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    addCourseMutation.mutate({
      course_code: courseCode,
      course_name: courseName,
      semester: semester ? parseInt(semester) : null,
      credits: credits ? parseInt(credits) : null,
    });
  };

  if (loadingCourses) return <LoadingSpinner />;

  const scoreMap = new Map(
    (relevanceScores || []).map((r: any) => [r.course_id, r])
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <Button onClick={() => setIsModalOpen(true)}>Add Course</Button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Course</h2>
            <form onSubmit={handleAddCourse} className="space-y-4">
              <Input
                label="Course Code"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                required
              />
              <Input
                label="Course Name"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
              />
              <Input
                label="Semester"
                type="number"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              />
              <Input
                label="Credits"
                type="number"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={addCourseMutation.isPending}>
                  Save Course
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(!courses || courses.length === 0) ? (
        <Card>
          <p className="text-center text-gray-500 py-8">No courses found. Add courses to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {courses.map((course: any) => {
            const score = scoreMap.get(course.id);
            const relevance = score?.relevance_score;
            return (
              <Card key={course.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">
                        {course.course_code}
                      </span>
                      <h3 className="font-semibold text-gray-900">{course.course_name}</h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Semester {course.semester} · {course.credits} credits
                    </p>
                  </div>
                  {relevance !== undefined && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Relevance Score</p>
                      <p className={`text-2xl font-bold ${relevance >= 0.7 ? "text-green-600" : relevance >= 0.5 ? "text-yellow-600" : "text-red-600"}`}>
                        {relevance.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
                {relevance !== undefined && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${relevance >= 0.7 ? "bg-green-500" : relevance >= 0.5 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${Math.round(relevance * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-400">
                      <span>Alumni match: {((score?.skill_match_score || 0) * 100).toFixed(0)}%</span>
                      <span>Alumni avg rating: {((score?.alumni_relevance_avg || 0) * 4 + 1).toFixed(1)}/5</span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
