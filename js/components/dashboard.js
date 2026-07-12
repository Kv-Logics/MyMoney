function renderDashboard() {
  if (state.user && state.user.email === 'a.keerthivasan7676@gmail.com') {
    const userView = document.getElementById('user-dashboard-view');
    const adminView = document.getElementById('admin-dashboard-view');
    if (userView) userView.classList.add('hidden');
    if (adminView) adminView.classList.remove('hidden');
    renderAdminDashboard();
    return;
  } else {
    const userView = document.getElementById('user-dashboard-view');
    const adminView = document.getElementById('admin-dashboard-view');
    if (userView) userView.classList.remove('hidden');
    if (adminView) adminView.classList.add('hidden');
  }

  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  const monthExpenses = state.expenses.filter(e => e.date.startsWith(thisMonthStr) && e.category.toLowerCase() !== 'rent');
  const todayExpenses = state.expenses.filter(e => e.date === todayStr && e.category.toLowerCase() !== 'rent');

  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const rentExpenses = state.expenses.filter(e => e.date.startsWith(thisMonthStr) && e.category.toLowerCase() === 'rent');
  const rentTotal = rentExpenses.reduce((sum, e) => sum + e.amount, 0);

  document.getElementById('stat-month-spending').innerText = `${state.settings.currency} ${monthTotal.toLocaleString()}`;
  document.getElementById('stat-today-spending').innerText = `${state.settings.currency} ${todayTotal.toLocaleString()}`;

  const rentStatEl = document.getElementById('stat-monthly-rent');
  if (rentStatEl) {
    rentStatEl.innerText = `${state.settings.currency} ${rentTotal.toLocaleString()}`;
  }

  const activeBudgets = state.budgets.filter(b => b.amount > 0 && b.category.toLowerCase() !== 'rent');
  const budgetSelect = document.getElementById('dashboard-budget-select');
  
  if (budgetSelect) {
    if (activeBudgets.length > 1) {
      budgetSelect.classList.remove('hidden');
      const currentVal = budgetSelect.value || (activeBudgets.find(b => b.category === 'Overall') ? 'Overall' : activeBudgets[0].category);
      budgetSelect.innerHTML = '';
      activeBudgets.forEach(b => {
        const isSelected = b.category === currentVal ? 'selected' : '';
        budgetSelect.innerHTML += `<option value="${b.category}" ${isSelected}>${b.category}</option>`;
      });
    } else {
      budgetSelect.classList.add('hidden');
      budgetSelect.innerHTML = activeBudgets.length === 1 
        ? `<option value="${activeBudgets[0].category}" selected>${activeBudgets[0].category}</option>` 
        : `<option value="Overall" selected>Overall</option>`;
    }
  }
  
  if (typeof window.renderDashboardBudget === 'function') {
    window.renderDashboardBudget();
  }

  // Draw Category Pie
  const categoryMap = {};
  monthExpenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });

  const catSummary = Object.keys(categoryMap).map(name => {
    const color = state.categories.find(c => c.name === name)?.color || '#6B7280';
    return { name, amount: categoryMap[name], color };
  }).sort((a, b) => b.amount - a.amount);

  const pieChartView = document.getElementById('pie-chart-view');
  const pieEmptyState = document.getElementById('pie-empty-state');
  
  if (catSummary.length === 0) {
    pieChartView.classList.add('hidden');
    pieEmptyState.classList.remove('hidden');
  } else {
    pieChartView.classList.remove('hidden');
    pieEmptyState.classList.add('hidden');
    document.getElementById('donut-total').innerText = `${state.settings.currency} ${monthTotal.toLocaleString()}`;
    
    const donut = document.getElementById('svg-donut');
    donut.innerHTML = `<circle cx="50" cy="50" r="40" fill="transparent" stroke="#1e293b" stroke-width="8" />`;
    
    let cumulative = 0;
    catSummary.forEach(item => {
      const pct = monthTotal > 0 ? (item.amount / monthTotal) * 100 : 0;
      const offset = 251.2 - (251.2 * pct / 100) + (251.2 * (100 - cumulative) / 100);
      donut.innerHTML += `
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="${item.color}" stroke-width="8"
          stroke-dasharray="251.2" stroke-dashoffset="${offset}" class="transition-all duration-300 hover:stroke-[10] cursor-pointer" />
      `;
      cumulative += pct;
    });

    const legend = document.getElementById('pie-legend');
    legend.innerHTML = '';
    catSummary.slice(0, 5).forEach(item => {
      const pct = monthTotal > 0 ? Math.round((item.amount / monthTotal) * 100) : 0;
      legend.innerHTML += `
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 truncate">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${item.color}"></span>
            <span class="text-slate-400 truncate">${escapeHTML(item.name)}</span>
          </div>
          <span class="font-semibold text-white">${pct}%</span>
        </div>
      `;
    });
  }

  // Daily Trend Bars
  const trendBars = document.getElementById('weekly-trend-bars');
  trendBars.innerHTML = '';
  const dailyTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
    const dayAmt = state.expenses.filter(e => e.date === dateStr && e.category.toLowerCase() !== 'rent').reduce((sum, e) => sum + e.amount, 0);
    dailyTrend.push({ day: dayName, amount: dayAmt, date: dateStr });
  }

  const maxVal = Math.max(...dailyTrend.map(t => t.amount), 1);
  dailyTrend.forEach(d => {
    const hPct = (d.amount / maxVal) * 100;
    const isSelected = state.selectedTrendDate === d.date;
    
    // Highlight if selected
    const barColorClass = isSelected 
      ? 'bg-brand-500 border-t border-brand-400 hover:bg-brand-600'
      : 'bg-indigo-500/20 hover:bg-indigo-500/40 border-t border-indigo-400/30';
    const textHighlightClass = isSelected ? 'text-brand-500 font-extrabold' : 'text-slate-400';
    
    trendBars.innerHTML += `
      <div onclick="selectTrendDay('${d.date}')" class="flex-1 flex flex-col items-center group relative h-full justify-end select-none">
        <div class="absolute bottom-full mb-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
          ${state.settings.currency} ${d.amount.toLocaleString()}
        </div>
        <div class="w-full ${barColorClass} rounded-t transition-all duration-300 cursor-pointer" style="height: ${Math.max(4, hPct)}%"></div>
        <span class="text-[10px] ${textHighlightClass} mt-2">${d.day}</span>
      </div>
    `;
  });

  // Show/Hide filter badge
  const filterIndicator = document.getElementById('dashboard-filter-indicator');
  if (filterIndicator) {
    if (state.selectedTrendDate) {
      filterIndicator.classList.remove('hidden');
    } else {
      filterIndicator.classList.add('hidden');
    }
  }

  // Populate Recent Transactions Table on the Dashboard
  const recentTbody = document.getElementById('recent-expenses-tbody');
  if (recentTbody) {
    recentTbody.innerHTML = '';
    
    // Sort expenses by date desc, time desc
    const sortedExpenses = [...state.expenses].sort((a, b) => {
      return new Date(b.date + 'T' + (b.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00'));
    });
    
    // Filter by selected day if one is selected
    const filteredExpenses = state.selectedTrendDate 
      ? sortedExpenses.filter(e => e.date === state.selectedTrendDate && e.category.toLowerCase() !== 'rent')
      : sortedExpenses.filter(e => e.category.toLowerCase() !== 'rent');
      
    const itemsToShow = filteredExpenses.slice(0, 5);
    
    itemsToShow.forEach(e => {
      recentTbody.innerHTML += `
        <tr class="hover:bg-slate-900/10">
          <td class="py-3 pr-3">
            <p class="font-semibold text-slate-200 text-xs">${escapeHTML(e.title)}</p>
            <span class="text-[10px] text-slate-500">${escapeHTML(e.category)}</span>
          </td>
          <td class="py-3 text-xs text-slate-400">${escapeHTML(formatDateToDMY(e.date))}</td>
          <td class="py-3 text-xs text-slate-400">${escapeHTML(e.payment_method)}</td>
          <td class="py-3 text-right font-bold text-white text-xs">${state.settings.currency} ${e.amount.toLocaleString()}</td>
        </tr>
      `;
    });
    
    if (itemsToShow.length === 0) {
      recentTbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-400 text-xs">No transactions found</td></tr>`;
    }
  }
}

// Interactive filter helpers for Dashboard
function selectTrendDay(date) {
  if (state.selectedTrendDate === date) {
    state.selectedTrendDate = null;
  } else {
    state.selectedTrendDate = date;
  }
  renderDashboard();
}

function clearDashboardTrendFilter() {
  state.selectedTrendDate = null;
  renderDashboard();
}

async function renderAdminDashboard() {
  try {
    // 1. Fetch system-wide stats
    const statsRes = await fetch(`${API_BASE}/auth/admin/stats`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (statsRes.ok) {
      const stats = await statsRes.json();
      document.getElementById('admin-stat-users').innerText = stats.total_users;
      document.getElementById('admin-stat-expenses').innerText = stats.total_expenses;
      document.getElementById('admin-stat-amount').innerText = `₹${stats.total_amount.toLocaleString()}`;
    }

    // 2. Fetch all registered users
    const usersRes = await fetch(`${API_BASE}/auth/admin/users`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (usersRes.ok) {
      const users = await usersRes.json();
      
      const badge = document.getElementById('admin-users-count-badge');
      if (badge) badge.innerText = `${users.length} Users`;
      
      const tbody = document.getElementById('admin-users-list-tbody');
      if (tbody) {
        tbody.innerHTML = '';
        users.forEach(u => {
          tbody.innerHTML += `
            <tr class="hover:bg-slate-900/10">
              <td class="py-3 pr-3 font-semibold text-slate-200">${escapeHTML(u.name || '')}</td>
              <td class="py-3 text-slate-400 font-mono">${escapeHTML(u.email || '')}</td>
              <td class="py-3 text-slate-400">${escapeHTML(u.currency || '₹')}</td>
              <td class="py-3 text-right">
                <button onclick="selectAdminUserToReset('${escapeHTML(u.email)}')" class="px-2.5 py-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 font-medium rounded-lg text-[10px] transition-colors">
                  Select
                </button>
              </td>
            </tr>
          `;
        });
        if (users.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-400">No users found</td></tr>`;
        }
      }
    }
  } catch (err) {
    console.error('Error loading admin dashboard stats/users:', err);
  }
}

function selectAdminUserToReset(email) {
  const emailInput = document.getElementById('admin-dash-user-email');
  if (emailInput) {
    emailInput.value = email;
    const pwdInput = document.getElementById('admin-dash-user-password');
    if (pwdInput) pwdInput.focus();
  }
}

async function adminDashSetUserPassword() {
  const emailInput = document.getElementById('admin-dash-user-email');
  const passwordInput = document.getElementById('admin-dash-user-password');
  
  if (!emailInput || !passwordInput) return;
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  if (!email || !password) {
    showToast('Please fill in both email and password fields', 'error');
    return;
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters long', 'error');
    return;
  }
  
  showLoading(true);
  try {
    const res = await fetch(`${API_BASE}/auth/admin/set-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    if (res.ok) {
      showToast(data.message || 'Password upserted successfully!', 'success');
      passwordInput.value = '';
      renderAdminDashboard();
    } else {
      showToast(data.detail || 'Failed to upsert password', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Connection error', 'error');
  } finally {
    showLoading(false);
  }
}

window.renderDashboardBudget = function() {
  const select = document.getElementById('dashboard-budget-select');
  const cat = select ? select.value : 'Overall';
  const budget = state.budgets.find(b => b.category === cat);
  const limit = budget ? budget.amount : 0;
  
  const overallBarContainer = document.getElementById('overall-budget-progress-container');
  const setBudgetBtn = document.getElementById('set-budget-link-btn');
  const spentText = document.getElementById('budget-spent-text');
  
  if (limit > 0) {
    overallBarContainer.classList.remove('hidden');
    setBudgetBtn.classList.add('hidden');
    if(spentText) spentText.classList.remove('hidden');
    
    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const spent = state.expenses
      .filter(e => e.date.startsWith(thisMonthStr) && e.category.toLowerCase() !== 'rent' && (cat === 'Overall' || e.category === cat))
      .reduce((sum, e) => sum + e.amount, 0);
      
    const pct = Math.min(100, (spent / limit) * 100);
    document.getElementById('stat-remaining-budget').innerText = `${state.settings.currency} ${Math.max(0, limit - spent).toLocaleString()}`;
    
    if(spentText) spentText.innerText = `${Math.round(pct)}% used (${state.settings.currency} ${spent.toLocaleString()})`;
    
    const bar = document.getElementById('overall-budget-progress-bar');
    bar.style.width = `${pct}%`;
    bar.className = `h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`;
  } else {
    overallBarContainer.classList.add('hidden');
    if(spentText) spentText.classList.add('hidden');
    setBudgetBtn.classList.remove('hidden');
    document.getElementById('stat-remaining-budget').innerText = 'Not Set';
    if (state.activeOwner) setBudgetBtn.classList.add('hidden');
  }
}
