// Isolated Daily Profit Tracker Component

async function renderProfitTab() {
  if (state.activeOwner) return;

  try {
    // 1. Fetch Profit Summary
    const sumRes = await fetchWithAuth(`${API_BASE}/profit/summary`);
    if (sumRes.ok) {
      const summary = await sumRes.json();
      
      const totalEl = document.getElementById('profit-stat-total');
      if (totalEl) totalEl.innerText = `${state.settings.currency} ${(summary.total_profit || 0).toLocaleString()}`;

      const posEl = document.getElementById('profit-stat-positive-days');
      if (posEl) posEl.innerText = `${summary.profitable_days || 0} Days`;

      const lossEl = document.getElementById('profit-stat-loss-days');
      if (lossEl) lossEl.innerText = `${summary.loss_days || 0} Days`;

      const avgEl = document.getElementById('profit-stat-avg');
      if (avgEl) avgEl.innerText = `${state.settings.currency} ${Math.round(summary.average_daily_profit || 0).toLocaleString()}`;
    }

    // 2. Fetch Profit List Records
    const profRes = await fetchWithAuth(`${API_BASE}/profit`);
    if (profRes.ok) {
      const data = await profRes.json();
      const records = data.records || [];
      state.dailyProfits = records;

      const tbody = document.getElementById('profit-list-tbody');
      if (tbody) {
        tbody.innerHTML = '';
        records.forEach(item => {
          const isPos = item.amount > 0;
          const isNeg = item.amount < 0;
          const amtColor = isPos ? 'text-emerald-500 font-extrabold' : (isNeg ? 'text-rose-500 font-extrabold' : 'text-slate-500 font-bold');
          const amtSign = isPos ? '+' : '';

          tbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">${escapeHTML(item.date)}</td>
              <td class="py-3 px-4 text-slate-600 dark:text-slate-300 text-xs">${escapeHTML(item.note || '—')}</td>
              <td class="py-3 px-4 text-right ${amtColor}">${amtSign}${state.settings.currency} ${item.amount.toLocaleString()}</td>
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button onclick="openEditProfitModal('${escapeHTML(item.id || item._id)}')" class="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                  </button>
                  <button onclick="deleteDailyProfit('${escapeHTML(item.id || item._id)}', '${escapeHTML(item.date)}')" class="p-1 hover:bg-rose-500/10 rounded text-rose-500">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        });

        if (records.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colSpan="4" className="py-8 text-center text-slate-400 dark:text-slate-500 italic text-xs">
                No daily profit records logged yet. Click "+ Record Today's Profit" above to start tracking!
              </td>
            </tr>
          `;
        }
      }

      // Update Dashboard Profit Summary Card if elements exist
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRecord = records.find(r => r.date === todayStr);
      const dashValEl = document.getElementById('dash-profit-today');
      if (dashValEl) {
        if (todayRecord) {
          const val = todayRecord.amount;
          dashValEl.innerText = `${val >= 0 ? '+' : ''}${state.settings.currency} ${val.toLocaleString()}`;
          dashValEl.className = val > 0 ? 'text-2xl font-extrabold text-emerald-500' : (val < 0 ? 'text-2xl font-extrabold text-rose-500' : 'text-2xl font-extrabold text-slate-800 dark:text-white');
        } else {
          dashValEl.innerText = '₹0';
          dashValEl.className = 'text-2xl font-extrabold text-slate-800 dark:text-white';
        }
      }

      const statProfitTopEl = document.getElementById('stat-today-profit-top');
      if (statProfitTopEl) {
        if (todayRecord) {
          const val = todayRecord.amount;
          statProfitTopEl.innerText = `${val >= 0 ? '+' : ''}${state.settings.currency} ${val.toLocaleString()}`;
        } else {
          statProfitTopEl.innerText = '₹0';
        }
      }
    }
  } catch (err) {
    console.error('Error rendering profit tab:', err);
  }

  if (window.lucide) lucide.createIcons();
}

function openProfitModal(editingId = null) {
  const modal = document.getElementById('profit-modal');
  if (!modal) return;

  const form = document.getElementById('profit-form');
  if (form) form.reset();

  const titleEl = document.getElementById('profit-modal-title');
  const dateInput = document.getElementById('profit-date');
  const amountInput = document.getElementById('profit-amount');
  const noteInput = document.getElementById('profit-note');
  const idInput = document.getElementById('profit-id');

  const todayStr = new Date().toISOString().split('T')[0];
  if (dateInput) dateInput.value = todayStr;

  if (editingId && state.dailyProfits) {
    const item = state.dailyProfits.find(p => (p.id || p._id) === editingId || p.date === editingId);
    if (item) {
      if (titleEl) titleEl.innerText = 'Edit Daily Profit Entry';
      if (idInput) idInput.value = item.id || item._id;
      if (dateInput) dateInput.value = item.date;
      if (amountInput) amountInput.value = item.amount;
      if (noteInput) noteInput.value = item.note || '';
    }
  } else {
    if (titleEl) titleEl.innerText = 'Record Daily Profit';
    if (idInput) idInput.value = '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function openEditProfitModal(id) {
  openProfitModal(id);
}

function closeProfitModal() {
  const modal = document.getElementById('profit-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function saveDailyProfit(event) {
  event.preventDefault();
  const date = document.getElementById('profit-date').value;
  const amountVal = document.getElementById('profit-amount').value;
  const note = document.getElementById('profit-note').value;
  const id = document.getElementById('profit-id').value;

  if (!amountVal || isNaN(amountVal)) {
    alert('Please enter a valid profit amount');
    return;
  }

  try {
    const payload = {
      date,
      amount: parseFloat(amountVal),
      note
    };

    const res = await fetchWithAuth(`${API_BASE}/profit`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeProfitModal();
      renderProfitTab();
    } else {
      alert('Failed to save profit entry');
    }
  } catch (err) {
    console.error('Error saving profit:', err);
    alert('Server error saving profit');
  }
}

async function deleteDailyProfit(id, date) {
  const confirmed = await showConfirmModal(
    `Are you sure you want to delete the daily profit record for ${date}?`,
    'Delete Profit Record',
    'Delete',
    true
  );
  if (!confirmed) return;

  try {
    const res = await fetchWithAuth(`${API_BASE}/profit/${id || date}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      renderProfitTab();
    } else {
      alert('Failed to delete profit record');
    }
  } catch (err) {
    console.error('Error deleting profit:', err);
    alert('Server error deleting profit record');
  }
}
