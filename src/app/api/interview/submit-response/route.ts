
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Session from "@/models/Session";
import { requireAuth } from "@/lib/auth-middleware";
import { generateFeedbackAndNextQuestion } from "@/lib/gemini";
import { analyzeSpeech } from "@/lib/speech-analysis";

export async function POST(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const { sessionId, questionId, questionText, answerText, order } = await req.json();

    if (!sessionId || !questionId || !answerText?.trim()) {
      return NextResponse.json(
        { success: false, error: "sessionId, questionId, and answerText are required" },
        { status: 400 }
      );
    }

    const session = await Session.findOne({ _id: sessionId, userId: user!.id, status: "active" });
    if (!session) {
      return NextResponse.json({ success: false, error: "Active session not found" }, { status: 404 });
    }

    const speechAnalysis = analyzeSpeech(answerText);


    session.responses.push({
      questionId,
      questionText,
      answerText: answerText.trim(),
      fillerWordsCount: speechAnalysis.fillerWordsCount,
      fillerWordsFound: speechAnalysis.fillerWordsFound,
      wordCount: speechAnalysis.wordCount,
      order,
      createdAt: new Date(),
    } as never);

    await session.save();

    // Build the full Q&A history for context
    const previousQA = session.responses.map((r: { questionText: string; answerText: string }) => ({
      question: r.questionText,
      answer: r.answerText,
    }));

    const nextQuestionNumber = session.questions.length + 1;


    // Single API call: generates feedback comment + next question together
    // This replaces what was previously two separate Gemini calls per turn
    let followUpComment = "Thank you for your response. Let's continue.";
    let nextQuestionData: {
      done: boolean;
      question: string | null;
      questionId: string | null;
      questionNumber: number;
      totalQuestions: number;
    } | null = null;

    try {
      const result = await generateFeedbackAndNextQuestion({
        category: session.category,
        difficulty: session.difficulty,
        role: session.role,
        questionNumber: nextQuestionNumber,
        totalQuestions: session.numQuestionsTarget,
        previousQA,
        fillerCount: speechAnalysis.fillerWordsCount,
      });

      followUpComment = result.comment;

      if (result.done || !result.nextQuestion) {
        // Interview is over
        nextQuestionData = {
          done: true,
          question: null,
          questionId: null,
          questionNumber: nextQuestionNumber,
          totalQuestions: session.numQuestionsTarget,
        };
      } else {
        // Save the next question to the session
        session.questions.push({
          text: result.nextQuestion,
          order: session.questions.length + 1,
          createdAt: new Date(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        await session.save();

        const lastQ = session.questions[session.questions.length - 1];
        nextQuestionData = {
          done: false,
          question: result.nextQuestion,
          questionId: lastQ._id.toString(),
          questionNumber: session.questions.length,
          totalQuestions: session.numQuestionsTarget,
        };
      }
    } catch (geminiError) {
      console.warn("Combined generation failed:", geminiError);
      // nextQuestionData stays null — frontend will fall back to the old generate-question endpoint
    }

    return NextResponse.json({
      success: true,
      data: {
        followUpComment,
        nextQuestion: nextQuestionData, // null if Gemini call failed (frontend handles fallback)
        speechAnalysis: {
          fillerWordsCount: speechAnalysis.fillerWordsCount,
          fillerWordsFound: speechAnalysis.fillerWordsFound,
          wordCount: speechAnalysis.wordCount,
        },
        questionsAnswered: session.responses.length,
        questionsTotal: session.numQuestionsTarget,
      },
    });
  } catch (error) {
    console.error("Submit response error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save response" },
      { status: 500 }
    );
  }
}
