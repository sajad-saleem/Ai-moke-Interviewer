// src/app/(dashboard)/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import {
  Mic, BarChart3, Trophy, MessageSquare, TrendingUp,
  ChevronRight, Loader2, Clock, Sparkles,
} from "lucide-react";
import { DashboardStats } from "@/types";

const CATEGORY_ICONS: Record<string, string> = {
  Technical: "💻", HR: "🤝", Managerial: "📋",
  "Academic CS": "🎓", "Product Manager": "🛠️", General: "🌐",
};

function formatDuration(s: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}m ${sec}s`;
}

function ScoreColor(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { get } = useApi();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<DashboardStats>("/api/users/stats").then((res) => {
      if (res.success && res.data) setStats(res.data);
      setLoading(false);
    });
  }, [get]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10 animate-fade-up">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 tracking-tight">
          Welcome back, <span className="text-gradient">{user?.name.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-gray-400 mt-2 text-sm max-w-2xl">
          {user?.role ? `${user.role} · ` : ""}Ready to practice your next interview? Your AI coach is standing by to help you prepare.
        </p>
      </div>

      {/* CTA */}
      <div className="relative overflow-hidden glass-card rounded-3xl p-8 mb-10 flex items-center justify-between gap-6 flex-wrap animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase tracking-widest">AI Powered</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Start a Mock Interview</h2>
          <p className="text-sm text-gray-300 max-w-md leading-relaxed">
            Practice with an expert AI interviewer, get real-time speech analysis, and receive actionable, constructive feedback instantly.
          </p>
        </div>
        <Link
          href="/interview"
          className="relative z-10 flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-3.5 rounded-2xl text-sm transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] hover:-translate-y-1 flex-shrink-0"
        >
          <Mic className="w-[18px] h-[18px]" /> Start Practicing
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { icon: BarChart3, label: "Sessions", value: stats?.totalSessions ?? 0, color: "text-indigo-400", bg: "bg-indigo-500/15", border: "border-indigo-500/20" },
              { icon: TrendingUp, label: "Avg Score", value: stats?.averageScore ? `${stats.averageScore}%` : "—", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/20" },
              { icon: Trophy, label: "Best Score", value: stats?.bestScore ? `${stats.bestScore}%` : "—", color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/20" },
              { icon: MessageSquare, label: "Questions", value: stats?.totalQuestions ?? 0, color: "text-purple-400", bg: "bg-purple-500/15", border: "border-purple-500/20" },
            ].map(({ icon: Icon, label, value, color, bg, border }, i) => (
              <div key={label} className={`glass-panel rounded-2xl p-6 transition-transform hover:-translate-y-1 hover:shadow-lg animate-fade-up border ${border}`} style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className={`text-3xl font-bold ${color} font-serif tracking-tight mb-1`}>{value}</div>
                <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>

          {/* Category & Recent Split */}
          <div className="grid lg:grid-cols-2 gap-6 animate-fade-up" style={{ animationDelay: '0.6s' }}>
            {/* Category breakdown */}
            {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 && (
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-5 tracking-wide uppercase flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  Performance Profile
                </h3>
                <div className="space-y-4">
                  {stats.categoryBreakdown.map((c) => (
                    <div key={c.category} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{CATEGORY_ICONS[c.category] || "📌"}</span>
                          <span className="text-sm font-medium text-gray-300">{c.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold ${ScoreColor(c.avgScore)}`}>{c.avgScore}%</span>
                          <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{c.count} sessions</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-gray-900/80 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 group-hover:from-indigo-400 group-hover:to-purple-400 relative"
                          style={{ width: `${c.avgScore}%` }}
                        >
                           <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:20px_20px] animate-[pulse-slow_2s_infinite]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent sessions */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Recent Sessions
                </h3>
                <Link href="/sessions" className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded-full transition-colors">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              
              <div className="flex-1">
                {stats?.recentSessions?.length ? (
                  <div className="space-y-3">
                    {stats.recentSessions.map((s) => (
                      <Link
                        key={String(s._id)}
                        href={`/sessions/${s._id}`}
                        className="flex items-center gap-4 p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-900/80 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform">
                          {CATEGORY_ICONS[s.category] || "📌"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-200 font-semibold truncate group-hover:text-white transition-colors">{s.category}</p>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(s.duration)} <span className="opacity-50">•</span> {s.difficulty}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {s.feedback?.overallScore !== undefined ? (
                            <span className={`text-lg font-bold font-serif ${ScoreColor(s.feedback.overallScore)}`}>
                              {s.feedback.overallScore}%
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full capitalize">{s.status}</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-8 text-gray-500">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <Mic className="w-6 h-6 text-indigo-400/50" />
                    </div>
                    <p className="text-sm font-medium text-gray-400">No sessions yet.</p>
                    <Link href="/interview" className="text-indigo-400 text-sm hover:text-indigo-300 mt-2 font-medium transition-colors">
                      Start your first interview →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
