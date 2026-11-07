import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
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
  Store,
  Plane,
  X,
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
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
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
    businessMode,
    wallets,
    customers,
    products,
    sales,
    expenses,
    payments,
    purchases,
    vendors,
    tourBatches,
    tourBookings,
    tourExpenses,
    tourWallets,
    tourInquiries,
    tourPricingSettings,
    auditLogs,
    formatCurrency,
  } = useData();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    const welcomeMsgText =
      businessMode === 'tourism'
        ? 'Assalam o Alaikum bhai! Main aapka Sanzari Tourism AI Manager hoon. Date wise bookings, Sahil/Rizwan wallet transactions, Mustak commission, ya baki dues ke baare me kuch bhi pucho, main exact numbers calculate karke reply dunga!'
        : 'Assalam o Alaikum bhai! Main aapka Sanzari Dry Fruits AI Assistant hoon. Daily sales, low stock, baki customer dues, ya wallet balances ke baare me kuch bhi pucho!';

    const initialThread: ChatThread = {
      id: 'default-welcome-thread',
      title: businessMode === 'tourism' ? 'Tourism Operations AI' : 'Dry Fruits Store AI',
      createdAt: new Date().toLocaleDateString('en-IN'),
      messages: [
        {
          id: 'welcome',
          sender: 'assistant',
          text: welcomeMsgText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };
    return [initialThread];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    return threads[0]?.id || 'default-welcome-thread';
  });

  // Save threads to localStorage
  useEffect(() => {
    localStorage.setItem('sanzari_ai_chat_threads', JSON.stringify(threads));
  }, [threads]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAiAssistantOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threads, loading, isAiAssistantOpen, activeThreadId]);

  if (!isAiAssistantOpen) return null;

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const messages = activeThread?.messages || [];

  const handleNewChat = () => {
    const newId = `thread-${Date.now()}`;
    const welcomeMsgText =
      businessMode === 'tourism'
        ? 'New Tourism Chat started! Ask me about date-wise wallet collections, bookings, Mustak commission, or tour folders.'
        : 'New Dry Fruits Chat started! Ask me about store sales, stock, or customer balances.';

    const newThread: ChatThread = {
      id: newId,
      title: 'New Conversation',
      createdAt: new Date().toLocaleDateString('en-IN'),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: welcomeMsgText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
    setIsSidebarOpen(false);
  };

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

    setThreads((prevThreads) =>
      prevThreads.map((t) => {
        if (t.id === activeThreadId) {
          const isFirstUserMsg = t.messages.length <= 1;
          const autoTitle = isFirstUserMsg
            ? query.trim().substring(0, 24) + (query.trim().length > 24 ? '...' : '')
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
      const todayIso = new Date().toISOString().split('T')[0]; // YYYY-MM-DD (e.g. 2026-11-06)
      const todayFormatted = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }); // e.g. "06 November 2026"

      let contextText = '';

      if (businessMode === 'tourism') {
        const totalRev = tourBookings.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
        const advRec = tourBookings.reduce((s, b) => s + Number(b.advancePaid || 0), 0);
        const remainingDues = tourBookings.reduce(
          (s, b) => s + Math.max(0, Number(b.totalAmount || 0) - Number(b.advancePaid || 0)),
          0
        );

        // Mustak Commission
        let mustakCommission = 0;
        let mustakPax = 0;
        let mustakBookings = 0;
        const rate = tourPricingSettings?.commissionRatePerPax ?? 200;

        tourBookings.forEach((b) => {
          const bBy = (b.bookedBy || b.specialNotes || '').toLowerCase();
          if (bBy.includes('mustak')) {
            mustakBookings += 1;
            const billableMembers = (b.members || []).filter((m) => {
              const ageNum = m.age !== undefined && m.age !== '' ? Number(m.age) : 10;
              return ageNum >= 5;
            });
            mustakPax += billableMembers.length;
            mustakCommission += billableMembers.length * rate;
          }
        });

        // Wallets Current Balances
        const sahilWallet =
          tourWallets.find((w) => w.name.toLowerCase().includes('sahil'))?.currentBalance || 0;
        const rizwanWallet =
          tourWallets.find((w) => w.name.toLowerCase().includes('rizwan'))?.currentBalance || 0;
        const busWallet =
          tourWallets.find((w) => w.name.toLowerCase().includes('bus'))?.currentBalance || 0;

        // Folders list
        const folderList = tourBatches
          .map((f) => {
            const cnt = tourBookings.filter((b) => b.tourBatchId === f.id).length;
            const paxCnt = tourBookings
              .filter((b) => b.tourBatchId === f.id)
              .reduce((s, b) => s + (b.membersCount || 1), 0);
            return `• ${f.title} (${f.destination}): ${paxCnt}/${f.totalSeats || 30} Pax booked (${cnt} Bookings)`;
          })
          .join('\n');

        // Detailed Bookings List with exact creation/booking dates
        const detailedBookingsList = tourBookings
          .map((b) => {
            const dateStr = b.createdAt ? b.createdAt.substring(0, 10) : b.tourDate || todayIso;
            const bBy = b.bookedBy || (b.walletName?.toLowerCase().includes('mustak') ? 'Mustak' : 'Rizwan');
            return `• Date: ${dateStr} | Booking: ${b.bookingNumber} | Customer: ${b.customerName} (${b.customerPhone}) | Pax: ${b.membersCount} | BookedBy: ${bBy} | Wallet: ${b.walletName || 'Rizwan (Tour)'} | Total: ₹${b.totalAmount} | Adv: ₹${b.advancePaid} | Baaki: ₹${Math.max(0, Number(b.totalAmount || 0) - Number(b.advancePaid || 0))} | Tour: ${b.destination}`;
          })
          .join('\n');

        // COMPLETE WALLET TRANSACTIONS & COLLECTIONS BREAKDOWN BY DATE
        const walletTransactionsList: string[] = [];

        tourBookings.forEach((b) => {
          const mainDate = b.createdAt ? b.createdAt.substring(0, 10) : b.tourDate || todayIso;
          const mainWallet = b.walletName || 'Rizwan (Tour)';

          if (Array.isArray(b.paymentHistory) && b.paymentHistory.length > 0) {
            b.paymentHistory.forEach((ph, pIdx) => {
              const pDate = ph.date ? ph.date.substring(0, 10) : mainDate;
              const pWallet = ph.walletName || mainWallet;
              walletTransactionsList.push(
                `• Date: ${pDate} | Wallet: ${pWallet} | Collection Amount: ₹${ph.amount} | Customer: ${b.customerName} (${b.bookingNumber}) | Mode: ${ph.paymentMode || 'UPI'} | Note: Installment #${pIdx + 1}`
              );
            });
          } else if (Number(b.advancePaid || 0) > 0) {
            walletTransactionsList.push(
              `• Date: ${mainDate} | Wallet: ${mainWallet} | Collection Amount: ₹${b.advancePaid} | Customer: ${b.customerName} (${b.bookingNumber}) | Mode: ${b.paymentMode || 'UPI'} | Note: Initial Advance Collection`
            );
          }
        });

        // Add Tour Expenses Cash-Out
        (tourExpenses || []).forEach((e) => {
          const eDate = e.date ? e.date.substring(0, 10) : todayIso;
          const eWallet = e.walletName || 'Rizwan (Tour)';
          walletTransactionsList.push(
            `• Date: ${eDate} | Wallet: ${eWallet} | Expense Out: -₹${e.amount} | Description: ${e.description} (${e.category})`
          );
        });

        // Audit Logs (Activity Update Logs)
        const activityLogsList = (auditLogs || [])
          .slice(0, 20)
          .map(
            (log) =>
              `• Date/Time: ${log.timestamp} | Action: ${log.action} | Record: ${log.recordType} (${log.recordId}) | Details: ${log.newValue || log.oldValue || ''} | By: ${log.userEmail}`
          )
          .join('\n');

        contextText = `
CURRENT REAL-TIME DATE: ${todayFormatted} (ISO: ${todayIso})
NOTE: 6 ko = 06 November 2026 (or 2026-11-06). If user asks "Sahil wallet me kitna aaya 6 ko?", filter the WALLET TRANSACTIONS LIST for "Date: 2026-11-06" and "Wallet: Sahil (Tour)", add up the collection amounts, and list the customer names!

• OVERALL TOUR FINANCIAL STATS:
  - Total Confirmed Bookings: ${tourBookings.length}
  - Total Booked Revenue: ${formatCurrency(totalRev)}
  - Total Advance Received: ${formatCurrency(advRec)}
  - Total Pending Dues (Baaki): ${formatCurrency(remainingDues)}

• MUSTAK COMMISSION REPORT:
  - Rate: ₹${rate}/pax (Age ≥ 5 yrs)
  - Mustak Bookings: ${mustakBookings}
  - Mustak Billable Pax: ${mustakPax} Pax
  - Mustak Total Commission: ${formatCurrency(mustakCommission)}

• TOUR WALLETS CURRENT LIVE BALANCES:
  - Sahil (Tour): ${formatCurrency(sahilWallet)}
  - Rizwan (Tour): ${formatCurrency(rizwanWallet)}
  - Bus (Tour): ${formatCurrency(busWallet)}

• WALLET TRANSACTIONS & COLLECTIONS BREAKDOWN BY DATE (Use this for "Sahil wallet me kitna aaya", "Rizwan wallet collection" date queries):
${walletTransactionsList.join('\n') || 'No wallet transactions recorded yet'}

• DATE-WISE ALL TOUR BOOKINGS RECORDS:
${detailedBookingsList || 'No bookings found'}

• TOUR DATE FOLDERS (${tourBatches.length}):
${folderList || 'No folders created yet'}

• RECENT ACTIVITY & UPDATE LOGS:
${activityLogsList || 'No recent activity logs'}
`;
      } else {
        // DRY FRUITS MODE ONLY
        const totalSales = sales.reduce((s, x) => s + Number(x.total || 0), 0);
        const totalExp = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);
        const totalPaidCust = customers.reduce((s, c) => s + Number(c.pendingBalance || 0), 0);

        contextText = `
CURRENT REAL-TIME DATE: ${todayFormatted} (ISO: ${todayIso})
MODE: SANZARI DRY FRUITS STORE ONLY (DO NOT DISCUSS TOURISM)

• STORE SUMMARY:
  - Total Sales Recorded: ${formatCurrency(totalSales)}
  - Total Store Expenses: ${formatCurrency(totalExp)}
  - Pending Customer Dues: ${formatCurrency(totalPaidCust)}

• STORE PRODUCTS STOCK:
${products.slice(0, 15).map((p) => `• ${p.name}: ${p.currentStock} ${p.unit} in stock, ₹${p.sellingPrice}/${p.unit}`).join('\n')}
`;
      }

      const res = await askAiAssistant(query, contextText);

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
                  text: 'Bhai, response generate karne me issue aaya. Kripya dubara try karein.',
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
    <div className="fixed inset-0 z-[100] bg-white text-zinc-950 flex flex-col font-sans overflow-hidden">
      {/* Sleek Full Screen Header Bar */}
      <div className="bg-zinc-950 text-white px-3 sm:px-6 py-3 flex items-center justify-between border-b border-zinc-800 shrink-0 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className={`p-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isSidebarOpen
                ? 'bg-amber-400 text-zinc-950 border-amber-500 font-black'
                : 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:bg-zinc-800'
            }`}
            title="Toggle ChatGPT History Sidebar"
          >
            {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            <span className="text-xs font-bold">History ({threads.length})</span>
          </button>

          <div className="min-w-0 flex items-center gap-1.5">
            <span className="font-black text-sm sm:text-base tracking-tight text-white truncate">
              Sanzari AI Manager
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
              {businessMode === 'tourism' ? (
                <>
                  <Plane size={10} /> ✈️ Tourism
                </>
              ) : (
                <>
                  <Store size={10} /> 🌰 Dry Fruits
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleNewChat}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-zinc-950 text-xs font-black flex items-center gap-1 shadow-sm transition-transform active:scale-95 cursor-pointer"
          >
            <Plus size={14} className="stroke-[3]" />
            <span className="hidden sm:inline">+ New Chat</span>
            <span className="sm:hidden">+ New</span>
          </button>

          <button
            onClick={() => setIsAiAssistantOpen(false)}
            className="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close Full Screen AI"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Full-Screen Body (Drawer Sidebar + Full Chat Area) */}
      <div className="flex-1 flex overflow-hidden relative bg-white">
        {/* ChatGPT Style History Drawer Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute inset-y-0 left-0 z-40 w-full sm:w-72 bg-zinc-950 text-white p-4 shadow-2xl flex flex-col justify-between border-r border-zinc-800"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                  <span className="text-xs font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                    <History size={15} />
                    <span>Saved Chat History</span>
                  </span>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Close ✕
                  </button>
                </div>

                <button
                  onClick={handleNewChat}
                  className="w-full mb-3 p-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-zinc-950 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Plus size={16} className="stroke-[3]" />
                  <span>Start New Chat</span>
                </button>

                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
                  {threads.map((t) => {
                    const isActive = t.id === activeThreadId;

                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setActiveThreadId(t.id);
                          setIsSidebarOpen(false);
                        }}
                        className={`p-3 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isActive
                            ? 'bg-amber-400 text-zinc-950 font-extrabold shadow-sm'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium border border-zinc-800'
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
                          className={`p-1 rounded-lg hover:bg-rose-600 hover:text-white transition-colors ${
                            isActive ? 'text-zinc-950' : 'text-zinc-400'
                          }`}
                          title="Delete thread"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 text-[10px] text-zinc-400 font-mono text-center">
                Sanzari Gemini AI Manager • Full Screen Chat
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Full Screen Chat Conversation Area */}
        <div className="flex-1 flex flex-col justify-between max-w-4xl mx-auto w-full h-full p-3 sm:p-5 overflow-hidden">
          {/* Messages list with Auto Scroll Ref */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 sm:pr-2">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-amber-400 text-zinc-950 font-black flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-xs border border-amber-500">
                    <Sparkles size={15} className="fill-zinc-950" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[80%] p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-zinc-950 text-white font-medium rounded-tr-xs shadow-sm'
                      : 'bg-zinc-100 text-zinc-950 rounded-tl-xs border border-zinc-250 shadow-2xs'
                  }`}
                >
                  {m.sender === 'assistant' ? (
                    <FormattedMessage text={m.text} />
                  ) : (
                    <p className="whitespace-pre-line">{m.text}</p>
                  )}

                  <span
                    className={`block text-[9px] sm:text-[10px] mt-1.5 text-right ${
                      m.sender === 'user' ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-full bg-amber-400 text-zinc-950 font-black flex items-center justify-center shrink-0 border border-amber-500">
                  <Sparkles size={15} className="animate-spin" />
                </div>
                <div className="p-3 bg-zinc-100 rounded-2xl text-xs sm:text-sm text-zinc-800 flex items-center gap-2 border border-zinc-250">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 font-bold text-zinc-950">
                    Calculating {businessMode === 'tourism' ? 'Tour' : 'Dry Fruits'} data...
                  </span>
                </div>
              </div>
            )}

            {/* Invisible Scroll Anchor Element */}
            <div ref={messagesEndRef} />
          </div>

          {/* Full Screen ChatGPT Style Input Box */}
          <div className="pt-3 pb-2 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-zinc-100 border-2 border-zinc-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-950 transition-all shadow-sm"
            >
              <input
                type="text"
                placeholder={
                  businessMode === 'tourism'
                    ? 'Pucho: Sahil wallet me kitna aaya 6 ko?, Mustak commission, date bookings...'
                    : 'Pucho: Sales, stock, customer dues...'
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-transparent text-xs sm:text-sm text-zinc-950 outline-none font-medium placeholder:text-zinc-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center hover:bg-black disabled:opacity-30 transition-transform active:scale-95 cursor-pointer shrink-0 shadow-sm"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
