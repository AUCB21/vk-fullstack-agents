"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Check support only after mount to avoid SSR hydration mismatch
  useEffect(() => {
    setSupported(getSpeechRecognition() !== null);
  }, []);

  const start = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setError("Reconocimiento de voz no soportado en este navegador");
      return;
    }

    setError(null);

    const recognition = new SR();
    recognition.lang = "es-AR";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(finalTranscript);
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.error("[voice] SpeechRecognition error:", e.error);
      const messages: Record<string, string> = {
        "not-allowed": "Permiso de microfono denegado. Habilitalo en la configuracion del navegador.",
        "no-speech": "No se detecto voz. Intenta de nuevo.",
        "network": "Error de red. El reconocimiento de voz requiere conexion.",
        "aborted": "",
        "audio-capture": "No se encontro microfono.",
        "service-not-allowed": "Reconocimiento de voz no disponible. Requiere HTTPS.",
      };
      const msg = messages[e.error] || `Error de voz: ${e.error}`;
      if (msg) setError(msg);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
      setTranscript("");
    } catch (err) {
      console.error("[voice] Failed to start:", err);
      setError("No se pudo iniciar el reconocimiento de voz");
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { isListening, transcript, start, stop, supported, error, clearError };
}
