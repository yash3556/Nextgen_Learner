import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { getHomePathForRole } from "../utils/auth";

function FeatureCard({ title, desc, icon }) {
  return (
    <Card className="transition hover:-translate-y-1" variant="light">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <div className="font-bold text-slate-900">{title}</div>
          <div className="text-sm text-slate-600 mt-1">{desc}</div>
        </div>
      </div>
    </Card>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="w-5 h-5">
      <path d="M12 2l1.5 6L20 10l-6.5 2L12 22l-1.5-10L4 10l6.5-2L12 2z" />
    </svg>
  );
}

function RoadmapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="w-5 h-5">
      <path d="M6 3h12v6H6V3z" />
      <path d="M6 15h12v6H6v-6z" />
      <path d="M4 9h16" />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="w-5 h-5">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="w-5 h-5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
    </svg>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(getHomePathForRole(user.role), { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-lightBg">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-10 w-[34rem] h-[34rem] bg-gradient-to-tr from-primary/25 to-secondary/20 blur-3xl" />
        <div className="pointer-events-none absolute -top-20 right-0 w-[26rem] h-[26rem] bg-gradient-to-tr from-secondary/20 to-primary/10 blur-3xl" />

        <div className="px-4 pt-10 pb-16 mx-auto max-w-6xl">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="WiseGrove Learners Community" className="h-24 w-auto object-contain md:h-32" />
              <div className="hidden md:block">
                <div className="text-3xl font-black tracking-[-0.06em] text-slate-900">WiseGrove</div>
                <div className="text-base font-medium tracking-[-0.04em] text-slate-600">Learners Community</div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/login")}>
                Login
              </Button>
              <Button onClick={() => navigate("/onboarding")}>Get Started</Button>
            </div>
          </header>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
                Become the Best Version of Yourself
              </h1>
              <p className="mt-4 text-slate-600 text-base md:text-lg">
                AI-powered platform to improve your skills, communication, and confidence. Get a personalized plan, daily tasks,
                and an AI teacher that keeps you moving.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Button onClick={() => navigate("/onboarding")}>Get Started</Button>
                <Button variant="ghost" onClick={() => navigate("/login")}>
                  I already have an account
                </Button>
              </div>

              <div className="mt-7 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/70 border border-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                  Notion-style clarity
                </span>
                <span className="rounded-full bg-white/70 border border-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                  Duolingo daily streak vibe
                </span>
                <span className="rounded-full bg-white/70 border border-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                  LinkedIn learning energy
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="glass rounded-3xl p-6 shadow-soft border border-white/70 floaty">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">Learning sprint</div>
                  <div className="text-xs rounded-full px-3 py-1 bg-gradient-to-r from-primary to-secondary text-white shadow-soft">
                    Weekly focus
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    { title: "Strength building", detail: "One skill block every day" },
                    { title: "Community check-in", detail: "Join one peer discussion" },
                    { title: "Project momentum", detail: "Ship one small milestone" }
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-white/80 bg-white/65 p-3">
                      <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-600">{item.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card className="transition hover:-translate-y-1" variant="light">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Community</div>
                      <div className="text-2xl font-bold text-slate-900">12+</div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center text-primary">
                      <CommunityIcon />
                    </div>
                  </div>
                </Card>
                <Card className="transition hover:-translate-y-1" variant="light">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Focus</div>
                      <div className="text-xl font-bold text-slate-900">Practice + AI</div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center text-primary">
                      <RoadmapIcon />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          <section className="mt-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Features that keep you motivated</h2>
                <p className="mt-2 text-slate-600">Premium, simple, and focused on student wins every day.</p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              <FeatureCard title="AI Teacher" desc="Get personalized suggestions based on your weaknesses and interests." icon={<SparkIcon />} />
              <FeatureCard title="Personalized Roadmaps" desc="Follow a plan that matches your goals and progress." icon={<RoadmapIcon />} />
              <FeatureCard title="Daily Tasks" desc="Small tasks you can complete in minutes. Build momentum daily." icon={<TasksIcon />} />
              <FeatureCard title="Community Support" desc="Join sessions and connect with students who grow together." icon={<CommunityIcon />} />
            </div>
          </section>

          <section className="mt-16">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">How It Works</h2>
            <p className="mt-2 text-slate-600">A simple flow. No overwhelm. Just progress.</p>

            <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { step: "1", title: "Fill Profile", desc: "Tell us your skills, interests, and what you want to improve." },
                { step: "2", title: "Get Roadmap", desc: "We generate a clear learning path with tasks per day." },
                { step: "3", title: "Improve Daily", desc: "Finish daily tasks and use your AI teacher to stay confident." }
              ].map((s) => (
                <Card key={s.step} variant="light" className="transition hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold">
                      {s.step}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900">{s.title}</div>
                      <div className="text-sm text-slate-600 mt-1">{s.desc}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <footer className="mt-16 border-t border-slate-200/70 pt-8 pb-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                Built for students. Clean guidance. Daily motivation.
              </div>
              <div className="text-sm font-semibold text-slate-700">
                WiseGrove Learners Community
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

