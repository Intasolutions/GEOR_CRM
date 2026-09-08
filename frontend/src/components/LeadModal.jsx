import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Building, Flag, Megaphone } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const LeadModal = ({ isOpen, onClose, onRefresh, editLead = null }) => {
  const { user } = useAuth();
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
    campaign: '',
    custom_data: {}
  });
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [phoneDuplicateError, setPhoneDuplicateError] = useState(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.get('stages/'),
        api.get('custom-fields/'),
        api.get('users/'),
        api.get('campaigns/')
      ]).then(([stagesRes, fieldsRes, usersRes, campaignsRes]) => {
        const stageData = Array.isArray(stagesRes.data) ? stagesRes.data : [];
        const fieldData = Array.isArray(fieldsRes.data) ? fieldsRes.data : [];
        const userData = Array.isArray(usersRes.data) ? usersRes.data : [];
        const campaignData = Array.isArray(campaignsRes.data) ? campaignsRes.data : [];
        
        setStages(stageData);
        setCustomFields(fieldData);
        setUsers(userData);
        setCampaigns(campaignData);
        
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
            campaign: editLead.campaign || '',
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
        setCampaigns([]);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const rawPhone = formData.phone?.trim();
    if (!rawPhone || rawPhone.length < 5) {
      setPhoneDuplicateError(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingPhone(true);
        const res = await api.get('leads/check_phone/', {
          params: {
            phone: rawPhone,
            lead_id: editLead ? editLead.id : undefined
          }
        });
        if (res.data?.is_duplicate) {
          const leadInfo = res.data.lead;
          const assignedText = leadInfo.assigned_to ? ` (Assigned to: ${leadInfo.assigned_to})` : '';
          setPhoneDuplicateError(`Mobile number already exists for "${leadInfo.name}"${assignedText}. Duplicate mobile numbers are not allowed.`);
        } else {
          setPhoneDuplicateError(null);
        }
      } catch (err) {
        // non-blocking
      } finally {
        setIsCheckingPhone(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [formData.phone, editLead]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (phoneDuplicateError) {
      import('react-hot-toast').then(m => m.toast.error(phoneDuplicateError));
      return;
    }
    try {
      // Clean up empty strings for IDs so Django doesn't error
      const submissionData = {
        ...formData,
        stage: formData.stage === "" ? null : formData.stage,
        assigned_to: formData.assigned_to === "" ? null : formData.assigned_to,
        campaign: formData.campaign === "" ? null : formData.campaign
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
      const errorData = err.response?.data;
      let errorMsg = editLead ? 'Failed to update lead' : 'Failed to create lead';
      if (errorData) {
        if (typeof errorData === 'string') {
          errorMsg = errorData;
        } else if (errorData.phone) {
          errorMsg = Array.isArray(errorData.phone) ? errorData.phone[0] : errorData.phone;
        } else if (errorData.non_field_errors) {
          errorMsg = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
        } else {
          errorMsg = Object.entries(errorData)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ');
        }
      }
      import('react-hot-toast').then(m => m.toast.error(errorMsg));
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600' }}>Phone</label>
                {isCheckingPhone && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Checking...</span>}
              </div>
              <input 
                className="glass-input" 
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                style={phoneDuplicateError ? { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)' } : {}}
              />
              {phoneDuplicateError && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px', fontWeight: '500', display: 'flex', alignItems: 'flex-start', gap: '4px', lineHeight: '1.3' }}>
                  <span>⚠️</span>
                  <span>{phoneDuplicateError}</span>
                </p>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Course</label>
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
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Campaign</label>
              <select 
                className="glass-input"
                style={{ appearance: 'none' }}
                value={formData.campaign}
                onChange={e => setFormData({ ...formData, campaign: e.target.value })}
                disabled={user?.role !== 'admin'}
              >
                <option value="">-- No Campaign --</option>
                {(campaigns || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={Boolean(phoneDuplicateError)}
              title={phoneDuplicateError || ''}
              style={{ flex: 1, opacity: phoneDuplicateError ? 0.6 : 1, cursor: phoneDuplicateError ? 'not-allowed' : 'pointer' }}
            >
              {editLead ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
