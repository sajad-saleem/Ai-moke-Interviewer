// src/app/api/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Session from "@/models/Session";
import { requireAuth } from "@/lib/auth-middleware";
import { StartSessionPayload } from "@/types";

// GET /api/sessions — list all sessions for current user
export async function GET(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      Session.find({ userId: user!.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-questions -responses") // lightweight list
        .lean(),
      Session.countDocuments({ userId: user!.id }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Sessions GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST /api/sessions — create a new session
export async function POST(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();

    const body: StartSessionPayload = await req.json();
    const { category, difficulty, role, numQuestions } = body;

    if (!category || !difficulty) {
      return NextResponse.json(
        { success: false, error: "Category and difficulty are required" },
        { status: 400 }
      );
    }

    const session = await Session.create({
      userId: user!.id,
      category,
      difficulty,
      role: role || "",
      numQuestionsTarget: numQuestions || 5,
      questions: [],
      responses: [],
      status: "active",
    });

    return NextResponse.json(
      {
        success: true,
        data: { sessionId: session._id.toString(), session },
        message: "Session created",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Sessions POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create session" },
      { status: 500 }
    );
  }
}
