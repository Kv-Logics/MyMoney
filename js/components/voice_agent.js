// VOICE AI AGENT MODULE ("Agentic MyMoney")

let voiceRecognition = null;
let isRecording = false;
let currentDraftExpenses = [];

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Speech Recognition API not supported in this browser.");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isRecording = true;
    updateMicUI(true);
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    const inputEl = document.getElementById('voice-input-text');
    if (inputEl) inputEl.value = transcript;
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    isRecording = false;
    updateMicUI(false);
    if (typeof showToast === 'function') {
      showToast(`Voice capture error: ${event.error}`, 'error');
    }
  };

  recognition.onend = () => {
    isRecording = false;
    updateMicUI(false);
  };

  return recognition;
}

function updateMicUI(recording) {
  const micBtn = document.getElementById('voice-mic-btn');
  const micIcon = document.getElementById('voice-mic-icon');
  const statusText = document.getElementById('voice-agent-status-text');
  const pulseRing = document.getElementById('voice-pulse-ring');

  if (recording) {
    if (micBtn) micBtn.classList.add('bg-rose-500', 'hover:bg-rose-600', 'ring-4', 'ring-rose-500/30', 'scale-105');
    if (micBtn) micBtn.classList.remove('bg-brand-500', 'hover:bg-brand-600');
    if (statusText) statusText.innerText = 'Listening... Speak your expenses naturally';
    if (pulseRing) pulseRing.classList.remove('hidden');
  } else {
    if (micBtn) micBtn.classList.remove('bg-rose-500', 'hover:bg-rose-600', 'ring-4', 'ring-rose-500/30', 'scale-105');
    if (micBtn) micBtn.classList.add('bg-brand-500', 'hover:bg-brand-600');
    if (statusText) statusText.innerText = 'Click mic or type to speak to Agent';
    if (pulseRing) pulseRing.classList.add('hidden');
  }
}

function toggleVoiceRecording() {
  if (!voiceRecognition) {
    voiceRecognition = initSpeechRecognition();
  }

  if (!voiceRecognition) {
    alert("Speech recognition is not supported in your browser. Please type your narration below.");
    return;
  }

  if (isRecording) {
    voiceRecognition.stop();
  } else {
    try {
      voiceRecognition.start();
    } catch (e) {
      console.error(e);
    }
  }
}

function openVoiceAgentModal() {
  if (state.activeOwner) {
    alert("Voice Agent is disabled in shared read-only view.");
    return;
  }

  const modal = document.getElementById('modal-voice-agent');
  if (modal) modal.classList.remove('hidden');

  currentDraftExpenses = [];
  renderVoiceDraftCards();
  
  const statusMsg = document.getElementById('voice-agent-chat-reply');
  if (statusMsg) {
    statusMsg.innerText = "Hi! I am your AI Voice Expense Agent. Tell me what you spent today (e.g. 'I spent 450 at Reliance Smart with UPI, and 180 for lunch cash').";
  }
}

function closeVoiceAgentModal() {
  if (isRecording && voiceRecognition) {
    voiceRecognition.stop();
  }
  const modal = document.getElementById('modal-voice-agent');
  if (modal) modal.classList.add('hidden');
}

async function handleVoiceNarrationSubmit(e) {
  if (e) e.preventDefault();
  const inputEl = document.getElementById('voice-input-text');
  const narration = inputEl ? inputEl.value.trim() : '';

  if (!narration) {
    showToast('Please speak or type an expense narration first.', 'error');
    return;
  }

  const sendBtn = document.getElementById('voice-send-btn');
  const chatReply = document.getElementById('voice-agent-chat-reply');
  
  if (sendBtn) sendBtn.disabled = true;
  if (chatReply) chatReply.innerHTML = `<span class="animate-pulse">Thinking & parsing your narration with Gemini AI...</span>`;

  try {
    const payload = {
      narration: narration,
      existing_drafts: currentDraftExpenses,
      categories: state.categories.map(c => c.name),
      payment_methods: state.paymentMethods.map(p => p.name),
      currency: state.settings?.currency || '₹'
    };

    const res = await fetch(`${API_BASE}/expenses/voice-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      currentDraftExpenses = data.extracted_expenses || [];
      if (chatReply) chatReply.innerText = data.reply_message || "Extracted expenses successfully.";
      renderVoiceDraftCards();
      if (inputEl) inputEl.value = '';
    } else {
      const err = await res.json();
      if (chatReply) chatReply.innerText = `Error: ${err.detail || 'Failed to process narration'}`;
    }
  } catch (err) {
    console.error(err);
    if (chatReply) chatReply.innerText = "Connection error while reaching Voice AI Agent service.";
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

function renderVoiceDraftCards() {
  const container = document.getElementById('voice-drafts-container');
  const saveAllBtn = document.getElementById('voice-save-all-btn');
  const emptyState = document.getElementById('voice-drafts-empty');

  if (!container) return;

  if (currentDraftExpenses.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (saveAllBtn) saveAllBtn.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (saveAllBtn) saveAllBtn.classList.remove('hidden');

  const categories = state.categories.map(c => c.name);
  if (!categories.includes('Other')) categories.push('Other');

  const pmethods = state.paymentMethods.map(p => p.name);
  if (!pmethods.includes('Cash')) pmethods.push('Cash');

  const curr = state.settings?.currency || '₹';

  container.innerHTML = currentDraftExpenses.map((item, idx) => `
    <div class="glass border border-brand-500/30 rounded-xl p-4 space-y-3 relative group bg-slate-900/60 transition-all hover:border-brand-500/60">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-1 min-w-0">
          <span class="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold text-xs flex items-center justify-center shrink-0">${idx + 1}</span>
          <input type="text" value="${escapeHTML(item.title)}" onchange="updateVoiceDraft(${idx}, 'title', this.value)" placeholder="Expense title" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-sm font-semibold text-white focus:border-brand-500 focus:outline-none" />
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <span class="text-xs text-slate-400 font-bold">${curr}</span>
          <input type="number" step="0.01" value="${item.amount}" onchange="updateVoiceDraft(${idx}, 'amount', parseFloat(this.value))" placeholder="Amount" class="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-sm font-bold text-brand-400 focus:border-brand-500 focus:outline-none text-right" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label class="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Category</label>
          <select onchange="updateVoiceDraft(${idx}, 'category', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:border-brand-500 focus:outline-none">
            ${categories.map(c => `<option value="${c}" ${c === item.category ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-[10px] text-slate-400 font-semibold uppercase mb-1">Payment Method</label>
          <select onchange="updateVoiceDraft(${idx}, 'payment_method', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:border-brand-500 focus:outline-none">
            ${pmethods.map(p => `<option value="${p}" ${p === item.payment_method ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
        <span class="text-[11px] text-slate-400">Date: ${item.date || new Date().toISOString().split('T')[0]}</span>
        <button onclick="removeVoiceDraft(${idx})" class="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 py-0.5 px-2 rounded hover:bg-rose-500/10">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          <span>Remove</span>
        </button>
      </div>
    </div>
  `).join('');

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

    let savedCount = 0;
    for (const draft of currentDraftExpenses) {
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

      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) savedCount++;
    }

    if (savedCount > 0) {
      if (typeof confetti === 'function') confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
      showToast(`Successfully saved ${savedCount} expense(s) to MyMoney!`, 'success');
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
