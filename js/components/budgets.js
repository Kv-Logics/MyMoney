// BUDGET LIMIT MODALS & FORM SUBMISSIONS LOGIC

function openBudgetModal(cat = 'Overall') {
  if (state.activeOwner) return;
  document.getElementById('modal-budget').classList.remove('hidden');
  document.getElementById('budget-category').value = cat;
  const existing = state.budgets.find(b => b.category === cat);
  document.getElementById('budget-amount').value = existing ? existing.amount : '';
}

function closeBudgetModal() {
  document.getElementById('modal-budget').classList.add('hidden');
}

async function handleBudgetSubmit(e) {
  e.preventDefault();
  if (state.activeOwner) return;
  const category = document.getElementById('budget-category').value;
  const amount = parseFloat(document.getElementById('budget-amount').value);

  try {
    const res = await fetch(`${API_BASE}/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ category, amount })
    });
    if (res.ok) {
      closeBudgetModal();
      fetchAllData();
    }
  } catch (err) {
    alert('Failed to update budget limit');
  }
}
