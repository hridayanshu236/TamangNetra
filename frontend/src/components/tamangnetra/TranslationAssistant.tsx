'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Trash2,
  Sparkles,
  FileText,
  Globe,
  Shield,
  Loader2,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { ScrollArea } from '@/src/components/ui/scroll-area';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const STORAGE_KEY = 'tamangnetra-chat-history';

const quickSuggestions = [
  {
    icon: FileText,
    label: 'How do I translate a PDF?',
    prompt: 'How do I translate a PDF document?',
  },
  {
    icon: Globe,
    label: 'What languages are supported?',
    prompt: 'What languages are supported by TamangNetra?',
  },
  {
    icon: Shield,
    label: 'How does PII scrubbing work?',
    prompt: 'How does PII scrubbing work in TamangNetra?',
  },
];

function loadChatHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as ChatMessage[];
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveChatHistory(messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    // Keep only last 50 messages to avoid storage overflow
    const trimmed = messages.slice(-50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage errors
  }
}

export function TranslationAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = loadChatHistory();
    if (stored.length > 0) {
      setMessages(stored);
    } else {
      // Welcome message
      setMessages([
        {
          role: 'assistant',
          content:
            'Namaste! 🙏 I\'m the TamangNetra AI assistant. I can help you with translation features, language support, file formats, PII scrubbing, and more. What would you like to know?',
          timestamp: Date.now(),
        },
      ]);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (isInitialized) {
      saveChatHistory(messages);
    }
  }, [messages, isInitialized]);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      try {
        // Build conversation history for API (last 10 messages for context window)
        const recentMessages = messages.slice(-10).concat(userMessage);

        const response = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: recentMessages }),
        });

        if (!response.ok) {
          throw new Error('Failed to get response');
        }

        const data = await response.json();

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.message?.content || data.message || 'Sorry, I couldn\'t generate a response. Please try again.',
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content:
            'I\'m having trouble connecting right now. Please try again in a moment. In the meantime, you can explore the FAQ section or check the How it Works guide!',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (prompt: string) => {
    sendMessage(prompt);
  };

  const clearChat = () => {
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content:
        'Chat cleared! 🙏 How can I help you with TamangNetra today?',
      timestamp: Date.now(),
    };
    setMessages([welcomeMessage]);
  };

  return (
    <>
      {/* Floating chat button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 left-4 z-40 group flex size-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:from-emerald-400 hover:to-teal-400 hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 hover:scale-110"
            aria-label="Open AI Assistant"
          >
            <MessageCircle className="size-5" />
            {/* Notification dot */}
            <span className="absolute -top-0.5 -right-0.5 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-amber-500" />
            </span>
            {/* Tooltip */}
            <span className="absolute left-14 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
              AI Assistant
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-4 left-4 z-50 flex flex-col w-[calc(100vw-2rem)] sm:w-96 h-[70vh] sm:h-[500px] rounded-2xl border border-border/50 bg-background/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm">
                  <Bot className="size-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    TamangNetra AI
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Online
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={clearChat}
                  title="Clear chat"
                >
                  <Trash2 className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            >
              {messages.map((msg, i) => (
                <motion.div
                  key={`${msg.timestamp}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-2 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 mt-0.5">
                      <Sparkles className="size-3 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-br-md'
                        : 'bg-muted/80 text-foreground rounded-bl-md border border-border/30'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted mt-0.5">
                      <User className="size-3 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 justify-start"
                >
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-500 mt-0.5">
                    <Sparkles className="size-3 text-white" />
                  </div>
                  <div className="bg-muted/80 rounded-2xl rounded-bl-md border border-border/30 px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="size-3.5 animate-spin text-emerald-500" />
                      <span className="text-xs text-muted-foreground">
                        Thinking...
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quick suggestions (show only when few messages) */}
              {messages.length <= 2 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="pt-2 space-y-1.5"
                >
                  <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider">
                    Quick questions
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {quickSuggestions.map((suggestion) => {
                      const Icon = suggestion.icon;
                      return (
                        <button
                          key={suggestion.label}
                          onClick={() =>
                            handleSuggestionClick(suggestion.prompt)
                          }
                          className="flex items-center gap-2 w-full rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-xs text-foreground hover:border-emerald-500/30 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 transition-all duration-200 text-left"
                        >
                          <Icon className="size-3.5 text-emerald-500 shrink-0" />
                          {suggestion.label}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input area */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-border/40 px-3 py-2.5 bg-background/80"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about TamangNetra..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="size-8 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-all duration-200"
              >
                <Send className="size-3.5" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
