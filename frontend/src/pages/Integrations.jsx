import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Mail, MessageSquare, Smartphone, 
  Zap, Check, ExternalLink, Globe, 
  ShieldCheck, ArrowRight, Settings as SettingsIcon,
  Loader2, Facebook, Slack, Calendar, CreditCard,
  FileSpreadsheet
} from 'lucide-react';
import api from '../api/client';
import IntegrationModal from '../components/IntegrationModal';

const IntegrationCard = ({ icon: Icon, title, description, connected, color, delay, onToggle, loading }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -5, boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)' }}
    className="glass-card" 
    style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '24px',
      padding: '32px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      height: '100%'
    }}
  >
    {connected && (
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        right: '20px', 
        background: 'rgba(16, 185, 129, 0.1)', 
        color: 'var(--success)', 
        padding: '6px 12px', 
        borderRadius: '20px', 
        fontSize: '12px', 
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Check size={14} /> Connected
      </div>
    )}

    <div style={{ 
      width: '64px', 
      height: '64px', 
      borderRadius: '16px', 
      background: `linear-gradient(135deg, ${color}15, ${color}30)`, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      color: color 
    }}>
      <Icon size={32} />
    </div>

    <div style={{ flex: 1 }}>
      <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>{title}</h3>
      <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{description}</p>
    </div>

    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
      {connected ? (
        <>
          <button 
            onClick={onToggle}
            className="btn-secondary" 
            style={{ flex: 1, padding: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid #ef4444', color: '#ef4444' }}
          >
            Disconnect
          </button>
          <button className="btn-secondary" style={{ width: '44px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SettingsIcon size={16} />
          </button>
        </>
      ) : (
        <button 
          onClick={onToggle}
          disabled={loading}
          className="btn-primary" 
          style={{ 
            flex: 1, 
            background: color, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            boxShadow: `0 4px 12px ${color}30`
          }}
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <>Connect Service <ArrowRight size={16} /></>}
        </button>
      )}
    </div>
  </motion.div>
);

const Integrations = () => {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [togglingProvider, setTogglingProvider] = React.useState(null);
  const [selectedProvider, setSelectedProvider] = React.useState(null);

  const fetchIntegrations = async () => {
    try {
      const res = await api.get('integrations/');
      setIntegrations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Fetch integrations error:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleToggle = async (providerId) => {
    const statusEntry = integrations.find(i => i.provider === providerId);
    const isConnected = statusEntry ? statusEntry.is_connected : false;

    // If already connected, disconnect directly
    if (isConnected) {
      setTogglingProvider(providerId);
      try {
        await api.post(`integrations/${providerId}/toggle/`);
        await fetchIntegrations();
      } catch (err) {
        console.error('Toggle integration error:', err);
      } finally {
        setTogglingProvider(null);
      }
    } else {
      // If not connected, open configuration modal
      const app = apps.find(a => a.id === providerId);
      setSelectedProvider(app);
    }
  };

  const apps = [
    {
      id: 'gmail',
      icon: Mail,
      title: "Gmail / Outlook",
      description: "Sync your business emails and track every interaction directly in the lead timeline.",
      color: "#3b82f6"
    },
    {
      id: 'whatsapp',
      icon: MessageSquare,
      title: "WhatsApp Business",
      description: "Broadcast automated welcome messages and instant notification alerts to new leads.",
      color: "#25d366"
    },
    {
      id: 'sms',
      icon: Smartphone,
      title: "SMS Gateway",
      description: "Send personalized SMS follow-ups and automated reminders to improve conversion rates.",
      color: "#8b5cf6"
    },
    {
      id: 'zapier',
      icon: Zap,
      title: "Zapier",
      description: "Unlock infinite possibilities by connecting with 3000+ apps using custom automation workflows.",
      color: "#ff4f00"
    },
    {
      id: 'webhooks',
      icon: Globe,
      title: "Webhooks",
      description: "Real-time data synchronization with your custom applications using secure REST webhooks.",
      color: "#0ea5e9"
    },
    {
      id: 'recaptcha',
      icon: ShieldCheck,
      title: "reCAPTCHA v3",
      description: "Protect your lead generation forms from spam and bots without affecting user experience.",
      color: "#4285f4"
    },
    {
      id: 'facebook',
      icon: Facebook,
      title: "Facebook Ads",
      description: "Sync leads from Facebook Lead Ads directly into your pipeline in real-time.",
      color: "#1877f2"
    },
    {
      id: 'slack',
      icon: Slack,
      title: "Slack Alerts",
      description: "Get instant notifications in your primary Slack channels when a new lead is assigned.",
      color: "#4a154b"
    },
    {
      id: 'calendar',
      icon: Calendar,
      title: "Google Calendar",
      description: "Sync your CRM reminders and follow-up activities with your personal calendar.",
      color: "#ea4335"
    },
    {
      id: 'stripe',
      icon: CreditCard,
      title: "Stripe",
      description: "Track payments, generate invoices, and view customer transaction history directly.",
      color: "#6772e5"
    },
    {
      id: 'sheets',
      icon: FileSpreadsheet,
      title: "Google Sheets",
      description: "Auto-export your leads and deal data to spreadsheets for custom reporting and analysis.",
      color: "#0f9d58"
    }
  ];

  return (
    <div className="page-container">
      <button 
        onClick={() => navigate('/settings')}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'none', 
          color: 'var(--text-secondary)', 
          marginBottom: '24px',
          fontWeight: '500'
        }}
      >
        <ArrowLeft size={18} /> Back to Settings
      </button>

      <motion.header 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ marginBottom: '48px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <div style={{ padding: '10px', background: 'var(--brand-blue)', borderRadius: '12px', color: 'white' }}>
            <Zap size={24} />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800' }}>Apps & Integrations</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '600px' }}>
          Extend your CRM capabilities by connecting the tools your team uses every day.
        </p>
      </motion.header>

      {loading ? (
        <div className="integration-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="glass-card animate-pulse" style={{ height: '280px', background: 'rgba(255,255,255,0.05)' }}></div>
          ))}
        </div>
      ) : (
        <div className="integration-grid" style={{ paddingBottom: '40px' }}>
          {apps.map((app, index) => {
            const statusEntry = integrations.find(i => i.provider === app.id);
            const isConnected = statusEntry ? statusEntry.is_connected : false;
            
            return (
              <IntegrationCard 
                key={app.id} 
                {...app} 
                connected={isConnected}
                delay={index * 0.1}
                onToggle={() => handleToggle(app.id)}
                loading={togglingProvider === app.id}
              />
            );
          })}
        </div>
      )}

      <IntegrationModal 
        isOpen={!!selectedProvider}
        onClose={() => setSelectedProvider(null)}
        provider={selectedProvider}
        onRefresh={fetchIntegrations}
      />
    </div>
  );
};

export default Integrations;
