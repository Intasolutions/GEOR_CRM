import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Building, Flag, Megaphone } from 'lucide-react';
import api from '../api/client';

const LeadModal = ({ isOpen, onClose, onRefresh, editLead = null }) => {
  const [stages, setStages] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    lead_source: '',
    stage: '',
    assigned_to: '',
    deal_value: 0,
    lost_reason: '',
    custom_data: {}
  });
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.get('stages/'),
        api.get('custom-fields/'),
        api.get('users/')
      ]).then(([stagesRes, fieldsRes, usersRes]) => {
        const stageData = Array.isArray(stagesRes.data) ? stagesRes.data : [];
        const fieldData = Array.isArray(fieldsRes.data) ? fieldsRes.data : [];
        const userData = Array.isArray(usersRes.data) ? usersRes.data : [];
        
        setStages(stageData);
        setCustomFields(fieldData);
        setUsers(userData);
        
        if (editLead) {
          // Pre-fill the form with existing lead data
          const customDataMap = {};
          if (editLead.custom_values) {
             editLead.custom_values.forEach(cv => {
                customDataMap[cv.field] = cv.value;
             });
          }
          setFormData({
            name: editLead.name || '',
            email: editLead.email || '',
            phone: editLead.phone || '',
            company: editLead.company || '',
            lead_source: editLead.lead_source || '',
            stage: editLead.stage || (stageData.length > 0 ? stageData[0].id : ''),
            assigned_to: editLead.assigned_to || '',
            deal_value: editLead.deal_value || 0,
            lost_reason: editLead.lost_reason || '',
            custom_data: customDataMap
          });
        } else if (stageData.length > 0) {
          setFormData(prev => ({ ...prev, stage: stageData[0].id }));
        }
      }).catch(err => {
        console.error('LeadModal initial fetch error:', err);
        setStages([]);
        setCustomFields([]);
        setUsers([]);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Clean up empty strings for IDs so Django doesn't error
      const submissionData = {
        ...formData,
        stage: formData.stage === "" ? null : formData.stage,
        assigned_to: formData.assigned_to === "" ? null : formData.assigned_to
      };
      
      if (editLead) {
        await api.put(`leads/${editLead.id}/`, submissionData);
        import('react-hot-toast').then(m => m.toast.success('Lead updated successfully!'));
      } else {
        await api.post('leads/', submissionData);
        import('react-hot-toast').then(m => m.toast.success('Lead created successfully!'));
      }
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : (editLead ? 'Failed to update lead' : 'Failed to create lead');
      import('react-hot-toast').then(m => m.toast.error('Error: ' + errorMsg));
    }
  };

  const selectedStage = stages.find(s => s.id == formData.stage);
  const isLostStage = selectedStage && (selectedStage.name.toLowerCase().includes('lost') || selectedStage.name.toLowerCase().includes('next intake'));

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button onClick={onClose} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', color: 'var(--text-secondary)' }}>
          <X size={20} />
        </button>
        <h2 style={{ marginBottom: '24px' }}>{editLead ? 'Edit Lead Details' : 'Create New Lead'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Full Name</label>
            <input 
              required
              className="glass-input" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Email</label>
              <input 
                type="email"
                className="glass-input" 
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Phone</label>
              <input 
                className="glass-input" 
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Company</label>
            <input 
              className="glass-input" 
              value={formData.company}
              onChange={e => setFormData({ ...formData, company: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Lead Source</label>
              <input 
                className="glass-input" 
                value={formData.lead_source}
                onChange={e => setFormData({ ...formData, lead_source: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Initial Stage</label>
              <select 
                className="glass-input"
                style={{ appearance: 'none' }}
                value={formData.stage}
                onChange={e => setFormData({ ...formData, stage: e.target.value })}
              >
                {(stages || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Assigned To</label>
              <select 
                className="glass-input"
                style={{ appearance: 'none' }}
                value={formData.assigned_to}
                onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
              >
                <option value="">-- Unassigned --</option>
                {(users || []).map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Deal Value (INR)</label>
              <input 
                type="number"
                className="glass-input" 
                value={formData.deal_value}
                onChange={e => setFormData({ ...formData, deal_value: e.target.value })}
              />
            </div>
          </div>

          {isLostStage && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Status Reason <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea 
                required
                className="glass-input" 
                style={{ minHeight: '80px', width: '100%', resize: 'vertical' }}
                value={formData.lost_reason}
                onChange={e => setFormData({ ...formData, lost_reason: e.target.value })}
                placeholder="Reason for moving to this stage..."
              />
            </div>
          )}

          {customFields.length > 0 && (
            <div style={{ marginBottom: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>Custom Information</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {(customFields || []).map(field => (
                  <div key={field.id}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{field.label}</label>
                    {field.field_type === 'dropdown' ? (
                      <select 
                        className="glass-input"
                        value={formData.custom_data[field.id] || ''}
                        onChange={e => setFormData({ ...formData, custom_data: { ...formData.custom_data, [field.id]: e.target.value } })}
                      >
                        <option value="">Select...</option>
                        {field.options?.split(',').map(opt => <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>)}
                      </select>
                    ) : (
                      <input 
                        type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                        className="glass-input" 
                        value={formData.custom_data[field.id] || ''}
                        onChange={e => setFormData({ ...formData, custom_data: { ...formData.custom_data, [field.id]: e.target.value } })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editLead ? 'Save Changes' : 'Create Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
