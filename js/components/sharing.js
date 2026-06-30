// FAMILY SHARING ACTION HANDLERS

async function handleSharingSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('share-email').value.trim();
  const msgDiv = document.getElementById('sharing-msg');
  msgDiv.classList.add('hidden');

  try {
    const res = await fetch(`${API_BASE}/sharing/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ email, permission: 'view' })
    });
    const data = await res.json();
    if (res.ok) {
      msgDiv.className = 'p-3 rounded-xl text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      msgDiv.innerText = data.message;
      msgDiv.classList.remove('hidden');
      document.getElementById('share-email').value = '';
      fetchAllData();
    } else {
      msgDiv.className = 'p-3 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20';
      msgDiv.innerText = data.detail || 'Failed to share';
      msgDiv.classList.remove('hidden');
    }
  } catch (err) {
    msgDiv.className = 'p-3 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20';
    msgDiv.innerText = 'Connection error';
    msgDiv.classList.remove('hidden');
  }
}

async function revokeSharing(id) {
  if (!confirm('Are you sure you want to revoke access?')) return;
  try {
    const res = await fetch(`${API_BASE}/sharing/revoke/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) fetchAllData();
  } catch (err) {
    alert('Failed to revoke sharing invite');
  }
}

async function viewSharedTracker(id) {
  const tracker = state.sharedTrackers.find(t => t.id === id);
  if (tracker) {
    state.activeOwner = tracker;
    document.getElementById('shared-badge').classList.remove('hidden');
    const headerSharedBadge = document.getElementById('header-shared-badge');
    if (headerSharedBadge) headerSharedBadge.classList.remove('hidden');
    document.getElementById('header-add-expense-btn').classList.add('hidden');
    await fetchAllData();
    switchTab('dashboard');
  }
}

async function exitSharedView() {
  state.activeOwner = null;
  document.getElementById('shared-badge').classList.add('hidden');
  const headerSharedBadge = document.getElementById('header-shared-badge');
  if (headerSharedBadge) headerSharedBadge.classList.add('hidden');
  document.getElementById('header-add-expense-btn').classList.remove('hidden');
  await fetchAllData();
  switchTab('dashboard');
}

function toggleParentSharedDropdown() {
  const dropdown = document.getElementById('parent-shared-dropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('hidden');
  
  if (!dropdown.classList.contains('hidden')) {
    const container = document.getElementById('parent-shared-trackers-list');
    container.innerHTML = '';
    
    if (state.sharedTrackers.length === 0) {
      container.innerHTML = '<div class="px-4 py-3 text-xs text-slate-400">No shared accounts</div>';
      return;
    }
    
    state.sharedTrackers.forEach(t => {
      const isCurrent = state.activeOwner && state.activeOwner.id === t.id;
      container.innerHTML += `
        <button onclick="selectParentSharedAccount('${t.id}')" class="w-full text-left px-4 py-2 text-xs flex items-center justify-between transition-colors ${isCurrent ? 'bg-brand-500/10 text-brand-400 font-bold' : 'text-slate-300 hover:bg-slate-900/45'}">
          <div class="flex items-center gap-2 truncate">
            <i data-lucide="user" class="w-3.5 h-3.5 shrink-0"></i>
            <span class="truncate">${escapeHTML(t.owner_name)}</span>
          </div>
          ${isCurrent ? '<i data-lucide="check" class="w-3.5 h-3.5 text-brand-400"></i>' : ''}
        </button>
      `;
    });
    
    if (state.activeOwner) {
      container.innerHTML += `
        <div class="border-t border-slate-800/80 my-1"></div>
        <button onclick="exitSharedView(); document.getElementById('parent-shared-dropdown').classList.add('hidden');" class="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-slate-900/40 flex items-center gap-2 font-semibold">
          <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
          <span>Exit Shared View</span>
        </button>
      `;
    }
    
    lucide.createIcons();
  }
}

async function selectParentSharedAccount(id) {
  const dropdown = document.getElementById('parent-shared-dropdown');
  if (dropdown) dropdown.classList.add('hidden');
  await viewSharedTracker(id);
}
