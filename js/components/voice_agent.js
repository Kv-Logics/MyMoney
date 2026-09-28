// VOICE AI AGENT MODULE ("Agentic MyMoney")
// Features: Real-time Continuous Voice Recognition, Manual Start/Stop Control, Multi-turn Chat Memory, Meal/Timing Extraction, AI Access Approval & Token Monitoring

let voiceRecognition = null;
let isUserRecording = false;
let currentDraftExpenses = [];
let userAIStatus = null;
let recordedTranscript = '';

// Persistent conversation history across turns
let conversationHistory = [
  {
    role: 'assistant',
    content: "Hi! I am your Voice AI Agent. Speak naturally or type instructions (e.g. 'I ate dosa in the morning for 150 online, and biryani at night for 350 cash'). You can correct me anytime (e.g. 'change amount to 400')!",
    time: formatTimeNow()
  }
];

function formatTimeNow() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech Recognition API not supported in this browser.");
    return null;
  }

  const recognition = new SpeechRecognition();
  // Continuous recognition so browser does NOT terminate when user pauses to think
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isUserRecording = true;
    updateMicUI(true);
  };

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
    const fullText = (finalStr + interim).trim();
    const inputEl = document.getElementById('voice-input-text');
    if (inputEl && fullText) {
      inputEl.value = fullText;
      updateVoiceClearBtn();
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    if (event.error === 'no-speech') {
      // Don't kill recording session on brief silence; user explicitly controls start/stop
      if (isUserRecording) return;
    }
    if (typeof showToast === 'function' && event.error !== 'no-speech') {
      showToast(`Voice capture error: ${event.error}`, 'error');
    }
    isUserRecording = false;
    updateMicUI(false);
  };

  recognition.onend = () => {
    // If the browser ended recognition while user is still in recording mode,
    // automatically restart it so recording continues until user clicks Stop!
    if (isUserRecording) {
      try {
        recognition.start();
        return;
      } catch (e) {
        console.warn("Auto-restart recognition notice:", e);
      }
    }
    isUserRecording = false;
    updateMicUI(false);
  };

  return recognition;
}

function startVoiceRecording() {
  if (isUserRecording) return;
  if (!voiceRecognition) {
    voiceRecognition = initSpeechRecognition();
  }

  if (!voiceRecognition) {
    alert("Speech recognition is not supported in your browser. Please type your narration in the chat input.");
    return;
  }

  isUserRecording = true;
  try {
    voiceRecognition.start();
  } catch (e) {
    console.warn("Recognition already active or starting:", e);
  }
  updateMicUI(true);
}

function stopVoiceRecording() {
  if (!isUserRecording) return;
  isUserRecording = false;
  if (voiceRecognition) {
    try {
      voiceRecognition.stop();
    } catch (e) {
      console.warn("Error stopping voice recognition:", e);
    }
  }
  updateMicUI(false);
  if (typeof showToast === 'function') {
    showToast("Recording stopped. Click 'Send' to parse expenses.", "info");
  }
}

function toggleVoiceRecording() {
  if (isUserRecording) {
    stopVoiceRecording();
  } else {
    startVoiceRecording();
  }
}

function updateMicUI(recording) {
  // Tab elements
  const tabMicBtn = document.getElementById('voice-tab-mic-btn');
  const tabMicIcon = document.getElementById('voice-tab-mic-icon');
  const tabPulseRing = document.getElementById('voice-tab-pulse-ring');
  const tabDot = document.getElementById('voice-tab-dot');
  const tabStateText = document.getElementById('voice-tab-state-text');
  const tabStartBtn = document.getElementById('voice-tab-start-btn');
  const tabStopBtn = document.getElementById('voice-tab-stop-btn');

  // Modal elements (backward compatibility)
  const modalMicBtn = document.getElementById('voice-mic-btn');
  const modalMicIcon = document.getElementById('voice-mic-icon');
  const modalPulseRing = document.getElementById('voice-pulse-ring');
  const modalDot = document.getElementById('voice-mic-dot');
  const modalStateText = document.getElementById('voice-mic-state-text');
  const modalStartBtn = document.getElementById('voice-start-btn');
  const modalStopBtn = document.getElementById('voice-stop-btn');

  if (recording) {
    [tabMicBtn, modalMicBtn].forEach(btn => {
      if (!btn) return;
      btn.classList.remove('bg-brand-500', 'hover:bg-brand-600');
      btn.classList.add('bg-rose-500', 'hover:bg-rose-600', 'ring-4', 'ring-rose-500/30', 'scale-105');
    });
    [tabMicIcon, modalMicIcon].forEach(icon => {
      if (!icon) return;
      icon.setAttribute('data-lucide', 'square');
      icon.className = 'w-7 h-7 fill-white text-white';
    });
    [tabPulseRing, modalPulseRing].forEach(el => el && el.classList.remove('hidden'));
    [tabDot, modalDot].forEach(el => {
      if (el) el.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping';
    });
    [tabStateText, modalStateText].forEach(el => {
      if (!el) return;
      el.innerText = 'Recording Active — Speak Continuously (Click Stop to End)';
      el.className = 'text-rose-400 font-bold';
    });
    [tabStartBtn, modalStartBtn].forEach(btn => {
      if (!btn) return;
      btn.disabled = true;
      btn.classList.add('opacity-40', 'cursor-not-allowed');
    });
    [tabStopBtn, modalStopBtn].forEach(btn => {
      if (!btn) return;
      btn.disabled = false;
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
      btn.classList.add('ring-2', 'ring-rose-500/50', 'shadow-md', 'shadow-rose-500/20');
    });
  } else {
    [tabMicBtn, modalMicBtn].forEach(btn => {
      if (!btn) return;
      btn.classList.remove('bg-rose-500', 'hover:bg-rose-600', 'ring-4', 'ring-rose-500/30', 'scale-105');
      btn.classList.add('bg-brand-500', 'hover:bg-brand-600');
    });
    [tabMicIcon, modalMicIcon].forEach(icon => {
      if (!icon) return;
      icon.setAttribute('data-lucide', 'mic');
      icon.className = 'w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-110';
    });
    [tabPulseRing, modalPulseRing].forEach(el => el && el.classList.add('hidden'));
    [tabDot, modalDot].forEach(el => {
      if (el) el.className = 'w-2 h-2 rounded-full bg-brand-400';
    });
    [tabStateText, modalStateText].forEach(el => {
      if (!el) return;
      el.innerText = 'Ready to Record • Click Start or Mic';
      el.className = 'text-slate-300 font-medium';
    });
    [tabStartBtn, modalStartBtn].forEach(btn => {
      if (!btn) return;
      btn.disabled = false;
      btn.classList.remove('opacity-40', 'cursor-not-allowed');
    });
    [tabStopBtn, modalStopBtn].forEach(btn => {
      if (!btn) return;
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
      btn.classList.remove('ring-2', 'ring-rose-500/50', 'shadow-md', 'shadow-rose-500/20');
    });
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

// ================= AI MODE TAB INITIALIZATION =================
async function initVoiceAgentPage() {
  if (state.activeOwner) {
    showToast("Voice AI Agent is disabled in shared read-only view.", "info");
    return;
  }

  // Pre-fill saved Gemini key in tab input if present
  const tabKeyInput = document.getElementById('tab-gemini-key-input');
  if (tabKeyInput) {
    tabKeyInput.value = localStorage.getItem('gemini_api_key') || '';
  }

  // Check access permission
  await checkAIAccessPermission();

  // Render chat messages and current draft cards
  renderChatMessages();
  renderVoiceDraftCards();
  updateMicUI(isUserRecording);
  updateVoiceClearBtn();
}

function renderChatMessages() {
  const container = document.getElementById('voice-chat-messages');
  if (!container) return;

  container.innerHTML = conversationHistory.map(msg => {
    if (msg.role === 'user') {
      return `
        <div class="flex justify-end gap-2.5 items-end">
          <div class="max-w-[85%] sm:max-w-[75%] space-y-1 text-right">
            <div class="chat-bubble-user px-4 py-2.5 text-xs text-white leading-relaxed inline-block text-left break-words">
              ${escapeHTML(msg.content)}
            </div>
            <div class="text-[10px] text-slate-500 pr-1">${msg.time || ''}</div>
          </div>
          <div class="w-7 h-7 rounded-xl bg-violet-600/30 border border-violet-500/40 text-violet-300 flex items-center justify-center shrink-0 text-xs font-bold mb-4">
            <i data-lucide="user" class="w-3.5 h-3.5"></i>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="flex justify-start gap-2.5 items-end">
          <div class="w-7 h-7 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md mb-4">
            <i data-lucide="bot" class="w-3.5 h-3.5"></i>
          </div>
          <div class="max-w-[85%] sm:max-w-[75%] space-y-1">
            <div class="chat-bubble-ai px-4 py-2.5 text-xs leading-relaxed inline-block break-words">
              ${escapeHTML(msg.content)}
            </div>
            <div class="text-[10px] text-slate-500 pl-1">${msg.time || ''}</div>
          </div>
        </div>
      `;
    }
  }).join('');

  if (window.lucide) lucide.createIcons();
  container.scrollTop = container.scrollHeight;
}

function showAiThinkingIndicator() {
  const container = document.getElementById('voice-chat-messages');
  if (!container) return;
  const existing = document.getElementById('voice-ai-thinking-bubble');
  if (existing) return;

  const bubble = document.createElement('div');
  bubble.id = 'voice-ai-thinking-bubble';
  bubble.className = 'flex justify-start gap-2.5 items-end animate-pulse';
  bubble.innerHTML = `
    <div class="w-7 h-7 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
      <i data-lucide="bot" class="w-3.5 h-3.5"></i>
    </div>
    <div class="chat-bubble-ai px-4 py-2 text-xs flex items-center gap-2 text-violet-300">
      <span class="inline-block w-2 h-2 rounded-full bg-violet-400 animate-ping"></span>
      <span>Thinking & parsing your narration...</span>
    </div>
  `;
  container.appendChild(bubble);
  if (window.lucide) lucide.createIcons();
  container.scrollTop = container.scrollHeight;
}

function hideAiThinkingIndicator() {
  const el = document.getElementById('voice-ai-thinking-bubble');
  if (el) el.remove();
}

function useChatChip(text) {
  const inputEl = document.getElementById('voice-input-text');
  if (inputEl) {
    inputEl.value = text;
    updateVoiceClearBtn();
    inputEl.focus();
  }
}

function clearChatHistory() {
  conversationHistory = [
    {
      role: 'assistant',
      content: "Conversation reset! How can I help you record or organize your expenses?",
      time: formatTimeNow()
    }
  ];
  renderChatMessages();
}

// Modal compatibility functions
async function openVoiceAgentModal() {
  if (state.activeOwner) {
    alert("Voice Agent is disabled in shared read-only view.");
    return;
  }

  // Switch to the dedicated AI Mode tab with left slide-in animation!
  if (typeof switchTab === 'function') {
    switchTab('ai-agent');
    return;
  }

  const modal = document.getElementById('modal-voice-agent');
  if (modal) modal.classList.remove('hidden');

  const keyInput = document.getElementById('voice-gemini-key-input');
  if (keyInput) {
    keyInput.value = localStorage.getItem('gemini_api_key') || '';
  }

  await checkAIAccessPermission();
  renderVoiceDraftCards();
  updateMicUI(false);
}

function closeVoiceAgentModal() {
  if (isUserRecording) {
    stopVoiceRecording();
  }
  const modal = document.getElementById('modal-voice-agent');
  if (modal) modal.classList.add('hidden');
}

// ================= PERMISSION & APPROVAL HANDLING =================
async function checkAIAccessPermission() {
  const approvalSection = document.getElementById('voice-approval-banner');
  const agentBody = document.getElementById('voice-agent-active-body');
  const tabApproval = document.getElementById('tab-voice-approval-banner');
  const tabBody = document.getElementById('tab-voice-active-body');
  
  try {
    const res = await fetch(`${API_BASE}/ai/access/status`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (res.ok) {
      userAIStatus = await res.json();
      const hasAccess = userAIStatus.can_use_ai || userAIStatus.is_admin;
      if (hasAccess) {
        if (approvalSection) approvalSection.classList.add('hidden');
        if (agentBody) agentBody.classList.remove('hidden');
        if (tabApproval) tabApproval.classList.add('hidden');
        if (tabBody) tabBody.classList.remove('hidden');
      } else {
        if (approvalSection) approvalSection.classList.remove('hidden');
        if (agentBody) agentBody.classList.add('hidden');
        if (tabApproval) tabApproval.classList.remove('hidden');
        if (tabBody) tabBody.classList.add('hidden');
        updateApprovalBannerUI(userAIStatus.status);
      }
    }
  } catch (err) {
    console.warn("Could not check AI permission:", err);
  }
}

function updateApprovalBannerUI(status) {
  const badges = [
    document.getElementById('voice-approval-status-badge'),
    document.getElementById('tab-voice-approval-status-badge')
  ];
  const reqBtns = [
    document.getElementById('voice-request-access-btn'),
    document.getElementById('tab-voice-request-access-btn')
  ];
  const descs = [
    document.getElementById('voice-approval-desc'),
    document.getElementById('tab-voice-approval-desc')
  ];

  if (status === 'pending') {
    badges.forEach(b => {
      if (!b) return;
      b.innerText = 'Approval Pending';
      b.className = 'px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold rounded-full text-xs';
    });
    reqBtns.forEach(b => {
      if (!b) return;
      b.disabled = true;
      b.innerText = 'Request Sent (Pending Admin Review)';
      b.className = 'w-full py-2.5 bg-slate-800 text-slate-400 font-medium rounded-xl text-xs cursor-not-allowed';
    });
    descs.forEach(d => {
      if (!d) return;
      d.innerText = 'Your request has been submitted to the admin (keerthivasan.220722@gmail.com). You will get access once approved!';
    });
  } else if (status === 'revoked') {
    badges.forEach(b => {
      if (!b) return;
      b.innerText = 'Access Revoked';
      b.className = 'px-3 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold rounded-full text-xs';
    });
    reqBtns.forEach(b => {
      if (!b) return;
      b.disabled = false;
      b.innerText = 'Re-request Access';
      b.className = 'w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl text-xs transition-colors';
    });
    descs.forEach(d => {
      if (!d) return;
      d.innerText = 'Your AI access was revoked. Contact admin to re-enable.';
    });
  } else {
    badges.forEach(b => {
      if (!b) return;
      b.innerText = 'Approval Required';
      b.className = 'px-3 py-1 bg-violet-500/20 border border-violet-500/30 text-violet-400 font-bold rounded-full text-xs';
    });
    reqBtns.forEach(b => {
      if (!b) return;
      b.disabled = false;
      b.innerText = 'Request AI Access from Admin';
      b.className = 'w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl text-xs transition-colors shadow-md';
    });
    descs.forEach(d => {
      if (!d) return;
      d.innerText = 'To manage token consumption and free credits, AI features require one-time approval from admin.';
    });
  }
}

async function requestAIAccessSubmit() {
  const reqBtns = [
    document.getElementById('voice-request-access-btn'),
    document.getElementById('tab-voice-request-access-btn')
  ];
  reqBtns.forEach(b => b && (b.disabled = true));

  try {
    const res = await fetch(`${API_BASE}/ai/access/request`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (res.ok) {
      showToast('AI Access requested! Admin will review your request.', 'success');
      await checkAIAccessPermission();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Failed to submit request', 'error');
    }
  } catch (e) {
    showToast('Network error while requesting AI access', 'error');
  } finally {
    reqBtns.forEach(b => b && (b.disabled = false));
  }
}

function saveGeminiAPIKeyFromUI() {
  const input = document.getElementById('voice-gemini-key-input');
  if (!input) return;
  const key = input.value.trim();
  if (key) {
    localStorage.setItem('gemini_api_key', key);
    showToast('Gemini API Key saved locally for this browser!', 'success');
  } else {
    localStorage.removeItem('gemini_api_key');
    showToast('Gemini API Key cleared.', 'info');
  }
  const tabInput = document.getElementById('tab-gemini-key-input');
  if (tabInput) tabInput.value = key;
}

function saveGeminiKeyFromTab() {
  const input = document.getElementById('tab-gemini-key-input');
  if (!input) return;
  const key = input.value.trim();
  if (key) {
    localStorage.setItem('gemini_api_key', key);
    showToast('Gemini API Key saved locally for this browser!', 'success');
  } else {
    localStorage.removeItem('gemini_api_key');
    showToast('Gemini API Key cleared.', 'info');
  }
  const modalInput = document.getElementById('voice-gemini-key-input');
  if (modalInput) modalInput.value = key;
}

// ================= MULTI-TURN VOICE & TEXT NARRATION HANDLER =================
async function handleVoiceNarrationSubmit(e) {
  if (e) e.preventDefault();
  const inputEl = document.getElementById('voice-input-text');
  const narration = inputEl ? inputEl.value.trim() : '';

  if (!narration) {
    showToast('Please speak or type an expense narration first.', 'error');
    return;
  }

  // Push user turn to conversation history and render bubble immediately
  conversationHistory.push({
    role: 'user',
    content: narration,
    time: formatTimeNow()
  });
  renderChatMessages();
  showAiThinkingIndicator();

  const sendBtn = document.getElementById('voice-send-btn');
  const originalBtnHTML = sendBtn ? sendBtn.innerHTML : '';
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = `<span>Analyzing...</span> <span class="animate-spin text-xs">✨</span>`;
  }

  try {
    const tabKeyInput = document.getElementById('tab-gemini-key-input')?.value.trim();
    const modalKeyInput = document.getElementById('voice-gemini-key-input')?.value.trim();
    const customKey = tabKeyInput || modalKeyInput || localStorage.getItem('gemini_api_key') || '';
    if (tabKeyInput && tabKeyInput !== localStorage.getItem('gemini_api_key')) {
      localStorage.setItem('gemini_api_key', tabKeyInput);
    }

    const catList = (state.categories || []).map(c => typeof c === 'string' ? c : (c && c.name ? c.name : '')).filter(Boolean);
    const pmList = (state.paymentMethods || []).map(p => typeof p === 'string' ? p : (p && p.name ? p.name : '')).filter(Boolean);

    // Format history for backend
    const historyPayload = conversationHistory.map(m => ({
      role: m.role,
      content: m.content
    }));

    const payload = {
      narration: narration,
      conversation_history: historyPayload,
      existing_drafts: currentDraftExpenses || [],
      categories: catList.length > 0 ? catList : ["Food", "Grocery", "Fuel", "Shopping", "Entertainment", "Transport", "Rent", "Medical", "Utilities", "Travel", "Other"],
      payment_methods: pmList.length > 0 ? pmList : ["Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer", "Wallet"],
      currency: state.settings?.currency || '₹',
      gemini_api_key: customKey || null
    };

    const res = await fetch(`${API_BASE}/expenses/voice-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    hideAiThinkingIndicator();

    if (res.ok) {
      const data = await res.json();
      currentDraftExpenses = data.extracted_expenses || [];
      const replyMsg = data.reply_message || "Extracted and updated expenses successfully.";
      
      // Push AI reply to conversation history
      conversationHistory.push({
        role: 'assistant',
        content: replyMsg,
        time: formatTimeNow()
      });
      renderChatMessages();
      renderVoiceDraftCards();
      
      // Keep prompt text accessible for quick follow-up or refinement
      updateVoiceClearBtn();
      showToast("Updated draft expenses!", "success");
    } else {
      const err = await res.json();
      let errorDetail = 'Failed to process narration';
      if (typeof err.detail === 'string') {
        errorDetail = err.detail;
      } else if (Array.isArray(err.detail)) {
        errorDetail = err.detail.map(d => `${d.loc ? d.loc.slice(-1)[0] : ''}: ${d.msg}`).join(', ');
      } else if (err.detail && typeof err.detail === 'object') {
        errorDetail = JSON.stringify(err.detail);
      }
      
      conversationHistory.push({
        role: 'assistant',
        content: `Error: ${errorDetail}`,
        time: formatTimeNow()
      });
      renderChatMessages();
    }
  } catch (err) {
    console.error(err);
    hideAiThinkingIndicator();
    conversationHistory.push({
      role: 'assistant',
      content: "Network error while connecting to Voice AI Agent service.",
      time: formatTimeNow()
    });
    renderChatMessages();
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = originalBtnHTML;
    }
  }
}

function updateVoiceClearBtn() {
  const inputEl = document.getElementById('voice-input-text');
  const clearBtn = document.getElementById('voice-clear-input-btn');
  if (clearBtn) {
    if (inputEl && inputEl.value.trim().length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }
}

function clearVoiceInputText() {
  const inputEl = document.getElementById('voice-input-text');
  if (inputEl) {
    inputEl.value = '';
    inputEl.focus();
  }
  updateVoiceClearBtn();
}

// ================= DRAFT EXPENSE CARDS =================
function renderVoiceDraftCards() {
  const container = document.getElementById('voice-drafts-container');
  const saveAllBtn = document.getElementById('voice-save-all-btn');
  const emptyState = document.getElementById('voice-drafts-empty');
  const countBadge = document.getElementById('voice-drafts-count');

  if (countBadge) {
    countBadge.innerText = currentDraftExpenses.length;
  }

  if (!container) return;

  if (currentDraftExpenses.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (saveAllBtn) saveAllBtn.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (saveAllBtn) saveAllBtn.classList.remove('hidden');

  const categories = (state.categories || []).map(c => typeof c === 'string' ? c : (c && c.name ? c.name : '')).filter(Boolean);
  if (!categories.includes('Food')) categories.unshift('Food');
  if (!categories.includes('Other')) categories.push('Other');

  const pmethods = (state.paymentMethods || []).map(p => typeof p === 'string' ? p : (p && p.name ? p.name : '')).filter(Boolean);
  if (!pmethods.includes('UPI')) pmethods.unshift('UPI');
  if (!pmethods.includes('Cash')) pmethods.push('Cash');

  const curr = state.settings?.currency || '₹';

  container.innerHTML = currentDraftExpenses.map((item, idx) => {
    // Ensure item category & payment method are present in lists
    const itemCats = [...categories];
    if (item.category && !itemCats.includes(item.category)) itemCats.unshift(item.category);

    const itemPMs = [...pmethods];
    if (item.payment_method && !itemPMs.includes(item.payment_method)) itemPMs.unshift(item.payment_method);

    return `
    <div class="glass border border-brand-500/30 rounded-xl p-4 space-y-3 relative group bg-slate-900/60 transition-all hover:border-brand-500/60">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <span class="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold text-xs flex items-center justify-center shrink-0">${idx + 1}</span>
          <input type="text" value="${escapeHTML(item.title || '')}" oninput="updateVoiceDraft(${idx}, 'title', this.value)" placeholder="Expense title" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-sm font-semibold text-white focus:border-brand-500 focus:outline-none" />
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <span class="text-xs text-slate-400 font-bold">${curr}</span>
          <input type="number" step="0.01" value="${item.amount || 0}" oninput="updateVoiceDraft(${idx}, 'amount', parseFloat(this.value) || 0)" placeholder="Amount" class="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-sm font-bold text-brand-400 focus:border-brand-500 focus:outline-none text-right" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label class="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Category</label>
          <select onchange="updateVoiceDraft(${idx}, 'category', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:border-brand-500 focus:outline-none">
            ${itemCats.map(c => `<option value="${c}" ${c === item.category ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Payment Method</label>
          <select onchange="updateVoiceDraft(${idx}, 'payment_method', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:border-brand-500 focus:outline-none">
            ${itemPMs.map(p => `<option value="${p}" ${p === item.payment_method ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Date, Timing, & Meal Badge -->
      <div class="flex flex-wrap items-center justify-between text-xs pt-1.5 border-t border-slate-800/60 gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/60">
            <i data-lucide="calendar" class="w-3 h-3 text-slate-500"></i>
            <input type="date" value="${item.date || new Date().toISOString().split('T')[0]}" onchange="updateVoiceDraft(${idx}, 'date', this.value)" class="bg-transparent border-0 text-[11px] text-slate-300 focus:outline-none p-0 cursor-pointer" />
          </div>
          <div class="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800/60">
            <i data-lucide="clock" class="w-3 h-3 text-slate-500"></i>
            <input type="time" value="${item.time || ''}" onchange="updateVoiceDraft(${idx}, 'time', this.value)" placeholder="--:--" class="bg-transparent border-0 text-[11px] text-slate-300 focus:outline-none p-0 w-16 cursor-pointer" />
          </div>
          ${item.description ? `<span class="text-[10px] px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/25 truncate max-w-[150px]" title="${escapeHTML(item.description)}">${escapeHTML(item.description)}</span>` : ''}
        </div>
        <button type="button" onclick="removeVoiceDraft(${idx})" class="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 py-0.5 px-2 rounded hover:bg-rose-500/10 transition-colors">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          <span>Remove</span>
        </button>
      </div>
    </div>
  `}).join('');

  if (window.lucide) window.lucide.createIcons();
}

function updateVoiceDraft(index, field, value) {
  if (currentDraftExpenses[index]) {
    currentDraftExpenses[index][field] = value;
  }
}

function removeVoiceDraft(index) {
  currentDraftExpenses.splice(index, 1);
  renderVoiceDraftCards();
}

async function confirmSaveAllVoiceDrafts() {
  if (currentDraftExpenses.length === 0) return;

  const saveBtn = document.getElementById('voice-save-all-btn');
  if (saveBtn) saveBtn.disabled = true;

  try {
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

    const savePromises = currentDraftExpenses.map(draft => {
      const payload = {
        amount: draft.amount,
        title: draft.title || "Voice Expense",
        category: draft.category || "Other",
        payment_method: draft.payment_method || "Cash",
        date: draft.date || today,
        time: draft.time || nowTime,
        location: draft.location || "",
        description: draft.description || "Added via Voice AI Agent",
        receipt_image: ""
      };

      return fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify(payload)
      });
    });

    const results = await Promise.allSettled(savePromises);
    const savedCount = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;

    if (savedCount > 0) {
      if (typeof confetti === 'function') confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
      showToast(`Successfully saved ${savedCount} expense(s) to MyMoney!`, 'success');
      currentDraftExpenses = [];
      renderVoiceDraftCards();
      
      // Add completion note to conversation history
      conversationHistory.push({
        role: 'assistant',
        content: `All ${savedCount} expense(s) have been saved to your dashboard and records!`,
        time: formatTimeNow()
      });
      renderChatMessages();

      closeVoiceAgentModal();
      if (typeof fetchAllData === 'function') fetchAllData();
    } else {
      showToast('Failed to save expenses.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Error saving voice expenses.', 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// ================= ADMIN AI MONITORING & APPROVAL =================
async function loadAdminAIPanel() {
  const container = document.getElementById('admin-ai-panel');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/ai/admin/dashboard`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (!res.ok) return;

    const data = await res.json();
    const summary = data.summary;

    const callsEl = document.getElementById('admin-ai-total-calls');
    const tokensEl = document.getElementById('admin-ai-total-tokens');
    const pendingEl = document.getElementById('admin-ai-pending-badge');
    
    if (callsEl) callsEl.innerText = summary.total_ai_requests;
    if (tokensEl) tokensEl.innerText = summary.total_tokens_consumed.toLocaleString();
    if (pendingEl) pendingEl.innerText = `${summary.pending_approvals} Pending`;

    const tbody = document.getElementById('admin-ai-users-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      data.users.forEach(u => {
        let statusBadge = '';
        if (u.is_admin) {
          statusBadge = `<span class="px-2 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full text-[10px] font-bold">Admin</span>`;
        } else if (u.status === 'approved') {
          statusBadge = `<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold">Approved</span>`;
        } else if (u.status === 'pending') {
          statusBadge = `<span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-bold animate-pulse">Pending</span>`;
        } else {
          statusBadge = `<span class="px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full text-[10px]">None</span>`;
        }

        let actionBtns = '';
        if (!u.is_admin) {
          if (u.status !== 'approved') {
            actionBtns += `<button onclick="setAdminUserAIStatus('${u.user_id}', 'approved')" class="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold rounded-lg text-[10px] transition-all mr-1">Approve</button>`;
          }
          if (u.status === 'approved' || u.status === 'pending') {
            actionBtns += `<button onclick="setAdminUserAIStatus('${u.user_id}', 'revoked')" class="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-lg text-[10px] transition-all">Revoke</button>`;
          }
        } else {
          actionBtns = `<span class="text-[10px] text-slate-500 italic">Full Access</span>`;
        }

        tbody.innerHTML += `
          <tr class="hover:bg-slate-900/10">
            <td class="py-3 pr-3 font-semibold text-slate-200 text-xs">${escapeHTML(u.name)}</td>
            <td class="py-3 text-slate-400 font-mono text-xs">${escapeHTML(u.email)}</td>
            <td class="py-3">${statusBadge}</td>
            <td class="py-3 text-xs text-brand-400 font-mono">${u.total_requests} calls / ~${u.total_tokens.toLocaleString()} tok</td>
            <td class="py-3 text-right">${actionBtns}</td>
          </tr>
        `;
      });

      if (data.users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500 text-xs">No users registered yet</td></tr>`;
      }
    }
  } catch (err) {
    console.error('Error loading AI admin dashboard:', err);
  }
}

async function setAdminUserAIStatus(userId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/ai/admin/users/${userId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      showToast(`User AI status updated to '${newStatus}'!`, 'success');
      loadAdminAIPanel();
    } else {
      const err = await res.json();
      showToast(err.detail || 'Failed to update user AI status', 'error');
    }
  } catch (e) {
    showToast('Network error updating user AI status', 'error');
  }
}
