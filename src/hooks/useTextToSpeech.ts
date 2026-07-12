"use client";

import { useCallback, useEffect, useState } from "react";

export function useTextToSpeech() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setTimeout(() => setIsSupported(true), 0);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSupported) return;

    window.speechSynthesis.cancel(); // Stop any ongoing speech

    // Clean up markdown before speaking
    const cleanText = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");

    // Split text into sentences to prevent Chrome's 15-second speech cutoff bug
    const sentences = cleanText.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [cleanText];
    
    setIsSpeaking(true);
    let utterancesCompleted = 0;

    sentences.forEach((sentence, index) => {
      const utterance = new SpeechSynthesisUtterance(sentence.trim());
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Premium")));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      utterance.onend = () => {
        utterancesCompleted++;
        if (utterancesCompleted === sentences.length) {
          setIsSpeaking(false);
        }
      };
      
      utterance.onerror = () => {
        utterancesCompleted++;
        if (utterancesCompleted === sentences.length) {
          setIsSpeaking(false);
        }
      };

      window.speechSynthesis.speak(utterance);
    });
  }, [isSupported]);

  const stopSpeaking = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, stopSpeaking, isSpeaking, isSupported };
}
