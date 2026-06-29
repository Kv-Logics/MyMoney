// TASK MANAGER DASHBOARD COMPONENT

let taskChecklistDraft = [];

function openTaskModal(editingId = null) {
  if (state.activeOwner) return;
  const modal = document.getElementById('modal-task');
  modal.classList.remove('hidden');
  
  // Reset form
  document.getElementById('task-id').value = '';
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-category').value = 'Personal';
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-due-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('task-due-time').value = '';
  document.getElementById('task-notes').value = '';
  document.getElementById('checklist-item-input').value = '';
  
  taskChecklistDraft = [];

  if (editingId) {
    document.getElementById('modal-task-title').innerText = 'Modify Task Details';
    const task = state.tasks.find(t => t.id === editingId);
    if (task) {
      document.getElementById('task-id').value = task.id;
      document.getElementById('task-title').value = task.title;
      document.getElementById('task-desc').value = task.description || '';
      document.getElementById('task-category').value = task.category;
      document.getElementById('task-priority').value = task.priority;
      document.getElementById('task-due-date').value = task.due_date;
      document.getElementById('task-due-time').value = task.due_time || '';
      document.getElementById('task-notes').value = task.notes || '';
      taskChecklistDraft = JSON.parse(JSON.stringify(task.checklist || []));
    }
  } else {
    document.getElementById('modal-task-title').innerText = 'Create New Task';
  }

  renderDraftChecklist();
}

function closeTaskModal() {
  document.getElementById('modal-task').classList.add('hidden');
}

function addChecklistItemToDraft() {
  const input = document.getElementById('checklist-item-input');
  const text = input.value.trim();
  if (!text) return;

  taskChecklistDraft.push({
    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    text: text,
    completed: false
  });
  input.value = '';
  renderDraftChecklist();
}

function removeChecklistItemFromDraft(itemId) {
  taskChecklistDraft = taskChecklistDraft.filter(item => item.id !== itemId);
  renderDraftChecklist();
}

function renderDraftChecklist() {
  const container = document.getElementById('modal-checklist-container');
  const counter = document.getElementById('task-checklist-counter');
  
  container.innerHTML = '';
  counter.innerText = `${taskChecklistDraft.length} items`;

  taskChecklistDraft.forEach((item) => {
    container.innerHTML += `
      <div class="flex items-center justify-between bg-slate-900/50 border border-slate-800/40 rounded-lg p-2 text-xs">
        <span class="text-slate-300 truncate pr-2">${escapeHTML(item.text)}</span>
        <button type="button" onclick="removeChecklistItemFromDraft('${item.id}')" class="text-rose-400 hover:text-rose-300 p-0.5">
          <i data-lucide="trash" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
  });
  
  lucide.createIcons();
}

async function handleTaskSubmit(e) {
  e.preventDefault();
  if (state.activeOwner) return;

  const id = document.getElementById('task-id').value;
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const category = document.getElementById('task-category').value;
  const priority = document.getElementById('task-priority').value;
  const due_date = document.getElementById('task-due-date').value;
  const due_time = document.getElementById('task-due-time').value;
  const notes = document.getElementById('task-notes').value.trim();

  const payload = {
    title,
    description,
    category,
    priority,
    due_date,
    due_time,
    notes,
    checklist: taskChecklistDraft
  };

  try {
    let res;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.token}`
    };

    if (id) {
      res = await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      closeTaskModal();
      await fetchTasksData();
      renderTasks();
    } else {
      const errData = await res.json();
      alert(errData.detail || 'Failed to save task');
    }
  } catch (err) {
    alert('Server communication error');
  }
}

async function fetchTasksData() {
  const ownerQuery = state.activeOwner ? `?owner_email=${encodeURIComponent(state.activeOwner.owner_email)}` : '';
  try {
    const res = await fetch(`${API_BASE}/tasks${ownerQuery}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) {
      state.tasks = await res.json();
    }
  } catch (err) {
    console.error('Offline / Failed to fetch tasks:', err);
  }
}

async function toggleTaskChecklistItem(taskId, itemId, completed) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const updatedChecklist = task.checklist.map(item => {
    if (item.id === itemId) {
      return { ...item, completed };
    }
    return item;
  });

  try {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ checklist: updatedChecklist })
    });

    if (res.ok) {
      const updatedTask = await res.json();
      // Update local task state
      state.tasks = state.tasks.map(t => t.id === taskId ? updatedTask : t);
      renderTasks();
      
      // Trigger confetti on full task completion!
      if (updatedTask.status === 'Completed' && task.status !== 'Completed') {
        confetti({ particleCount: 50, spread: 40 });
      }
    }
  } catch (err) {
    console.error(err);
  }
}

async function deleteTask(id) {
  if (state.activeOwner) return;
  if (!confirm('Are you sure you want to delete this task?')) return;

  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) {
      state.tasks = state.tasks.filter(t => t.id !== id);
      renderTasks();
    }
  } catch (err) {
    alert('Failed to delete task');
  }
}

function editTask(id) {
  openTaskModal(id);
}

function renderTasks() {
  const container = document.getElementById('tasks-list-container');
  if (!container) return;

  container.innerHTML = '';

  const catFilter = document.getElementById('task-filter-category').value;
  const prioFilter = document.getElementById('task-filter-priority').value;
  const statFilter = document.getElementById('task-filter-status').value;

  const filteredTasks = state.tasks.filter(task => {
    if (catFilter && task.category !== catFilter) return false;
    if (prioFilter && task.priority !== prioFilter) return false;
    if (statFilter && task.status !== statFilter) return false;
    return true;
  });

  if (filteredTasks.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
        <i data-lucide="check-square" class="w-8 h-8 opacity-50"></i>
        <span>No tasks found matches the filters</span>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  filteredTasks.forEach(task => {
    // Priority class styling
    let prioBadgeClass = '';
    if (task.priority === 'high') {
      prioBadgeClass = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
    } else if (task.priority === 'medium') {
      prioBadgeClass = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    } else {
      prioBadgeClass = 'bg-slate-500/10 border-slate-500/20 text-slate-400';
    }

    // Status classes
    let statusClass = 'text-slate-400 border-slate-800/80';
    if (task.status === 'Completed') {
      statusClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    } else if (task.status === 'Overdue') {
      statusClass = 'bg-rose-500/20 border-rose-500/30 text-rose-400 font-bold';
    } else if (task.status === 'In Progress') {
      statusClass = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
    }

    // Checklist progress calculation
    const progress = Math.round(task.progress || 0);

    // Build checklist HTML
    let checklistHtml = '';
    if (task.checklist && task.checklist.length > 0) {
      checklistHtml += `<div class="space-y-1.5 mt-3 pt-3 border-t border-slate-800/40">`;
      task.checklist.forEach(item => {
        const checkedAttr = item.completed ? 'checked' : '';
        const disabledAttr = state.activeOwner ? 'disabled' : '';
        const textClass = item.completed ? 'line-through text-slate-500' : 'text-slate-300';
        checklistHtml += `
          <label class="flex items-center gap-2 text-[11px] cursor-pointer">
            <input type="checkbox" ${checkedAttr} ${disabledAttr} 
              onchange="toggleTaskChecklistItem('${task.id}', '${item.id}', this.checked)" 
              class="w-3.5 h-3.5 rounded border-slate-800 bg-slate-900 text-brand-500 focus:ring-0 focus:ring-offset-0">
            <span class="${textClass} truncate">${escapeHTML(item.text)}</span>
          </label>
        `;
      });
      checklistHtml += `</div>`;
    }

    // Action buttons (hide if shared read-only tracker)
    const actionsHtml = state.activeOwner ? '' : `
      <div class="flex items-center justify-end gap-2 border-t border-slate-900/60 pt-3 mt-4">
        <button onclick="editTask('${task.id}')" class="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold">
          <i data-lucide="edit" class="w-3 h-3"></i>
          <span>Update</span>
        </button>
        <span class="text-slate-700">|</span>
        <button onclick="deleteTask('${task.id}')" class="text-xs text-rose-400 hover:underline flex items-center gap-1 font-semibold">
          <i data-lucide="trash-2" class="w-3 h-3"></i>
          <span>Delete</span>
        </button>
      </div>
    `;

    container.innerHTML += `
      <div class="glass rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between space-y-3">
        <div>
          <!-- Header info -->
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] px-2 py-0.5 rounded-full border ${prioBadgeClass} uppercase font-bold tracking-wider">${task.priority}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full border ${statusClass}">${task.status}</span>
          </div>

          <h4 class="font-bold text-white text-sm truncate">${escapeHTML(task.title)}</h4>
          ${task.description ? `<p class="text-xs text-slate-500 mt-1 line-clamp-2">${escapeHTML(task.description)}</p>` : ''}
          
          <div class="flex items-center justify-between text-[10px] text-slate-400 mt-3 font-semibold">
            <span class="flex items-center gap-1"><i data-lucide="folder" class="w-3 h-3 text-slate-500"></i> ${escapeHTML(task.category)}</span>
            <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3 text-slate-500"></i> ${escapeHTML(task.due_date)}</span>
          </div>

          <!-- Progress bar -->
          <div class="space-y-1 mt-3">
            <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div class="h-full rounded-full bg-brand-500 transition-all duration-300" style="width: ${progress}%"></div>
            </div>
            <div class="flex items-center justify-between text-[9px] text-slate-500 font-bold">
              <span>Progress</span>
              <span>${progress}%</span>
            </div>
          </div>

          ${checklistHtml}
          
          ${task.notes ? `<p class="text-[10px] text-slate-600 italic mt-3 bg-slate-900/20 p-2 rounded-lg border border-slate-800/10">${escapeHTML(task.notes)}</p>` : ''}
        </div>
        
        ${actionsHtml}
      </div>
    `;
  });

  lucide.createIcons();
}

// Prevent form submit when pressing Enter in checklist item input
document.addEventListener('keydown', function(e) {
  if (e.target && e.target.id === 'checklist-item-input' && e.key === 'Enter') {
    e.preventDefault();
    addChecklistItemToDraft();
  }
});

