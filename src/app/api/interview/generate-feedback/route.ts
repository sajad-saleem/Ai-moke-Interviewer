import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Session from "@/models/Session";
import { requireAuth } from "@/lib/auth-middleware";
import { generateSessionFeedback } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();

    const { sessionId, duration } = await req.json();
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Load full session
    const session = await Session.findOne({
      _id: sessionId,
      userId: user!.id,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.responses.length === 0) {
      return NextResponse.json(
        { success: false, error: "No responses found in session" },
        { status: 400 }
      );
    }

    // Build transcript for Gemini
    const transcript = session.responses.map((r) => ({
      question: r.questionText,
      answer: r.answerText,
    }));

    // Generate comprehensive feedback via Gemini (API key server-side only)
    const feedbackData = await generateSessionFeedback({
      category: session.category,
      difficulty: session.difficulty,
      role: session.role,
      transcript,
    });

    // Save feedback and mark session completed
    session.feedback = {
      ...feedbackData,
      generatedAt: new Date(),
    };
    session.status = "completed";
    session.duration = duration || 0;

    await session.save();

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session._id.toString(),
        feedback: session.feedback,
      },
      message: "Feedback generated successfully",
    });
  } catch (error) {
    console.error("Generate feedback error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate feedback",
      },
      { status: 500 }
    );
  }
}
