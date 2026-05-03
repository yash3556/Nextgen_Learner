import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { apiFetch } from "../api/api";

function parseRoadmapTasks(tasks = []) {
  const dayMap = new Map();

  tasks.forEach((task) => {
    const raw = String(task || "");
    const match = raw.match(/^Day\s*(\d+)\s*:\s*(.*)$/i);

    if (match) {
      const day = Number(match[1]);
      const text = match[2].trim();
      if (!dayMap.has(day)) dayMap.set(day, []);
      dayMap.get(day).push(text);
      return;
    }

    if (!dayMap.has(1)) dayMap.set(1, []);
    dayMap.get(1).push(raw);
  });

  return [...dayMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, taskTexts]) => ({ day, taskTexts }));
}

function getRoadmapTopic(roadmap) {
  if (roadmap?.id === "communication") return "communication";
  if (roadmap?.id === "dsa-cpp") return "dsa";
  if (roadmap?.id === "python") return "python";
  if (roadmap?.id === "web-dev") return "web";

  const text = `${roadmap?.title || ""} ${(roadmap?.tasks || []).join(" ")}`.toLowerCase();
  if (/(communication|speaking|presentation)/.test(text)) return "communication";
  if (/(dsa|cpp|c\+\+|problem|binary search)/.test(text)) return "dsa";
  if (/(python|loop|function)/.test(text)) return "python";
  if (/(web|react|javascript|html|css)/.test(text)) return "web";
  return "general";
}

function getRoadmapSummary(roadmap) {
  if (roadmap?.id === "dsa-cpp") return "DSA patterns plus C++ problem solving.";
  if (roadmap?.id === "python") return "Python foundations with practice drills and scripts.";
  if (roadmap?.id === "communication") return "Confidence building, speaking drills, and interview responses.";
  if (roadmap?.id === "web-dev") return "Web fundamentals plus React building.";
  return "A personalized mix based on your profile and learning goals.";
}

function getGuideConfig(topic) {
  if (topic === "dsa") {
    return {
      label: "Problem practice",
      url: "https://leetcode.com/problemset/"
    };
  }

  if (topic === "python") {
    return {
      label: "Python guide",
      url: "https://docs.python.org/3/tutorial/"
    };
  }

  if (topic === "web") {
    return {
      label: "Web guide",
      url: "https://developer.mozilla.org/en-US/docs/Learn"
    };
  }

  return null;
}

function buildPlaylistUrl(roadmap, taskText = "") {
  const query = [roadmap?.title, taskText, "tutorial playlist"].filter(Boolean).join(" ");
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function buildAiHelpUrl(roadmap, taskText = "") {
  const topic = getRoadmapTopic(roadmap);
  const params = new URLSearchParams();

  if (topic === "communication") {
    params.set("mode", "speaking");
    params.set("topic", "communication");
  } else {
    params.set("topic", topic);
  }

  if (taskText) {
    params.set(
      "prompt",
      `Help me learn this ${roadmap?.title || "roadmap"} step: ${taskText}. Teach it simply, give me one practice task, and tell me the common mistake to avoid.`
    );
  } else {
    params.set(
      "prompt",
      `Help me follow the ${roadmap?.title || "roadmap"} roadmap. Explain how to start and what I should focus on first.`
    );
  }

  return `/ai-teacher?${params.toString()}`;
}

function openExternal(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function RoadmapDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState(null);
  const [activeInfo, setActiveInfo] = useState({ roadmap: null, currentStep: null });
  const [activating, setActivating] = useState(false);

  const progressKey = roadmap?.id ? `nextzen_roadmap_progress_${roadmap.id}` : null;
  const [progress, setProgress] = useState({});

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const activeData = await apiFetch("/api/roadmaps/active").catch(() => ({ roadmap: null, currentStep: null }));
        if (alive) {
          setActiveInfo({
            roadmap: activeData?.roadmap || null,
            currentStep: activeData?.currentStep || null
          });
        }

        const data = await apiFetch("/api/roadmaps/predefined");
        const found = (data.roadmaps || []).find((item) => item.id === id);

        if (found) {
          if (!alive) return;
          setRoadmap(found);
          return;
        }

        if (id === "custom") {
          const stored = localStorage.getItem("nextzen_custom_roadmap");
          const parsed = stored ? JSON.parse(stored) : activeData?.roadmap?.id === "custom" ? activeData.roadmap : null;
          if (!parsed) throw new Error("No custom roadmap found. Generate one first.");
          if (!alive) return;
          setRoadmap(parsed);
          return;
        }

        throw new Error("Roadmap not found");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load().catch(() => {
      if (alive) setRoadmap(null);
      if (alive) setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!progressKey) return;
    try {
      const stored = localStorage.getItem(progressKey);
      setProgress(stored ? JSON.parse(stored) : {});
    } catch {
      setProgress({});
    }
  }, [progressKey]);

  const days = useMemo(() => parseRoadmapTasks(roadmap?.tasks || []), [roadmap]);
  const topic = useMemo(() => getRoadmapTopic(roadmap), [roadmap]);
  const guide = useMemo(() => getGuideConfig(topic), [topic]);
  const isActiveRoadmap = useMemo(() => {
    if (!roadmap || !activeInfo.roadmap) return false;
    return activeInfo.roadmap.id === roadmap.id && activeInfo.roadmap.title === roadmap.title;
  }, [activeInfo.roadmap, roadmap]);

  const allTasksCount = useMemo(() => days.reduce((count, day) => count + day.taskTexts.length, 0), [days]);
  const completedCount = useMemo(
    () => days.reduce((count, day) => count + day.taskTexts.filter((_, index) => progress[`${day.day}-${index}`]).length, 0),
    [days, progress]
  );

  async function activateRoadmap() {
    if (!roadmap || activating) return;

    setActivating(true);
    try {
      const data = await apiFetch("/api/roadmaps/active", {
        method: "POST",
        body: JSON.stringify({ roadmap })
      });
      setActiveInfo({
        roadmap: data.roadmap || null,
        currentStep: data.currentStep || null
      });
    } catch {
      // Keep the page stable if activation fails.
    } finally {
      setActivating(false);
    }
  }

  async function onGenerateCustom() {
    try {
      const data = await apiFetch("/api/roadmaps/custom", {
        method: "POST",
        body: JSON.stringify({})
      });
      if (data.roadmap?.id) {
        navigate(`/roadmaps/${data.roadmap.id}`, { replace: true });
      } else {
        navigate("/roadmaps", { replace: true });
      }
    } catch {
      // Keep the page stable if generation fails.
    }
  }

  function toggleTask(day, index) {
    const key = `${day}-${index}`;
    setProgress((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        if (progressKey) localStorage.setItem(progressKey, JSON.stringify(next));
      } catch {
        // ignore localStorage errors
      }
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{roadmap?.title || "Roadmap"}</h1>
          <div className="mt-2 text-sm text-slate-600">
            {roadmap?.duration ? <span className="font-semibold text-slate-700">Duration: {roadmap.duration}</span> : null}
            {roadmap?.difficulty ? <span className="ml-2">{roadmap.difficulty}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={activateRoadmap} disabled={!roadmap || activating}>
            {activating ? "Saving..." : isActiveRoadmap ? "Active in Daily Tasks" : "Use in Daily Tasks"}
          </Button>
          <Button variant="secondary" onClick={onGenerateCustom}>
            Generate Custom Roadmap
          </Button>
          <Button variant="ghost" onClick={() => navigate("/tasks")}>
            Go to Tasks
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">
          <Card>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="skeleton h-14 rounded-2xl" />
                ))}
              </div>
            ) : roadmap ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-700">7-Day Timeline</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Learn each step, open a playlist, or ask AI for help when you get stuck.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                    {completedCount}/{allTasksCount} Done
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {days.map((day) => (
                    <div key={day.day} className="rounded-3xl border border-white/70 bg-white/40 p-4 transition hover:shadow-soft">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-900">Day {day.day}</div>
                        <div className="text-xs text-slate-500">
                          {day.taskTexts.filter((_, index) => progress[`${day.day}-${index}`]).length}/{day.taskTexts.length} completed
                        </div>
                      </div>

                      <div className="mt-3 space-y-3">
                        {day.taskTexts.map((taskText, index) => {
                          const key = `${day.day}-${index}`;
                          const checked = Boolean(progress[key]);
                          const aiHelpUrl = buildAiHelpUrl(roadmap, `Day ${day.day}: ${taskText}`);

                          return (
                            <div key={key} className="rounded-2xl border border-white/70 bg-white/55 px-3 py-3">
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleTask(day.day, index)}
                                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border transition ${
                                    checked
                                      ? "border-primary bg-primary text-white"
                                      : "border-slate-300 bg-white text-transparent"
                                  }`}
                                  aria-label={checked ? "Mark task incomplete" : "Mark task complete"}
                                >
                                  &#10003;
                                </button>

                                <div className="min-w-0 flex-1">
                                  <div className={`${checked ? "text-slate-500 line-through" : "font-semibold text-slate-900"}`}>
                                    {taskText}
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openExternal(buildPlaylistUrl(roadmap, taskText))}
                                      className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:-translate-y-0.5"
                                    >
                                      Open playlist
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => navigate(aiHelpUrl)}
                                      className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:-translate-y-0.5"
                                    >
                                      Ask AI for help
                                    </button>
                                    {topic === "communication" ? (
                                      <button
                                        type="button"
                                        onClick={() => navigate("/ai-teacher?mode=speaking&topic=communication")}
                                        className="rounded-full border border-amber-400/25 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:-translate-y-0.5"
                                      >
                                        Practice with audio
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-600">Could not load the roadmap. Generate a custom one or go back.</div>
            )}
          </Card>
        </div>

        <div className="space-y-5 xl:col-span-4">
          <Card variant="light">
            <div className="text-sm font-semibold text-slate-700">Roadmap Summary</div>
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs text-slate-500">Skills covered</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{getRoadmapSummary(roadmap)}</div>
              </div>
              <div className="h-px bg-slate-200/70" />
              <div>
                <div className="text-xs text-slate-500">Next best action</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {days.length ? `Start with Day ${days[0].day}: ${days[0].taskTexts[0] || "your first task"}` : "Generate a roadmap first."}
                </div>
              </div>
              <div className="h-px bg-slate-200/70" />
              <div>
                <div className="text-xs text-slate-500">Daily task sync</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {isActiveRoadmap && activeInfo.currentStep
                    ? `Daily Tasks are following Day ${activeInfo.currentStep.day}: ${activeInfo.currentStep.taskTexts?.[0] || "current roadmap step"}`
                    : "Click 'Use in Daily Tasks' to pull this roadmap into today's task list."}
                </div>
              </div>
            </div>
          </Card>

          <Card variant="light">
            <div className="text-sm font-semibold text-slate-700">Learn This Roadmap</div>
            <div className="mt-3 text-sm text-slate-600">
              Each roadmap now includes faster support so learning feels more guided, not just a checklist.
            </div>

            <div className="mt-4 space-y-3">
              <Button className="w-full" onClick={() => openExternal(buildPlaylistUrl(roadmap))}>
                Open roadmap playlist
              </Button>

              {guide ? (
                <Button className="w-full" variant="ghost" onClick={() => openExternal(guide.url)}>
                  {guide.label}
                </Button>
              ) : null}

              <Button
                className="w-full"
                variant="ghost"
                onClick={() => navigate(buildAiHelpUrl(roadmap))}
              >
                Ask AI to teach this roadmap
              </Button>

              {topic === "communication" ? (
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => navigate("/ai-teacher?mode=speaking&topic=communication")}
                >
                  Open speaking audio practice
                </Button>
              ) : null}
            </div>

            {topic === "communication" ? (
              <div className="mt-4 rounded-3xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-800">
                Use the microphone in Speaking Practice to answer out loud and get AI feedback.
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
