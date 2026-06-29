// SAVINGS GOALS FORM SUBMISSIONS & UPDATE ACTIONS

function openGoalModal() {
  if (state.activeOwner) return;
  document.getElementById('modal-goal').classList.remove('hidden');
  document.getElementById('modal-goal-title').innerText = 'Create Savings Goal';
  document.getElementById('goal-id').value = '';
  document.getElementById('goal-title').value = '';
  document.getElementById('goal-target').value = '';
  document.getElementById('goal-saved').value = '0';
}

function closeGoalModal() {
  document.getElementById('modal-goal').classList.add('hidden');
}

function editGoal(id) {
  const g = state.savingsGoals.find(item => item.id === id);
  if (!g) return;
  document.getElementById('modal-goal').classList.remove('hidden');
  document.getElementById('modal-goal-title').innerText = 'Update Goal Progress';
  document.getElementById('goal-id').value = g.id;
  document.getElementById('goal-title').value = g.title;
  document.getElementById('goal-target').value = g.target_amount;
  document.getElementById('goal-saved').value = g.saved_amount;
}

async function handleGoalSubmit(e) {
  e.preventDefault();
  if (state.activeOwner) return;

  const id = document.getElementById('goal-id').value;
  const title = document.getElementById('goal-title').value.trim();
  const target_amount = parseFloat(document.getElementById('goal-target').value);
  const saved_amount = parseFloat(document.getElementById('goal-saved').value);

  const payload = { title, target_amount, saved_amount };

  try {
    let res;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    };
    if (id) {
      res = await fetch(`${API_BASE}/savings/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/savings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      if (saved_amount >= target_amount) {
        confetti({ particleCount: 100, spread: 80 });
      }
      closeGoalModal();
      fetchAllData();
    }
  } catch (err) {
    alert('Failed to save savings goal details');
  }
}

async function deleteGoal(id) {
  if (state.activeOwner) return;
  if (!confirm('Are you sure you want to delete this savings goal?')) return;
  try {
    const res = await fetch(`${API_BASE}/savings/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) fetchAllData();
  } catch (e) {
    alert('Failed to delete savings goal');
  }
}

async function quickAddGoalMoney(id) {
  if (state.activeOwner) return;
  const g = state.savingsGoals.find(item => item.id === id);
  if (!g) return;

  const input = prompt(`Add money to "${g.title}" (Current saved: ${state.settings.currency} ${g.saved_amount.toLocaleString()})\nEnter amount to add:`);
  if (!input) return;
  
  const amount = parseFloat(input);
  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid positive number.");
    return;
  }

  const oldSaved = g.saved_amount;
  const newSaved = oldSaved + amount;
  
  // Optimistic UI Update
  g.saved_amount = newSaved;
  renderSavingsGoals();

  if (newSaved >= g.target_amount && oldSaved < g.target_amount) {
    confetti({ particleCount: 100, spread: 80 });
  }

  const payload = {
    title: g.title,
    target_amount: g.target_amount,
    saved_amount: newSaved
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    };
    const res = await fetch(`${API_BASE}/savings/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      g.saved_amount = oldSaved;
      renderSavingsGoals();
      alert("Failed to save to database. Restored previous value.");
    } else {
      const updatedGoal = await res.json();
      g.saved_amount = updatedGoal.saved_amount;
      g.target_amount = updatedGoal.target_amount;
      g.title = updatedGoal.title;
      renderSavingsGoals();
    }
  } catch (err) {
    console.error(err);
    g.saved_amount = oldSaved;
    renderSavingsGoals();
    alert("Connection error. Saved value restored.");
  }
}
