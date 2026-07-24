import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, Save, Type, Hash, Calendar, CheckSquare, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const FIELD_TYPES = [
  { id: 'text', label: 'Short Text', icon: Type },
  { id: 'number', label: 'Number', icon: Hash },
  { id: 'date', label: 'Date', icon: Calendar },
  { id: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { id: 'dropdown', label: 'Dropdown', icon: List },
];

const CustomFieldSettings = () => {
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newField, setNewField] = useState({ name: '', label: '', field_type: 'text', options: '' });

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const res = await api.get('custom-fields/');
      setFields(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    try {
      // Slugify the label for the name if name is empty
      const fieldName = newField.name || newField.label.toLowerCase().replace(/ /g, '_');
      await api.post('custom-fields/', { ...newField, name: fieldName });
      setNewField({ name: '', label: '', field_type: 'text', options: '' });
      setIsAdding(false);
      fetchFields();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this custom field? All data associated with it will be lost.')) return;
    try {
      await api.delete(`custom-fields/${id}/`);
      fetchFields();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      <button 
        onClick={() => navigate('/settings')}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', color: 'var(--text-secondary)', marginBottom: '24px' }}
      >
        <ArrowLeft size={18} /> Back to Settings
      </button>

      <header className="page-header-responsive" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>Custom Fields</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Extend your lead data with specialized fields (BRD 7.6).</p>
        </div>
        {!isAdding && (
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsAdding(true)}>
            <Plus size={20} /> Create Field
          </button>
        )}
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {isAdding && (
          <div className="glass-card" style={{ border: '2px dashed var(--brand-blue)' }}>
            <form onSubmit={handleAddField}>
              <div className="grid-equal" style={{ gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Field Label</label>
                  <input 
                    required
                    className="glass-input" 
                    placeholder="e.g. Project Budget" 
                    value={newField.label}
                    onChange={e => setNewField({...newField, label: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Field Type</label>
                  <select 
                    className="glass-input"
                    value={newField.field_type}
                    onChange={e => setNewField({...newField, field_type: e.target.value})}
                  >
                    {FIELD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {newField.field_type === 'dropdown' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Dropdown Options (comma separated)</label>
                  <input 
                    className="glass-input" 
                    placeholder="Small, Medium, Large" 
                    value={newField.options}
                    onChange={e => setNewField({...newField, options: e.target.value})}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Field</button>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsAdding(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p>Loading fields...</p>
        ) : fields.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No custom fields yet. Add one to capture more lead details.</p>
          </div>
        ) : (
          <div className="glass-card table-container" style={{ padding: '0' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Slug (System Name)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fields.map(field => {
                  const Icon = FIELD_TYPES.find(t => t.id === field.field_type)?.icon || Type;
                  return (
                    <tr key={field.id}>
                      <td><span style={{ fontWeight: '600' }}>{field.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                          <Icon size={14} color="var(--brand-blue)" />
                          {FIELD_TYPES.find(t => t.id === field.field_type)?.label}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}><code>{field.name}</code></td>
                      <td>
                        <button onClick={() => handleDelete(field.id)} style={{ color: 'var(--danger)', background: 'none' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomFieldSettings;
