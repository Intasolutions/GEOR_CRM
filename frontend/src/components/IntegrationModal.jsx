import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Key, Globe, Info, Save, Loader2, Link } from 'lucide-react';
import api from '../api/client';

const IntegrationModal = ({ isOpen, onClose, provider, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({});

    const fields = {
        gmail: [
            { name: 'email', label: 'Business Email', type: 'email', placeholder: 'support@company.com' },
            { name: 'auth_type', label: 'Auth Method', type: 'select', options: ['OAuth 2.0 (Recommended)', 'App Password'] }
        ],
        whatsapp: [
            { name: 'instance_id', label: 'Instance ID', type: 'text', placeholder: 'e.g. 123456' },
            { name: 'token', label: 'API Token', type: 'password', placeholder: 'Enter your access token' }
        ],
        sms: [
            { name: 'gateway_provider', label: 'SMS Provider', type: 'select', options: ['Twilio', 'MessageBird', 'BulkSMS'] },
            { name: 'api_key', label: 'API Key', type: 'password', placeholder: 'Enter API Key' },
            { name: 'sender_id', label: 'Sender ID', type: 'text', placeholder: 'e.g. INTA-CRM' }
        ],
        zapier: [
            { name: 'api_key', label: 'Zapier API Key', type: 'text', readOnly: true, value: 'INTA_' + Math.random().toString(36).substr(2, 9).toUpperCase() },
            { name: 'environment', label: 'Environment', type: 'select', options: ['Production', 'Sandbox'] }
        ],
        webhooks: [
            { name: 'webhook_url', label: 'Target URL', type: 'text', placeholder: 'https://your-api.com/webhooks' },
            { name: 'secret', label: 'Secret Key', type: 'password', placeholder: 'Optional signing secret' }
        ],
        recaptcha: [
            { name: 'site_key', label: 'v3 Site Key', type: 'text', placeholder: 'v3 Site Key' },
            { name: 'secret_key', label: 'v3 Secret Key', type: 'password', placeholder: 'v3 Secret Key' }
        ],
        facebook: [
            { name: 'pixel_id', label: 'Pixel ID', type: 'text', placeholder: 'e.g. 123456789' },
            { name: 'page_token', label: 'Page Access Token', type: 'password', placeholder: 'EAAG...' }
        ],
        slack: [
            { name: 'webhook_url', label: 'Slack Webhook URL', type: 'text', placeholder: 'https://hooks.slack.com/services/...' },
            { name: 'channel', label: 'Default Channel', type: 'text', placeholder: '#lead-alerts' }
        ],
        calendar: [
            { name: 'calendar_id', label: 'Calendar ID', type: 'text', placeholder: 'primary' },
            { name: 'sync_mode', label: 'Sync Mode', type: 'select', options: ['Two-way Sync', 'One-way (CRM to Calendar)', 'One-way (Calendar to CRM)'] }
        ],
        stripe: [
            { name: 'secret_key', label: 'Stripe Secret Key', type: 'password', placeholder: 'sk_live_...' },
            { name: 'publishable_key', label: 'Stripe Publishable Key', type: 'text', placeholder: 'pk_live_...' }
        ],
        sheets: [
            { name: 'spreadsheet_id', label: 'Spreadsheet ID', type: 'text', placeholder: 'Enter ID from URL' },
            { name: 'sheet_name', label: 'Sheet Name', type: 'text', placeholder: 'e.g. Leads_2026' },
            { name: 'sync_interval', label: 'Auto-Sync Data', type: 'select', options: ['Real-time', 'Every Hour', 'Daily'] }
        ]
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`integrations/${provider.id}/toggle/`, {
                config_data: formData,
                is_connected: true
            });
            onRefresh();
            onClose();
        } catch (err) {
            console.error('Error saving integration:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !provider) return null;

    const currentFields = fields[provider.id] || [];

    return (
        <AnimatePresence>
            <div className="modal-overlay" style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.7)' }}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    className="glass-card"
                    style={{ 
                        width: '100%', 
                        maxWidth: '520px', 
                        padding: '40px',
                        background: 'linear-gradient(165deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px ${provider.color}15`,
                        borderRadius: '24px',
                        position: 'relative'
                    }}
                >
                    {/* Decorative glow */}
                    <div style={{ 
                        position: 'absolute', 
                        top: '-100px', 
                        right: '-100px', 
                        width: '300px', 
                        height: '300px', 
                        background: `radial-gradient(circle, ${provider.color}10 0%, transparent 70%)`,
                        zIndex: 0,
                        pointerEvents: 'none'
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <motion.div 
                                    initial={{ rotate: -15 }}
                                    animate={{ rotate: 0 }}
                                    style={{ 
                                        width: '60px', 
                                        height: '60px', 
                                        borderRadius: '18px', 
                                        background: `linear-gradient(135deg, ${provider.color}, ${provider.color}dd)`, 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        color: 'white',
                                        boxShadow: `0 8px 16px ${provider.color}40`
                                    }}
                                >
                                    <provider.icon size={30} />
                                </motion.div>
                                <div>
                                    <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em', color: 'white' }}>Connect {provider.title}</h2>
                                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Enterprise Integration Setup</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose} 
                                style={{ 
                                    background: 'rgba(255,255,255,0.05)', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    width: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'rgba(255,255,255,0.5)',
                                    transition: 'all 0.2s'
                                }}
                                className="hover-scale"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
                                {currentFields.map((field, idx) => (
                                    <motion.div 
                                        key={field.name}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 + (idx * 0.05) }}
                                        style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                                    >
                                        <label style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {field.label}
                                            {field.readOnly && <Link size={12} style={{ color: 'var(--brand-blue)' }} />}
                                        </label>
                                        
                                        {field.type === 'select' ? (
                                            <div style={{ position: 'relative' }}>
                                                <select 
                                                    className="modal-input"
                                                    onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                                                    required
                                                    style={{ 
                                                        width: '100%',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        padding: '12px 16px',
                                                        borderRadius: '14px',
                                                        color: 'white',
                                                        fontSize: '15px'
                                                    }}
                                                >
                                                    {field.options.map(opt => <option key={opt} value={opt} style={{ background: '#0f172a' }}>{opt}</option>)}
                                                </select>
                                            </div>
                                        ) : (
                                            <div style={{ position: 'relative' }}>
                                                <input 
                                                    type={field.type}
                                                    className="modal-input"
                                                    placeholder={field.placeholder}
                                                    value={field.value || formData[field.name] || ''}
                                                    readOnly={field.readOnly}
                                                    onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
                                                    required={!field.readOnly}
                                                    style={{ 
                                                        width: '100%',
                                                        background: field.readOnly ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        padding: '12px 16px 12px 48px',
                                                        borderRadius: '14px',
                                                        color: 'white',
                                                        fontSize: '15px',
                                                        transition: 'all 0.3s ease',
                                                        outline: 'none'
                                                    }}
                                                />
                                                <div style={{ position: 'absolute', left: '16px', top: '14px', color: provider.color }}>
                                                    {field.type === 'password' ? <Key size={18} /> : (field.readOnly ? <Shield size={18} /> : <Info size={18} />)}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}

                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    style={{ 
                                        padding: '20px', 
                                        borderRadius: '16px', 
                                        background: 'rgba(255, 255, 255, 0.02)', 
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        marginTop: '4px' 
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                        <div style={{ 
                                            padding: '8px', 
                                            background: 'rgba(16, 185, 129, 0.1)', 
                                            borderRadius: '10px',
                                            color: '#10b981'
                                        }}>
                                            <Shield size={18} />
                                        </div>
                                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>
                                            Security prioritized. Credentials are encrypted and isolated within your secure environment.
                                        </p>
                                    </div>
                                </motion.div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button 
                                    type="button"
                                    onClick={onClose}
                                    style={{ 
                                        flex: 1, 
                                        padding: '14px', 
                                        borderRadius: '14px', 
                                        background: 'rgba(255,255,255,0.05)', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                    className="hover-scale"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loading}
                                    style={{ 
                                        flex: 1, 
                                        padding: '14px',
                                        borderRadius: '14px',
                                        background: `linear-gradient(135deg, ${provider.color}, ${provider.color}dd)`, 
                                        color: 'white',
                                        fontWeight: '700',
                                        border: 'none',
                                        boxShadow: `0 8px 20px -6px ${provider.color}60`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        transition: 'all 0.3s'
                                    }}
                                    className="hover-scale"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Activate Integration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default IntegrationModal;
