import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Megaphone, Users, Calendar, BarChart3,
  MoreVertical, Edit2, Trash2, X, Check, Search,
  TrendingUp, Target, DollarSign
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const Campaigns = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planned',
    budget: 0,
    assigned_users: [],
    start_date: '',
    end_date: '',
    collect_demographics: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campRes, userRes] = await Promise.all([
        api.get('campaigns/'),
        api.get('users/')
      ]);
      setCampaigns(campRes.data);
      setUsers(userRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Clean data before sending
      const submissionData = {
        ...formData,
        budget: parseFloat(formData.budget) || 0,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      if (editingCampaign) {
        await api.put(`campaigns/${editingCampaign.id}/`, submissionData);
      } else {
        await api.post('campaigns/', submissionData);
      }
      fetchData();
      setIsModalOpen(false);
      toast.success(editingCampaign ? 'Campaign updated' : 'Campaign created');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save campaign';
      toast.error(msg);
    }
  };

  const handleEdit = (camp) => {
    setEditingCampaign(camp);
    setFormData({
      name: camp.name,
      description: camp.description || '',
      status: camp.status,
      budget: camp.budget,
      assigned_users: camp.assigned_users || [],
      start_date: camp.start_date || '',
      end_date: camp.end_date || '',
      collect_demographics: camp.collect_demographics !== false
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await api.delete(`campaigns/${id}/`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      active: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
      paused: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308' },
      completed: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
      planned: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' }
    };
    const style = colors[status] || colors.planned;
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        background: style.bg,
        color: style.text
      }}>
        {status}
      </span>
    );
  };

  return (
    <div className="page-container">
      <header className="page-header-responsive" style={{ marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Marketing Campaigns</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Organize leads and assign teams to specific outreach initiatives.</p>
        </div>
        {(user?.role === 'admin' || user?.permissions?.campaigns?.create) && (
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
            onClick={() => {
              setEditingCampaign(null);
              setFormData({ name: '', description: '', status: 'planned', budget: 0, assigned_users: [], start_date: '', end_date: '' });
              setIsModalOpen(true);
            }}
          >
            <Plus size={20} /> New Campaign
          </button>
        )}
      </header>

      {/* Stats row */}
      <div className="stat-grid" style={{ marginBottom: '40px' }}>
        {[
          { label: 'Active Campaigns', value: campaigns.filter(c => c.status === 'active').length, icon: Megaphone, color: '#3b82f6' },
          { label: 'Total Leads Associated', value: campaigns.reduce((acc, c) => acc + (c.lead_count || 0), 0), icon: Target, color: '#22c55e' },
          { label: 'Total Budgeted', value: `₹${campaigns.reduce((acc, c) => acc + parseFloat(c.budget), 0).toLocaleString()}`, icon: DollarSign, color: '#f59e0b' }
        ].map((stat, i) => (
          <div key={i} className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{stat.label}</p>
                <h3 style={{ fontSize: '24px', fontWeight: '800' }}>{stat.value}</h3>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                <stat.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="responsive-grid">
        {loading ? (
          <p>Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px' }}>
            <Megaphone size={48} style={{ margin: '0 auto 20px', opacity: 0.2 }} />
            <h3>No campaigns created yet</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Click "New Campaign" to start your first marketing push.</p>
          </div>
        ) : campaigns.map(camp => (
          <motion.div
            layout
            key={camp.id}
            className="glass-card"
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <StatusBadge status={camp.status} />
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginTop: '12px', marginBottom: '4px' }}>{camp.name}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', minHeight: '40px' }}>{camp.description || 'No description provided.'}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(user?.role === 'admin' || user?.permissions?.campaigns?.edit) && (
                  <button onClick={() => handleEdit(camp)} style={{ background: 'none', color: 'var(--text-secondary)' }}><Edit2 size={16} /></button>
                )}
                {(user?.role === 'admin' || user?.permissions?.campaigns?.delete) && (
                  <button onClick={() => handleDelete(camp.id)} style={{ background: 'none', color: 'var(--danger)' }}><Trash2 size={16} /></button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div
                style={{ flex: 1, cursor: 'pointer' }}
                onClick={() => navigate(`/leads?campaign=${camp.id}`)}
                title="View leads in this campaign"
              >
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Assigned Leads</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={14} color="var(--brand-blue)" />
                  <span style={{ fontWeight: '700', borderBottom: '1px dashed var(--brand-blue)' }}>{camp.lead_count || 0}</span>
                </div>
              </div>
              {user?.role !== 'agent' && (
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Budget Alloc.</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={14} color="#22c55e" />
                    <span style={{ fontWeight: '700' }}>${camp.budget}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 'auto' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Team Members</p>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {camp.assigned_users_details?.map((u, i) => (
                  <div
                    key={u.id}
                    title={u.username}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)',
                      border: '2px solid white', marginLeft: i === 0 ? 0 : '-8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700'
                    }}
                  >
                    {u.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                ))}
                {(!camp.assigned_users_details || camp.assigned_users_details.length === 0) && (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Unassigned</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h2>{editingCampaign ? 'Update Campaign' : 'Configure New Campaign'}</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none' }}><X size={24} /></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Campaign Name</label>
                    <input
                      required className="glass-input" placeholder="e.g. Summer 2024 Retargeting"
                      value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Description</label>
                    <textarea
                      className="glass-input" placeholder="Goal of this campaign..." style={{ minHeight: '80px' }}
                      value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Status</label>
                      <select className="glass-input" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                        <option value="planned">Planned</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Budget ($)</label>
                      <input
                        type="number" className="glass-input"
                        value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Assign Team Members</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                      {users.map(u => (
                        <div
                          key={u.id}
                          onClick={() => {
                            const current = [...formData.assigned_users];
                            if (current.includes(u.id)) {
                              setFormData({ ...formData, assigned_users: current.filter(id => id !== u.id) });
                            } else {
                              setFormData({ ...formData, assigned_users: [...current, u.id] });
                            }
                          }}
                          style={{
                            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: formData.assigned_users.includes(u.id) ? 'var(--brand-blue)' : 'var(--bg-tertiary)',
                            color: formData.assigned_users.includes(u.id) ? 'white' : 'var(--text-primary)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {u.username} {formData.assigned_users.includes(u.id) && <Check size={12} />}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
                    <input 
                      type="checkbox" 
                      id="collect_demographics" 
                      checked={formData.collect_demographics} 
                      onChange={e => setFormData({ ...formData, collect_demographics: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--brand-blue)' }}
                    />
                    <label htmlFor="collect_demographics" style={{ fontSize: '13px', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}>
                      Collect Student Demographics (Age, Place, Qualification)
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Start Date</label>
                      <input
                        type="date" className="glass-input"
                        value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>End Date</label>
                      <input
                        type="date" className="glass-input"
                        value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ flex: 2 }}>{editingCampaign ? 'Save Changes' : 'Create Campaign'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Campaigns;
