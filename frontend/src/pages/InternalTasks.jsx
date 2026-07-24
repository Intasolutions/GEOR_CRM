import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar,
  User,
  Tag,
  ChevronDown,
  LayoutGrid,
  List as ListIcon,
  Flag,
  FileText,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const InternalTasks = () => {
  const { user: currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view] = useState('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState({ status: '', category: '', priority: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    category: 'admin',
    due_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const categories = [
    { value: 'finance', label: 'Finance', color: '#10b981' },
    { value: 'hr', label: 'HR', color: '#ec4899' },
    { value: 'ops', label: 'Operations', color: '#3b82f6' },
    { value: 'it', label: 'IT', color: '#6366f1' },
    { value: 'marketing', label: 'Marketing', color: '#f59e0b' },
    { value: 'legal', label: 'Legal', color: '#ef4444' },
    { value: 'admin', label: 'General Admin', color: '#6b7280' },
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: '#10b981' },
    { value: 'medium', label: 'Medium', color: '#3b82f6' },
    { value: 'high', label: 'High', color: '#f59e0b' },
    { value: 'critical', label: 'Critical', color: '#ef4444' },
  ];

  const statuses = [
    { value: 'pending', label: 'Pending', icon: Clock, color: '#64748b' },
    { value: 'ongoing', label: 'Ongoing', icon: AlertCircle, color: '#3b82f6' },
    { value: 'completed', label: 'Completed', icon: CheckCircle2, color: '#10b981' },
    { value: 'overdue', label: 'Overdue', icon: Flag, color: '#ef4444' },
  ];

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.priority) params.append('priority', filter.priority);
      if (filter.category) params.append('category', filter.category);
      
      const response = await api.get(`internal-tasks/?exclude_completed=true&${params.toString()}`);
      const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('users/');
      setUsers(Array.isArray(response.data) ? response.data : (response.data.results || []));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [filter]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('internal-tasks/', newTask);
      toast.success('Task created successfully');
      setIsModalOpen(false);
      setNewTask({
        title: '', description: '', assigned_to: '', priority: 'medium', category: 'admin',
        due_date: new Date().toISOString().split('T')[0]
      });
      fetchTasks();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleAutoRollover = async () => {
    try {
      const res = await api.post('internal-tasks/auto_rollover/');
      if (res.data.rolled_over > 0) {
        toast.success(`${res.data.rolled_over} tasks rolled over to today!`);
        fetchTasks();
      } else {
        toast.success('No tasks needed rollover.');
      }
    } catch (err) {
      toast.error('Rollover failed');
    }
  };

  const updateStatus = async (taskId, newStatus) => {
    try {
      await api.patch(`internal-tasks/${taskId}/`, { status: newStatus });
      toast.success('Status updated');
      fetchTasks();
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDragStart = (e, taskId) => {
    if (isMobile) return;
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = async (e, targetStatus) => {
    if (isMobile) return;
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) updateStatus(taskId, targetStatus);
  };

  const handleSaveNotes = async (taskId, notes) => {
    try {
      await api.patch(`internal-tasks/${taskId}/`, { notes });
      toast.success('Notes saved');
      fetchTasks();
      setIsDetailModalOpen(false);
    } catch (err) {
      toast.error('Failed to save notes');
    }
  };


  const renderListView = () => {
    if (isMobile) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tasks.map(task => {
            const categoryData = categories.find(c => c.value === task.category) || categories[categories.length - 1];
            const priorityData = priorities.find(p => p.value === task.priority) || priorities[0];
            const statusData = statuses.find(s => s.value === task.status) || statuses[0];
            return (
              <div 
                key={task.id} 
                className="glass-card" 
                onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }} 
                style={{ 
                  padding: '16px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  borderLeft: `4px solid ${priorityData.color}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--brand-blue)', marginBottom: '4px' }}>{task.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
                      {task.description?.length > 80 ? `${task.description.substring(0, 80)}...` : task.description}
                    </div>
                  </div>
                  <span style={{ 
                    fontSize: '10px', 
                    color: statusData.color, 
                    fontWeight: '800', 
                    background: `${statusData.color}12`, 
                    padding: '4px 8px', 
                    borderRadius: '6px',
                    border: `1px solid ${statusData.color}20`
                  }}>
                    {statusData.label.toUpperCase()}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                   <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: `${categoryData.color}12`, color: categoryData.color, fontWeight: '700' }}>{categoryData.label}</span>
                   <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '700', color: priorityData.color }}>
                     <Flag size={10} fill={priorityData.color} /> {priorityData.label}
                   </span>
                   {task.rollover_count > 0 && (
                     <span style={{ color: '#ef4444', fontWeight: '800', fontSize: '10px', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                       {task.rollover_count}x ROLLED
                     </span>
                   )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--brand-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700' }}>
                      {task.assigned_to_name?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{task.assigned_to_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '600' }}>
                    <Calendar size={12} />
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Assignee</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Rollover</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => {
              const categoryData = categories.find(c => c.value === task.category) || categories[categories.length - 1];
              const priorityData = priorities.find(p => p.value === task.priority) || priorities[0];
              const statusData = statuses.find(s => s.value === task.status) || statuses[0];
              return (
                <tr key={task.id} onClick={() => { setSelectedTask(task); setIsDetailModalOpen(true); }} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ fontWeight: '600' }}>{task.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{task.description?.substring(0, 50)}...</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'var(--brand-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{task.assigned_to_name?.charAt(0).toUpperCase()}</div>
                      <span>{task.assigned_to_name}</span>
                    </div>
                  </td>
                  <td><span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: `${categoryData.color}12`, color: categoryData.color, fontWeight: '600' }}>{categoryData.label}</span></td>
                  <td><span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600', color: priorityData.color }}><Flag size={12} fill={priorityData.color} /> {priorityData.label}</span></td>
                  <td>{task.rollover_count > 0 ? <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '12px' }}>{task.rollover_count}x</span> : '-'}</td>
                  <td><span style={{ fontSize: '12px', color: statusData.color, fontWeight: '700' }}>{statusData.label.toUpperCase()}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '1600px', margin: '0 auto' }}>
      <header style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '32px', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: '800', color: 'var(--brand-blue)' }}>Ops Command Center</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Professional task delegation and daily workload management.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
           <button onClick={handleAutoRollover} style={{ flex: 1, padding: '12px 20px', background: 'rgba(59, 130, 246, 0.05)', color: 'var(--brand-blue)', borderRadius: '12px', fontWeight: '700', border: '1px solid rgba(59, 130, 246, 0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
             <Clock size={18} /> Daily Sync
           </button>
           <button onClick={() => setIsModalOpen(true)} style={{ flex: 1, padding: '12px 24px', background: 'var(--accent-primary)', color: 'white', borderRadius: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)' }}>
            <Plus size={20} /> Assign Task
          </button>
        </div>
      </header>
 
      {/* Workload Matrix */}
      {!isMobile && (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '16px' }}>
          {users
            .filter(u => (currentUser?.role === 'admin' || currentUser?.role === 'manager') || u.id === currentUser?.id)
            .map(u => {
              const userTasks = tasks.filter(t => t.assigned_to === u.id && t.status !== 'completed');
              const overdue = userTasks.filter(t => t.status === 'overdue').length;
              return (
                <div key={u.id} className="glass-card" style={{ padding: '16px', minWidth: '180px', flex: '0 0 auto', border: overdue > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--brand-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>{u.username.charAt(0).toUpperCase()}</div>
                    <div style={{ fontWeight: '700', fontSize: '13px' }}>{u.id === currentUser?.id ? 'Your Workload' : u.username}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                     <div><div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>ACTIVE</div><div style={{ fontWeight: '800' }}>{userTasks.length}</div></div>
                     {overdue > 0 && <div><div style={{ fontSize: '10px', color: '#ef4444' }}>ROLLED</div><div style={{ fontWeight: '800', color: '#ef4444' }}>{overdue}</div></div>}
                  </div>
                </div>
              );
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '24px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} style={{ border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px', background: 'white', fontWeight: '600', fontSize: '13px' }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={filter.priority} onChange={e => setFilter({ ...filter, priority: e.target.value })} style={{ border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '8px', background: 'white', fontWeight: '600', fontSize: '13px' }}>
            <option value="">All Priorities</option>
            {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>Loading tasks...</div>
      ) : renderListView()}

      <AnimatePresence>
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '24px', padding: isMobile ? '24px' : '32px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800' }}>New Operation Task</h2>
                <X size={20} style={{ cursor: 'pointer' }} onClick={() => setIsModalOpen(false)} />
              </div>
              <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)' }}>TASK TITLE</label>
                  <input type="text" placeholder="e.g. Monthly Finance Audit" required value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)' }}>DESCRIPTION</label>
                  <textarea placeholder="Add details..." value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', minHeight: '100px', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)' }}>ASSIGNEE</label>
                    <select value={newTask.assigned_to} onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })} required style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '14px' }}>
                      <option value="">Select User</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                  </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)' }}>DUE DATE</label>
                    <input type="date" value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '14px' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)' }}>PRIORITY</label>
                    <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '14px' }}>
                      {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)' }}>CATEGORY</label>
                    <select value={newTask.category} onChange={e => setNewTask({ ...newTask, category: e.target.value })} style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '14px' }}>
                      {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button type="submit" style={{ flex: 1, padding: '14px', background: 'var(--brand-blue)', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Create Task</button>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isDetailModalOpen && selectedTask && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: '20px' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} style={{ background: 'white', width: '100%', maxWidth: '800px', borderRadius: '24px', padding: isMobile ? '24px' : '40px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
              <button onClick={() => setIsDetailModalOpen(false)} style={{ position: 'absolute', top: isMobile ? '16px' : '24px', right: isMobile ? '16px' : '24px', border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
              <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '800', marginBottom: '24px', paddingRight: '40px' }}>{selectedTask.title}</h2>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '32px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-tertiary)' }}>DESCRIPTION</label>
                  <p style={{ marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '14px', whiteSpace: 'pre-wrap' }}>{selectedTask.description || 'No description provided'}</p>
                  
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-tertiary)' }}>INTERNAL NOTES</label>
                  <textarea 
                    id="task-notes-edit" 
                    defaultValue={selectedTask.notes || ''} 
                    placeholder="Add progress notes..."
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', minHeight: '120px', marginBottom: '16px', fontSize: '14px' }} 
                  />
                  <button onClick={() => handleSaveNotes(selectedTask.id, document.getElementById('task-notes-edit').value)} style={{ width: '100%', padding: '14px', background: 'var(--brand-blue)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Update Task Notes</button>
                </div>
                <div style={{ width: isMobile ? '100%' : '250px' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <small style={{ color: 'var(--text-tertiary)', fontWeight: '800', display: 'block', marginBottom: '8px' }}>STATUS</small>
                      <select value={selectedTask.status} onChange={e => updateStatus(selectedTask.id, e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white', fontWeight: '600' }}>
                        {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-tertiary)', fontWeight: '800', display: 'block', marginBottom: '8px' }}>ASSIGNEE</small>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--brand-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {selectedTask.assigned_to_name ? selectedTask.assigned_to_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span style={{ fontWeight: '700', fontSize: '14px' }}>{selectedTask.assigned_to_name}</span>
                      </div>
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-tertiary)', fontWeight: '800', display: 'block', marginBottom: '8px' }}>CREATED BY</small>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedTask.created_by_name || 'System'}</span>
                      </div>
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-tertiary)', fontWeight: '800', display: 'block', marginBottom: '8px' }}>DUE DATE</small>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '14px' }}>
                        <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                        {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'No date'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InternalTasks;
