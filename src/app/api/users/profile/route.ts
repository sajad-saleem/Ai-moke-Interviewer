// src/app/api/users/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth-middleware";

export async function PATCH(req: NextRequest) {
  const { user, errorResponse } = requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const body = await req.json();
    const { name, role } = body;

    const updates: Record<string, string> = {};
    if (name?.trim()) updates.name = name.trim();
    if (role !== undefined) updates.role = role.trim();

    const updated = await User.findByIdAndUpdate(
      user!.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated._id.toString(),
        name: updated.name,
        email: updated.email,
        role: updated.role,
      },
      message: "Profile updated",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
