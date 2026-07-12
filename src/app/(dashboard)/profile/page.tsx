// src/app/(dashboard)/profile/page.tsx
"use client";
import { useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { User, Mail, Briefcase, Loader2, CheckCircle2, Key } from "lucide-react";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { patch } = useApi();
  const [name, setName] = useState(user?.name || "");
  const [role, setRole] = useState(user?.role || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(""); setSaved(false);
    if (!name.trim()) { setError("Name cannot be empty"); return; }
    setSaving(true);

    const res = await patch<{ id: string; name: string; role: string }>("/api/users/profile", { name, role });
    setSaving(false);

    if (!res.success) {
      setError(res.error || "Failed to update profile");
    } else {
      updateUser({ name: res.data!.name, role: res.data!.role });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-1">Profile</h1>
      <p className="text-sm text-gray-400 mb-8">Manage your account information</p>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xl font-bold text-indigo-400 font-serif">
          {initials}
        </div>
        <div>
          <p className="font-medium text-white">{user?.name}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
          {user?.role && (
            <p className="text-xs text-gray-500 mt-0.5">{user.role}</p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-5">
          Personal Information
        </h2>

        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          {saved && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-gray-400 text-sm cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Role / Field{" "}
              <span className="text-gray-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. BSCS Student, Software Engineer"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Used to personalize interview questions.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Security note */}
      <div className="mt-5 bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
          Security
        </h2>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
            <Key className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Password</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Password changes are not yet supported through the UI.
              Please contact your administrator or update via the database directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
