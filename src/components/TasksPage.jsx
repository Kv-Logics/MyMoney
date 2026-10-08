import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckSquare, Plus, Folder, Calendar, Edit3, Trash2, X } from 'lucide-react';

export default function TasksPage() {
  const { tasks, setTasks, showConfirm } = useApp();
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Work');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('30/06/2026');

  const handleDeleteTask = async (id) => {
    const confirmed = await showConfirm(
      'Are you sure you want to delete this task?',
      'Delete Task',
      'Delete',
      true
    );
    if (!confirmed) return;

    setTasks(prev => prev.filter(t => (t.id || t._id) !== id));
  };

  const handleToggleCheck = (taskId, itemIdx) => {
    setTasks(prev => prev.map(t => {
      if ((t.id || t._id) === taskId && t.items) {
        const newItems = [...t.items];
        newItems[itemIdx].done = !newItems[itemIdx].done;
        const doneCount = newItems.filter(i => i.done).length;
        const newPct = Math.round((doneCount / newItems.length) * 100);
        return { ...t, items: newItems, progress: newPct };
      }
      return t;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-white">Tasks</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize and track tasks, checklists, and daily activities alongside expenses
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs">
            <option value="">All Categories</option>
            <option value="Work">Work</option>
            <option value="Study">Study</option>
          </select>

          <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs">
            <option value="">All Priorities</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
          </select>

          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs">
            <option value="">All Statuses</option>
            <option value="Overdue">Overdue</option>
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition shrink-0"
          >
            <Plus className="w-4 h-4" /> Add New Task
          </button>
        </div>
      </div>

      {/* Task Cards Grid (Exact matching Screenshot 7) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tasks.map(t => (
          <div key={t.id || t._id} className="app-card space-y-4">
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                t.priority === 'HIGH' ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'
              }`}>
                {t.priority}
              </span>

              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-500 border border-rose-200">
                {t.status || 'Overdue'}
              </span>
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">{t.title}</h4>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <div className="flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5" />
                  <span>{t.category || 'Work'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{t.due_date}</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${t.progress}%` }}></div>
              </div>
              <span className="text-[10px] text-slate-400 font-bold block text-right mt-1">{t.progress}%</span>
            </div>

            {/* Checklist items */}
            {t.items && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {t.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggleCheck(t.id || t._id, idx)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-500"
                    />
                    <span className={item.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 text-xs">
              <button className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1">
                <Edit3 className="w-3.5 h-3.5" /> Update
              </button>
              <button onClick={() => handleDeleteTask(t.id || t._id)} className="text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    {/* Create Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal max-w-md w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Create New Task</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const newTask = {
                id: Date.now().toString(),
                title,
                category,
                priority,
                due_date: dueDate,
                status: 'Pending',
                progress: 0,
                items: []
              };
              setTasks(prev => [...prev, newTask]);
              setIsModalOpen(false);
              setTitle('');
              setCategory('Work');
              setPriority('MEDIUM');
              setDueDate(new Date().toISOString().split('T')[0]);
            }} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Pay electricity bill"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="Work">Work</option>
                    <option value="Study">Study</option>
                    <option value="Personal">Personal</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Save Task
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
