function populateSelectDropdowns() {
  const expenseCatSelect = document.getElementById('expense-category');
  const filterCatSelect = document.getElementById('filter-category');
  const budgetCatSelect = document.getElementById('budget-category');

  expenseCatSelect.innerHTML = '';
  filterCatSelect.innerHTML = '<option value="">All Categories</option>';
  budgetCatSelect.innerHTML = '<option value="Overall">Overall Budget</option>';

  state.categories.forEach(c => {
    expenseCatSelect.innerHTML += `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`;
    filterCatSelect.innerHTML += `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`;
    budgetCatSelect.innerHTML += `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)} Budget</option>`;
  });

  const expensePaySelect = document.getElementById('expense-payment');
  const filterPaySelect = document.getElementById('filter-payment');

  expensePaySelect.innerHTML = '';
  filterPaySelect.innerHTML = '<option value="">All Payments</option>';

  state.paymentMethods.forEach(p => {
    expensePaySelect.innerHTML += `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`;
    filterPaySelect.innerHTML += `<option value="${escapeHTML(p)}">${escapeHTML(p)}</option>`;
  });
}

function updateSyncStatus() {
  const syncDiv = document.getElementById('sync-status');
  syncDiv.className = 'text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium';
  
  if (state.isOffline) {
    syncDiv.classList.add('bg-amber-500/10', 'text-amber-400', 'border', 'border-amber-500/20');
    syncDiv.innerHTML = `<i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i><span class="hidden sm:inline">Offline Mode</span>`;
  } else if (state.syncQueue.length > 0) {
    syncDiv.classList.add('bg-indigo-500/10', 'text-indigo-400', 'border', 'border-indigo-500/20', 'animate-pulse');
    syncDiv.innerHTML = `<i data-lucide="refresh-cw" class="w-3.5 h-3.5 animate-spin"></i><span onclick="syncOfflineQueue()">Syncing (${state.syncQueue.length})</span>`;
  } else {
    syncDiv.classList.add('bg-emerald-500/10', 'text-emerald-400', 'border', 'border-emerald-500/20');
    syncDiv.innerHTML = `<i data-lucide="check-circle" class="w-3.5 h-3.5"></i><span class="hidden sm:inline">Synced</span>`;
  }
  lucide.createIcons();
}


function renderExpensesList() {
  const search = document.getElementById('filter-search').value.toLowerCase();
  const category = document.getElementById('filter-category').value;
  const payment = document.getElementById('filter-payment').value;
  const sortBy = document.getElementById('filter-sort').value;
  const start = document.getElementById('filter-start-date').value;
  const end = document.getElementById('filter-end-date').value;
  const min = parseFloat(document.getElementById('filter-min-amount').value) || 0;
  const max = parseFloat(document.getElementById('filter-max-amount').value) || Infinity;

  const filtered = state.expenses.filter(e => {
    const mSearch = !search || e.title.toLowerCase().includes(search) || (e.description && e.description.toLowerCase().includes(search));
    const mCat = !category || e.category === category;
    const mPay = !payment || e.payment_method === payment;
    const mStart = !start || e.date >= start;
    const mEnd = !end || e.date <= end;
    const mMin = e.amount >= min;
    const mMax = e.amount <= max;
    return mSearch && mCat && mPay && mStart && mEnd && mMin && mMax;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.date + 'T' + (b.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00'));
    if (sortBy === 'date_asc') return new Date(a.date + 'T' + (a.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00'));
    if (sortBy === 'amount_desc') return b.amount - a.amount;
    if (sortBy === 'amount_asc') return a.amount - b.amount;
    return 0;
  });

  document.querySelectorAll('.action-header').forEach(el => {
    if (state.activeOwner) el.classList.add('hidden');
    else el.classList.remove('hidden');
  });

  document.getElementById('expenses-count-text').innerText = `Showing ${filtered.length} Transactions`;
  
  const totalSum = filtered.reduce((sum, e) => sum + e.amount, 0);
  const sumEl = document.getElementById('expenses-sum-text');
  if (sumEl) sumEl.innerText = `Total: ${state.settings.currency} ${totalSum.toLocaleString()}`;

  const tbody = document.getElementById('expenses-list-tbody');
  tbody.innerHTML = '';

  filtered.forEach(e => {
    const catColor = state.categories.find(c => c.name === e.category)?.color || '#6366f1';
    const actionsTd = state.activeOwner ? '' : `
      <td class="py-4 text-right">
        <div class="flex items-center justify-end gap-2">
          <button onclick="editExpense('${e.id}')" class="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <i data-lucide="edit" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteExpense('${e.id}')" class="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-400">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </td>
    `;

    const receiptLink = e.receipt_image ? `
      <button onclick="viewReceipt('${e.id}')" class="text-xs text-indigo-400 hover:underline font-semibold">View File</button>
    ` : `<span class="text-slate-600">-</span>`;

    tbody.innerHTML += `
      <tr class="hover:bg-slate-900/20 group">
        <td class="py-4">
          <div>
            <p class="font-semibold text-slate-200">${escapeHTML(e.title)}</p>
            ${e.description ? `<p class="text-xs text-slate-500 max-w-[200px] truncate">${escapeHTML(e.description)}</p>` : ''}
          </div>
        </td>
        <td class="py-4">
          <span class="text-xs px-2.5 py-0.5 rounded-full font-medium" style="background-color: ${catColor}10; color: ${catColor}; border: 1px solid ${catColor}20">
            ${escapeHTML(e.category)}
          </span>
        </td>
        <td class="py-4 text-slate-400 text-xs">${escapeHTML(e.payment_method)}</td>
        <td class="py-4 text-slate-400 text-xs">
          <p>${escapeHTML(formatDateToDMY(e.date))}</p>
          ${e.time ? `<p class="text-[10px] text-slate-500">${escapeHTML(e.time)}</p>` : ''}
        </td>
        <td class="py-4 text-slate-400 text-xs truncate max-w-[120px]">${escapeHTML(e.location) || '-'}</td>
        <td class="py-4">${receiptLink}</td>
        <td class="py-4 text-right font-extrabold text-white text-base">${state.settings.currency} ${e.amount.toLocaleString()}</td>
        ${actionsTd}
      </tr>
    `;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="py-12 text-center text-slate-400 text-xs">No matching expenses found</td></tr>`;
  }
  lucide.createIcons();
}

function renderBudgets() {
  const container = document.getElementById('budgets-list-container');
  container.innerHTML = '';

  const addBudgetBtn = document.getElementById('add-budget-btn');
  if (state.activeOwner) addBudgetBtn.classList.add('hidden');
  else addBudgetBtn.classList.remove('hidden');

  const thisMonthPrefix = new Date().toISOString().split('-').slice(0, 2).join('-');

  ['Overall', ...state.categories.map(c => c.name).filter(name => name.toLowerCase() !== 'rent')].forEach(catName => {
    const budgetItem = state.budgets.find(b => b.category === catName);
    if (!budgetItem && catName !== 'Overall') return;

    const limit = budgetItem ? budgetItem.amount : 0;
    const spent = state.expenses
      .filter(e => {
        const isThisMonth = e.date.startsWith(thisMonthPrefix);
        if (e.category.toLowerCase() === 'rent') return false;
        const isCat = catName === 'Overall' ? true : e.category === catName;
        return isThisMonth && isCat;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    const color = state.categories.find(c => c.name === catName)?.color || '#6366f1';
    
    let progressHtml = '';
    if (limit > 0) {
      const barColorClass = pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : '';
      const barStyle = pct >= 100 ? '' : `style="background-color: ${color}"`;
      const statusText = pct >= 100 ? '<span class="text-rose-400 font-bold">Exceeded</span>' : pct >= 75 ? '<span class="text-amber-400">Approaching Limit</span>' : '<span class="text-emerald-400">Within Budget</span>';

      progressHtml = `
        <div class="space-y-1">
          <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500 ${barColorClass}" ${barStyle} style="width: ${Math.min(100, pct)}%"></div>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1">
            <span>${Math.round(pct)}% Limit Used</span>
            <span>${statusText}</span>
          </div>
        </div>
      `;
    } else {
      const editBtn = state.activeOwner ? '' : `
        <button onclick="openBudgetModal('${catName}')" class="text-xs text-brand-500 hover:underline font-semibold mt-2">Set Limit Now</button>
      `;
      progressHtml = `
        <div class="py-2">
          <p class="text-xs text-slate-500 italic">No budget limit set</p>
          ${editBtn}
        </div>
      `;
    }

    let editActionHtml = '';
    if (limit > 0 && !state.activeOwner) {
      editActionHtml = `
        <button onclick="openBudgetModal('${catName}')" class="p-1 text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 rounded-lg transition-colors ml-2" title="Edit Budget">
          <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
        </button>
      `;
    }

    container.innerHTML += `
      <div class="glass rounded-2xl p-6 space-y-4 relative group">
        <div class="flex items-start justify-between">
          <div class="flex items-center">
            <div>
              <h4 class="font-bold text-white text-base">${escapeHTML(catName)} Budget</h4>
              <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Monthly Limit</span>
            </div>
            ${editActionHtml}
          </div>
          <div class="text-right">
            <p class="text-sm font-extrabold text-white">${limit > 0 ? `${state.settings.currency} ${limit.toLocaleString()}` : 'Not Set'}</p>
            <p class="text-[10px] text-slate-400">Spent: ${state.settings.currency} ${spent.toLocaleString()}</p>
          </div>
        </div>
        ${progressHtml}
      </div>
    `;
  });
}

function renderSavingsGoals() {
  const container = document.getElementById('savings-list-container');
  container.innerHTML = '';

  const addBtn = document.getElementById('add-savings-btn');
  if (state.activeOwner) addBtn.classList.add('hidden');
  else addBtn.classList.remove('hidden');

  state.savingsGoals.forEach(g => {
    const pct = Math.min(100, (g.saved_amount / g.target_amount) * 100);
    const completeBadge = pct >= 100 ? `<div class="absolute top-0 right-0 bg-emerald-500/10 border-l border-b border-emerald-500/20 text-emerald-400 px-3 py-1 text-[10px] uppercase font-extrabold tracking-wider rounded-bl-xl">Completed 🎉</div>` : '';
    
    const actionHtml = state.activeOwner ? '' : `
      <div class="flex items-center justify-end gap-2 border-t border-slate-900/60 pt-3">
        <button onclick="quickAddGoalMoney('${g.id}')" class="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold mr-auto">
          <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Add Money
        </button>
        <button onclick="editGoal('${g.id}')" class="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold">
          <i data-lucide="edit" class="w-3 h-3"></i> Update
        </button>
        <span class="text-slate-700">|</span>
        <button onclick="deleteGoal('${g.id}')" class="text-xs text-rose-400 hover:underline flex items-center gap-1 font-semibold">
          <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
        </button>
      </div>
    `;

    container.innerHTML += `
      <div class="glass rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between space-y-4">
        ${completeBadge}
        <div>
          <h4 class="font-bold text-white text-base truncate">${escapeHTML(g.title)}</h4>
          <div class="flex items-baseline gap-1 mt-2">
            <span class="text-2xl font-black text-white">${state.settings.currency} ${g.saved_amount.toLocaleString()}</span>
            <span class="text-xs text-slate-400">of ${state.settings.currency} ${g.target_amount.toLocaleString()}</span>
          </div>
        </div>
        <div class="space-y-1">
          <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div class="h-full rounded-full bg-brand-500" style="width: ${pct}%"></div>
          </div>
          <span class="text-[10px] font-semibold text-slate-400 block pt-1">${Math.round(pct)}% Goal Achieved</span>
        </div>
        ${actionHtml}
      </div>
    `;
  });

  if (state.savingsGoals.length === 0) {
    container.innerHTML = `<div class="col-span-3 glass rounded-2xl py-12 text-center text-slate-400 text-xs">No savings goals created</div>`;
  }
  lucide.createIcons();
}

function renderNotifications() {
  const container = document.getElementById('notifications-container');
  const dot = document.getElementById('bell-dot');
  
  const unread = state.notifications.some(n => !n.read);
  if (unread) dot.classList.remove('hidden');
  else dot.classList.add('hidden');

  container.innerHTML = '';
  if (state.notifications.length === 0) {
    container.innerHTML = `<div class="px-4 py-6 text-center text-xs text-slate-400">No notifications</div>`;
    return;
  }

  state.notifications.forEach(n => {
    const typeColor = n.type === 'budget' ? 'bg-rose-500' : 'bg-brand-500';
    container.innerHTML += `
      <div class="px-4 py-3 border-b border-slate-900/60 hover:bg-slate-900/40 text-xs flex gap-2 ${!n.read ? 'bg-slate-900/10' : ''}">
        <div class="w-2 h-2 rounded-full mt-1 shrink-0 ${typeColor}"></div>
        <div>
          <p class="font-semibold text-slate-200">${escapeHTML(n.title)}</p>
          <p class="text-slate-400 mt-0.5">${escapeHTML(n.message)}</p>
          <span class="text-[10px] text-slate-500 block mt-1">${new Date(n.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    `;
  });
}

function renderAuditLogs() {
  const container = document.getElementById('audit-log-container');
  container.innerHTML = '';

  state.auditLogs.forEach(log => {
    container.innerHTML += `
      <div class="relative">
        <div class="absolute -left-[21px] top-1.5 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-brand-500"></div>
        <div class="text-xs">
          <p class="font-semibold text-slate-200">${escapeHTML(log.user_name)} (${escapeHTML(log.action.replace('_', ' '))})</p>
          <p class="text-slate-400 mt-0.5">${escapeHTML(log.details)}</p>
          <span class="text-[10px] text-slate-500 block mt-1">${new Date(log.created_at).toLocaleString()}</span>
        </div>
      </div>
    `;
  });

  if (state.auditLogs.length === 0) {
    container.innerHTML = `<div class="text-center py-12 text-slate-500 italic text-xs">No activity logs recorded</div>`;
  }
}

function renderSharedTrackersSection() {
  const container = document.getElementById('shared-trackers-container');
  const section = document.getElementById('shared-list-section');
  
  // Show or hide the top header quick shared switcher for parents
  const parentContainer = document.getElementById('parent-shared-dropdown-container');
  if (parentContainer) {
    if (state.sharedTrackers && state.sharedTrackers.length > 0) {
      parentContainer.classList.remove('hidden');
    } else {
      parentContainer.classList.add('hidden');
    }
  }

  container.innerHTML = '';
  if (state.sharedTrackers.length > 0) {
    section.classList.remove('hidden');
    state.sharedTrackers.forEach(t => {
      const activeClass = state.activeOwner?.owner_email === t.owner_email 
        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
        : 'text-slate-400 hover:bg-slate-900 hover:text-white';
      
      container.innerHTML += `
        <button onclick="viewSharedTracker('${escapeHTML(t.id)}')" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium truncate text-left transition-colors ${activeClass}">
          <i data-lucide="eye" class="w-3.5 h-3.5 shrink-0"></i>
          <span class="truncate">${escapeHTML(t.owner_name)}</span>
        </button>
      `;
    });
  } else {
    section.classList.add('hidden');
  }

  // Also populate list in the Family Sharing tab (very useful on mobile)
  const tabContainer = document.getElementById('shared-by-me-list-container');
  if (tabContainer) {
    tabContainer.innerHTML = '';
    if (state.sharedTrackers.length > 0) {
      state.sharedTrackers.forEach(t => {
        const isCurrent = state.activeOwner?.owner_email === t.owner_email;
        const btnText = isCurrent ? 'Viewing' : 'Switch View';
        const btnClass = isCurrent 
          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold' 
          : 'bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold';
        
        tabContainer.innerHTML += `
          <div class="py-3 flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-slate-200">${escapeHTML(t.owner_name)}</p>
              <p class="text-[10px] text-slate-400">${escapeHTML(t.owner_email)}</p>
            </div>
            <button onclick="viewSharedTracker('${escapeHTML(t.id)}')" class="${btnClass}">
              ${btnText}
            </button>
          </div>
        `;
      });
    } else {
      tabContainer.innerHTML = `<div class="py-4 text-center text-xs text-slate-500 italic">No trackers shared with you</div>`;
    }
  }

  lucide.createIcons();
}

function renderSharingTab() {
  if (state.activeOwner) return;
  const container = document.getElementById('sharing-list-container');
  container.innerHTML = '';

  state.sharingList.forEach(item => {
    container.innerHTML += `
      <div class="py-3 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-200">${escapeHTML(item.shared_with_email)}</p>
          <span class="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-full font-medium mt-1 inline-block">
            View-Only Access
          </span>
        </div>
        <button onclick="revokeSharing('${escapeHTML(item.id)}')" class="text-xs text-rose-400 hover:text-rose-500 font-semibold">
          Revoke Access
        </button>
      </div>
    `;
  });

  if (state.sharingList.length === 0) {
    container.innerHTML = `<div class="py-8 text-center text-xs text-slate-500 italic">Not sharing access with anyone</div>`;
  }
}
