// src/app/(dashboard)/sessions/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import {
  ChevronLeft, Loader2, Trophy, Mic, BarChart3,
  TrendingUp, MessageSquare, Lightbulb, ThumbsUp,
  Target, AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import { ISession } from "@/types";



function ProgressBar({ value, color = "bg-indigo-500" }: { value: number; color?: string }) {
  return (
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function sentimentColor(s: string) {
  if (s === "Positive") return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  if (s === "Negative") return "text-red-400 bg-red-400/10 border-red-400/20";
  if (s === "Mixed") return "text-amber-400 bg-amber-400/10 border-amber-400/20";
  return "text-blue-400 bg-blue-400/10 border-blue-400/20";
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";
  const { get } = useApi();
  const [session, setSession] = useState<ISession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<ISession>(`/api/sessions/${id}`).then((res) => {
      if (res.success && res.data) setSession(res.data);
      setLoading(false);
    });
  }, [id, get]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-96">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
    </div>
  );

  if (!session) return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-3 text-gray-400">
      <AlertCircle className="w-10 h-10 opacity-40" />
      <p>Session not found.</p>
      <Link href="/sessions" className="text-indigo-400 text-sm hover:underline">← Back to history</Link>
    </div>
  );

  const fb = session.feedback;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/sessions" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      {isNew && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-400">Session Complete!</p>
            <p className="text-xs text-emerald-400/70">Your AI feedback report is ready below.</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {session.category} Interview
          </h1>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
            <span className="capitalize">{session.difficulty}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {session.duration ? `${Math.floor(session.duration / 60)}m ${session.duration % 60}s` : "—"}
            </span>
            <span>·</span>
            <span>{new Date(session.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
          </p>
        </div>
      </div>

      {!fb ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p>No feedback available for this session.</p>
          <p className="text-sm mt-1 text-gray-500">Session may have ended before feedback was generated.</p>
        </div>
      ) : (
        <>
          {/* Score cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { icon: BarChart3, label: "Overall", value: fb.overallScore, color: "text-indigo-400", bar: "bg-indigo-500" },
              { icon: Trophy, label: "Confidence", value: fb.confidenceScore, color: "text-emerald-400", bar: "bg-emerald-500" },
              { icon: TrendingUp, label: "Clarity", value: fb.clarityScore, color: "text-teal-400", bar: "bg-teal-500" },
              { icon: MessageSquare, label: "Fluency", value: fb.fillerWordScore, color: "text-violet-400", bar: "bg-violet-500" },
            ].map(({ icon: Icon, label, value, color, bar }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">{label}</span>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <div className={`text-3xl font-bold font-serif ${color} mb-2`}>{value}%</div>
                <ProgressBar value={value} color={bar} />
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Mic className="w-4 h-4 text-indigo-400" /> AI Analysis Summary
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">{fb.summary}</p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className={`text-xs border px-2 py-1 rounded-full ${sentimentColor(fb.sentiment)}`}>
                Sentiment: {fb.sentiment}
              </span>
              {fb.communicationStyle && (
                <span className="text-xs border border-gray-700 text-gray-400 px-2 py-1 rounded-full">
                  Style: {fb.communicationStyle}
                </span>
              )}
              {fb.fillerWordsFound?.length > 0 && (
                <span className="text-xs border border-amber-400/20 bg-amber-400/10 text-amber-400 px-2 py-1 rounded-full">
                  Fillers: {fb.fillerWordsFound.join(", ")}
                </span>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {/* Strengths */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <ThumbsUp className="w-4 h-4 text-emerald-400" /> Strengths
              </h3>
              <ul className="space-y-2">
                {fb.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-amber-400" /> Areas to Improve
              </h3>
              <ul className="space-y-2">
                {fb.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-indigo-400" /> Personalized Coaching Tips
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">{fb.tips}</p>
          </div>

          {/* Transcript */}
          {session.responses && session.responses.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Session Transcript</h3>
              <div className="space-y-5">
                {session.responses.map((r, i) => (
                  <div key={String(r._id || i)} className="border-l-2 border-gray-700 pl-4">
                    <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider mb-1">
                      Q{i + 1}
                    </p>
                    <p className="text-sm text-gray-300 mb-2">{r.questionText}</p>
                    <p className="text-sm text-gray-400 leading-relaxed bg-gray-800/50 rounded-lg p-3">
                      {r.answerText}
                    </p>
                    {r.fillerWordsCount > 0 && (
                      <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {r.fillerWordsCount} filler word{r.fillerWordsCount > 1 ? "s" : ""} detected:
                        {" "}{r.fillerWordsFound.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-8 flex-wrap">
        <Link
          href="/interview"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Mic className="w-4 h-4" /> Practice Again
        </Link>
        <Link
          href="/sessions"
          className="flex items-center gap-2 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          View All Sessions
        </Link>
      </div>
    </div>
  );
}
