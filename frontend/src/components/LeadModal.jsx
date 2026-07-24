import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Building, Flag, Megaphone } from 'lucide-react';
import api from '../api/client';

const LeadModal = ({ isOpen, onClose, onRefresh }) => {
  const [stages, setStages] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    lead_source: '',
    stage: '',
    campaign: '',
    deal_value: 0,
    custom_data: {}
  });
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.get('stages/'),
        api.get('custom-fields/'),
        api.get('campaigns/')
      ]).then(([stagesRes, fieldsRes, campRes]) => {
        const stageData = Array.isArray(stagesRes.data) ? stagesRes.data : [];
        const fieldData = Array.isArray(fieldsRes.data) ? fieldsRes.data : [];
        const campData = Array.isArray(campRes.data) ? campRes.data : [];
        
        setStages(stageData);
        setCustomFields(fieldData);
        setCampaigns(campData);
        
        if (stageData.length > 0) {
          setFormData(prev => ({ ...prev, stage: stageData[0].id }));
        }
      }).catch(err => {
        console.error('LeadModal initial fetch error:', err);
        setStages([]);
        setCustomFields([]);
        setCampaigns([]);
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
        campaign: formData.campaign === "" ? null : formData.campaign,
        stage: formData.stage === "" ? null : formData.stage
      };
      
      await api.post('leads/', submissionData);
      import('react-hot-toast').then(m => m.toast.success('Lead created successfully!'));
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create lead';
      import('react-hot-toast').then(m => m.toast.error('Error: ' + errorMsg));
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', color: 'var(--text-secondary)' }}>
          <X size={20} />
        </button>
        <h2 style={{ marginBottom: '24px' }}>Create New Lead</h2>
        
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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Campaign</label>
              <select 
                className="glass-input"
                style={{ appearance: 'none' }}
                value={formData.campaign}
                onChange={e => setFormData({ ...formData, campaign: e.target.value })}
              >
                <option value="">-- No Campaign --</option>
                {(campaigns || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Create Lead</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
