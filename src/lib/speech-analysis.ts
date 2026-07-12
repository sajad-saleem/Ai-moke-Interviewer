// src/lib/speech-analysis.ts

const FILLER_WORDS = [
  "um", "uh", "ah", "er", "like", "you know", "basically",
  "literally", "actually", "so", "well", "i mean", "right",
  "okay", "ok", "yeah", "hmm", "sort of", "kind of",
];

export interface SpeechAnalysisResult {
  fillerWordsCount: number;
  fillerWordsFound: string[];
  wordCount: number;
  uniqueWords: number;
  avgSentenceLength: number;
  sentences: number;
}

export function analyzeSpeech(text: string): SpeechAnalysisResult {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Detect filler words (whole word matching)
  const foundFillers: string[] = [];
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      foundFillers.push(filler);
    }
  }

  const fillerWordsCount = foundFillers.reduce((acc, filler) => {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    return acc + (text.match(regex)?.length || 0);
  }, 0);

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const uniqueWords = new Set(words).size;
  const avgSentenceLength = sentences > 0 ? Math.round(wordCount / sentences) : 0;

  return {
    fillerWordsCount,
    fillerWordsFound: foundFillers,
    wordCount,
    uniqueWords,
    avgSentenceLength,
    sentences,
  };
}
