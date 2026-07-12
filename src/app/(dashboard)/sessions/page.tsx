// src/app/(dashboard)/sessions/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Tilt from "react-parallax-tilt";
import { useApi } from "@/hooks/useApi";
import {
  ChevronRight, Loader2, Mic, Clock, Trash2,
  CheckCircle, XCircle, Activity,
} from "lucide-react";
import { ISession } from "@/types";

const ICONS: Record<string, string> = {
  Technical: "💻", HR: "🤝", Managerial: "📋",
  "Academic CS": "🎓", "Product Manager": "🛠️", General: "🌐",
};

function ScoreColor(s: number) {
  if (s >= 70) return "text-emerald-400";
  if (s >= 50) return "text-amber-400";
  return "text-red-400";
}

function formatDur(sec: number) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}m ${s}s`;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function SessionsPage() {
  const router = useRouter();
  const { get, del } = useApi();
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadSessions() {
    const res = await get<{ sessions: ISession[] }>("/api/sessions?limit=50");
    if (res.success && res.data) setSessions(res.data.sessions);
    setLoading(false);
  }

  useEffect(() => { loadSessions(); }, []); // eslint-disable-line

  async function handleDelete(id: string) {
    if (!confirm("Delete this session?")) return;
    setDeleting(id);
    const res = await del(`/api/sessions/${id}`);
    if (res.success) setSessions((prev) => prev.filter((s) => String(s._id) !== id));
    setDeleting(null);
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Session History</h1>
          <p className="text-sm text-gray-400 mt-1">All your past mock interview sessions</p>
        </div>
        <Link
          href="/interview"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Mic className="w-4 h-4" /> New Session
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Mic className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-400">No sessions yet</p>
          <p className="text-sm mt-1">Start a mock interview to see your history here.</p>
          <Link href="/interview" className="text-indigo-400 text-sm hover:underline mt-3 inline-block">
            Start your first interview →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Tilt key={String(s._id)} tiltMaxAngleX={2} tiltMaxAngleY={2} glareEnable={true} glareMaxOpacity={0.05} scale={1.01} transitionSpeed={2000}>
            <div className="group bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors flex items-center gap-4">
              <span className="text-2xl flex-shrink-0">{ICONS[s.category] || "📌"}</span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{s.category}</span>
                  <span className="text-xs text-gray-500 capitalize border border-gray-700 px-1.5 py-0.5 rounded">
                    {s.difficulty}
                  </span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                  <span>{formatDate(s.createdAt)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDur(s.duration)}</span>
                  <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{s.responses?.length ?? 0} answers</span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {s.feedback?.overallScore !== undefined ? (
                  <div className="text-right">
                    <div className={`text-lg font-bold font-serif ${ScoreColor(s.feedback.overallScore)}`}>
                      {s.feedback.overallScore}%
                    </div>
                    <div className="text-xs text-gray-500">score</div>
                  </div>
                ) : null}

                {/* Resume button for active sessions */}
                {s.status === "active" && (
                  <button
                    onClick={() => router.push(`/interview?resume=${s._id}`)}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/50 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-all font-semibold"
                  >
                    ▶ Resume
                  </button>
                )}

                <Link
                  href={`/sessions/${s._id}`}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  View <ChevronRight className="w-3 h-3" />
                </Link>

                <button
                  onClick={() => handleDelete(String(s._id))}
                  disabled={deleting === String(s._id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all disabled:opacity-40"
                  title="Delete session"
                >
                  {deleting === String(s._id)
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
            </Tilt>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed")
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded">
        <CheckCircle className="w-3 h-3" /> Completed
      </span>
    );
  if (status === "abandoned")
    return (
      <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded">
        <XCircle className="w-3 h-3" /> Abandoned
      </span>
    );
  return (
    <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
      Active
    </span>
  );
}
