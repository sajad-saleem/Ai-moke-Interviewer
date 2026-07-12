// src/app/api/sessions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Session from "@/models/Session";
import { requireAuth } from "@/lib/auth-middleware";

// GET /api/sessions/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const { id } = await params;

    const session = await Session.findOne({ _id: id, userId: user!.id }).lean();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error("Session GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

// PATCH /api/sessions/:id — update status/duration
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const allowed = ["status", "duration"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const session = await Session.findOneAndUpdate(
      { _id: id, userId: user!.id },
      { $set: updates },
      { new: true }
    );

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error("Session PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update session" },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const { id } = await params;

    const session = await Session.findOneAndDelete({
      _id: id,
      userId: user!.id,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Session deleted",
    });
  } catch (error) {
    console.error("Session DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
