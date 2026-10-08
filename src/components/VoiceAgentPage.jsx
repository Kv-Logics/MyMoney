import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE, fetchWithAuth } from '../api';
import { Bot, Mic, Send, RefreshCw, Key, Sparkles } from 'lucide-react';

export default function VoiceAgentPage() {
  const { loadAllData } = useApp();
  const [apiKey, setApiKey] = useState('');
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

  const handleSendPrompt = async (textToSend = null) => {
    const text = textToSend || promptInput;
    if (!text.trim()) return;

    const userMsg = { sender: 'user', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages(prev => [...prev, userMsg]);
    if (!textToSend) setPromptInput('');
    setIsProcessing(true);

    try {
      const res = await fetchWithAuth(`${API_BASE}/ai/parse-voice-chat`, {
        method: 'POST',
        body: JSON.stringify({ prompt: text })
      });

      if (res.ok) {
        const data = await res.json();
        const agentReply = {
          sender: 'agent',
          text: data.message || 'Extracted expenses successfully.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, agentReply]);
        if (data.parsed) setExtractedDrafts(prev => [...prev, ...data.parsed]);
        loadAllData();
      } else {
        setChatMessages(prev => [...prev, {
          sender: 'agent',
          text: 'Sorry, I had trouble parsing that. Please try rephrasing your prompt.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      console.error('Error sending AI prompt:', err);
    } finally {
      setIsProcessing(false);
    }
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
        <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl">
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <input
            type="password"
            placeholder="••••••••••••••••••••••••"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="bg-transparent text-xs text-white focus:outline-none w-36"
          />
          <button className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] rounded-lg">
            Save Key
          </button>
        </div>
      </div>

      {/* Center Row: Recording Mic Card (Left) & Extracted Drafts (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Recording Card */}
        <div className="app-card flex flex-col items-center justify-center text-center p-8 space-y-4 min-h-[220px]">
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
              isRecording ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            <Mic className="w-8 h-8" />
          </button>

          <div>
            <p className="text-xs font-semibold text-slate-400">
              {isRecording ? 'Listening...' : 'Ready to Record • Click Start or Mic'}
            </p>

            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                onClick={() => setIsRecording(true)}
                className="px-4 py-2 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-200 transition"
              >
                ▷ Start Recording
              </button>
              <button
                onClick={() => setIsRecording(false)}
                className="px-4 py-2 bg-rose-100 text-rose-700 font-bold text-xs rounded-xl hover:bg-rose-200 transition"
              >
                ⏹ Stop Recording
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              You decide when to start & stop speaking • Continuous recognition
            </p>
          </div>
        </div>

        {/* Extracted Drafts Card */}
        <div className="app-card min-h-[220px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">EXTRACTED DRAFTS</span>
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">
                {extractedDrafts.length}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Live editable • continue chatting to refine</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center">
            {extractedDrafts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No draft expenses extracted yet. Speak or type in the chat to extract expenses!
              </p>
            ) : (
              <div className="w-full space-y-2">
                {extractedDrafts.map((d, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{d.title}</p>
                      <span className="text-[10px] text-slate-400">{d.category}</span>
                    </div>
                    <span className="font-extrabold text-emerald-600">₹{d.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          {['Morning dosa for 150', 'Night biryani for 350', 'Change amount to 800', 'Also 50 for chai'].map((prompt) => (
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
