// src/app/(dashboard)/interview/page.tsx
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import Tilt from "react-parallax-tilt";
import {
  Mic, MicOff, Send, Loader2, ChevronRight,
  Clock, SquareX, CheckCircle2, AlertCircle,
} from "lucide-react";
import { InterviewCategory, Difficulty } from "@/types";

type Phase = "setup" | "interview" | "finishing";

interface ChatMsg {
  role: "ai" | "user";
  content: string;
  id: number;
}

const CATEGORIES: { value: InterviewCategory; label: string; icon: string; desc: string }[] = [
  { value: "Technical", label: "Technical", icon: "💻", desc: "DSA, system design, CS fundamentals" },
  { value: "HR", label: "HR / Behavioral", icon: "🤝", desc: "STAR method, situational questions" },
  { value: "Managerial", label: "Managerial", icon: "📋", desc: "Leadership, conflict resolution" },
  { value: "Academic CS", label: "Academic CS", icon: "🎓", desc: "Theory, research, academia" },
  { value: "Product Manager", label: "Product Manager", icon: "🛠️", desc: "Product sense, metrics, roadmap" },
  { value: "General", label: "General", icon: "🌐", desc: "Mixed across all categories" },
];

export default function InterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { post, patch, get } = useApi();
  const { isListening, transcript, startListening, stopListening, resetTranscript, setTranscript, isSupported } = useSpeechRecognition();
  const { speak, stopSpeaking, isSpeaking } = useTextToSpeech();

  // Setup state
  const [category, setCategory] = useState<InterviewCategory>("Technical");
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [numQ, setNumQ] = useState(5);
  const [phase, setPhase] = useState<Phase>("setup");
  const [resumeLoading, setResumeLoading] = useState(false);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [currentQuestionText, setCurrentQuestionText] = useState("");
  const [questionOrder, setQuestionOrder] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [aiThinking, setAiThinking] = useState(false);
  const [timer, setTimer] = useState(0);
  const [ending, setEnding] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgId = useRef(0);

  // Handle ?resume=sessionId on mount
  useEffect(() => {
    const resumeId = searchParams.get("resume");
    if (!resumeId) return;

    setResumeLoading(true);

    get<{
      _id: string;
      category: string;
      difficulty: string;
      numQuestionsTarget: number;
      questions: { _id: string; text: string; order: number }[];
      responses: { questionText: string; answerText: string }[];
      duration: number;
    }>(`/api/sessions/${resumeId}`).then((res) => {
      setResumeLoading(false);
      if (!res.success || !res.data) {
        return;
      }
      const s = res.data;
      // Restore setup state
      setCategory(s.category as typeof category);
      setDifficulty(s.difficulty as typeof difficulty);
      setNumQ(s.numQuestionsTarget);
      setSessionId(s._id);
      setTimer(s.duration || 0);
      setQuestionsAnswered(s.responses.length);
      setQuestionOrder(s.questions.length);

      // Rebuild chat history from past Q&As
      const rebuilt: ChatMsg[] = [];
      s.responses.forEach((r, i) => {
        msgId.current += 1;
        rebuilt.push({ role: "ai", content: `Question ${i + 1} of ${s.numQuestionsTarget}: ${r.questionText}`, id: msgId.current });
        msgId.current += 1;
        rebuilt.push({ role: "user", content: r.answerText, id: msgId.current });
      });
      msgId.current += 1;
      rebuilt.push({ role: "ai", content: `👋 Welcome back! Resuming your **${s.category}** session. You've answered **${s.responses.length}** of **${s.numQuestionsTarget}** questions. Let's continue!`, id: msgId.current });
      setMessages(rebuilt);
      setPhase("interview");

      // Ask the next question
      setTimeout(() => askNextQuestion(s._id), 400);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, aiThinking]);

  // Timer
  useEffect(() => {
    if (phase === "interview") {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  function addMsg(role: "ai" | "user", content: string) {
    msgId.current += 1;
    setMessages((prev) => [...prev, { role, content, id: msgId.current }]);
    if (role === "ai") {
      speak(content);
    }
  }

  // Fallback: only called if submit-response fails to return nextQuestion
  const askNextQuestion = useCallback(async (sid: string) => {
    setAiThinking(true);
    const res = await post<{
      done: boolean; question: string | null;
      questionId: string | null; questionNumber: number; totalQuestions: number;
    }>("/api/interview/generate-question", { sessionId: sid });
    setAiThinking(false);

    if (!res.success) {
      addMsg("ai", `⚠️ ${res.error || "Failed to generate question. Please try again."}`);
      return;
    }
    if (res.data?.done) {
      await finishSession(sid);
      return;
    }
    setCurrentQuestionId(res.data!.questionId);
    setCurrentQuestionText(res.data!.question!);
    setQuestionOrder((prev) => prev + 1);
    addMsg("ai", `Question ${res.data!.questionNumber} of ${res.data!.totalQuestions}: ${res.data!.question}`);
  }, [post]); // eslint-disable-line

  // Handle the nextQuestion data returned from submit-response (combined call)
  const handleNextQuestionData = useCallback(async (
    sid: string,
    nextQ: { done: boolean; question: string | null; questionId: string | null; questionNumber: number; totalQuestions: number } | null
  ) => {
    if (!nextQ) {
      // Combined call failed — fall back to separate generate-question call
      await askNextQuestion(sid);
      return;
    }
    if (nextQ.done) {
      await finishSession(sid);
      return;
    }
    setCurrentQuestionId(nextQ.questionId);
    setCurrentQuestionText(nextQ.question!);
    setQuestionOrder((prev) => prev + 1);
    addMsg("ai", `Question ${nextQ.questionNumber} of ${nextQ.totalQuestions}: ${nextQ.question}`);
  }, [askNextQuestion]); // eslint-disable-line

  async function startSession() {
    setPhase("interview");
    setMessages([]);
    setTimer(0);
    setQuestionsAnswered(0);
    setQuestionOrder(0);

    addMsg("ai", `👋 Welcome! I'm your AI interviewer for a **${category}** session at **${difficulty}** level${user?.role ? ` — tailored for a *${user.role}*` : ""}. I'll ask you **${numQ} questions** and analyze your speech and sentiment in real time. Let's begin!`);

    const res = await post<{ sessionId: string }>("/api/sessions", {
      category, difficulty, role: user?.role || "", numQuestions: numQ,
    });

    if (!res.success || !res.data?.sessionId) {
      addMsg("ai", "⚠️ Failed to start session. Please check your connection.");
      setPhase("setup");
      return;
    }

    const sid = res.data.sessionId;
    setSessionId(sid);
    await askNextQuestion(sid);
  }

  async function submitAnswer() {
    const text = transcript.trim();
    if (!text || !sessionId || !currentQuestionId || aiThinking) return;

    if (isListening) stopListening();
    stopSpeaking();
    resetTranscript();
    addMsg("user", text);
    setAiThinking(true);

    const res = await post<{
      followUpComment: string;
      questionsAnswered: number;
      nextQuestion: {
        done: boolean;
        question: string | null;
        questionId: string | null;
        questionNumber: number;
        totalQuestions: number;
      } | null;
    }>("/api/interview/submit-response", {
      sessionId,
      questionId: currentQuestionId,
      questionText: currentQuestionText,
      answerText: text,
      order: questionOrder,
    });

    setAiThinking(false);

    if (!res.success) {
      addMsg("ai", "⚠️ Failed to save response. Please try again.");
      return;
    }

    setQuestionsAnswered(res.data!.questionsAnswered);
    // Show feedback comment
    addMsg("ai", res.data!.followUpComment);

    // Use the next question already returned by submit-response (saves one API call)
    // If it's null the combined call failed and we fall back to a separate request
    setTimeout(() => handleNextQuestionData(sessionId, res.data!.nextQuestion ?? null), 400);
  }

  async function finishSession(sid: string) {
    setPhase("finishing");
    setEnding(true);
    if (timerRef.current) clearInterval(timerRef.current);

    addMsg("ai", "🏁 Session complete! Generating your comprehensive feedback report...");

    // Save duration
    await patch(`/api/sessions/${sid}`, { duration: timer });

    // Generate feedback
    const res = await post<{ sessionId: string }>("/api/interview/generate-feedback", {
      sessionId: sid, duration: timer,
    });

    setEnding(false);

    if (res.success) {
      router.push(`/sessions/${sid}?new=1`);
    } else {
      addMsg("ai", "⚠️ Feedback generation failed. You can still view your session in History.");
      setTimeout(() => router.push("/sessions"), 2500);
    }
  }

  async function handleEndEarly() {
    if (!sessionId || ending) return;
    if (questionsAnswered === 0) { setPhase("setup"); return; }
    await finishSession(sessionId);
  }

  function formatTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitAnswer();
    }
  }

  // ── SETUP PHASE ──────────────────────────────────────────────────────────
  if (resumeLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
        </div>
        <p className="text-gray-300 font-medium">Resuming your session...</p>
        <p className="text-xs text-gray-500">Loading previous questions and answers</p>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 tracking-tight mb-2">New Interview Session</h1>
        <p className="text-gray-400 text-sm mb-10 max-w-xl">Configure your session parameters below to start practicing with your personalized AI interviewer.</p>

        {/* Category */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-4 h-px bg-indigo-500/50"></span>
            Select Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CATEGORIES.map((c, i) => (
              <Tilt key={c.value} tiltMaxAngleX={5} tiltMaxAngleY={5} glareEnable={true} glareMaxOpacity={0.1} scale={1.02} transitionSpeed={2000}>
              <button
                onClick={() => setCategory(c.value)}
                className={`relative flex flex-col items-start p-5 rounded-2xl border transition-all duration-300 overflow-hidden animate-fade-up
                  ${category === c.value
                    ? "bg-indigo-500/20 border-indigo-400/50 ring-1 ring-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                    : "glass-panel hover:bg-white/5 border-transparent hover:border-white/10 hover:-translate-y-1"
                  }`}
                style={{ animationDelay: `${0.1 + i * 0.05}s` }}
              >
                {category === c.value && (
                  <div className="absolute top-0 right-0 p-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
                <span className="text-3xl mb-3">{c.icon}</span>
                <span className="text-sm font-bold text-white mb-1">{c.label}</span>
                <span className="text-[11px] text-gray-400 leading-relaxed text-left">{c.desc}</span>
              </button>
              </Tilt>
            ))}
          </div>
        </div>

        {/* Options row */}
        <div className="grid sm:grid-cols-2 gap-6 mb-10 animate-fade-up" style={{ animationDelay: '0.4s' }}>
          <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3} glareEnable={true} glareMaxOpacity={0.05} scale={1.01}>
          <div className="glass-panel p-5 rounded-2xl h-full">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Difficulty Level</label>
            <div className="relative">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>
          </Tilt>
          <Tilt tiltMaxAngleX={3} tiltMaxAngleY={3} glareEnable={true} glareMaxOpacity={0.05} scale={1.01}>
          <div className="glass-panel p-5 rounded-2xl h-full">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Session Length</label>
            <div className="relative">
              <select
                value={numQ}
                onChange={(e) => setNumQ(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
              >
                <option value={3}>3 questions — Quick</option>
                <option value={5}>5 questions — Standard</option>
                <option value={8}>8 questions — Comprehensive</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>
          </Tilt>
        </div>

        <button
          onClick={startSession}
          className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 py-4 rounded-2xl text-sm transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] hover:-translate-y-1 animate-fade-up w-full sm:w-auto justify-center"
          style={{ animationDelay: '0.5s' }}
        >
          <Mic className="w-5 h-5" /> Start Interview Session <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // ── INTERVIEW / FINISHING PHASE ───────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen lg:h-[calc(100vh-0px)] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-gray-950 to-gray-950">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 glass-panel border-b border-white/5 flex-shrink-0 z-10 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">{category}</span>
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px] uppercase tracking-wider font-semibold">{difficulty}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.1)]">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(timer)}
          </div>
          <div className="text-xs font-semibold text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <span className="text-white">{questionsAnswered}</span> / {numQ}
          </div>
          {phase === "interview" && !ending && (
            <button
              onClick={handleEndEarly}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-red-400 border border-transparent hover:bg-red-500/10 hover:border-red-500/20 px-3 py-1.5 rounded-full transition-all duration-200"
            >
              <SquareX className="w-3.5 h-3.5" /> End
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 py-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 animate-fade-up ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-lg
              ${msg.role === "ai"
                ? "bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-400/30 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                : "bg-gray-800 border border-gray-600 text-gray-300"
              }`}>
              {msg.role === "ai" ? "AI" : user?.name.charAt(0).toUpperCase()}
            </div>
            <div className={`max-w-[85%] sm:max-w-xl rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm
              ${msg.role === "ai"
                ? "glass-panel text-gray-200 rounded-tl-sm"
                : "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white ml-auto rounded-tr-sm shadow-[0_0_15px_rgba(99,102,241,0.2)]"
              }`}
              style={{ whiteSpace: "pre-wrap" }}
            >
              {msg.content.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {aiThinking && (
          <div className="flex gap-3 animate-fade-up">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-400/30 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] flex-shrink-0">
              AI
            </div>
            <div className="glass-panel rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5 h-[52px]">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}
        
        {isSpeaking && !aiThinking && phase === "interview" && (
           <div className="flex justify-start ml-[48px] animate-fade-in -mt-4 mb-2">
             <div className="flex gap-1 items-center bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/30">
               <div className="w-1 h-2 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
               <div className="w-1 h-3 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_100ms]"></div>
               <div className="w-1 h-2 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
               <span className="text-[10px] text-indigo-300 ml-1 font-medium tracking-wider uppercase">Speaking</span>
             </div>
           </div>
        )}

        {/* Finishing */}
        {phase === "finishing" && ending && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mb-2">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
            <p className="text-gray-300 font-medium tracking-wide">Generating your comprehensive feedback report...</p>
            <p className="text-xs text-gray-500">This might take a few moments</p>
          </div>
        )}
      </div>

      {/* Input area */}
      {phase === "interview" && (
        <div className="glass-panel border-t border-white/5 px-4 sm:px-6 py-4 flex-shrink-0 z-10 pb-6 sm:pb-4">
          {isListening && (
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 mb-3 ml-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              Listening... speak now
            </div>
          )}
          {!isSupported && (
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-3 ml-2">
              <AlertCircle className="w-3.5 h-3.5" />
              Voice input unavailable (use Chrome for best experience)
            </div>
          )}
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={!isSupported}
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300
                ${isListening
                  ? "bg-red-500 text-white animate-recording shadow-lg"
                  : "bg-white/5 border border-white/10 text-gray-400 hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-400 disabled:opacity-40"
                }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <div className="flex-1 relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
              <textarea
                ref={inputRef}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={aiThinking}
                placeholder="Type your answer… or use the mic (Enter to send)"
                rows={1}
                className="relative w-full bg-gray-900 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none min-h-[50px] max-h-36 overflow-y-auto transition-colors disabled:opacity-50 shadow-inner"
                style={{ height: "auto" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 144) + "px";
                }}
              />
            </div>
            <button
              onClick={submitAnswer}
              disabled={!transcript.trim() || aiThinking}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white flex items-center justify-center flex-shrink-0 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]"
            >
              {aiThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
            </button>
          </div>
          <p className="text-[10px] font-medium text-gray-500 mt-3 text-center uppercase tracking-widest">
            Shift+Enter for new line <span className="mx-2">•</span> Enter to send
          </p>
        </div>
      )}
    </div>
  );
}
