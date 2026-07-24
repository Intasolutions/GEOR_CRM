import React, { useState, useEffect } from 'react';
import { Play, Plus, Zap, Trash2, Edit3, CheckCircle2, AlertCircle, Clock, X, ChevronRight, Activity } from 'lucide-react';
import api from '../api/client';
import { toast } from 'react-hot-toast';

const WorkflowSettings = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [stages, setStages] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'stage_change',
    trigger_value: '',
    action_type: 'update_stage',
    action_data: {},
    is_active: true
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    fetchWorkflows();
    fetchStages();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await api.get('workflows/');
      setWorkflows(res.data);
    } catch (err) {
      toast.error('Failed to fetch workflows');
    } finally {
      setLoading(false);
    }
  };

  const fetchStages = async () => {
    try {
      const res = await api.get('stages/');
      setStages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingWorkflow) {
        await api.put(`workflows/${editingWorkflow.id}/`, formData);
        toast.success('Workflow updated');
      } else {
        await api.post('workflows/', formData);
        toast.success('Workflow created');
      }
      setIsModalOpen(false);
      fetchWorkflows();
      resetForm();
    } catch (err) {
      toast.error('Error saving workflow');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      trigger_type: 'stage_change',
      trigger_value: '',
      action_type: 'update_stage',
      action_data: {},
      is_active: true
    });
    setEditingWorkflow(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this workflow?')) {
      try {
        await api.delete(`workflows/${id}/`);
        toast.success('Workflow deleted');
        fetchWorkflows();
      } catch (err) {
        toast.error('Error deleting workflow');
      }
    }
  };

  const toggleStatus = async (workflow) => {
    try {
      await api.patch(`workflows/${workflow.id}/`, { is_active: !workflow.is_active });
      fetchWorkflows();
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const renderWorkflowCards = () => (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))', 
      gap: '20px' 
    }}>
      {workflows.map(wf => (
        <div key={wf.id} className="glass-card" style={{ 
          padding: '24px', 
          borderLeft: wf.is_active ? '4px solid #10b981' : '4px solid #9ca3af',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          background: 'white',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                background: wf.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)', 
                borderRadius: '10px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Zap size={22} color={wf.is_active ? '#10b981' : '#9ca3af'} />
              </div>
              <div>
                <h3 style={{ fontWeight: '700', fontSize: '16px', margin: 0, color: 'var(--brand-blue)' }}>{wf.name}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                   Created {new Date(wf.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '11px', 
                  fontWeight: '800',
                  background: wf.is_active ? '#dcfce7' : '#f3f4f6',
                  color: wf.is_active ? '#166534' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: wf.is_active ? '#10b981' : '#9ca3af' }}></div>
                  {wf.is_active ? 'ACTIVE' : 'PAUSED'}
                </div>
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '12px', 
            marginBottom: '24px', 
            background: 'var(--bg-secondary)', 
            padding: '16px', 
            borderRadius: '12px',
            border: '1px dashed var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-blue)' }}></div>
               <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800' }}>When...</span>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>
                    {wf.trigger_type === 'stage_change' ? 'Stage moves to ' : wf.trigger_type === 'lead_created' ? 'A new lead is ' : 'Lead is '}
                    <span style={{ color: 'var(--brand-blue)' }}>
                      {wf.trigger_type === 'stage_change' ? (stages.find(s => s.id == wf.trigger_value)?.name || 'Any Stage') : wf.trigger_type === 'lead_created' ? 'Created' : 'Inactive'}
                    </span>
                  </div>
               </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0', opacity: 0.3 }}>
               <ChevronRight size={16} style={{ transform: 'rotate(90deg)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
               <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800' }}>Then...</span>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>
                    {wf.action_type === 'update_stage' ? 'Update stage to ' : wf.action_type === 'create_task' ? 'Create follow-up: ' : 'Send alert'}
                    <span style={{ color: '#10b981' }}>
                      {wf.action_type === 'update_stage' ? (stages.find(s => s.id == wf.action_data.stage_id)?.name || 'Next Stage') : wf.action_type === 'create_task' ? wf.action_data.note : ''}
                    </span>
                  </div>
               </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
                onClick={() => toggleStatus(wf)}
                className="btn-secondary" 
                style={{ flex: 1.5, fontSize: '13px', fontWeight: '600' }}
            >
               {wf.is_active ? 'Pause Automation' : 'Resume Automation'}
            </button>
            <button 
                onClick={() => { setEditingWorkflow(wf); setFormData(wf); setIsModalOpen(true); }} 
                className="btn-secondary" 
                style={{ flex: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
                <Edit3 size={15} /> Edit
            </button>
            <button 
                onClick={() => handleDelete(wf.id)} 
                className="btn-secondary" 
                style={{ color: 'var(--danger)', padding: '10px' }}
            >
                <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page-container">
      <header style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '32px', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', marginBottom: '4px' }}>Sales Automation</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Automate repetitive tasks with workflow rules.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
        >
          <Plus size={20} /> New Workflow
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading Automations...</div>
      ) : workflows.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
          <Zap size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No workflows defined yet.</p>
        </div>
      ) : (
        renderWorkflowCards()
      )}

      {isModalOpen && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
          display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', 
          justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' 
        }}>
          <div className="glass-card" style={{ 
            width: isMobile ? '100%' : '500px', 
            padding: isMobile ? '24px 20px 40px' : '32px',
            borderRadius: isMobile ? '24px 24px 0 0' : '16px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px' }}>{editingWorkflow ? 'Edit Workflow' : 'New Workflow'}</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '800', color: 'var(--brand-blue)' }}>WORKFLOW NAME</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Auto-follow up on New Lead"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '800', color: 'var(--brand-blue)' }}>TRIGGER</label>
                  <select 
                    className="glass-input"
                    value={formData.trigger_type}
                    onChange={e => setFormData({...formData, trigger_type: e.target.value})}
                  >
                    <option value="lead_created">Lead Created</option>
                    <option value="stage_change">Stage Changed</option>
                  </select>
                </div>
                {formData.trigger_type === 'stage_change' && (
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '800', color: 'var(--brand-blue)' }}>TO STAGE</label>
                    <select 
                      className="glass-input"
                      value={formData.trigger_value}
                      onChange={e => setFormData({...formData, trigger_value: e.target.value})}
                    >
                      <option value="">Any Stage</option>
                      {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(30, 58, 138, 0.03)', borderRadius: '12px', border: '1px solid rgba(30, 58, 138, 0.1)' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: '800', color: 'var(--brand-blue)' }}>AUTOMATED ACTION</label>
                <select 
                  className="glass-input"
                  style={{ marginBottom: '16px' }}
                  value={formData.action_type}
                  onChange={e => setFormData({...formData, action_type: e.target.value})}
                >
                  <option value="update_stage">Update Stage</option>
                  <option value="create_task">Create Task/Reminder</option>
                </select>

                {formData.action_type === 'update_stage' && (
                  <select 
                    className="glass-input"
                    value={formData.action_data.stage_id || ''}
                    onChange={e => setFormData({...formData, action_data: { ...formData.action_data, stage_id: e.target.value }})}
                  >
                    <option value="">Select Target Stage</option>
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}

                {formData.action_type === 'create_task' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="Task Note"
                      value={formData.action_data.note || ''}
                      onChange={e => setFormData({...formData, action_data: { ...formData.action_data, note: e.target.value }})}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Delay:</span>
                        <input 
                        type="number" 
                        className="glass-input" 
                        style={{ width: '80px' }}
                        placeholder="Delay (h)"
                        value={formData.action_data.delay_hours || ''}
                        onChange={e => setFormData({...formData, action_data: { ...formData.action_data, delay_hours: parseInt(e.target.value) }})}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>hours</span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="workflow-active"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="workflow-active" style={{ fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Active / Published</label>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowSettings;
