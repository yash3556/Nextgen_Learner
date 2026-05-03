import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/api";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

function Badge({ children, tone = "primary" }) {
  const cls =
    tone === "secondary"
      ? "bg-secondary/10 border-secondary/20 text-secondary"
      : tone === "emerald"
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700"
        : "bg-primary/10 border-primary/20 text-primary";

  return (
    <span className={`px-3 py-1 text-xs font-semibold border rounded-full ${cls}`}>{children}</span>
  );
}

function RoadmapCard({ roadmap, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-3xl glass border border-white/70 shadow-soft hover:shadow-glow hover:-translate-y-0.5 transition p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-500">{roadmap.source === "custom" ? "AI Roadmap" : "Roadmap"}</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{roadmap.title}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{roadmap.duration}</Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="secondary">{roadmap.difficulty}</Badge>
        {roadmap.source === "custom" ? <Badge tone="emerald">Saved</Badge> : null}
      </div>
      <div className="mt-4 text-sm text-slate-600">
        {roadmap.source === "custom" && roadmap.idea
          ? `Created from your idea: ${roadmap.idea}`
          : "Timeline preview included."}
      </div>
    </button>
  );
}

export default function Roadmaps() {
  const [loading, setLoading] = useState(true);
  const [roadmaps, setRoadmaps] = useState([]);
  const [customLoading, setCustomLoading] = useState(false);
  const [idea, setIdea] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch("/api/roadmaps/predefined");
      setRoadmaps(data.roadmaps || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function generateCustom() {
    const prompt = idea.trim();
    setCustomLoading(true);
    setError("");

    try {
      const data = await apiFetch("/api/roadmaps/custom", {
        method: "POST",
        body: JSON.stringify({ idea: prompt })
      });
      setRoadmaps(data.roadmaps || []);
      setIdea("");
      if (data.roadmap?.id) {
        navigate(`/roadmaps/${data.roadmap.id}`);
      }
    } catch (err) {
      setError(err?.message || "Could not generate that roadmap.");
    } finally {
      setCustomLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Roadmaps</h1>
        <p className="text-sm text-slate-600 mt-2">
          Pick a roadmap or describe your own learning idea and let AI turn it into a saved roadmap.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card variant="light">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Create a roadmap from your idea</div>
              <div className="mt-1 text-sm text-slate-600">
                Example: “Build a DSA roadmap for arrays, binary search, and interview practice.”
              </div>
            </div>

            <Input
              as="textarea"
              label="Roadmap idea"
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="Type the exact roadmap idea you want AI to generate..."
              hint="You can mention topic, goal, difficulty, or who the roadmap is for."
            />

            {error ? <div className="text-sm font-medium text-red-600">{error}</div> : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={generateCustom} disabled={customLoading}>
                {customLoading ? "Generating..." : "Generate AI Roadmap"}
              </Button>
              <Button variant="ghost" onClick={() => navigate("/tasks")}>
                View Daily Tasks
              </Button>
            </div>
          </div>
        </Card>

        <Card variant="light">
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-900">What happens next</div>
            <div className="rounded-3xl border border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-700">
              1. You describe the roadmap idea.
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-700">
              2. AI generates a day-by-day roadmap based on your idea and profile.
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-700">
              3. The roadmap is saved here as a real roadmap card you can reopen later.
            </div>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-3xl glass border border-white/70 p-5">
              <div className="skeleton h-5 w-2/3 rounded-xl" />
              <div className="skeleton h-4 mt-3 rounded-xl" />
              <div className="skeleton h-4 mt-3 rounded-xl" />
              <div className="skeleton h-10 mt-4 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {roadmaps.map((roadmap) => (
            <RoadmapCard key={roadmap.id} roadmap={roadmap} onClick={() => navigate(`/roadmaps/${roadmap.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
