// EXPENSE MODAL & SUBMISSIONS LOGIC

function openExpenseModal(editingId = null) {
  if (state.activeOwner) return;
  const modal = document.getElementById('modal-expense');
  modal.classList.remove('hidden');

  if (editingId) {
    document.getElementById('modal-expense-title').innerText = 'Modify Expense details';
    const exp = state.expenses.find(e => e.id === editingId);
    
    document.getElementById('expense-id').value = exp.id;
    document.getElementById('expense-amount').value = exp.amount;
    document.getElementById('expense-title').value = exp.title;
    document.getElementById('expense-category').value = exp.category;
    document.getElementById('expense-payment').value = exp.payment_method;
    document.getElementById('expense-date').value = exp.date;
    document.getElementById('expense-time').value = exp.time || '';
    document.getElementById('expense-location').value = exp.location || '';
    document.getElementById('expense-desc').value = exp.description || '';
    
    state.receiptBase64 = exp.receipt_image || '';
    const badge = document.getElementById('expense-receipt-badge');
    if (state.receiptBase64) badge.classList.remove('hidden');
    else badge.classList.add('hidden');
  } else {
    document.getElementById('modal-expense-title').innerText = 'Record Expense Entry';
    document.getElementById('expense-id').value = '';
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-title').value = '';
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('expense-time').value = new Date().toTimeString().split(' ')[0].substring(0, 5);
    document.getElementById('expense-location').value = '';
    document.getElementById('expense-desc').value = '';
    state.receiptBase64 = '';
    document.getElementById('expense-receipt-badge').classList.add('hidden');
  }
}

function closeExpenseModal() {
  document.getElementById('modal-expense').classList.add('hidden');
}

function handleReceiptUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = () => {
    state.receiptBase64 = reader.result;
    document.getElementById('expense-receipt-badge').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

async function handleExpenseSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('expense-id').value;
  const amount = parseFloat(document.getElementById('expense-amount').value);
  const title = document.getElementById('expense-title').value.trim();
  const category = document.getElementById('expense-category').value;
  const payment_method = document.getElementById('expense-payment').value;
  const date = document.getElementById('expense-date').value;
  const time = document.getElementById('expense-time').value;
  const location = document.getElementById('expense-location').value.trim();
  const description = document.getElementById('expense-desc').value.trim();

  const payload = {
    amount, title, category, payment_method, date, time, location, description,
    receipt_image: state.receiptBase64
  };

  if (state.isOffline) {
    const tempId = 'offline_' + Date.now();
    if (id) {
      state.expenses = state.expenses.map(exp => exp.id === id ? { ...exp, ...payload } : exp);
      state.syncQueue.push({ type: 'create_expense', id, data: payload });
    } else {
      const newExp = { ...payload, id: tempId, _id: tempId, user_id: state.user.id, user_email: state.user.email, created_at: new Date().toISOString() };
      state.expenses.unshift(newExp);
      state.syncQueue.push({ type: 'create_expense', id: tempId, data: payload });
    }
    localStorage.setItem('sync_queue', JSON.stringify(state.syncQueue));
    localStorage.setItem('cached_expenses', JSON.stringify(state.expenses));
    closeExpenseModal();
    updateSyncStatus();
    renderTabContent();
    return;
  }

  try {
    let res;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    };
    if (id) {
      res = await fetch(`${API_BASE}/expenses/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.8 } });
      closeExpenseModal();
      fetchAllData();
    } else {
      alert('Failed to save expense');
    }
  } catch (err) {
    alert('Server error');
  }
}

async function deleteExpense(id) {
  if (state.activeOwner) return;
  if (!confirm('Are you sure you want to delete this expense?')) return;

  if (state.isOffline) {
    state.expenses = state.expenses.filter(e => e.id !== id);
    state.syncQueue.push({ type: 'delete_expense', id });
    localStorage.setItem('sync_queue', JSON.stringify(state.syncQueue));
    localStorage.setItem('cached_expenses', JSON.stringify(state.expenses));
    updateSyncStatus();
    renderTabContent();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) fetchAllData();
  } catch (e) {
    alert('Server error');
  }
}

function editExpense(id) {
  openExpenseModal(id);
}

function viewReceipt(id) {
  const exp = state.expenses.find(e => e.id === id);
  if (exp && exp.receipt_image) {
    const w = window.open();
    w.document.write(`<img src="${exp.receipt_image}" alt="Uploaded expense receipt" style="max-width: 100%; max-height: 100vh; margin: auto; display: block;" />`);
  }
}

function clearExpensesFilters() {
  document.getElementById('filter-search').value = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-payment').value = '';
  document.getElementById('filter-sort').value = 'date_desc';
  document.getElementById('filter-min-amount').value = '';
  document.getElementById('filter-max-amount').value = '';
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('filter-start-date').value = `${year}-${month}-01`;
  
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  document.getElementById('filter-end-date').value = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  
  renderExpensesList();
}

function toggleExpensesFilters() {
  const content = document.getElementById('expenses-filters-content');
  const chevron = document.getElementById('filter-chevron-icon');
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  } else {
    content.classList.add('hidden');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  }
}

// Initialize expense filter inputs to current month
window.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  const startInput = document.getElementById('filter-start-date');
  if (startInput) startInput.value = `${year}-${month}-01`;
  
  const endInput = document.getElementById('filter-end-date');
  if (endInput) {
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    endInput.value = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  }
});

async function showAddPaymentMethodPrompt() {
  const name = prompt("Enter new payment method name (e.g. UPI-KVB, UPI SBI):");
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;

  try {
    const headers = {
      'Authorization': `Bearer ${state.token}`
    };
    const res = await fetch(`${API_BASE}/payment-methods?name=${encodeURIComponent(trimmed)}`, {
      method: 'POST',
      headers
    });
    if (res.ok) {
      await fetchAllData();
      document.getElementById('expense-payment').value = trimmed;
    } else {
      const err = await res.json();
      alert(err.detail || "Failed to add payment method");
    }
  } catch (error) {
    console.error(error);
    alert("Connection error occurred");
  }
}

async function showAddCategoryPrompt() {
  const name = prompt("Enter new category name:");
  if (!name) return;
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const color = prompt("Enter category color (e.g. #3b82f6 or name):", "#3b82f6");
  const trimmedColor = (color || "#3b82f6").trim();

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    };
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: trimmedName, color: trimmedColor })
    });
    if (res.ok) {
      await fetchAllData();
      document.getElementById('expense-category').value = trimmedName;
    } else {
      const err = await res.json();
      alert(err.detail || "Failed to add category");
    }
  } catch (error) {
    console.error(error);
    alert("Connection error occurred");
  }
}
