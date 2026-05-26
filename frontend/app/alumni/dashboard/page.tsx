"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Star } from "lucide-react";

export default function AlumniDashboard() {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["alumni-me"],
    queryFn: () => api.get("/api/v1/alumni/me").then((r) => r.data),
  });

  if (isLoading) return <div className="page page-narrow"><LoadingSpinner /></div>;

  if (error) {
    return (
      <div className="page page-narrow">
        <div className="page-head">
          <div>
            <span className="eyebrow">Alumni · dashboard</span>
            <h1 className="serif">Welcome.</h1>
          </div>
        </div>
        <Card padded>
          <div className="alumni-empty">
            <div className="alumni-empty-mark">empty.</div>
            <h3 className="serif">No survey on file yet.</h3>
            <p>
              We haven't received your career outcome survey. It takes about <em>five minutes</em>
              and helps the curriculum committee see where the syllabus needs to evolve.
            </p>
            <div className="alumni-empty-actions">
              <Button onClick={() => (window.location.href = "/alumni/survey")}>Begin the survey →</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div>
          <span className="eyebrow">Alumni · dashboard</span>
          <h1 className="serif">A standing profile.</h1>
          <p className="lede">
            Your reply as recorded by the Office of Curriculum Affairs. Update it whenever
            your work situation changes.
          </p>
        </div>
        <div className="actions">
          <Button variant="ghost" onClick={() => (window.location.href = "/alumni/update")}>
            Update profile
          </Button>
        </div>
      </div>

      <div className="alumni-grid">
        <Card padded title="Personal" subtitle="Academic background">
          <dl className="kv">
            <dt>Department</dt><dd>{profile.department || "—"}</dd>
            <dt>Graduation</dt><dd className="mono">{profile.graduation_year || "—"}</dd>
            <dt>Degree</dt><dd>{profile.degree_program || "—"}</dd>
            <dt>Gender</dt><dd>{profile.gender || "—"}</dd>
          </dl>
        </Card>

        <Card padded title="Career standing" subtitle="Where you are now">
          <dl className="kv">
            <dt>Employment</dt>
            <dd>
              <Badge tone={profile.employment_status === "Employed" ? "green" : "gray"} dot>
                {profile.employment_status || "Not specified"}
              </Badge>
            </dd>
            <dt>Role</dt><dd>{profile.job_role_designation || "—"}</dd>
            <dt>Company</dt><dd>{profile.company_name || "—"}</dd>
            <dt>Industry</dt><dd>{profile.industry_domain || "—"}</dd>
            <dt>Work mode</dt><dd>{profile.work_mode || "—"}</dd>
          </dl>
        </Card>

        <Card padded title="Reflections on tuition" subtitle="How you rated us" className="span-2">
          <div className="rating-row">
            <RatingTile
              eyebrow="Course relevance"
              value={profile.course_relevance_rating}
              quote="On the present utility of the syllabus to your work."
            />
            <RatingTile
              eyebrow="Career growth"
              value={profile.career_growth_satisfaction}
              quote="On the trajectory of your professional life since."
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function RatingTile({ eyebrow, value, quote }: { eyebrow: string; value?: number; quote: string }) {
  const v = value ?? null;
  return (
    <div className="rating-tile">
      <span className="rating-eyebrow mono">{eyebrow}</span>
      <div className="alumni-rating-big">
        <span className="alumni-rating-num serif">
          {v ?? "—"}<span style={{ color: "var(--ink-3)", fontSize: 18 }}> / 5</span>
        </span>
        <div className="stars" style={{ marginTop: 4 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i} size={14}
              style={{
                color: v && i <= v ? "var(--accent)" : "var(--line)",
                fill: v && i <= v ? "var(--accent)" : "transparent",
              }}
            />
          ))}
        </div>
      </div>
      <p className="rating-quote">{quote}</p>
    </div>
  );
}
