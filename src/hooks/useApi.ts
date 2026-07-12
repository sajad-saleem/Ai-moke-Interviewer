"use client";
// src/hooks/useApi.ts
import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

export function useApi() {
  const { token, logout } = useAuth();

  const request = useCallback(
    async <T = unknown>(
      url: string,
      options: RequestInit = {}
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...(options.headers as Record<string, string>),
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(url, { ...options, headers });
        const data = await res.json();

        if (res.status === 401) {
          logout();
          return { success: false, error: "Session expired. Please log in again." };
        }

        return data;
      } catch {
        return { success: false, error: "Network error. Please check your connection." };
      }
    },
    [token, logout]
  );

  const get = useCallback(
    <T = unknown>(url: string) => request<T>(url, { method: "GET" }),
    [request]
  );

  const post = useCallback(
    <T = unknown>(url: string, body: unknown) =>
      request<T>(url, { method: "POST", body: JSON.stringify(body) }),
    [request]
  );

  const patch = useCallback(
    <T = unknown>(url: string, body: unknown) =>
      request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
    [request]
  );

  const del = useCallback(
    <T = unknown>(url: string) => request<T>(url, { method: "DELETE" }),
    [request]
  );

  return { get, post, patch, del };
}
