import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { executeAvaCommand } from "@/lib/ava-command-router";
import { Mic, MicOff, ArrowRight, Loader2, LayoutGrid, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function applyGreenTheme() {
  document.documentElement.classList.remove("dark");
  document.documentElement.classList.add("green");
}

function restoreUserTheme() {
  const stored = localStorage.getItem("theme");
  document.documentElement.classList.remove("dark", "green");
  if (stored === "dark") {
    document.documentElement.classList.add("dark");
  } else if (stored === "green") {
    document.documentElement.classList.add("green");
  }
}

function DocumentSonarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("w-8 h-8", className)}
    >
      {/* Outer sonar ring */}
      <circle cx="18" cy="18" r="16" opacity="0.3" fill="none" />
      {/* Middle sonar ring */}
      <circle cx="18" cy="18" r="12" opacity="0.5" fill="none" />
      {/* Inner sonar ring */}
      <circle cx="18" cy="18" r="8" opacity="0.7" fill="none" />
      {/* Document with folded corner */}
      <path d="M14 11h5l3 3v8a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" strokeWidth="2" />
      <path d="M19 11v3h3" strokeWidth="2" />
      {/* Document lines */}
      <line x1="15" y1="17" x2="20" y2="17" strokeWidth="1.5" />
      <line x1="15" y1="20" x2="19" y2="20" strokeWidth="1.5" />
    </svg>
  );
}

type AvaInterpretResponse = {
  mode: "command" | "qa";
  intent?: string;
  parameters?: Record<string, any>;
  assistantMessage: string;
  actionLink?: {
    label: string;
    href: string;
  };
  requiresConfirmation?: boolean;
  followUpQuestion?: string;
};

export default function StartPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [commandInput, setCommandInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNavigateExpanded, setIsNavigateExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigateInputRef = useRef<HTMLInputElement>(null);

  const {
    isSupported: isVoiceSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition({
    continuous: false,
    onTranscript: (text, isFinal) => {
      if (isFinal && text.trim()) {
        setCommandInput(text.trim());
        setTimeout(() => handleSubmit(text.trim()), 500);
      }
    },
  });

  const displayTranscript = transcript || interimTranscript;

  useEffect(() => {
    applyGreenTheme();
    return () => {
      restoreUserTheme();
    };
  }, []);

  useEffect(() => {
    if (isNavigateExpanded && navigateInputRef.current) {
      setTimeout(() => navigateInputRef.current?.focus(), 100);
    }
  }, [isNavigateExpanded]);

  const executeCommand = useCallback(async (intent: string, parameters: Record<string, any>): Promise<void> => {
    const result = await executeAvaCommand(
      intent,
      parameters,
      { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      {
        navigate,
        showToast: toast,
      }
    );

    if (result.errorMessage) {
      setErrorMessage(result.errorMessage);
    }
  }, [navigate, toast]);

  const handleSubmit = useCallback(async (overrideInput?: string) => {
    const input = (overrideInput || commandInput).trim();
    if (!input) return;

    setIsProcessing(true);
    setErrorMessage(null);
    resetTranscript();

    try {
      const response = await fetch("/api/ava/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: input,
          context: {
            currentRoute: "start",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to interpret command");
      }

      const result: AvaInterpretResponse = await response.json();

      if (result.mode === "command" && result.intent) {
        await executeCommand(result.intent, result.parameters || {});
      } else if (result.mode === "qa") {
        navigate("/pe/deals");
        sessionStorage.setItem("ava_seed_message", JSON.stringify({
          userMessage: input,
          assistantMessage: result.assistantMessage,
        }));
      } else {
        navigate("/pe/deals");
      }
    } catch (error) {
      console.error("Error processing command:", error);
      setErrorMessage("I'm not sure what you want to work on. Can you rephrase or be more specific?");
    } finally {
      setIsProcessing(false);
    }
  }, [commandInput, executeCommand, navigate, resetTranscript]);

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      setCommandInput("");
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleNavigateCardClick = useCallback(() => {
    if (!isNavigateExpanded) {
      setIsNavigateExpanded(true);
      setErrorMessage(null);
    }
  }, [isNavigateExpanded]);

  const handleNavigateCollapse = useCallback(() => {
    setIsNavigateExpanded(false);
    setCommandInput("");
    if (isListening) {
      stopListening();
    }
  }, [isListening, stopListening]);

  const actionCards = [
    {
      id: "navigate",
      title: "Speak to Navigate",
      description: "Jump to any matter, document, or feature",
      icon: Mic,
      iconBg: "bg-gradient-to-br from-emerald-900/60 to-emerald-950/80",
      iconColor: "text-emerald-400",
      onClick: handleNavigateCardClick,
    },
    {
      id: "record",
      title: "Live Intelligence",
      description: "AI listens, pulls relevant docs and data as you and others speak",
      badge: { text: "AI", className: "bg-red-500/15 text-red-400" },
      icon: DocumentSonarIcon,
      iconBg: "bg-gradient-to-br from-rose-800 to-rose-900",
      iconColor: "text-rose-100",
      onClick: () => navigate("/ambient-intelligence"),
    },
    {
      id: "research",
      title: "Research",
      description: "Ask anything. Attorney-client privileged, confidential.",
      badge: { text: "PRIVILEGED", className: "bg-blue-500/15 text-blue-400" },
      icon: LayoutGrid,
      iconBg: "bg-gradient-to-br from-blue-900/40 to-blue-950/60",
      iconColor: "text-blue-400",
      onClick: () => navigate("/privileged-research"),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-bold tracking-tight text-foreground">
            Sentinel
          </h1>
          <p className="text-[11px] text-muted-foreground uppercase tracking-[1.5px] mt-0.5">
            Counsel LLP
          </p>
        </div>
        <Link 
          href="/pe/deals" 
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="link-skip-to-platform"
        >
          Skip to Platform
        </Link>
      </header>
      <main className="flex-1 px-6 flex flex-col items-center">
        <div className="py-8 w-full max-w-xl text-center">
          <h2 
            className="font-serif text-[28px] font-normal text-foreground leading-tight tracking-tight"
            data-testid="text-start-headline"
          >At Your Service.</h2>
        </div>

        <div className="pb-6 w-full max-w-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="bg-card border border-border rounded-[14px] px-4 py-3 flex items-center gap-3">
              <Input
                ref={inputRef}
                value={isListening ? displayTranscript : commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Ask Emma anything..."
                disabled={isProcessing || isListening}
                className="flex-1 bg-transparent border-0 p-0 h-auto text-sm focus-visible:ring-0 placeholder:text-muted-foreground/60"
                data-testid="input-command"
              />
              
              {isVoiceSupported && (
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={isProcessing}
                  className={cn(
                    "w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors",
                    isListening 
                      ? "bg-destructive text-destructive-foreground animate-pulse" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid="button-voice-input"
                  aria-label={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? (
                    <MicOff className="w-[18px] h-[18px]" />
                  ) : (
                    <Mic className="w-[18px] h-[18px]" />
                  )}
                </button>
              )}
              
              <button
                type="submit"
                disabled={(!commandInput.trim() && !isListening) || isProcessing}
                className="w-9 h-9 rounded-[10px] bg-primary text-primary-foreground flex items-center justify-center transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-submit-command"
              >
                {isProcessing ? (
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                ) : (
                  <ArrowRight className="w-[18px] h-[18px]" />
                )}
              </button>
            </div>
          </form>
        </div>

        {errorMessage && (
          <div 
            className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 mb-4 w-full max-w-xl" 
            data-testid="text-error-message"
          >
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-3 flex-1 w-full max-w-xl">
          {actionCards.map((card) => {
            if (card.id === "navigate" && isNavigateExpanded) {
              return (
                <div
                  key={card.id}
                  className="bg-card border-2 border-primary/60 rounded-2xl p-5 shadow-lg shadow-primary/20 animate-navigate-expand"
                  data-testid={`card-action-${card.id}`}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                    className="flex items-center gap-3"
                  >
                    {isVoiceSupported && (
                      <button
                        type="button"
                        onClick={handleMicClick}
                        disabled={isProcessing}
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 animate-nav-item-1",
                          isListening 
                            ? "bg-destructive text-destructive-foreground animate-pulse" 
                            : card.iconBg
                        )}
                        data-testid="button-navigate-mic"
                        aria-label={isListening ? "Stop listening" : "Start voice input"}
                      >
                        {isListening ? (
                          <MicOff className={cn("w-[22px] h-[22px]", "text-white")} />
                        ) : (
                          <card.icon className={cn("w-[22px] h-[22px]", card.iconColor)} />
                        )}
                      </button>
                    )}
                    
                    <Input
                      ref={navigateInputRef}
                      value={isListening ? displayTranscript : commandInput}
                      onChange={(e) => setCommandInput(e.target.value)}
                      placeholder={isListening ? "Listening..." : "Where do you want to go?"}
                      disabled={isProcessing || isListening}
                      className="flex-1 bg-transparent border-0 p-0 h-auto text-base focus-visible:ring-0 placeholder:text-muted-foreground/60 animate-nav-item-2"
                      data-testid="input-navigate-command"
                    />
                    
                    <button
                      type="submit"
                      disabled={(!commandInput.trim() && !isListening) || isProcessing}
                      className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 animate-nav-item-3"
                      data-testid="button-navigate-submit"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-5 h-5" />
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleNavigateCollapse}
                      className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 flex items-center justify-center transition-colors shrink-0 animate-nav-item-4"
                      data-testid="button-navigate-close"
                      aria-label="Close"
                    >
                      <span className="text-lg">&times;</span>
                    </button>
                  </form>
                </div>
              );
            }
            
            return (
              <div
                key={card.id}
                onClick={card.onClick}
                className="bg-card border border-border rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:bg-accent/50 hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 flex items-start gap-4 group"
                data-testid={`card-action-${card.id}`}
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                  card.iconBg
                )}>
                  <card.icon className={cn("w-[22px] h-[22px]", card.iconColor)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-semibold text-foreground">
                      {card.title}
                    </span>
                    {card.badge && (
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-medium tracking-wide",
                        card.badge.className
                      )}>
                        {card.badge.text}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-snug">
                    {card.description}
                  </p>
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 self-center opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
