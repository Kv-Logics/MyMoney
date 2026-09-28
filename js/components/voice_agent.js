// VOICE AI AGENT MODULE ("Agentic MyMoney")
// Features: Real-time Voice Recognition, Gemini Extraction, AI Access Approval & Token Monitoring

let voiceRecognition = null;
let isRecording = false;
let currentDraftExpenses = [];
let userAIStatus = null;

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

async function openVoiceAgentModal() {
  if (state.activeOwner) {
    alert("Voice Agent is disabled in shared read-only view.");
    return;
  }

  const modal = document.getElementById('modal-voice-agent');
  if (modal) modal.classList.remove('hidden');

  // Pre-fill saved Gemini key in input if present
  const keyInput = document.getElementById('voice-gemini-key-input');
  if (keyInput) {
    keyInput.value = localStorage.getItem('gemini_api_key') || '';
  }

  // Check access permission
  await checkAIAccessPermission();

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

async function checkAIAccessPermission() {
  const approvalSection = document.getElementById('voice-approval-banner');
  const agentBody = document.getElementById('voice-agent-active-body');
  
  try {
    const res = await fetch(`${API_BASE}/ai/access/status`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });

    if (res.ok) {
      userAIStatus = await res.json();
      if (userAIStatus.can_use_ai || userAIStatus.is_admin) {
        if (approvalSection) approvalSection.classList.add('hidden');
        if (agentBody) agentBody.classList.remove('hidden');
      } else {
        if (approvalSection) approvalSection.classList.remove('hidden');
        if (agentBody) agentBody.classList.add('hidden');
        updateApprovalBannerUI(userAIStatus.status);
      }
    }
  } catch (err) {
    console.warn("Could not check AI permission:", err);
  }
}

function updateApprovalBannerUI(status) {
  const badge = document.getElementById('voice-approval-status-badge');
  const reqBtn = document.getElementById('voice-request-access-btn');
  const desc = document.getElementById('voice-approval-desc');

  if (status === 'pending') {
    if (badge) {
      badge.innerText = 'Approval Pending';
      badge.className = 'px-3 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold rounded-full text-xs';
    }
    if (reqBtn) {
      reqBtn.disabled = true;
      reqBtn.innerText = 'Request Sent (Pending Admin Review)';
      reqBtn.className = 'w-full py-2.5 bg-slate-800 text-slate-400 font-medium rounded-xl text-xs cursor-not-allowed';
    }
    if (desc) desc.innerText = 'Your request has been submitted to the admin (keerthivasan.220722@gmail.com). You will get access once approved!';
  } else if (status === 'revoked') {
    if (badge) {
      badge.innerText = 'Access Revoked';
      badge.className = 'px-3 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold rounded-full text-xs';
    }
    if (reqBtn) {
      reqBtn.disabled = false;
      reqBtn.innerText = 'Re-request Access';
      reqBtn.className = 'w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl text-xs transition-colors';
    }
    if (desc) desc.innerText = 'Your AI access was revoked. Contact admin to re-enable.';
  } else {
    if (badge) {
      badge.innerText = 'Approval Required';
      badge.className = 'px-3 py-1 bg-violet-500/20 border border-violet-500/30 text-violet-400 font-bold rounded-full text-xs';
    }
    if (reqBtn) {
      reqBtn.disabled = false;
      reqBtn.innerText = 'Request AI Access from Admin';
      reqBtn.className = 'w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl text-xs transition-colors shadow-md';
    }
    if (desc) desc.innerText = 'To manage token consumption and free credits, AI features require one-time approval from admin.';
  }
}

async function requestAIAccessSubmit() {
  const reqBtn = document.getElementById('voice-request-access-btn');
  if (reqBtn) reqBtn.disabled = true;

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
    if (reqBtn) reqBtn.disabled = false;
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
  const originalBtnHTML = sendBtn ? sendBtn.innerHTML : '';
  
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = `<span>Analyzing...</span> <span class="animate-spin text-xs">✨</span>`;
  }
  if (chatReply) chatReply.innerHTML = `<span class="animate-pulse">Thinking & parsing your narration with Gemini AI...</span>`;

  try {
    const inputKey = document.getElementById('voice-gemini-key-input')?.value.trim();
    const customKey = inputKey || localStorage.getItem('gemini_api_key') || '';
    if (inputKey && inputKey !== localStorage.getItem('gemini_api_key')) {
      localStorage.setItem('gemini_api_key', inputKey);
    }

    const catList = (state.categories || []).map(c => typeof c === 'string' ? c : (c && c.name ? c.name : '')).filter(Boolean);
    const pmList = (state.paymentMethods || []).map(p => typeof p === 'string' ? p : (p && p.name ? p.name : '')).filter(Boolean);

    const payload = {
      narration: narration,
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

    if (res.ok) {
      const data = await res.json();
      currentDraftExpenses = data.extracted_expenses || [];
      if (chatReply) chatReply.innerText = data.reply_message || "Extracted expenses successfully.";
      renderVoiceDraftCards();
      if (inputEl) inputEl.value = '';
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
      if (chatReply) chatReply.innerText = `Error: ${errorDetail}`;
    }
  } catch (err) {
    console.error(err);
    if (chatReply) chatReply.innerText = "Connection error while reaching Voice AI Agent service.";
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = originalBtnHTML;
    }
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
