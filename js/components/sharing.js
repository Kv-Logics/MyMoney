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
