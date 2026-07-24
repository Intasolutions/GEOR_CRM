import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, GripVertical, Save, X, Palette, CheckCircle, ArrowLeft, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const LeadStageSettings = () => {
    const navigate = useNavigate();
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isAdding, setIsAdding] = useState(false);
    const [newStage, setNewStage] = useState({ name: '', color: '#3b82f6', is_final: false, probability: 50 });
    const [editingStage, setEditingStage] = useState(null);
    const [editFormData, setEditFormData] = useState({ name: '', color: '#3b82f6', is_final: false, probability: 50 });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        fetchStages();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchStages = async () => {
        try {
            const res = await api.get('stages/');
            setStages(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStage = async (e) => {
        e.preventDefault();
        try {
            await api.post('stages/', { ...newStage, order: stages.length + 1 });
            setNewStage({ name: '', color: '#3b82f6', is_final: false, probability: 50 });
            setIsAdding(false);
            fetchStages();
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateStage = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`stages/${editingStage}/`, editFormData);
            setEditingStage(null);
            fetchStages();
        } catch (err) {
            console.error(err);
        }
    };

    const startEditing = (stage) => {
        setEditingStage(stage.id);
        setEditFormData({
            name: stage.name,
            color: stage.color,
            is_final: stage.is_final,
            probability: stage.probability
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this stage?')) return;
        try {
            await api.delete(`stages/${id}/`);
            fetchStages();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="page-container">
            <button 
                onClick={() => navigate('/settings')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: isMobile ? '14px' : '16px' }}
            >
                <ArrowLeft size={18} /> Back
            </button>

            <header className="page-header-responsive" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '32px', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: isMobile ? '24px' : '28px', marginBottom: '4px' }}>Pipeline Stages</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Define your sales workflow stages.</p>
                </div>
                {!isAdding && (
                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }} onClick={() => setIsAdding(true)}>
                        <Plus size={20} /> Add Stage
                    </button>
                )}
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isAdding && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card" style={{ border: '1px solid var(--brand-blue)', padding: isMobile ? '20px' : '24px' }}>
                        <form onSubmit={handleAddStage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--brand-blue)', marginBottom: '8px' }}>STAGE NAME</label>
                                <input 
                                    autoFocus
                                    className="glass-input" 
                                    placeholder="e.g., Initial Meeting" 
                                    value={newStage.name}
                                    onChange={e => setNewStage({...newStage, name: e.target.value})}
                                    required
                                />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--brand-blue)', marginBottom: '8px' }}>PROBABILITY (%)</label>
                                    <input 
                                        type="number"
                                        className="glass-input" 
                                        value={newStage.probability}
                                        onChange={e => setNewStage({...newStage, probability: e.target.value})}
                                        min="0" max="100"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--brand-blue)', marginBottom: '8px' }}>COLOR</label>
                                    <input 
                                        type="color" 
                                        value={newStage.color} 
                                        onChange={e => setNewStage({...newStage, color: e.target.value})}
                                        style={{ width: '100%', height: '42px', border: 'none', background: 'none', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(30, 58, 138, 0.05)', padding: '12px', borderRadius: '8px' }}>
                                <input 
                                    type="checkbox" 
                                    id="is_final" 
                                    checked={newStage.is_final}
                                    onChange={e => setNewStage({...newStage, is_final: e.target.checked})}
                                />
                                <label htmlFor="is_final" style={{ fontSize: '14px', fontWeight: '600' }}>Mark as Won/Lost (Final Stage)</label>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Save size={18} /> Save Stage
                                </button>
                                <button type="button" className="btn-secondary" style={{ padding: '12px' }} onClick={() => setIsAdding(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading Pipeline...</div>
                ) : stages.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>No stages defined yet.</p>
                    </div>
                ) : (
                    stages.map((stage, index) => (
                        <div key={stage.id}>
                            {editingStage === stage.id ? (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ border: '1px solid var(--brand-blue)', padding: '20px' }}>
                                    <form onSubmit={handleUpdateStage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--brand-blue)' }}>EDIT STAGE</h3>
                                            <button type="button" onClick={() => setEditingStage(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}><X size={18} /></button>
                                        </div>
                                        
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>STAGE NAME</label>
                                            <input 
                                                className="glass-input" 
                                                value={editFormData.name}
                                                onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                                                required
                                            />
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>PROBABILITY (%)</label>
                                                <input 
                                                    type="number"
                                                    className="glass-input" 
                                                    value={editFormData.probability}
                                                    onChange={e => setEditFormData({...editFormData, probability: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>COLOR</label>
                                                <input 
                                                    type="color" 
                                                    value={editFormData.color} 
                                                    onChange={e => setEditFormData({...editFormData, color: e.target.value})}
                                                    style={{ width: '100%', height: '42px', border: 'none', background: 'none' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input 
                                                type="checkbox" 
                                                id={`edit_final_${stage.id}`}
                                                checked={editFormData.is_final}
                                                onChange={e => setEditFormData({...editFormData, is_final: e.target.checked})}
                                            />
                                            <label htmlFor={`edit_final_${stage.id}`} style={{ fontSize: '13px' }}>Mark as Final Stage</label>
                                        </div>

                                        <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <Save size={18} /> Update Stage
                                        </button>
                                    </form>
                                </motion.div>
                            ) : (
                                <div className="glass-card" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '16px', padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                        <GripVertical size={20} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: stage.color, flexShrink: 0 }}></div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: '700', fontSize: '16px' }}>{stage.name}</span>
                                                {stage.is_final && <span style={{ fontSize: '10px', color: '#10b981', background: '#dcfce7', padding: '2px 8px', borderRadius: '10px', fontWeight: '800' }}>FINAL</span>}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Order: {stage.order}</div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: isMobile ? '1px solid var(--border-color)' : 'none', paddingTop: isMobile ? '12px' : '0' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: isMobile ? 'left' : 'right', minWidth: isMobile ? '0' : '80px' }}>
                                            <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--brand-blue)' }}>{stage.probability}%</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Probability</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                                            <button onClick={() => startEditing(stage)} style={{ color: 'var(--brand-blue)', background: 'rgba(30, 58, 138, 0.05)', padding: '10px', borderRadius: '8px' }}>
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(stage.id)} style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)', padding: '10px', borderRadius: '8px' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LeadStageSettings;
