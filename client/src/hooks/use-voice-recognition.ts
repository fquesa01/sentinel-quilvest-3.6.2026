import { useState, useCallback, useEffect, useRef } from "react";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface UseVoiceRecognitionOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  language?: string;
}

export interface UseVoiceRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useVoiceRecognition(
  options: UseVoiceRecognitionOptions = {}
): UseVoiceRecognitionReturn {
  const {
    onTranscript,
    onError,
    continuous = false,
    language = "en-US",
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;
      recognitionRef.current.maxAlternatives = 1;
    } else {
      setIsSupported(false);
      setError("Speech recognition is not supported in this browser");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [continuous, language]);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      isStoppingRef.current = false;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcriptText;
        } else {
          interimText += transcriptText;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
        setInterimTranscript("");
        onTranscript?.(finalTranscript.trim(), true);
      } else {
        setInterimTranscript(interimText);
        onTranscript?.(interimText.trim(), false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessages: Record<string, string> = {
        "no-speech": "No speech was detected. Please try again.",
        "audio-capture": "No microphone was found or permission was denied.",
        "not-allowed": "Microphone permission was denied. Please enable it in your browser settings.",
        "network": "Network error occurred. Please check your connection.",
        "aborted": "Speech recognition was aborted.",
        "service-not-allowed": "Speech recognition service is not allowed.",
      };

      const errorMessage = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
      
      if (event.error !== "aborted" || !isStoppingRef.current) {
        setError(errorMessage);
        onError?.(errorMessage);
      }
      
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      isStoppingRef.current = false;
    };
  }, [onTranscript, onError]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !isSupported) {
      setError("Speech recognition is not supported");
      return;
    }

    setError(null);
    setTranscript("");
    setInterimTranscript("");
    isStoppingRef.current = false;

    try {
      recognition.start();
    } catch (err) {
      if (err instanceof Error && err.message.includes("already started")) {
        recognition.stop();
        setTimeout(() => {
          try {
            recognition.start();
          } catch (retryErr) {
            setError("Failed to start speech recognition");
          }
        }, 100);
      } else {
        setError("Failed to start speech recognition");
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition && isListening) {
      isStoppingRef.current = true;
      recognition.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
