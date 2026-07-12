// src/app/layout.tsx
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import CustomCursor from "@/components/CustomCursor";
import ParticleBackground from "@/components/ParticleBackground";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AI Mock Interviewer — Speech & Sentiment Analysis",
  description:
    "Practice interviews with AI. Get real-time speech analysis, sentiment evaluation, and personalized feedback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`antialiased bg-gray-950 text-gray-100 min-h-screen ${dmSans.className}`}>
        <CustomCursor />
        <ParticleBackground />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

