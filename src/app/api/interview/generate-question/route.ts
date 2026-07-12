
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Session from "@/models/Session";
import { requireAuth } from "@/lib/auth-middleware";
import { generateInterviewQuestion } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
    }

    const session = await Session.findOne({ _id: sessionId, userId: user!.id, status: "active" });
    if (!session) {
      return NextResponse.json({ success: false, error: "Active session not found" }, { status: 404 });
    }

    if (session.questions.length >= session.numQuestionsTarget) {
      return NextResponse.json({ success: true, data: { done: true, question: null, questionId: null } });
    }

    const previousQA = session.responses.map((r: { questionText: string; answerText: string }) => ({
      question: r.questionText,
      answer: r.answerText,
    }));

    const questionText = await generateInterviewQuestion({
      category: session.category,
      difficulty: session.difficulty,
      role: session.role,
      questionNumber: session.questions.length + 1,
      totalQuestions: session.numQuestionsTarget,
      previousQA,
    });

    session.questions.push({
      text: questionText,
      order: session.questions.length + 1,
      createdAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await session.save();
    const lastQ = session.questions[session.questions.length - 1];

    return NextResponse.json({
      success: true,
      data: {
        done: false,
        question: questionText,
        questionId: lastQ._id.toString(),
        questionNumber: session.questions.length,
        totalQuestions: session.numQuestionsTarget,
      },
    });
  } catch (error) {
    console.error("Generate question error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate question" },
      { status: 500 }
    );
  }
}
