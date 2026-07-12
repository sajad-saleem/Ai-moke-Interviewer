// src/lib/gemini.ts
// Uses Groq's free API (Llama 3) instead of Gemini to avoid quota issues.
// Groq offers 14,400 requests/day completely free on the free tier.
// Sign up at https://console.groq.com to get your free GROQ_API_KEY.

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
// llama-3.1-8b-instant: very fast, free, great for conversational AI tasks
const GROQ_MODEL = "llama-3.1-8b-instant";

const MAX_CONTEXT_PAIRS = 1;

async function callGroq(
  prompt: string,
  temperature = 0.7,
  maxTokens = 400
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured in environment variables");
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: { message?: string } }).error?.message ||
      `Groq API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("No response from Groq API");
  }

  return text;
}

export async function generateInterviewQuestion(params: {
  category: string;
  difficulty: string;
  role?: string;
  questionNumber: number;
  totalQuestions: number;
  previousQA?: { question: string; answer: string }[];
}): Promise<string> {
  const { category, difficulty, role, questionNumber, totalQuestions, previousQA } = params;

  // Use a pre-written starter question for Q1 to save API credits
  if (questionNumber === 1 && (!previousQA || previousQA.length === 0)) {
    const STARTER_QUESTIONS: Record<string, string[]> = {
      "Technical": [
        "To start off, could you walk me through the architecture of a recent complex project you worked on?",
        "Can you describe a time when you had to optimize a slow-performing piece of code?",
        "How do you approach debugging a critical production issue?"
      ],
      "HR": [
        "Tell me about a time you had to navigate a conflict with a colleague or manager.",
        "Can you share an example of a time you failed or made a significant mistake, and how you handled it?",
        "Describe a situation where you had to adapt to a sudden change in project requirements."
      ],
      "Managerial": [
        "How do you approach motivating a team member who is underperforming?",
        "Tell me about a time you had to make a tough decision without having all the information.",
        "Describe your process for delegating tasks and ensuring quality results."
      ],
      "Product Manager": [
        "Walk me through how you prioritize features for a new product roadmap.",
        "Tell me about a time a product launch didn't go as planned. What did you learn?",
        "How do you balance engineering constraints with customer requests?"
      ],
      "Academic CS": [
        "Can you explain the tradeoffs between time complexity and space complexity in algorithm design?",
        "Walk me through how you would approach designing a research project from scratch.",
        "What is the most interesting theoretical computer science concept you've studied recently?"
      ],
      "General": [
        "Tell me about yourself and what motivates you professionally.",
        "Can you describe a time you had to learn something completely new under time pressure?",
        "What is your biggest professional achievement so far?"
      ]
    };
    const questions = STARTER_QUESTIONS[category] || [
      "Could you start by telling me a bit about your background and recent experience?",
      "Can you describe a recent project you are particularly proud of?",
      "What is the most challenging problem you've faced recently, and how did you solve it?"
    ];
    return questions[Math.floor(Math.random() * questions.length)];
  }

  const recentQA = previousQA?.slice(-MAX_CONTEXT_PAIRS) ?? [];

  const contextBlock =
    recentQA.length > 0
      ? `\nRecent conversation:\n${recentQA
          .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
          .join("\n\n")}\n`
      : "";

  const prompt = `You are an expert ${category} interviewer. Difficulty: ${difficulty}.${role ? ` Role: ${role}.` : ""}
This is question ${questionNumber} of ${totalQuestions}.
${contextBlock}
Generate the next interview question. Rules:
- If the last answer was weak or vague, ask a follow-up probing deeper.
- If the answer was strong, move to a new topic.
- Be specific, situational, and challenging. No vague generics.
- Return ONLY the question text. No numbering, no prefix. Max 2 sentences.`;

  const question = await callGroq(prompt, 0.8, 150);
  return question.trim();
}

export async function generateFeedbackAndNextQuestion(params: {
  category: string;
  difficulty: string;
  role?: string;
  questionNumber: number;
  totalQuestions: number;
  previousQA: { question: string; answer: string }[];
  fillerCount: number;
}): Promise<{ comment: string; nextQuestion: string | null; done: boolean }> {
  const { category, difficulty, role, questionNumber, totalQuestions, previousQA, fillerCount } = params;

  const lastQA = previousQA[previousQA.length - 1];
  const isDone = questionNumber > totalQuestions;

  const nextPart = isDone ? "" : `
NEXT QUESTION: Generate question ${questionNumber} of ${totalQuestions}. Be specific and challenging. Max 2 sentences.`;

  const prompt = `You are a ${category} interview coach. Difficulty: ${difficulty}.${role ? ` Role: ${role}.` : ""}
Q: "${lastQA.question}"
A: "${lastQA.answer}"${fillerCount > 0 ? `\n(Filler words used: ${fillerCount})` : ""}

Respond in this EXACT format:
FEEDBACK: <1-2 sentence constructive coaching comment>
${isDone ? "" : "NEXT QUESTION: <the next interview question, max 2 sentences>"}`;

  const raw = await callGroq(prompt, 0.7, isDone ? 120 : 250);

  const feedbackMatch = raw.match(/FEEDBACK:\s*([\s\S]*?)(?=NEXT(?:_|\s*)QUESTION:|$)/i);
  const nextQMatch = raw.match(/NEXT(?:_|\s*)QUESTION:\s*([\s\S]*?)$/i);

  const comment = feedbackMatch?.[1]?.trim() || raw.split("\n")[0]?.trim() || "Good response. Let's continue.";
  let nextQuestion = nextQMatch?.[1]?.trim() || null;

  // Failsafe: if we couldn't parse the next question, extract it from end of response
  if (!isDone && !nextQuestion) {
    const lines = raw.split("\n").filter(Boolean);
    if (lines.length > 1) {
      nextQuestion = lines[lines.length - 1];
    }
  }

  return {
    comment,
    nextQuestion: isDone ? null : nextQuestion,
    done: isDone,
  };
}

export async function generateFollowUpComment(params: {
  question: string;
  answer: string;
  category: string;
  fillerCount: number;
}): Promise<string> {
  const { question, answer, category, fillerCount } = params;

  const prompt = `You are a ${category} interview coach.
Q: "${question}"
A: "${answer}"${fillerCount > 0 ? `\n(Filler words: ${fillerCount})` : ""}

Write 1-2 sentences of encouraging, constructive coaching feedback. Return only the feedback text.`;

  return await callGroq(prompt, 0.7, 120);
}

export async function generateSessionFeedback(params: {
  category: string;
  difficulty: string;
  role?: string;
  transcript: { question: string; answer: string }[];
}): Promise<{
  overallScore: number;
  confidenceScore: number;
  clarityScore: number;
  fillerWordScore: number;
  sentiment: string;
  communicationStyle: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  fillerWordsFound: string[];
  tips: string;
}> {
  const { category, difficulty, role, transcript } = params;

  const transcriptText = transcript
    .map((t, i) => `Q${i + 1}: ${t.question}\nA: ${t.answer}`)
    .join("\n\n");

  const prompt = `You are an expert interview coach. Analyze this mock interview and return JSON feedback.
Type: ${category}, Difficulty: ${difficulty}${role ? `, Role: ${role}` : ""}

TRANSCRIPT:
${transcriptText}

Return ONLY valid JSON with this exact structure (no markdown, no backticks):
{
  "overallScore": <integer 0-100>,
  "confidenceScore": <integer 0-100>,
  "clarityScore": <integer 0-100>,
  "fillerWordScore": <integer 0-100, 100 = no fillers>,
  "sentiment": "<Positive|Neutral|Mixed|Negative>",
  "communicationStyle": "<one short phrase>",
  "summary": "<2 sentences>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>", "<area 3>"],
  "fillerWordsFound": ["<word1>"],
  "tips": "<3 tips separated by periods>"
}`;

  const raw = await callGroq(prompt, 0.3, 600);

  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      overallScore: 65,
      confidenceScore: 60,
      clarityScore: 65,
      fillerWordScore: 70,
      sentiment: "Neutral",
      communicationStyle: "Conversational",
      summary:
        "Session completed with " +
        transcript.length +
        " questions answered. Keep practicing to improve your scores!",
      strengths: [
        "Completed the full interview session",
        "Attempted all questions",
        "Showed willingness to engage",
      ],
      improvements: [
        "Work on structuring answers with the STAR method",
        "Reduce filler words for cleaner delivery",
        "Practice concise and focused responses",
      ],
      fillerWordsFound: [],
      tips: "Practice daily mock interviews. Use the STAR method for behavioral questions. Record yourself to spot speech habits.",
    };
  }
}

export default callGroq;
