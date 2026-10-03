import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { BottomSheet } from '../common/BottomSheet';
import { askAiAssistant } from '../../services/gemini';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  History,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  Bot,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

// Custom Formatter to replace raw markdown asterisks with clean HTML strong elements
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-1" />;

        // Check if line is bullet point
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        const cleanLine = isBullet ? line.trim().replace(/^[•\-]\s*/, '') : line;

        // Split line by **bold text**
        const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);

        const renderedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const innerText = part.slice(2, -2);
            return (
              <strong key={pIdx} className="font-extrabold text-zinc-950 bg-amber-500/10 px-1 py-0.2 rounded-sm">
                {innerText}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-amber-500 font-black text-sm leading-none shrink-0 mt-0.5">•</span>
              <span className="flex-1">{renderedLine}</span>
            </div>
          );
        }

        return <p key={idx}>{renderedLine}</p>;
      })}
    </div>
  );
};

export const AiAssistantModal: React.FC = () => {
  const {
    isAiAssistantOpen,
    setIsAiAssistantOpen,
    wallets,
    customers,
    products,
    sales,
    expenses,
    payments,
    purchases,
    vendors,
  } = useData();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Saved threads in localStorage
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    try {
      const saved = localStorage.getItem('sanzari_ai_chat_threads');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }

    // Default Initial Welcome Thread
    const initialThread: ChatThread = {
      id: 'default-welcome-thread',
      title: 'Store Operations Overview',
      createdAt: new Date().toLocaleDateString('en-IN'),
      messages: [
        {
          id: 'welcome',
          sender: 'assistant',
          text: 'Assalam o Alaikum! I am your Sanzari Financial Assistant. Ask me anything about store sales, balances, pending customer dues, or inventory stock in English or Hindi/Urdu.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };
    return [initialThread];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    return threads[0]?.id || 'default-welcome-thread';
  });

  // Save threads to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('sanzari_ai_chat_threads', JSON.stringify(threads));
  }, [threads]);

  // Current Active Thread
  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const messages = activeThread?.messages || [];

  const quickQuestions = [
    'Rizwan ke paas kitna balance hai?',
    'October mein kitni sales hui?',
    'Kis customer ka payment pending hai?',
    'Kaunsa stock low hai?',
  ];

  // Create a new ChatGPT Thread
  const handleNewChat = () => {
    const newId = `thread-${Date.now()}`;
    const newThread: ChatThread = {
      id: newId,
      title: 'New Conversation',
      createdAt: new Date().toLocaleDateString('en-IN'),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: 'New conversation started. How can I assist you with Sanzari Accounts today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
    if (window.innerWidth < 640) {
      setIsSidebarOpen(false);
    }
  };

  // Delete a Chat Thread
  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = threads.filter((t) => t.id !== threadId);
    if (filtered.length === 0) {
      handleNewChat();
    } else {
      setThreads(filtered);
      if (activeThreadId === threadId) {
        setActiveThreadId(filtered[0].id);
      }
    }
  };

  const handleSend = async (questionText?: string) => {
    const query = questionText || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Update active thread with user message & title if default
    setThreads((prevThreads) =>
      prevThreads.map((t) => {
        if (t.id === activeThreadId) {
          const isFirstUserMsg = t.messages.length <= 1;
          const autoTitle = isFirstUserMsg
            ? query.trim().substring(0, 26) + (query.trim().length > 26 ? '...' : '')
            : t.title;

          return {
            ...t,
            title: autoTitle === 'New Conversation' ? autoTitle : autoTitle,
            messages: [...t.messages, userMsg],
          };
        }
        return t;
      })
    );

    setInput('');
    setLoading(true);

    try {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const res = await askAiAssistant(query, {
        wallets,
        customers,
        products,
        sales,
        expenses,
        payments,
        purchases,
        vendors,
        currentMonth,
      });

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setThreads((prevThreads) =>
        prevThreads.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: [...t.messages, aiMsg],
            };
          }
          return t;
        })
      );
    } catch {
      setThreads((prevThreads) =>
        prevThreads.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: [
                ...t.messages,
                {
                  id: (Date.now() + 1).toString(),
                  sender: 'assistant',
                  text: 'Sorry, I encountered an issue analyzing the store records. Please try again.',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ],
            };
          }
          return t;
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isAiAssistantOpen}
      onClose={() => setIsAiAssistantOpen(false)}
      title="Sanzari Intelligence Engine"
      subtitle="In-built Store AI • Multi-Chat History"
      maxHeight="max-h-[92vh]"
    >
      <div className="flex flex-col h-[68vh] relative overflow-hidden bg-white text-zinc-900 rounded-2xl">
        {/* Top Header Bar with ChatGPT Sidebar Toggle */}
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-zinc-200/80 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className={`p-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                isSidebarOpen
                  ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                  : 'bg-zinc-100 text-zinc-800 border-zinc-200 hover:bg-zinc-200'
              }`}
              title="Toggle ChatGPT History Sidebar"
            >
              {isSidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
              <span className="text-xs font-bold">History ({threads.length})</span>
            </button>

            <span className="text-xs font-black text-zinc-800 truncate max-w-[160px] sm:max-w-xs">
              {activeThread?.title || 'Chat'}
            </span>
          </div>

          <button
            onClick={handleNewChat}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-extrabold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>+ New Chat</span>
          </button>
        </div>

        {/* Main Workspace Body (Sidebar Drawer + Active Chat Area) */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* ChatGPT Style Sidebar History Drawer */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute inset-y-0 left-0 z-20 w-64 bg-zinc-950 text-white p-3 shadow-2xl flex flex-col justify-between rounded-2xl border border-zinc-800"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-2">
                    <span className="text-xs font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                      <History size={14} />
                      <span>Chat History</span>
                    </span>
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="text-zinc-400 hover:text-white text-xs cursor-pointer"
                    >
                      Close ✕
                    </button>
                  </div>

                  <button
                    onClick={handleNewChat}
                    className="w-full mb-3 p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-zinc-700"
                  >
                    <Plus size={15} className="text-amber-400" />
                    <span>Start New Chat</span>
                  </button>

                  <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
                    {threads.map((t) => {
                      const isActive = t.id === activeThreadId;

                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            setActiveThreadId(t.id);
                            if (window.innerWidth < 640) {
                              setIsSidebarOpen(false);
                            }
                          }}
                          className={`p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all group ${
                            isActive
                              ? 'bg-amber-500 text-zinc-950 font-extrabold shadow-sm'
                              : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 font-medium border border-zinc-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-1">
                            <MessageSquare
                              size={14}
                              className={isActive ? 'text-zinc-950' : 'text-zinc-500'}
                            />
                            <span className="truncate text-xs">{t.title}</span>
                          </div>

                          <button
                            onClick={(e) => handleDeleteThread(t.id, e)}
                            className={`p-1 rounded-lg hover:bg-rose-600 hover:text-white transition-colors opacity-80 group-hover:opacity-100 ${
                              isActive ? 'text-zinc-950' : 'text-zinc-400'
                            }`}
                            title="Delete thread"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-400 font-mono text-center">
                  Sanzari Intelligence Engine • Auto-Saved
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Chat Conversation Area */}
          <div className="flex-1 flex flex-col justify-between overflow-hidden pl-0.5">
            {/* Messages list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-linear-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Sparkles size={13} className="fill-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[86%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-zinc-950 text-white font-medium rounded-tr-xs shadow-xs'
                        : 'bg-zinc-100/90 text-zinc-900 rounded-tl-xs border border-zinc-200/80 shadow-2xs'
                    }`}
                  >
                    {m.sender === 'assistant' ? (
                      <FormattedMessage text={m.text} />
                    ) : (
                      <p className="whitespace-pre-line">{m.text}</p>
                    )}

                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        m.sender === 'user' ? 'text-zinc-400' : 'text-zinc-400'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className="flex gap-2.5 items-center">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Sparkles size={13} className="animate-spin" />
                  </div>
                  <div className="p-3 bg-zinc-100 rounded-2xl text-xs text-zinc-600 flex items-center gap-1.5 border border-zinc-200">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    <span className="ml-1 text-[11px] font-bold text-zinc-800">
                      Analyzing Sanzari records...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick prompt chips */}
            <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="px-2.5 py-1 rounded-full bg-zinc-100 hover:bg-amber-50 hover:border-amber-200 border border-zinc-200/80 text-[11px] font-medium text-zinc-800 whitespace-nowrap cursor-pointer transition-all active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat input */}
            <div className="pt-1 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-100 border border-zinc-200 focus-within:bg-white focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 transition-all shadow-2xs"
              >
                <input
                  type="text"
                  placeholder="Ask anything about sales, wallets, stock..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-transparent text-xs text-zinc-900 outline-hidden font-medium placeholder:text-zinc-400"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-8.5 h-8.5 rounded-xl bg-zinc-950 text-white flex items-center justify-center hover:bg-black disabled:opacity-30 transition-transform active:scale-95 cursor-pointer shrink-0 shadow-xs"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
