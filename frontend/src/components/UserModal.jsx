import React, { useState, useEffect } from 'react';
import { X, Shield, Mail, User, Lock, Check, Eye, Edit3, Trash2, PlusCircle } from 'lucide-react';
import api from '../api/client';

const MODULES = [
  { id: 'leads', label: 'Leads Management' },
  { id: 'pipeline', label: 'Sales Pipeline' },
  { id: 'custom_fields', label: 'Custom Fields' },
  { id: 'users', label: 'User & Roles' },
  { id: 'reports', label: 'Dashboard & Reports' },
  { id: 'campaigns', label: 'Marketing Campaigns' },
  { id: 'integrations', label: 'Integrations Hub' }
];

const ACTIONS = [
  { id: 'view', label: 'View', icon: Eye },
  { id: 'create', label: 'Create', icon: PlusCircle },
  { id: 'edit', label: 'Edit', icon: Edit3 },
  { id: 'delete', label: 'Delete', icon: Trash2 }
];

const ROLE_DEFAULTS = {
  admin: {
    leads: { view: true, create: true, edit: true, delete: true },
    pipeline: { view: true, create: true, edit: true, delete: true },
    custom_fields: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    campaigns: { view: true, create: true, edit: true, delete: true },
    integrations: { view: true, create: true, edit: true, delete: true }
  },
  manager: {
    leads: { view: true, create: true, edit: true, delete: false },
    pipeline: { view: true, create: true, edit: true, delete: false },
    custom_fields: { view: true, create: true, edit: true, delete: false },
    users: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: true, edit: true, delete: false },
    campaigns: { view: true, create: true, edit: true, delete: false },
    integrations: { view: true, create: false, edit: false, delete: false }
  },
  agent: {
    leads: { view: true, create: true, edit: true, delete: false },
    pipeline: { view: true, create: true, edit: true, delete: false },
    custom_fields: { view: true, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    campaigns: { view: true, create: false, edit: false, delete: false },
    integrations: { view: false, create: false, edit: false, delete: false }
  },
  sales: {
    leads: { view: true, create: true, edit: true, delete: true },
    pipeline: { view: true, create: true, edit: true, delete: true },
    custom_fields: { view: true, create: true, edit: true, delete: true },
    users: { view: false, create: false, edit: false, delete: false },
    reports: { view: true, create: true, edit: true, delete: true },
    campaigns: { view: true, create: true, edit: true, delete: true },
    integrations: { view: true, create: true, edit: true, delete: true }
  },
  developer: {
    leads: { view: true, create: true, edit: true, delete: true },
    pipeline: { view: true, create: true, edit: true, delete: true },
    custom_fields: { view: true, create: true, edit: true, delete: true },
    users: { view: false, create: false, edit: false, delete: false },
    reports: { view: true, create: true, edit: true, delete: true },
    campaigns: { view: true, create: true, edit: true, delete: true },
    integrations: { view: true, create: true, edit: true, delete: true }
  }
};

const UserModal = ({ isOpen, onClose, onRefresh, editingUser = null }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'agent',
    permissions: ROLE_DEFAULTS.agent
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        username: editingUser.username || '',
        email: editingUser.email || '',
        password: '',
        role: editingUser.role || 'agent',
        permissions: editingUser.permissions || {}
      });
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'agent',
        permissions: ROLE_DEFAULTS.agent
      });
    }
  }, [editingUser, isOpen]);

  const handleRoleChange = (newRole) => {
    setFormData(prev => ({
      ...prev,
      role: newRole,
      // Only auto-apply defaults for new users to avoid overwriting custom tweaks for existing ones
      permissions: !editingUser ? ROLE_DEFAULTS[newRole] : prev.permissions
    }));
  };

  const togglePermission = (moduleId, actionId) => {
    const current = { ...formData.permissions };
    if (!current[moduleId]) {
      current[moduleId] = { view: false, create: false, edit: false, delete: false };
    }
    current[moduleId][actionId] = !current[moduleId][actionId];
    setFormData({ ...formData, permissions: current });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUser) {
        await api.put(`users/${editingUser.id}/`, formData);
      } else {
        await api.post('users/', formData);
      }
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error saving user data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', padding: '32px' }}>
        <button onClick={onClose} style={{ position: 'absolute', right: '24px', top: '24px', background: 'none', color: 'var(--text-secondary)' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>{editingUser ? 'Edit System User' : 'Register New User'}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px' }}>Configure access levels and granular permissions (BRD 6.2).</p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>Identity</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input 
                  required
                  placeholder="Username"
                  className="glass-input" 
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
                <input 
                  required
                  type="email"
                  placeholder="Email Address"
                  className="glass-input" 
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>Security & Role</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {!editingUser && (
                  <input 
                    required
                    type="password"
                    placeholder="Set Password"
                    className="glass-input" 
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                )}
                <select 
                  className="glass-input" 
                  value={formData.role}
                  onChange={e => handleRoleChange(e.target.value)}
                >
                  <option value="admin">Super Admin</option>
                  <option value="manager">Dept Manager</option>
                  <option value="sales">Sales Agent</option>
                  <option value="developer">Developer</option>
                  <option value="agent">General Agent</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px' }}>Module-Based Permissions</label>
            
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <tr>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px' }}>Module Name</th>
                    {ACTIONS.map(a => (
                      <th key={a.id} style={{ padding: '12px', textAlign: 'center', fontSize: '12px' }}>{a.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(m => (
                    <tr key={m.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 20px', fontSize: '14px', fontWeight: '600' }}>{m.label}</td>
                      {ACTIONS.map(a => (
                        <td key={a.id} style={{ padding: '12px', textAlign: 'center' }}>
                          <div 
                            onClick={() => togglePermission(m.id, a.id)}
                            style={{ 
                              width: '36px', 
                              height: '20px', 
                              borderRadius: '10px', 
                              background: formData.permissions[m.id]?.[a.id] ? 'var(--success)' : 'var(--bg-tertiary)',
                              position: 'relative',
                              cursor: 'pointer',
                              margin: '0 auto',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <div style={{ 
                              width: '16px', 
                              height: '16px', 
                              borderRadius: '50%', 
                              background: 'white', 
                              position: 'absolute', 
                              top: '2px', 
                              left: formData.permissions[m.id]?.[a.id] ? '18px' : '2px',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1, height: '48px' }}>Discard</button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2, height: '48px' }}>
              {loading ? 'Saving Changes...' : editingUser ? 'Update Permissions' : 'Create System User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
