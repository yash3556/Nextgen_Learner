import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setAuthToken } from "../api/api";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import CheckboxPill from "../components/ui/CheckboxPill";
import ProgressBar from "../components/ui/ProgressBar";
import { getHomePathForRole } from "../utils/auth";

const INTERESTS = ["Python", "Java", "C++", "DSA", "Communication"];

function StepIcon({ children }) {
  return (
    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold">
      {children}
    </div>
  );
}

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0..3
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("");
  const [cgpa, setCgpa] = useState("");

  const [technicalSkills, setTechnicalSkills] = useState("");
  const [nonTechnicalSkills, setNonTechnicalSkills] = useState("");
  const [interests, setInterests] = useState(["DSA"]);

  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("Communication");
  const [goals, setGoals] = useState("Improve my confidence and problem-solving");

  const [errors, setErrors] = useState({});

  const stepMeta = useMemo(
    () => [
      { title: "Your Basics", subtitle: "Start with your details.", icon: <span>1</span> },
      { title: "College & Skills", subtitle: "What are you studying?", icon: <span>2</span> },
      { title: "Interests & Focus", subtitle: "What do you want to practice?", icon: <span>3</span> },
      { title: "Goals & Feedback", subtitle: "Tell us what to improve.", icon: <span>4</span> }
    ],
    []
  );

  useEffect(() => {
    if (user) navigate(getHomePathForRole(user.role), { replace: true });
  }, [user, navigate]);

  function validateCurrent() {
    const nextErrors = {};

    const emailOk = String(email).includes("@") && String(email).includes(".");
    const phoneOk = String(phone).trim().length >= 6;
    const userIdOk = String(userId).trim().length >= 4;
    const passwordOk = String(password).trim().length >= 8;

    if (step === 0) {
      if (!name.trim()) nextErrors.name = "Please enter your name.";
      if (!email.trim() || !emailOk) nextErrors.email = "Enter a valid email address.";
      if (!phone.trim() || !phoneOk) nextErrors.phone = "Enter a valid phone number.";
      if (!userId.trim() || !userIdOk) nextErrors.userId = "Choose a user ID with at least 4 characters.";
      if (!password.trim() || !passwordOk) nextErrors.password = "Password must be at least 8 characters.";
    }
    if (step === 3) {
      if (!strengths.trim()) nextErrors.strengths = "Add at least one strength (comma or new line).";
      if (!weaknesses.trim()) nextErrors.weaknesses = "Add at least one weakness (comma or new line).";
      if (!goals.trim()) nextErrors.goals = "Tell us what help you want (goals).";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!validateCurrent()) return;

    setBusy(true);
    setErrors({});
    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          phone,
          userId,
          password,
          college,
          course,
          cgpa,
          technicalSkills,
          nonTechnicalSkills,
          interests,
          strengths,
          weaknesses,
          goals
        })
      });
      setAuthToken(data.token);
      setUser(data.user || null);
      navigate(getHomePathForRole(data.role), { replace: true });
    } catch (err) {
      const msg = err?.data?.message || err.message || "Failed to submit";
      setErrors({ submit: msg });
    } finally {
      setBusy(false);
    }
  }

  const progressValue = step; // 0..3

  return (
    <div className="min-h-screen bg-lightBg">
      <div className="px-4 py-10 mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-sm font-semibold text-primary">NextZen Learner</div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">Get started</h1>
            <p className="text-sm text-slate-600 mt-2">Takes about 2 minutes. Clear, simple, and motivational.</p>
          </div>

          <div className="hidden sm:block text-right">
            <div className="text-xs text-slate-500">Tip</div>
            <div className="text-sm font-semibold text-slate-800">Use commas or new lines for lists.</div>
          </div>
        </div>

        <div className="mt-8 flex flex-col lg:flex-row gap-6 items-stretch">
          <div className="lg:w-64">
            <Card className="h-full" variant="light">
              <div className="flex items-start gap-4">
                <StepIcon>{step + 1}</StepIcon>
                <div>
                  <div className="font-bold text-slate-900">{stepMeta[step].title}</div>
                  <div className="text-sm text-slate-600 mt-1">{stepMeta[step].subtitle}</div>
                </div>
              </div>

              <div className="mt-6">
                <ProgressBar value={progressValue + 1} max={4} />
              </div>

              <div className="mt-5 space-y-2 text-xs text-slate-600">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className={`font-semibold ${i <= step ? "text-slate-900" : "text-slate-500"}`}>Step {i + 1}</span>
                    <span className={`w-8 h-8 rounded-2xl flex items-center justify-center border ${i <= step ? "bg-gradient-to-r from-primary to-secondary text-white border-transparent" : "bg-white/60 border-white/70 text-slate-700"}`}>
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card variant="light" className="flex-1">
            <form onSubmit={onSubmit} className="space-y-6">
              {errors.submit ? (
                <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium">
                  {errors.submit}
                </div>
              ) : null}

              <div className="relative">
                <div
                  className="transition-all duration-300 ease-out"
                  style={{ transform: `translateX(${(step - 0) * -0}px)` }}
                >
                  {step === 0 ? (
                    <div key="step1" className="space-y-5">
                      <div className="flex items-center gap-3">
                        <StepIcon>👤</StepIcon>
                        <div>
                          <div className="font-bold text-slate-900">Step 1</div>
                          <div className="text-sm text-slate-600">Name, email, phone, user ID, and password.</div>
                        </div>
                      </div>

                      <Input
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Aisha Khan"
                        error={errors.name}
                      />
                      <Input
                        label="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        inputMode="email"
                        error={errors.email}
                      />
                      <Input
                        label="Phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 99999 12345"
                        inputMode="tel"
                        error={errors.phone}
                      />
                      <Input
                        label="User ID"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="e.g., aisha2026"
                        autoComplete="username"
                        error={errors.userId}
                      />
                      <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        autoComplete="new-password"
                        error={errors.password}
                      />
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div key="step2" className="space-y-5">
                      <div className="flex items-center gap-3">
                        <StepIcon>🎓</StepIcon>
                        <div>
                          <div className="font-bold text-slate-900">Step 2</div>
                          <div className="text-sm text-slate-600">Your college and course.</div>
                        </div>
                      </div>

                      <Input
                        label="College"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        placeholder="e.g., ABC University"
                      />
                      <Input
                        label="Course"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        placeholder="e.g., B.Tech / CS / Data Science"
                      />
                      <Input
                        label="CGPA"
                        value={cgpa}
                        onChange={(e) => setCgpa(e.target.value)}
                        placeholder="e.g., 8.4"
                      />
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div key="step3" className="space-y-5">
                      <div className="flex items-center gap-3">
                        <StepIcon>✨</StepIcon>
                        <div>
                          <div className="font-bold text-slate-900">Step 3</div>
                          <div className="text-sm text-slate-600">Your skills and interests.</div>
                        </div>
                      </div>

                      <Input
                        label="Technical Skills"
                        value={technicalSkills}
                        onChange={(e) => setTechnicalSkills(e.target.value)}
                        placeholder="Comma or new line: e.g., Python, C++, DSA"
                        as="textarea"
                      />
                      <Input
                        label="Non-Technical Skills"
                        value={nonTechnicalSkills}
                        onChange={(e) => setNonTechnicalSkills(e.target.value)}
                        placeholder="Comma or new line: e.g., Communication, Teamwork"
                        as="textarea"
                      />

                      <div>
                        <div className="text-sm font-semibold text-slate-800">Interests</div>
                        <div className="text-sm text-slate-600 mt-1">Pick what excites you. We’ll tailor roadmaps.</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {INTERESTS.map((it) => (
                            <CheckboxPill
                              key={it}
                              label={it}
                              checked={interests.includes(it)}
                              onChange={(checked) => {
                                setInterests((prev) =>
                                  checked ? [...prev, it] : prev.filter((x) => x !== it)
                                );
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div key="step4" className="space-y-5">
                      <div className="flex items-center gap-3">
                        <StepIcon>🎯</StepIcon>
                        <div>
                          <div className="font-bold text-slate-900">Step 4</div>
                          <div className="text-sm text-slate-600">Strengths, weaknesses, and goals.</div>
                        </div>
                      </div>

                      <Input
                        label="Strengths"
                        value={strengths}
                        onChange={(e) => setStrengths(e.target.value)}
                        placeholder="Comma or new line: e.g., Logical thinking, consistency"
                        error={errors.strengths}
                        as="textarea"
                      />
                      <Input
                        label="Weaknesses"
                        value={weaknesses}
                        onChange={(e) => setWeaknesses(e.target.value)}
                        placeholder="Comma or new line: e.g., Communication, problem-solving under pressure"
                        error={errors.weaknesses}
                        as="textarea"
                      />
                      <Input
                        label="What help do you want? (Goals)"
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        placeholder="e.g., Speak confidently and solve more DSA questions"
                        error={errors.goals}
                        as="textarea"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={step === 0 || busy}
                  onClick={() => {
                    setErrors({});
                    setStep((s) => Math.max(0, s - 1));
                  }}
                >
                  Back
                </Button>

                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={() => {
                      // validate only if step requires it
                      const ok = validateCurrent();
                      if (!ok) return;
                      setErrors({});
                      setStep((s) => Math.min(3, s + 1));
                    }}
                    className="ml-auto"
                  >
                    Continue
                  </Button>
                ) : (
                  <Button type="submit" disabled={busy} className="ml-auto">
                    {busy ? "Saving..." : "Create Account & Go to Dashboard"}
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

