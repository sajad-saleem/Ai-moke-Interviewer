// src/app/api/users/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Session from "@/models/Session";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const userId = new mongoose.Types.ObjectId(user!.id);

    const [stats, recentSessions, categoryStats] = await Promise.all([
      Session.aggregate([
        { $match: { userId, status: "completed" } },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            averageScore: { $avg: "$feedback.overallScore" },
            bestScore: { $max: "$feedback.overallScore" },
            totalQuestions: { $sum: { $size: "$responses" } },
          },
        },
      ]),
      Session.find({ userId: user!.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("category difficulty status feedback.overallScore duration createdAt")
        .lean(),
      Session.aggregate([
        { $match: { userId, status: "completed" } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            avgScore: { $avg: "$feedback.overallScore" },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const agg = stats[0] || {
      totalSessions: 0, averageScore: 0, bestScore: 0, totalQuestions: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        totalSessions: agg.totalSessions,
        averageScore: Math.round(agg.averageScore || 0),
        bestScore: Math.round(agg.bestScore || 0),
        totalQuestions: agg.totalQuestions,
        recentSessions,
        categoryBreakdown: categoryStats.map((c: { _id: string; count: number; avgScore: number }) => ({
          category: c._id,
          count: c.count,
          avgScore: Math.round(c.avgScore),
        })),
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
