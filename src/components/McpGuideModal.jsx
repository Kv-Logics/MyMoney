import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  Terminal, 
  ExternalLink, 
  Bot, 
  Zap, 
  ShieldCheck, 
  ChevronRight,
  TrendingUp,
  DollarSign,
  PieChart
} from 'lucide-react';

export default function McpGuideModal({ isOpen, onClose }) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeTab, setActiveTab] = useState('chatgpt'); // 'chatgpt' | 'claude' | 'cursor'
  const [serverStatus, setServerStatus] = useState('online'); // 'online' | 'checking' | 'error'

  if (!isOpen) return null;

  const mcpUrl = 'https://mymoney-jd0n.onrender.com/mcp';
  const mcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        mymoney: {
          url: "https://mymoney-jd0n.onrender.com/mcp"
        }
      }
    },
    null,
    2
  );

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(mcpUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(mcpConfigJson);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="glass-modal max-w-2xl w-full rounded-2xl p-5 sm:p-7 border border-indigo-200/50 dark:border-indigo-900/50 shadow-2xl bg-white dark:bg-slate-900 space-y-6 max-h-[90vh] overflow-y-auto my-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">
                  Connect MyMoney to ChatGPT
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full uppercase tracking-wider">
                  New Update
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Model Context Protocol (MCP) gives ChatGPT direct access to your finances
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Server Endpoint Badge */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Live MCP Server Endpoint
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.2 rounded-full">
                HTTP Streamable
              </span>
            </div>
            <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 break-all select-all">
              {mcpUrl}
            </p>
          </div>
          <button
            onClick={handleCopyUrl}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('chatgpt')}
            className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'chatgpt'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" /> ChatGPT Desktop
          </button>
          <button
            onClick={() => setActiveTab('claude')}
            className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'claude'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Claude Desktop
          </button>
          <button
            onClick={() => setActiveTab('cursor')}
            className={`pb-2.5 text-xs font-bold transition flex items-center gap-1.5 border-b-2 ${
              activeTab === 'cursor'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> Cursor / VS Code
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'chatgpt' && (
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px]">1</span>
                Open ChatGPT Developer Settings
              </h4>
              <p className="pl-7 text-slate-500 dark:text-slate-400">
                Open the official ChatGPT Desktop application, click your profile picture, navigate to <strong>Settings</strong> &gt; <strong>Developer</strong> &gt; <strong>MCP Servers</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px]">2</span>
                Add MyMoney Server
              </h4>
              <p className="pl-7 text-slate-500 dark:text-slate-400">
                Click <strong>Add Server</strong>, choose <strong>SSE / HTTP</strong>, and paste the URL:
              </p>
              <div className="ml-7 bg-slate-900 text-slate-200 font-mono p-2.5 rounded-lg text-[11px] flex items-center justify-between">
                <span>{mcpUrl}</span>
                <button onClick={handleCopyUrl} className="text-slate-400 hover:text-white transition">
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px]">3</span>
                Start Chatting with your finances!
              </h4>
              <p className="pl-7 text-slate-500 dark:text-slate-400">
                ChatGPT will now recognize all 15 MyMoney tools automatically. Try asking:
              </p>
              <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <div className="p-2 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-lg text-[11px] text-indigo-700 dark:text-indigo-300">
                  💬 &ldquo;What were my top expenses this week?&rdquo;
                </div>
                <div className="p-2 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-lg text-[11px] text-amber-700 dark:text-amber-300">
                  💬 &ldquo;Record ₹750 profit for today&rdquo;
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'claude' && (
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <p className="text-slate-500 dark:text-slate-400">
              Add the configuration below to your Claude Desktop config file located at:
              <br />
              <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-800 dark:text-slate-200">
                ~/Library/Application Support/Claude/claude_desktop_config.json
              </code>
            </p>

            <div className="relative">
              <pre className="bg-slate-900 text-slate-200 font-mono p-3.5 rounded-xl text-[11px] overflow-x-auto">
                {mcpConfigJson}
              </pre>
              <button
                onClick={handleCopyJson}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow transition"
              >
                {copiedJson ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'cursor' && (
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <p className="text-slate-500 dark:text-slate-400">
              In Cursor or VS Code, create a file named <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">.cursor/mcp.json</code> in your project:
            </p>

            <div className="relative">
              <pre className="bg-slate-900 text-slate-200 font-mono p-3.5 rounded-xl text-[11px] overflow-x-auto">
                {mcpConfigJson}
              </pre>
              <button
                onClick={handleCopyJson}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow transition"
              >
                {copiedJson ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 15 Built-in Tools Highlight */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            15 Production MCP Tools Available
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              📈 record_daily_profit
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              💳 list_expenses
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              ➕ create_expense
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              🎯 create_or_update_budget
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              📊 get_expense_summary
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              💰 get_profit_summary
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Powered by FastAPI & Model Context Protocol
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
