// REPORTS GENERATION & CSV EXPORTS LOGIC

function exportToCSV(expList) {
  let csv = 'Date,Title,Category,Payment Method,Amount,Location,Notes\n';
  expList.forEach(e => {
    csv += `"${e.date}","${e.title.replace(/"/g, '""')}","${e.category}","${e.payment_method}",${e.amount},"${(e.location || '').replace(/"/g, '""')}","${(e.description || '').replace(/"/g, '""')}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `mymoney_report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadCSVReport(list) {
  exportToCSV(list || state.expenses);
}

async function runReport() {
  let start = document.getElementById('report-start-date').value;
  let end = document.getElementById('report-end-date').value;

  if (!start || !end) {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    end = now.toISOString().split('T')[0];
    document.getElementById('report-start-date').value = start;
    document.getElementById('report-end-date').value = end;
  }

  const ownerQuery = state.activeOwner ? `&owner_email=${encodeURIComponent(state.activeOwner.owner_email)}` : '';
  
  try {
    const res = await fetch(`${API_BASE}/reports?start_date=${start}&end_date=${end}${ownerQuery}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) {
      const report = await res.json();
      document.getElementById('report-total').innerText = `${state.settings.currency}${report.total_expense.toLocaleString()}`;
      document.getElementById('report-avg').innerText = `${state.settings.currency}${Math.round(report.average_expense).toLocaleString()}`;
      document.getElementById('report-highest').innerText = `${report.highest_spending_category} (${state.settings.currency}${Math.round(report.highest_spending_category_amount).toLocaleString()})`;
      document.getElementById('report-lowest').innerText = `${report.lowest_spending_category} (${state.settings.currency}${Math.round(report.lowest_spending_category_amount).toLocaleString()})`;

      document.getElementById('report-log-title').innerText = `Expenses Log (${report.transaction_count} entries)`;
      const tbody = document.getElementById('report-tbody');
      tbody.innerHTML = '';
      
      report.expenses.forEach(e => {
        tbody.innerHTML += `
          <tr class="hover:bg-slate-900/10">
            <td class="py-3 text-xs text-slate-400">${escapeHTML(e.date)}</td>
            <td class="py-3 font-semibold text-slate-200">${escapeHTML(e.title)}</td>
            <td class="py-3 text-slate-400 text-xs">${escapeHTML(e.category)}</td>
            <td class="py-3 text-slate-400 text-xs">${escapeHTML(e.payment_method)}</td>
            <td class="py-3 text-right font-bold text-white">${state.settings.currency}${e.amount.toLocaleString()}</td>
          </tr>
        `;
      });
      
      if (report.expenses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400 text-xs">No expenses in this date range</td></tr>`;
      }
    }
  } catch (err) {
    const filtered = state.expenses.filter(e => e.date >= start && e.date <= end);
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('report-total').innerText = `${state.settings.currency}${total.toLocaleString()}`;
    document.getElementById('report-avg').innerText = `${state.settings.currency}${filtered.length ? Math.round(total / filtered.length).toLocaleString() : 0}`;
    document.getElementById('report-highest').innerText = 'Local Offline';
    document.getElementById('report-lowest').innerText = 'Local Offline';
    
    const tbody = document.getElementById('report-tbody');
    tbody.innerHTML = '';
    filtered.forEach(e => {
      tbody.innerHTML += `
        <tr class="hover:bg-slate-900/10">
          <td class="py-3 text-xs text-slate-400">${escapeHTML(e.date)}</td>
          <td class="py-3 font-semibold text-slate-200">${escapeHTML(e.title)}</td>
          <td class="py-3 text-slate-400 text-xs">${escapeHTML(e.category)}</td>
          <td class="py-3 text-slate-400 text-xs">${escapeHTML(e.payment_method)}</td>
          <td class="py-3 text-right font-bold text-white">${state.settings.currency}${e.amount.toLocaleString()}</td>
        </tr>
      `;
    });
  }
}

function downloadReportCSV() {
  const start = document.getElementById('report-start-date').value;
  const end = document.getElementById('report-end-date').value;
  const filtered = state.expenses.filter(e => e.date >= start && e.date <= end);
  exportToCSV(filtered);
}
