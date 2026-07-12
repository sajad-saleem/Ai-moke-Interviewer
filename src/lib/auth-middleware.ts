
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./jwt";
import { AuthUser } from "@/types";

export function getAuthUser(req: NextRequest): AuthUser | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export function requireAuth(req: NextRequest): {
  user: AuthUser | null;
  errorResponse: NextResponse | null;
} {
  const user = getAuthUser(req);
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthorized. Please log in." },
        { status: 401 }
      ),
    };
  }
  return { user, errorResponse: null };
}
