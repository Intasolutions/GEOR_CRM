import React from 'react';
import { Settings as SettingsIcon, Shield, Bell, Database, Globe, Smartphone, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsCard = ({ icon: Icon, title, description, onClick }) => (
  <div className="glass-card" style={{ display: 'flex', gap: '20px', cursor: 'pointer' }} onClick={onClick}>
    <div style={{ 
      width: '48px', 
      height: '48px', 
      borderRadius: '12px', 
      background: 'rgba(30, 58, 138, 0.05)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      color: 'var(--brand-blue)'
    }}>
      <Icon size={24} />
    </div>
    <div>
      <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>{title}</h3>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{description}</p>
    </div>
  </div>
);

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>System Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure your CRM preferences and manage modules.</p>
      </header>

      <div className="integration-grid">
        <SettingsCard 
          icon={Shield} 
          title="Security & Access" 
          description="Manage user roles, permissions, and session security settings." 
          onClick={() => navigate('/settings/users')}
        />
        <SettingsCard 
          icon={Database} 
          title="Custom Fields" 
          description="Create and manage dynamic fields for leads and contacts." 
          onClick={() => navigate('/settings/custom-fields')}
        />
        <SettingsCard 
          icon={Globe} 
          title="Lead Stages" 
          description="Configure the sales pipeline workflow and stage colors." 
          onClick={() => navigate('/settings/stages')}
        />
        <SettingsCard 
          icon={Zap} 
          title="Sales Automation" 
          description="Set up automatic stage transitions, task creation, and alerts." 
          onClick={() => navigate('/settings/workflows')}
        />
        <SettingsCard 
          icon={Bell} 
          title="Notifications" 
          description="Set up email alerts, browser notifications, and reminders." 
        />
        <SettingsCard 
          icon={Smartphone} 
          title="Mobile App & Integrations" 
          description="Connect WhatsApp, SMS gateways and manage mobile API keys." 
          onClick={() => navigate('/settings/integrations')}
        />
        <SettingsCard 
          icon={SettingsIcon} 
          title="General Configuration" 
          description="System-wide settings, branding, and default preferences." 
        />
      </div>
    </div>
  );
};

export default Settings;
