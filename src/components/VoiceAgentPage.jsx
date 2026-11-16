import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import { Bot, Mic, MicOff, Send, RefreshCw, Key, Sparkles, Check, Trash2, CheckCircle2 } from 'lucide-react';

export default function VoiceAgentPage() {
  const { loadAllData } = useApp();
  const [apiKey, setApiKey] = useState(localStorage.getItem('mymoney_gemini_key') || '');
  const [isRecording, setIsRecording] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'agent',
      text: "Hi! I am your Voice AI Agent. Speak naturally or type instructions (e.g. 'I ate dosa in the morning for 150 online, and biryani at night for 350 cash'). You can correct me anytime (e.g. 'change amount to 400')!",
      time: '12:31 PM'
    }
  ]);
  const [extractedDrafts, setExtractedDrafts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const recognitionRef = useRef(null);

  // Initialize and handle speech recognition
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. You can type directly in the chat input below!");
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event) => {
        let interim = '';
        let finalStr = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const full = (finalStr + interim).trim();
        if (full) {
          setPromptInput(full);
        }
      };

      recognition.onerror = (e) => {
        console.warn("Speech error:", e);
        setIsRecording(false);
      };

      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsRecording(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSendPrompt = async (textToSend = null) => {
    const text = textToSend || promptInput;
    if (!text.trim()) return;

    if (isRecording) {
      stopListening();
    }

    const userMsg = { sender: 'user', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages(prev => [...prev, userMsg]);
    if (!textToSend) setPromptInput('');
    setIsProcessing(true);

    try {
      const res = await fetchWithAuth(`${API_BASE}/ai/parse-voice-chat`, {
        method: 'POST',
        body: JSON.stringify({ 
          narration: text, 
          conversation_history: chatMessages,
          existing_drafts: extractedDrafts,
          gemini_api_key: apiKey 
        })
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.message || data.reply_message || 'Extracted expenses successfully.';
        const agentReply = {
          sender: 'agent',
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, agentReply]);
        const newDrafts = data.parsed || data.extracted_expenses || [];
        if (newDrafts.length > 0) {
          setExtractedDrafts(newDrafts);
        }
        loadAllData();
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.detail || 'Sorry, I had trouble parsing that. Please try rephrasing your prompt.';
        setChatMessages(prev => [...prev, {
          sender: 'agent',
          text: errMsg,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      console.error('Error sending AI prompt:', err);
      setChatMessages(prev => [...prev, {
        sender: 'agent',
        text: 'Network connection error. Please try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAllDrafts = async () => {
    if (extractedDrafts.length === 0) return;
    setIsProcessing(true);
    let saved = 0;
    try {
      for (const draft of extractedDrafts) {
        const payload = {
          title: draft.title || 'Voice Expense',
          amount: parseFloat(draft.amount) || 0,
          category: draft.category || 'Other',
          payment_method: draft.payment_method || 'Cash',
          date: draft.date || new Date().toISOString().split('T')[0],
          notes: draft.description || 'Saved via Voice AI Agent'
        };
        const res = await fetchWithAuth(`${API_BASE}/expenses`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.ok) saved++;
      }
      setExtractedDrafts([]);
      loadAllData();
      setSaveSuccessMsg(`Saved ${saved} expense(s) successfully!`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      setChatMessages(prev => [...prev, {
        sender: 'agent',
        text: `Confirmed! I've permanently added ${saved} expense(s) to your ledger.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      console.error('Error saving drafts:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDraft = (index) => {
    setExtractedDrafts(prev => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-6">
      {/* Banner Card */}
      <div className="app-card border border-purple-200 dark:border-purple-800/40 bg-gradient-to-r from-purple-50 via-white to-indigo-50 dark:from-purple-950/20 dark:to-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Agentic MyMoney</h3>
              <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full uppercase">
                AI MODE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Spoken narration, continuous multi-turn chat, time & meal duration parsing, and instant expense persistence
            </p>
          </div>
        </div>

        {/* Key Save Header */}
        <div className="flex flex-col gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl mt-4 w-full md:w-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Gemini API Key (Optional)</span>
            </div>
            <a 
              href="https://github.com/Kv-Logics/MyMoney/blob/main/docs/05-GEMINI-API-KEY-SETUP-GUIDE.md" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-purple-400 hover:text-purple-300 underline font-semibold flex items-center gap-1"
            >
              How to get a key?
            </a>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="password"
              placeholder="Enter your AI Studio API Key (AIzaSy...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500 rounded-lg px-3 py-2 flex-1"
            />
            <button 
              onClick={() => {
                localStorage.setItem('mymoney_gemini_key', apiKey);
                alert('Gemini API Key saved locally!');
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition shrink-0"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>

      {/* Center Row: Recording Mic Card (Left) & Extracted Drafts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Recording Card */}
        <div className="app-card flex flex-col items-center justify-center text-center p-8 space-y-4 min-h-[220px]">
          <button
            onClick={toggleRecording}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
              isRecording ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>

          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {isRecording ? 'Listening... Speak now!' : 'Ready to Record • Click Mic or Start'}
            </p>

            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                onClick={startListening}
                disabled={isRecording}
                className="px-4 py-2 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-200 transition disabled:opacity-50"
              >
                ▷ Start Recording
              </button>
              <button
                onClick={stopListening}
                disabled={!isRecording}
                className="px-4 py-2 bg-rose-100 text-rose-700 font-bold text-xs rounded-xl hover:bg-rose-200 transition disabled:opacity-50"
              >
                ⏹ Stop Recording
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Continuous voice recognition or type below • Auto expense categorization
            </p>
          </div>
        </div>

        {/* Extracted Drafts Card */}
        <div className="app-card min-h-[220px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">EXTRACTED DRAFTS</span>
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">
                  {extractedDrafts.length}
                </span>
              </div>
              {saveSuccessMsg && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {saveSuccessMsg}
                </span>
              )}
            </div>

            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 min-h-[140px] flex flex-col justify-center">
              {extractedDrafts.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center">
                  No draft expenses extracted yet. Speak or type in the chat to extract expenses!
                </p>
              ) : (
                <div className="w-full space-y-2 max-h-48 overflow-y-auto">
                  {extractedDrafts.map((d, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between text-xs border border-slate-100 dark:border-slate-700">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">{d.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-semibold">{d.category}</span>
                          <span>• {d.payment_method || 'Cash'}</span>
                          {d.time && <span>• {d.time}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-emerald-600 text-sm">₹{d.amount}</span>
                        <button
                          onClick={() => handleDeleteDraft(idx)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                          title="Remove draft"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {extractedDrafts.length > 0 && (
            <div className="pt-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setExtractedDrafts([])}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1"
              >
                Clear All
              </button>
              <button
                onClick={handleSaveAllDrafts}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Save {extractedDrafts.length} Expense(s) to Ledger
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Chat Conversation Box */}
      <div className="app-card space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AGENT CONVERSATION</span>
          <button onClick={() => setChatMessages([])} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Reset Chat
          </button>
        </div>

        {/* Messages List */}
        <div className="space-y-3 max-h-60 overflow-y-auto p-2">
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-purple-600 text-white rounded-br-none'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
              }`}>
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
            </div>
          ))}
        </div>

        {/* Try Saying Suggestions */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          <span className="text-slate-400 text-[10px] font-bold">Try saying:</span>
          {['Morning milk 10', 'Morning dosa for 150', 'Night biryani for 350', 'Change amount to 800', 'Also 50 for chai'].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendPrompt(prompt)}
              className="px-3 py-1 bg-slate-900 text-white rounded-xl text-[11px] font-semibold hover:bg-slate-800 transition"
            >
              "{prompt}"
            </button>
          ))}
        </div>

        {/* Input Box */}
        <form onSubmit={(e) => { e.preventDefault(); handleSendPrompt(); }} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Speak or type narration / edit prompts here..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            disabled={isProcessing}
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={isProcessing || !promptInput.trim()}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
