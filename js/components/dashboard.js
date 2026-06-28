function renderDashboard() {
  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  const monthExpenses = state.expenses.filter(e => e.date.startsWith(thisMonthStr));
  const todayExpenses = state.expenses.filter(e => e.date === todayStr);

  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  document.getElementById('stat-month-spending').innerText = `${state.settings.currency} ${monthTotal.toLocaleString()}`;
  document.getElementById('stat-today-spending').innerText = `${state.settings.currency} ${todayTotal.toLocaleString()}`;

  const overallB = state.budgets.find(b => b.category === 'Overall');
  const overallBarContainer = document.getElementById('overall-budget-progress-container');
  const setBudgetBtn = document.getElementById('set-budget-link-btn');
  
  if (overallB && overallB.amount > 0) {
    overallBarContainer.classList.remove('hidden');
    setBudgetBtn.classList.add('hidden');
    const pct = Math.min(100, (monthTotal / overallB.amount) * 100);
    document.getElementById('stat-remaining-budget').innerText = `${state.settings.currency} ${Math.max(0, overallB.amount - monthTotal).toLocaleString()}`;
    
    const bar = document.getElementById('overall-budget-progress-bar');
    bar.style.width = `${pct}%`;
    bar.className = `h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`;
  } else {
    overallBarContainer.classList.add('hidden');
    setBudgetBtn.classList.remove('hidden');
    document.getElementById('stat-remaining-budget').innerText = 'Not Set';
    if (state.activeOwner) setBudgetBtn.classList.add('hidden');
  }

  // Draw Category Pie
  const categoryMap = {};
  state.expenses.forEach(e => {
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
      const pct = (item.amount / monthTotal) * 100;
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
      const pct = Math.round((item.amount / monthTotal) * 100);
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
    const dayAmt = state.expenses.filter(e => e.date === dateStr).reduce((sum, e) => sum + e.amount, 0);
    dailyTrend.push({ day: dayName, amount: dayAmt });
  }

  const maxVal = Math.max(...dailyTrend.map(t => t.amount), 1);
  dailyTrend.forEach(d => {
    const hPct = (d.amount / maxVal) * 100;
    trendBars.innerHTML += `
      <div class="flex-1 flex flex-col items-center group relative h-full justify-end">
        <div class="absolute bottom-full mb-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
          ${state.settings.currency} ${d.amount.toLocaleString()}
        </div>
        <div class="w-full bg-indigo-500/20 hover:bg-indigo-500/40 border-t border-indigo-400/30 rounded-t transition-all duration-300 cursor-pointer" style="height: ${Math.max(4, hPct)}%"></div>
        <span class="text-[10px] text-slate-400 mt-2">${d.day}</span>
      </div>
    `;
  });
}
