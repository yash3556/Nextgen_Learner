import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { apiFetch } from "../api/api";

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "0ms" }} />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "150ms" }} />
      <span className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
    </span>
  );
}

function TopicButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
        active
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-white/70 bg-white/70 text-slate-600 hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function normalizeSpeakingTopic(value) {
  const allowedTopics = new Set([
    "communication",
    "interview",
    "interview-hr",
    "interview-technical",
    "interview-non-technical"
  ]);

  return allowedTopics.has(value) ? value : "communication";
}

function getSpeakingHint(topic) {
  if (topic === "interview-technical") {
    return "Define the concept first, explain your approach, then add one example or result.";
  }

  if (topic === "interview-hr") {
    return "Keep it honest and specific: direct answer, one example, then a short closing line.";
  }

  if (topic === "interview-non-technical" || topic === "interview") {
    return "Use a simple situation, action, and result flow so the answer sounds clear and practical.";
  }

  return "Aim for a direct answer, 2 supporting ideas, and a short closing sentence.";
}

export default function AITeacher() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeMode = searchParams.get("mode") === "speaking" ? "speaking" : "chat";
  const topicParam = searchParams.get("topic") || "";
  const speakingTopic = activeMode === "speaking" ? normalizeSpeakingTopic(topicParam || "communication") : "communication";
  const starterPrompt = searchParams.get("prompt") || "";

  const [messages, setMessages] = useState([
    {
      id: "m1",
      role: "ai",
      content:
        "Hey, I am your AI Teacher. Tell me what you are struggling with, or switch to Speaking Practice for answer feedback. Admin-only requests require verified Admin ID and Password."
    }
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState({ provider: "fallback", realtime: false, adminAuthenticated: false });
  const [promptLoading, setPromptLoading] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [speakingPrompt, setSpeakingPrompt] = useState(null);
  const [promptError, setPromptError] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [reviewError, setReviewError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [spokenPromptId, setSpokenPromptId] = useState(null);
  const endRef = useRef(null);
  const recognitionRef = useRef(null);
  const dictationBaseRef = useRef("");
  const seededPromptRef = useRef("");

  const formatted = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        lines: String(message.content || "").split("\n")
      })),
    [messages]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    setTtsSupported("speechSynthesis" in window);

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechSupported(false);
      return undefined;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setSpeechError("");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setSpeechError("Microphone permission was blocked. Allow mic access to speak your answer.");
      } else {
        setSpeechError(`Microphone error: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += `${event.results[index][0]?.transcript || ""} `;
      }

      const combined = [dictationBaseRef.current, transcript.trim()].filter(Boolean).join(" ").trim();
      setAnswer(combined);
    };

    recognitionRef.current = recognition;
    setSpeechSupported(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (activeMode !== "speaking") return;
    loadSpeakingPrompt(speakingTopic);
  }, [activeMode, speakingTopic]);

  useEffect(() => {
    if (activeMode !== "speaking" || !speakingPrompt || !ttsSupported) return;
    if (speakingPrompt.id && speakingPrompt.id === spokenPromptId) return;

    speakText(speakingPrompt.question);
    setSpokenPromptId(speakingPrompt.id || null);
  }, [activeMode, speakingPrompt, ttsSupported, spokenPromptId]);

  useEffect(() => {
    let alive = true;

    async function loadStatus() {
      try {
        const data = await apiFetch("/api/ai/status");
        if (!alive) return;
        setAiStatus(data || { provider: "fallback", realtime: false, adminAuthenticated: false });
      } catch {
        if (!alive) return;
        setAiStatus({ provider: "fallback", realtime: false, adminAuthenticated: false });
      }
    }

    loadStatus();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (activeMode !== "chat" || !starterPrompt) return;
    if (seededPromptRef.current === starterPrompt) return;
    seededPromptRef.current = starterPrompt;
    setInput(starterPrompt);
    setMessages((prev) => [
      ...prev,
      {
        id: `hint-${Date.now()}`,
        role: "ai",
        content: `Roadmap help is ready${topicParam ? ` for ${topicParam}` : ""}. Edit the prompt below or press Send to get a guided explanation.`
      }
    ]);
  }, [activeMode, starterPrompt, topicParam]);

  function updateMode(mode, topic = speakingTopic) {
    const next = new URLSearchParams(searchParams);

    if (mode === "speaking") {
      next.set("mode", "speaking");
      next.set("topic", topic);
    } else {
      next.delete("mode");
      if (topicParam) next.set("topic", topicParam);
      next.delete("mode");
    }

    setSearchParams(next);
  }

  async function loadSpeakingPrompt(topic = speakingTopic) {
    setPromptLoading(true);
    setFeedback(null);
    setReviewError("");
    setPromptError("");
    setSpeechError("");
    stopListening();
    stopAudio();

    try {
      const data = await apiFetch(`/api/ai/speaking/prompt?topic=${encodeURIComponent(topic)}`);
      setSpeakingPrompt(data.prompt || null);
    } catch (err) {
      setSpeakingPrompt(null);
      setPromptError(err?.message || "Could not load a speaking prompt right now.");
    } finally {
      setPromptLoading(false);
    }
  }

  function speakText(text) {
    if (!ttsSupported || typeof window === "undefined" || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.96;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function stopAudio() {
    if (ttsSupported && typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
  }

  function startListening() {
    if (!speechSupported || !recognitionRef.current) {
      setSpeechError("Speech recognition is not available in this browser.");
      return;
    }

    dictationBaseRef.current = answer.trim();
    setSpeechError("");

    try {
      recognitionRef.current.start();
    } catch {
      // Ignore duplicate start calls from the browser.
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors from unsupported browser states.
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const userMsg = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);

    await new Promise((resolve) => setTimeout(resolve, 350));

    try {
      const data = await apiFetch("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          messages: [...messages, userMsg].map((message) => ({
            role: message.role === "ai" ? "assistant" : "user",
            content: message.content
          }))
        })
      });
      setAiStatus((prev) => ({
        ...prev,
        adminAuthenticated: Boolean(data?.adminAuthenticated)
      }));
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "ai", content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "ai", content: err?.message || "Sorry, I could not respond. Try again." }
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function reviewAnswer() {
    if (!answer.trim() || !speakingPrompt || reviewBusy) return;

    setReviewBusy(true);
    setReviewError("");
    stopListening();

    try {
      const data = await apiFetch("/api/ai/speaking/review", {
        method: "POST",
        body: JSON.stringify({
          question: speakingPrompt.question,
          answer,
          topic: speakingTopic
        })
      });
      setFeedback(data.feedback || null);
    } catch (err) {
      setFeedback(null);
      setReviewError(err?.message || "Could not review your answer right now.");
    } finally {
      setReviewBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">AI Teacher</h1>
          <p className="mt-2 text-sm text-slate-600">
            Chat for guidance or switch to speaking practice to answer prompts, use your microphone, and get improvement feedback.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                aiStatus.realtime
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                  : "border-amber-400/25 bg-amber-400/15 text-amber-700"
              }`}
            >
              {aiStatus.realtime ? "Real AI mode" : "Fallback mode"}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                aiStatus.adminAuthenticated
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                  : "border-slate-300/70 bg-white/70 text-slate-600"
              }`}
            >
              {aiStatus.adminAuthenticated ? "Admin mode" : "Student mode"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateMode("chat")}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              activeMode === "chat"
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-white/70 bg-white/70 text-slate-700 hover:bg-white"
            }`}
          >
            Chat Coach
          </button>
          <button
            type="button"
            onClick={() => updateMode("speaking", speakingTopic)}
            className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
              activeMode === "speaking"
                ? "border-amber-400/25 bg-amber-400/15 text-amber-700"
                : "border-white/70 bg-white/70 text-slate-700 hover:bg-white"
            }`}
          >
            Speaking Practice
          </button>
        </div>
      </div>

      {activeMode === "chat" ? (
        <Card variant="light" className="overflow-hidden p-0">
          <div className="flex h-[70vh] min-h-[520px] flex-col">
            <div className="flex-1 space-y-4 overflow-auto bg-lightBg px-4 py-5">
              {!aiStatus.realtime ? (
                <div className="rounded-3xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-800">
                  Add `OPENAI_API_KEY` or `GEMINI_API_KEY` in the server `.env` file to enable real-time AI answers and dynamic speaking reviews.
                </div>
              ) : null}

              {starterPrompt ? (
                <div className="rounded-3xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-slate-700">
                  Roadmap help prompt loaded. Press Send to ask AI for a taught, step-by-step explanation.
                </div>
              ) : null}

              <div className="rounded-3xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-600">
                Admin-only requests are locked until verified credentials are entered in chat using `Admin ID: ...` and `Password: ...`.
              </div>

              {formatted.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] rounded-3xl border px-4 py-3 shadow-soft ${
                      message.role === "user"
                        ? "border-transparent bg-gradient-to-r from-primary to-secondary text-white"
                        : "glass border-white/70 text-slate-900"
                    }`}
                  >
                    {message.lines.map((line, index) => (
                      <div key={index} className="whitespace-pre-wrap text-sm font-medium leading-relaxed">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {busy ? (
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-3xl border border-white/70 glass px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      Typing <TypingDots />
                    </div>
                  </div>
                </div>
              ) : null}

              <div ref={endRef} />
            </div>

            <div className="border-t border-slate-200/80 bg-white/30 p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label=""
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask your AI teacher anything..."
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        send();
                      }
                    }}
                  />
                </div>
                <Button onClick={send} disabled={busy || !input.trim()} className="h-11 w-24">
                  Send
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Speaking prompt</div>
                <div className="mt-1 text-sm text-slate-600">
                  The AI teacher will read the question aloud. Answer out loud or type your response, then review how strong it sounds.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <TopicButton active={speakingTopic === "communication"} onClick={() => updateMode("speaking", "communication")}>
                  Communication
                </TopicButton>
                <TopicButton active={speakingTopic === "interview"} onClick={() => updateMode("speaking", "interview")}>
                  Mixed
                </TopicButton>
                <TopicButton active={speakingTopic === "interview-hr"} onClick={() => updateMode("speaking", "interview-hr")}>
                  HR
                </TopicButton>
                <TopicButton active={speakingTopic === "interview-technical"} onClick={() => updateMode("speaking", "interview-technical")}>
                  Technical
                </TopicButton>
                <TopicButton
                  active={speakingTopic === "interview-non-technical"}
                  onClick={() => updateMode("speaking", "interview-non-technical")}
                >
                  Non-technical
                </TopicButton>
              </div>
            </div>

            <div className="mt-5 rounded-[28px] border border-white/70 bg-white/55 p-5">
              {promptLoading ? (
                <div className="space-y-3">
                  <div className="skeleton h-5 w-1/3 rounded-xl" />
                  <div className="skeleton h-5 rounded-xl" />
                  <div className="skeleton h-5 rounded-xl" />
                  <div className="skeleton h-16 rounded-2xl" />
                </div>
              ) : speakingPrompt ? (
                <>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {speakingPrompt.category || speakingPrompt.topic}
                  </div>
                  <div className="mt-2 text-xl font-bold text-slate-900">{speakingPrompt.question}</div>
                  <div className="mt-2 text-sm text-slate-600">{speakingPrompt.encouragement}</div>
                  <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-slate-700">
                    Tip: {speakingPrompt.tip}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-600">{promptError || "Could not load a speaking prompt right now."}</div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="ghost"
                onClick={() => speakText(speakingPrompt?.question)}
                disabled={!ttsSupported || !speakingPrompt}
              >
                Read prompt aloud
              </Button>
              <Button
                variant="ghost"
                onClick={listening ? stopListening : startListening}
                disabled={!speechSupported}
              >
                {listening ? "Stop microphone" : "Start microphone"}
              </Button>
              <Button variant="ghost" onClick={stopAudio} disabled={!ttsSupported}>
                Stop audio
              </Button>
            </div>

            <div className="mt-3 rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-700">
              {speechSupported
                ? listening
                  ? "Listening now. Speak naturally and your answer will appear below."
                  : "Microphone ready. Best support is usually in Chrome or Edge."
                : "Speech recognition is not available in this browser, but you can still type your answer."}
            </div>

            {speechError ? (
              <div className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-400/15 px-4 py-3 text-sm text-amber-800">
                {speechError}
              </div>
            ) : null}

            {promptError ? (
              <div className="mt-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-700">
                {promptError}
              </div>
            ) : null}

            <div className="mt-5">
              <Input
                as="textarea"
                label="Your answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Type the answer you would say out loud..."
                hint={getSpeakingHint(speakingTopic)}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={reviewAnswer} disabled={reviewBusy || !answer.trim() || !speakingPrompt}>
                {reviewBusy ? "Reviewing..." : "Review my answer"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setAnswer("");
                  setFeedback(null);
                  loadSpeakingPrompt(speakingTopic);
                }}
                disabled={promptLoading}
              >
                New question
              </Button>
            </div>

            {reviewError ? (
              <div className="mt-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-700">
                {reviewError}
              </div>
            ) : null}
          </Card>

          <Card>
            <div className="text-sm font-semibold text-slate-900">AI feedback</div>
            <div className="mt-1 text-sm text-slate-600">
              You will get quick strengths, improvement points, and a model answer you can learn from.
            </div>

            {feedback ? (
              <div className="mt-5 space-y-5">
                <div className="rounded-[26px] border border-white/70 bg-white/60 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Score</div>
                  <div className="mt-2 text-4xl font-bold text-slate-900">{feedback.score}/10</div>
                  {feedback.summary ? <div className="mt-3 text-sm text-slate-600">{feedback.summary}</div> : null}
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What went well</div>
                  <div className="mt-3 space-y-2">
                    {feedback.strengths.map((item, index) => (
                      <div
                        key={`strength-${index}`}
                        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Improve next</div>
                  <div className="mt-3 space-y-2">
                    {feedback.improvements.map((item, index) => (
                      <div
                        key={`improvement-${index}`}
                        className="rounded-2xl border border-amber-400/25 bg-amber-400/15 px-4 py-3 text-sm text-amber-800"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/70 bg-white/60 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Next step</div>
                  <div className="mt-2 text-sm font-semibold text-slate-800">{feedback.nextStep}</div>
                </div>

                <div className="rounded-[26px] border border-primary/15 bg-primary/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Model answer</div>
                    <button
                      type="button"
                      onClick={() => speakText(feedback.sampleAnswer)}
                      disabled={!ttsSupported}
                      className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      Play audio
                    </button>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-700">{feedback.sampleAnswer}</div>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-700">
                  1. Read the prompt or play it aloud.
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-700">
                  2. Answer in your own words or use the microphone to capture your response.
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-700">
                  3. Click review to see what is strong and what you can improve.
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
