import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

const LostTaskReport = () => {
  const [activeTab, setActiveTab] = useState('leads');
  const [lostLeads, setLostLeads] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ lostValue: 0, completedCount: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'leads') {
        const res = await api.get('leads/?only_final=true&limit=100');
        const data = Array.isArray(res.data.results) ? res.data.results : [];
        setLostLeads(data);
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
    fetchData();
  }, [activeTab]);

  const renderLeadsTable = () => (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Lead Name</th>
            <th>Contact</th>
            <th>Company</th>
            <th>Deal Value</th>
            <th>Status</th>
            <th>Archived On</th>
          </tr>
        </thead>
        <tbody>
          {lostLeads.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No archived leads found.</td></tr>
          ) : lostLeads.map(lead => (
            <tr key={lead.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', background: 'var(--bg-tertiary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} />
                  </div>
                  <span style={{ fontWeight: '600' }}>{lead.name}</span>
                </div>
              </td>
              <td style={{ fontSize: '13px' }}>
                <div>{lead.email}</div>
                <div style={{ opacity: 0.7 }}>{lead.phone}</div>
              </td>
              <td>{lead.company || '-'}</td>
              <td style={{ fontWeight: '700' }}>₹{parseFloat(lead.deal_value || 0).toLocaleString('en-IN')}</td>
              <td>
                <span style={{ padding: '4px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                  {lead.stage_name.toUpperCase()}
                </span>
              </td>
              <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {new Date(lead.updated_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
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
        <p style={{ color: 'var(--text-secondary)' }}>Centralized view for finalized leads and closed operational tasks.</p>
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
