import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { 
  Archive, 
  CheckCircle2, 
  Trash2, 
  Clock, 
  User, 
  Mail, 
  Phone,
  BarChart3,
  Calendar,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const LostTaskReport = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('leads');
  const [lostLeads, setLostLeads] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ lostValue: 0, completedCount: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'leads') {
        const [leadsRes, usersRes] = await Promise.all([
          api.get('leads/?only_final=true&limit=100'),
          api.get('users/')
        ]);
        const data = Array.isArray(leadsRes.data.results) ? leadsRes.data.results : [];
        setLostLeads(data);
        setUsers(usersRes.data || []);
        const totalValue = data.reduce((sum, l) => sum + parseFloat(l.deal_value || 0), 0);
        setStats(prev => ({ ...prev, lostValue: totalValue }));
      } else {
        const res = await api.get('internal-tasks/?only_completed=true&limit=100');
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setCompletedTasks(data);
        setStats(prev => ({ ...prev, completedCount: data.length }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedLeads([]);
    fetchData();
  }, [activeTab]);

  const toggleSelectAll = () => {
    if (selectedLeads.length === lostLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(lostLeads.map(l => l.id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(sid => sid !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  };

  const handleBulkAssign = async () => {
    if (!targetUserId) {
      toast.error('Please choose an agent to assign.');
      return;
    }
    setAssigning(true);
    try {
      await Promise.all(selectedLeads.map(id => api.patch(`leads/${id}/`, { assigned_to: targetUserId })));
      toast.success(`Successfully assigned ${selectedLeads.length} leads!`);
      setSelectedLeads([]);
      setTargetUserId('');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign one or more leads.');
    } finally {
      setAssigning(false);
    }
  };

  const renderLeadsTable = () => (
    <div className="table-container">
      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedLeads.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              padding: '12px 20px',
              background: '#eff6ff',
              borderBottom: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: '#1e40af' }}>
              <UserCheck size={18} />
              <span>{selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#0f172a',
                  outline: 'none'
                }}
              >
                <option value="">Select Assignee...</option>
                {users.map(u => {
                  const isLst = u.is_lst_agent || (u.username || '').toLowerCase().includes('lst');
                  return (
                    <option key={u.id} value={u.id}>
                      {u.username}{isLst ? ' ⭐ (Lost Leads Agent)' : ''}
                    </option>
                  );
                })}
              </select>

              <button
                onClick={handleBulkAssign}
                disabled={assigning}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  background: 'var(--brand-blue, #2563eb)',
                  color: 'white',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {assigning ? 'Assigning...' : 'Assign Selected'}
              </button>

              <button
                onClick={() => setSelectedLeads([])}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <input 
                type="checkbox"
                checked={lostLeads.length > 0 && selectedLeads.length === lostLeads.length}
                onChange={toggleSelectAll}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th>Lead Name</th>
            <th>Contact</th>
            <th>Company</th>
            <th>Assigned To</th>
            <th>Deal Value</th>
            <th>Status</th>
            <th>Archived On</th>
          </tr>
        </thead>
        <tbody>
          {lostLeads.length === 0 ? (
            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>No archived leads found.</td></tr>
          ) : lostLeads.map(lead => {
            const isSelected = selectedLeads.includes(lead.id);
            return (
              <tr key={lead.id} style={{ background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                <td>
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectOne(lead.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td>
                  <div 
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                  >
                    <div style={{ width: '32px', height: '32px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} />
                    </div>
                    <span style={{ fontWeight: '600', color: 'var(--brand-blue, #2563eb)' }}>{lead.name}</span>
                  </div>
                </td>
                <td style={{ fontSize: '13px' }}>
                  <div>{lead.email}</div>
                  <div style={{ opacity: 0.7 }}>{lead.phone}</div>
                </td>
                <td>{lead.company || '-'}</td>
                <td>
                  {lead.assigned_to_name ? (
                    <span style={{ 
                      padding: '3px 8px', 
                      background: (lead.assigned_to_name || '').toLowerCase().includes('lst') ? '#eff6ff' : '#f1f5f9',
                      color: (lead.assigned_to_name || '').toLowerCase().includes('lst') ? '#1d4ed8' : '#334155',
                      border: (lead.assigned_to_name || '').toLowerCase().includes('lst') ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                      borderRadius: '6px', 
                      fontSize: '11px', 
                      fontWeight: '700' 
                    }}>
                      {lead.assigned_to_name}
                      {(lead.assigned_to_name || '').toLowerCase().includes('lst') && ' ⭐'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                  )}
                </td>
                <td style={{ fontWeight: '700' }}>₹{parseFloat(lead.deal_value || 0).toLocaleString('en-IN')}</td>
                <td>
                  <span style={{ padding: '4px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                    {(lead.stage_name || 'LOST').toUpperCase()}
                  </span>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {new Date(lead.updated_at).toLocaleDateString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderTasksTable = () => (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Task Title</th>
            <th>Assignee</th>
            <th>Category</th>
            <th>Completed At</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {completedTasks.length === 0 ? (
            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No completed tasks found.</td></tr>
          ) : completedTasks.map(task => (
            <tr key={task.id}>
              <td>
                <div style={{ fontWeight: '600' }}>{task.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{task.description?.substring(0, 50)}...</div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ width: '24px', height: '24px', background: 'var(--brand-blue)', color: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                     {task.assigned_to_name?.charAt(0)}
                   </div>
                   <span>{task.assigned_to_name}</span>
                </div>
              </td>
              <td style={{ textTransform: 'capitalize' }}>{task.category}</td>
              <td style={{ fontSize: '12px' }}>{task.completed_at ? new Date(task.completed_at).toLocaleDateString() : new Date(task.updated_at).toLocaleDateString()}</td>
              <td>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontWeight: '700', fontSize: '11px' }}>
                   <CheckCircle2 size={14} /> COMPLETED
                 </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="page-container" style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--brand-blue)', marginBottom: '8px' }}>Archive & Operational Reports</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Centralized view for finalized leads, re-assigning lost opportunities, and closed operational tasks.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
             <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: '#ef4444' }}><Archive size={24} /></div>
             <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Lost Deal Volume</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800' }}>₹{stats.lostValue.toLocaleString('en-IN')}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Total value of archived or lost leads</p>
        </div>
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
             <div style={{ padding: '10px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', color: 'var(--success)' }}><CheckCircle2 size={24} /></div>
             <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Completed Tasks</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800' }}>{stats.completedCount}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Operatonal tasks successfully closed</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <button 
            onClick={() => setActiveTab('leads')}
            style={{ 
              padding: '16px 24px', 
              background: activeTab === 'leads' ? 'white' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'leads' ? '2px solid var(--brand-blue)' : 'none',
              fontWeight: '700',
              cursor: 'pointer',
              color: activeTab === 'leads' ? 'var(--brand-blue)' : 'var(--text-secondary)'
            }}
          >
            Lost Leads
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            style={{ 
              padding: '16px 24px', 
              background: activeTab === 'tasks' ? 'white' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'tasks' ? '2px solid var(--brand-blue)' : 'none',
              fontWeight: '700',
              cursor: 'pointer',
              color: activeTab === 'tasks' ? 'var(--brand-blue)' : 'var(--text-secondary)'
            }}
          >
            Completed Tasks
          </button>
        </div>

        <div style={{ padding: '0' }}>
          {loading ? (
            <div style={{ padding: '100px', textAlign: 'center' }}>Loading archive data...</div>
          ) : activeTab === 'leads' ? renderLeadsTable() : renderTasksTable()}
        </div>
      </div>
    </div>
  );
};

export default LostTaskReport;
