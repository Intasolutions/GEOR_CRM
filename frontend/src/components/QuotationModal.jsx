import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Plus, Trash2, FileText, Download, Send, 
    Calculator, Receipt, Percent, Info, List, ListOrdered, Briefcase, ChevronRight
} from 'lucide-react';
import api from '../api/client';

export default function QuotationModal({ isOpen, onClose, lead, onQuotationCreated, existingQuotation }) {
    const [loading, setLoading] = useState(false);
    const [subject, setSubject] = useState('');
    const [executiveSummary, setExecutiveSummary] = useState('');
    const [items, setItems] = useState([{ description: 'Custom Software Development', quantity: 1, unit_price: 0 }]);
    const [taxPercent, setTaxPercent] = useState(18);
    const [discount, setDiscount] = useState(0);
    const [notes, setNotes] = useState(''); 
    const [terms, setTerms] = useState('');

    useEffect(() => {
        if (existingQuotation && isOpen) {
            setSubject(existingQuotation.subject || '');
            setExecutiveSummary(existingQuotation.executive_summary || '');
            setItems(existingQuotation.items?.length > 0 
                ? existingQuotation.items.map(i => ({ description: i.description, quantity: i.quantity, unit_price: parseFloat(i.unit_price) }))
                : [{ description: 'Custom Software Development', quantity: 1, unit_price: 0 }]
            );
            setTaxPercent(parseFloat(existingQuotation.tax_percent));
            setDiscount(parseFloat(existingQuotation.discount_amount));
            setNotes(existingQuotation.notes || '');
            setTerms(existingQuotation.terms_conditions || '');
        } else if (!existingQuotation && isOpen) {
            setSubject(`Strategic Proposal for ${lead?.name}`);
            setExecutiveSummary(`Submission of our professional technical proposal for ${lead?.name || 'your project'}. Prepared by IN-TA SOLUTIONS.`);
            setItems([{ description: 'Software Development Services', quantity: 1, unit_price: 0 }]);
            setTaxPercent(18);
            setDiscount(0);
            setNotes('• Custom Development\n• Technical Support\n• Quality Assurance');
            setTerms('1. Valid for 15 days.\n2. 50% Advance Payment.');
        }
    }, [existingQuotation, isOpen]);

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = (subtotal - discount) * (taxPercent / 100);
    const total = subtotal - discount + taxAmount;

    const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));
    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const formatText = (field, type) => {
        const val = field === 'summary' ? executiveSummary : (field === 'notes' ? notes : terms);
        const setVal = field === 'summary' ? setExecutiveSummary : (field === 'notes' ? setNotes : setTerms);
        if (type === 'bullet') setVal(val + (val ? '\n' : '') + '• ');
        else {
            const lines = val.split('\n').filter(l => l.trim());
            setVal(val + (val ? '\n' : '') + `${lines.length + 1}. `);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            let qId;
            const payload = {
                lead: lead.id,
                subject,
                executive_summary: executiveSummary,
                tax_percent: taxPercent,
                discount_amount: discount,
                notes,
                terms_conditions: terms,
                status: 'draft'
            };

            if (existingQuotation) {
                await api.patch(`quotations/${existingQuotation.id}/`, payload);
                qId = existingQuotation.id;
                const oldItemsRes = await api.get(`quotation-items/?quotation=${qId}`);
                for (const oldItem of oldItemsRes.data) {
                    await api.delete(`quotation-items/${oldItem.id}/`);
                }
            } else {
                const qRes = await api.post('quotations/', payload);
                qId = qRes.data.id;
            }

            for (const item of items) {
                await api.post('quotation-items/', {
                    quotation: qId,
                    ...item
                });
            }

            await api.post(`quotations/${qId}/generate_pdf/`);
            if (onQuotationCreated) onQuotationCreated();
            onClose();
        } catch (err) {
            console.error("Error:", err);
            alert("Error saving quotation.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)' }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="modal-content"
                style={{ width: '1000px', maxWidth: '96%', maxHeight: '92vh', overflowY: 'auto', padding: '0', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            >
                {/* Clean Professional Header */}
                <div style={{ padding: '24px 32px', background: '#0f172a', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: '#3b82f6', padding: '10px', borderRadius: '10px' }}><Briefcase size={22} color="white" /></div>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Strategic Proposal Builder</h2>
                            <p style={{ opacity: 0.7, fontSize: '13px', margin: 0 }}>Drafting professional offer for {lead.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}><X size={20} /></button>
                </div>

                <div style={{ padding: '32px' }}>
                    {/* Subject Row */}
                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Proposal Subject</label>
                        <input 
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Primary focus of this proposal..."
                            style={{ width: '100%', padding: '14px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}
                        />
                    </div>

                    {/* Executive Summary Row */}
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Partnership Executive Summary</label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button type="button" onClick={() => formatText('summary', 'bullet')} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white' }}><List size={14}/></button>
                                <button type="button" onClick={() => formatText('summary', 'number')} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white' }}><ListOrdered size={14}/></button>
                            </div>
                        </div>
                        <textarea 
                            value={executiveSummary}
                            onChange={(e) => setExecutiveSummary(e.target.value)}
                            placeholder="Initial overview for the client..."
                            style={{ width: '100%', padding: '16px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', lineHeight: '1.6', minHeight: '100px' }}
                        />
                    </div>

                    {/* Line Items Grid */}
                    <div className="glass-card" style={{ padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Solution Itemization</h3>
                            <button onClick={addItem} className="btn-secondary" style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}><Plus size={14}/> Add Item</button>
                        </div>
                        
                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <input 
                                        value={item.description}
                                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                                        placeholder="Detailed solution or service deliverable..."
                                        style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '500' }}
                                    />
                                    <div style={{ width: '60px' }}>
                                        <input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '10px', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
                                    </div>
                                    <div style={{ width: '120px' }}>
                                        <input type="number" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px', textAlign: 'right', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }} />
                                    </div>
                                    <button onClick={() => removeItem(index)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid-2" style={{ gap: '32px', marginBottom: '40px' }}>
                        {/* Scope/Terms Columns */}
                        <div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Scope & Technical Notes</label>
                                <button type="button" onClick={() => formatText('notes', 'bullet')} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white' }}><List size={14}/></button>
                            </div>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', minHeight: '140px' }} />
                        </div>
                        <div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Commercial Terms</label>
                                <button type="button" onClick={() => formatText('terms', 'number')} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white' }}><ListOrdered size={14}/></button>
                            </div>
                            <textarea value={terms} onChange={(e) => setTerms(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', minHeight: '140px' }} />
                        </div>
                    </div>

                    {/* Financial Summary Block */}
                    <div style={{ background: '#f8fafc', padding: '32px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '40px', alignItems: 'center' }}>
                             <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Subtotal</div>
                                <div style={{ fontSize: '20px', fontWeight: '600' }}>₹{subtotal.toLocaleString()}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Discount (₹)</div>
                                <input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'right', width: '100px', fontSize: '16px', fontWeight: '600' }} />
                            </div>
                            <div style={{ textAlign: 'right', borderLeft: '2px solid #e2e8f0', paddingLeft: '40px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Commitment</div>
                                <div style={{ fontSize: '42px', fontWeight: '800', color: '#0f172a' }}>₹{total.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '40px', paddingTop: '32px', borderTop: '1px solid #f1f5f9' }}>
                        <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '8px', background: 'white', border: '1px solid #cbd5e1', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleSubmit} disabled={loading} style={{ padding: '12px 40px', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: '700', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)' }}>
                            {loading ? 'Generating Proposal...' : (existingQuotation ? 'Update Proposal' : 'Launch Proposal PDF')}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
