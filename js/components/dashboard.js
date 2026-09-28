// DASHBOARD COMPONENT
// Features: Personal Expense Metrics, Category Donut Breakdown, Daily & Week-by-Week Trend Bar Graph,
// Previous Week & Previous Month Comparison Analysis, and Optional Admin System Stats Toggle.

function renderDashboard() {
  const isAdmin = state.user && (state.user.email === 'keerthivasan.220722@gmail.com' || state.user.email === 'a.keerthivasan7676@gmail.com');
  const toggleBar = document.getElementById('admin-view-toggle-bar');
  const userView = document.getElementById('user-dashboard-view');
  const adminView = document.getElementById('admin-dashboard-view');

  // Default to personal expenses dashboard sub-view
  if (typeof state.dashboardSubView === 'undefined') {
    state.dashboardSubView = 'user';
  }

  if (isAdmin) {
    if (toggleBar) toggleBar.classList.remove('hidden');
    if (state.dashboardSubView === 'admin') {
      if (userView) userView.classList.add('hidden');
      if (adminView) adminView.classList.remove('hidden');
      updateSubViewToggleButtons('admin');
      renderAdminDashboard();
      return;
    } else {
      if (userView) userView.classList.remove('hidden');
      if (adminView) adminView.classList.add('hidden');
      updateSubViewToggleButtons('user');
    }
  } else {
    if (toggleBar) toggleBar.classList.add('hidden');
    if (userView) userView.classList.remove('hidden');
    if (adminView) adminView.classList.add('hidden');
  }

  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  // Month & Today totals
  const monthExpenses = state.expenses.filter(e => e.date.startsWith(thisMonthStr) && e.category.toLowerCase() !== 'rent');
  const todayExpenses = state.expenses.filter(e => e.date === todayStr && e.category.toLowerCase() !== 'rent');

  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const rentExpenses = state.expenses.filter(e => e.date.startsWith(thisMonthStr) && e.category.toLowerCase() === 'rent');
  const rentTotal = rentExpenses.reduce((sum, e) => sum + e.amount, 0);

  const monthEl = document.getElementById('stat-month-spending');
  if (monthEl) monthEl.innerText = `${state.settings.currency} ${monthTotal.toLocaleString()}`;

  const todayEl = document.getElementById('stat-today-spending');
  if (todayEl) todayEl.innerText = `${state.settings.currency} ${todayTotal.toLocaleString()}`;

  const rentStatEl = document.getElementById('stat-monthly-rent');
  if (rentStatEl) rentStatEl.innerText = `${state.settings.currency} ${rentTotal.toLocaleString()}`;

  // Active budgets & budget selector
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
    if (pieChartView) pieChartView.classList.add('hidden');
    if (pieEmptyState) pieEmptyState.classList.remove('hidden');
  } else {
    if (pieChartView) pieChartView.classList.remove('hidden');
    if (pieEmptyState) pieEmptyState.classList.add('hidden');
    const donutTotalEl = document.getElementById('donut-total');
    if (donutTotalEl) donutTotalEl.innerText = `${state.settings.currency} ${monthTotal.toLocaleString()}`;
    
    const donut = document.getElementById('svg-donut');
    if (donut) {
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
    }

    const legend = document.getElementById('pie-legend');
    if (legend) {
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
  }

  // ================= EXPENSES BAR GRAPH (DAILY & WEEK-BY-WEEK) =================
  renderSpendingTrendBarGraph();

  // Populate Recent Transactions Table on the Dashboard
  renderDashboardRecentTransactions();

  if (window.lucide) lucide.createIcons();
}

function renderSpendingTrendBarGraph() {
  if (typeof state.trendGraphMode === 'undefined') state.trendGraphMode = 'daily';
  if (typeof state.weekOffset === 'undefined') state.weekOffset = 0;
  if (typeof state.monthOffset === 'undefined') state.monthOffset = 0;

  const trendBars = document.getElementById('weekly-trend-bars');
  if (!trendBars) return;
  trendBars.innerHTML = '';

  const now = new Date();
  const titleEl = document.getElementById('trend-card-title');
  const subtitleEl = document.getElementById('trend-comparison-subtitle');
  const rangeEl = document.getElementById('weekly-trend-range');
  const totalEl = document.getElementById('weekly-trend-total');

  // Toggle button styling
  const dailyBtn = document.getElementById('trend-mode-daily-btn');
  const weeklyBtn = document.getElementById('trend-mode-weekly-btn');
  if (state.trendGraphMode === 'daily') {
    if (dailyBtn) {
      dailyBtn.className = 'px-2.5 py-1 rounded-lg bg-brand-500 text-white transition-all';
    }
    if (weeklyBtn) {
      weeklyBtn.className = 'px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-all';
    }
    if (titleEl) titleEl.innerText = 'Daily Spending Trend';
    if (subtitleEl) subtitleEl.innerText = 'Day-by-day bar graph for selected week';
  } else {
    if (dailyBtn) {
      dailyBtn.className = 'px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-all';
    }
    if (weeklyBtn) {
      weeklyBtn.className = 'px-2.5 py-1 rounded-lg bg-brand-500 text-white transition-all';
    }
    if (titleEl) titleEl.innerText = 'Week-by-Week Monthly Trend';
    if (subtitleEl) subtitleEl.innerText = 'Weekly aggregated bar graph for selected month';
  }

  if (state.trendGraphMode === 'daily') {
    // 7 Days of selected week
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i + (state.weekOffset * 7));
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
      const dayAmt = state.expenses
        .filter(e => e.date === dateStr && e.category.toLowerCase() !== 'rent')
        .reduce((sum, e) => sum + e.amount, 0);
      dailyTrend.push({ label: dayName, amount: dayAmt, date: dateStr });
    }

    const currentPeriodTotal = dailyTrend.reduce((sum, d) => sum + d.amount, 0);
    if (totalEl) totalEl.innerText = `${state.settings.currency} ${currentPeriodTotal.toLocaleString()}`;

    if (rangeEl && dailyTrend.length >= 7) {
      const startDate = dailyTrend[0].date;
      const endDate = dailyTrend[6].date;
      const fmt = (ds) => { const p = ds.split('-'); return `${p[2]}/${p[1]}`; };
      rangeEl.innerText = state.weekOffset === 0 
        ? `This Week · ${fmt(startDate)} – ${fmt(endDate)}`
        : `${fmt(startDate)} – ${fmt(endDate)}`;
    }

    const maxVal = Math.max(...dailyTrend.map(t => t.amount), 1);
    dailyTrend.forEach(d => {
      const hPct = (d.amount / maxVal) * 100;
      const isSelected = state.selectedTrendDate === d.date;
      const barColorClass = isSelected 
        ? 'bg-brand-500 border-t border-brand-400 hover:bg-brand-600'
        : 'bg-indigo-500/20 hover:bg-indigo-500/40 border-t border-indigo-400/30';
      const textHighlightClass = isSelected ? 'text-brand-500 font-extrabold' : 'text-slate-400';

      trendBars.innerHTML += `
        <div onclick="selectTrendDay('${d.date}')" class="flex-1 flex flex-col items-center group relative h-full justify-end select-none">
          <div class="absolute bottom-full mb-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
            ${state.settings.currency} ${d.amount.toLocaleString()} (${d.date})
          </div>
          <div class="w-full ${barColorClass} rounded-t transition-all duration-300 cursor-pointer" style="height: ${Math.max(6, hPct)}%"></div>
          <span class="text-[10px] ${textHighlightClass} mt-2">${d.label}</span>
        </div>
      `;
    });

  } else {
    // Week-by-Week (4-5 weeks of selected month)
    const targetMonthDate = new Date(now.getFullYear(), now.getMonth() + state.monthOffset, 1);
    const targetYear = targetMonthDate.getFullYear();
    const targetMonth = targetMonthDate.getMonth();
    const monthName = targetMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    if (rangeEl) {
      rangeEl.innerText = state.monthOffset === 0 ? `This Month (${monthName})` : monthName;
    }

    // Days in target month
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const weeksInMonth = [
      { label: 'W1 (1-7)', start: 1, end: 7, amount: 0 },
      { label: 'W2 (8-14)', start: 8, end: 14, amount: 0 },
      { label: 'W3 (15-21)', start: 15, end: 21, amount: 0 },
      { label: 'W4 (22-28)', start: 22, end: 28, amount: 0 },
      { label: `W5 (29-${daysInMonth})`, start: 29, end: daysInMonth, amount: 0 }
    ];

    const targetMonthStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const targetMonthExpenses = state.expenses.filter(e => e.date.startsWith(targetMonthStr) && e.category.toLowerCase() !== 'rent');

    targetMonthExpenses.forEach(e => {
      const day = parseInt(e.date.split('-')[2], 10);
      const targetWeek = weeksInMonth.find(w => day >= w.start && day <= w.end);
      if (targetWeek) targetWeek.amount += e.amount;
    });

    const monthTotalSpent = weeksInMonth.reduce((s, w) => s + w.amount, 0);
    if (totalEl) totalEl.innerText = `${state.settings.currency} ${monthTotalSpent.toLocaleString()}`;

    const maxWeekVal = Math.max(...weeksInMonth.map(w => w.amount), 1);
    weeksInMonth.forEach((w, idx) => {
      const hPct = (w.amount / maxWeekVal) * 100;
      trendBars.innerHTML += `
        <div class="flex-1 flex flex-col items-center group relative h-full justify-end select-none">
          <div class="absolute bottom-full mb-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
            ${w.label}: ${state.settings.currency} ${w.amount.toLocaleString()}
          </div>
          <div class="w-full bg-violet-500/25 hover:bg-violet-500/50 border-t border-violet-400/40 rounded-t transition-all duration-300 cursor-pointer" style="height: ${Math.max(6, hPct)}%"></div>
          <span class="text-[10px] text-slate-400 mt-2">W${idx + 1}</span>
        </div>
      `;
    });
  }

  // ================= PREVIOUS WEEK & PREVIOUS MONTH COMPARISONS =================
  calculateComparisonStats();
}

function calculateComparisonStats() {
  const now = new Date();
  
  // 1. Previous Week calculation (7 days before the current active week window)
  const prevWeekDaily = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i + ((state.weekOffset - 1) * 7));
    const dateStr = d.toISOString().split('T')[0];
    const dayAmt = state.expenses
      .filter(e => e.date === dateStr && e.category.toLowerCase() !== 'rent')
      .reduce((sum, e) => sum + e.amount, 0);
    prevWeekDaily.push(dayAmt);
  }
  const prevWeekTotal = prevWeekDaily.reduce((a, b) => a + b, 0);

  // Active week total
  const currWeekDaily = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i + (state.weekOffset * 7));
    const dateStr = d.toISOString().split('T')[0];
    const dayAmt = state.expenses
      .filter(e => e.date === dateStr && e.category.toLowerCase() !== 'rent')
      .reduce((sum, e) => sum + e.amount, 0);
    currWeekDaily.push(dayAmt);
  }
  const currWeekTotal = currWeekDaily.reduce((a, b) => a + b, 0);

  const prevWeekEl = document.getElementById('stat-prev-week-total');
  if (prevWeekEl) prevWeekEl.innerText = `${state.settings.currency} ${prevWeekTotal.toLocaleString()}`;

  const weekDiffBadge = document.getElementById('stat-week-diff-badge');
  if (weekDiffBadge) {
    if (prevWeekTotal > 0) {
      const diffPct = Math.round(((currWeekTotal - prevWeekTotal) / prevWeekTotal) * 100);
      if (diffPct > 0) {
        weekDiffBadge.innerText = `+${diffPct}%`;
        weekDiffBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
      } else {
        weekDiffBadge.innerText = `${diffPct}%`;
        weekDiffBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      }
    } else {
      weekDiffBadge.innerText = currWeekTotal > 0 ? '+100%' : '0%';
      weekDiffBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400';
    }
  }

  // 2. Previous Month calculation
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthTotal = state.expenses
    .filter(e => e.date.startsWith(prevMonthStr) && e.category.toLowerCase() !== 'rent')
    .reduce((sum, e) => sum + e.amount, 0);

  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthTotal = state.expenses
    .filter(e => e.date.startsWith(thisMonthStr) && e.category.toLowerCase() !== 'rent')
    .reduce((sum, e) => sum + e.amount, 0);

  const prevMonthEl = document.getElementById('stat-prev-month-total');
  if (prevMonthEl) prevMonthEl.innerText = `${state.settings.currency} ${prevMonthTotal.toLocaleString()}`;

  const monthDiffBadge = document.getElementById('stat-month-diff-badge');
  if (monthDiffBadge) {
    if (prevMonthTotal > 0) {
      const diffPct = Math.round(((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100);
      if (diffPct > 0) {
        monthDiffBadge.innerText = `+${diffPct}%`;
        monthDiffBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
      } else {
        monthDiffBadge.innerText = `${diffPct}%`;
        monthDiffBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      }
    } else {
      monthDiffBadge.innerText = thisMonthTotal > 0 ? '+100%' : '0%';
      monthDiffBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400';
    }
  }
}

function setTrendGraphMode(mode) {
  state.trendGraphMode = mode;
  state.selectedTrendDate = null;
  renderSpendingTrendBarGraph();
  renderDashboardRecentTransactions();
}

function shiftTrendPeriod(direction) {
  if (state.trendGraphMode === 'daily') {
    if (typeof state.weekOffset === 'undefined') state.weekOffset = 0;
    const newOffset = state.weekOffset + direction;
    if (newOffset > 0) return; // Disallow navigating into the future
    state.weekOffset = newOffset;
  } else {
    if (typeof state.monthOffset === 'undefined') state.monthOffset = 0;
    const newOffset = state.monthOffset + direction;
    if (newOffset > 0) return; // Disallow navigating into the future
    state.monthOffset = newOffset;
  }
  state.selectedTrendDate = null;
  renderSpendingTrendBarGraph();
  renderDashboardRecentTransactions();
}

function selectTrendDay(date) {
  if (state.selectedTrendDate === date) {
    state.selectedTrendDate = null;
  } else {
    state.selectedTrendDate = date;
  }
  renderSpendingTrendBarGraph();
  renderDashboardRecentTransactions();
}

function clearDashboardTrendFilter() {
  state.selectedTrendDate = null;
  renderSpendingTrendBarGraph();
  renderDashboardRecentTransactions();
}

function renderDashboardRecentTransactions() {
  const filterIndicator = document.getElementById('dashboard-filter-indicator');
  if (filterIndicator) {
    if (state.selectedTrendDate) {
      filterIndicator.classList.remove('hidden');
    } else {
      filterIndicator.classList.add('hidden');
    }
  }

  const recentTbody = document.getElementById('recent-expenses-tbody');
  if (!recentTbody) return;
  recentTbody.innerHTML = '';

  const sortedExpenses = [...state.expenses].sort((a, b) => {
    return new Date(b.date + 'T' + (b.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00'));
  });

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

// Sub-view switcher between Personal Expenses & System Admin View
function switchDashboardSubView(subView) {
  state.dashboardSubView = subView;
  renderDashboard();
}

function updateSubViewToggleButtons(activeView) {
  const userBtn = document.getElementById('toggle-user-dash-btn');
  const adminBtn = document.getElementById('toggle-admin-dash-btn');

  if (activeView === 'user') {
    if (userBtn) {
      userBtn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all bg-brand-500 text-white shadow-md shadow-brand-500/20 flex items-center gap-1.5';
    }
    if (adminBtn) {
      adminBtn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5';
    }
  } else {
    if (userBtn) {
      userBtn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5';
    }
    if (adminBtn) {
      adminBtn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all bg-brand-500 text-white shadow-md shadow-brand-500/20 flex items-center gap-1.5';
    }
  }
}

// Backward compatibility helper
function shiftWeek(direction) {
  shiftTrendPeriod(direction);
}

// ================= ADMIN DASHBOARD FUNCTIONS =================
async function renderAdminDashboard() {
  try {
    const statsRes = await fetch(`${API_BASE}/auth/admin/stats`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (statsRes.ok) {
      const stats = await statsRes.json();
      const usersEl = document.getElementById('admin-stat-users');
      const expEl = document.getElementById('admin-stat-expenses');
      const amtEl = document.getElementById('admin-stat-amount');
      if (usersEl) usersEl.innerText = stats.total_users;
      if (expEl) expEl.innerText = stats.total_expenses;
      if (amtEl) amtEl.innerText = `₹${stats.total_amount.toLocaleString()}`;
    }

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

    if (typeof loadAdminAIPanel === 'function') {
      loadAdminAIPanel();
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
    if (overallBarContainer) overallBarContainer.classList.remove('hidden');
    if (setBudgetBtn) setBudgetBtn.classList.add('hidden');
    if (spentText) spentText.classList.remove('hidden');
    
    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const spent = state.expenses
      .filter(e => e.date.startsWith(thisMonthStr) && e.category.toLowerCase() !== 'rent' && (cat === 'Overall' || e.category === cat))
      .reduce((sum, e) => sum + e.amount, 0);
      
    const pct = Math.min(100, (spent / limit) * 100);
    const remEl = document.getElementById('stat-remaining-budget');
    if (remEl) remEl.innerText = `${state.settings.currency} ${Math.max(0, limit - spent).toLocaleString()}`;
    
    if (spentText) spentText.innerText = `${Math.round(pct)}% used (${state.settings.currency} ${spent.toLocaleString()})`;
    
    const bar = document.getElementById('overall-budget-progress-bar');
    if (bar) {
      bar.style.width = `${pct}%`;
      bar.className = `h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`;
    }
  } else {
    if (overallBarContainer) overallBarContainer.classList.add('hidden');
    if (spentText) spentText.classList.add('hidden');
    if (setBudgetBtn) setBudgetBtn.classList.remove('hidden');
    const remEl = document.getElementById('stat-remaining-budget');
    if (remEl) remEl.innerText = 'Not Set';
    if (state.activeOwner && setBudgetBtn) setBudgetBtn.classList.add('hidden');
  }
};
