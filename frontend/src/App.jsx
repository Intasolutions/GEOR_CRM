import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { 
  LayoutDashboard, Users, Settings as SettingsIcon, LogOut, Trello, 
  Megaphone, BarChart3, Menu, X, Archive, Bell, Search, Sparkles
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Leads from './pages/Leads';
import Settings from './pages/Settings';
import LeadDetails from './pages/LeadDetails';
import UserManagement from './pages/UserManagement';
import LeadStageSettings from './pages/LeadStageSettings';
import CustomFieldSettings from './pages/CustomFieldSettings';
import WorkflowSettings from './pages/WorkflowSettings';
import Pipeline from './pages/Pipeline';
import ImportLeads from './pages/ImportLeads';
import Integrations from './pages/Integrations';
import Campaigns from './pages/Campaigns';
import Reports from './pages/Reports';
import InternalTasks from './pages/InternalTasks';
import LostTaskReport from './pages/LostTaskReport';
import { Toaster } from 'react-hot-toast';
import NotificationManager from './components/NotificationManager';

const SidebarLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  const [isHovered, setIsHovered] = React.useState(false);
  
  return (
    <Link 
      to={to} 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '6px',
        background: isActive ? '#ffffff' : isHovered ? '#edf2f7' : 'transparent',
        color: isActive ? '#0f172a' : '#475569',
        border: isActive ? '1px solid #e2e8f0' : '1px solid transparent',
        boxShadow: isActive ? '0 1px 2px 0 rgba(15, 23, 42, 0.05)' : 'none',
        marginBottom: '4px',
        transition: 'all 0.1s ease',
        fontWeight: isActive ? '600' : '500',
        fontSize: '13.5px'
      }}
    >
      <Icon size={17} color={isActive ? '#0f172a' : '#64748b'} />
      <span style={{ flex: 1 }}>{label}</span>
    </Link>
  );
};

const ProtectedLayout = ({ children }) => {
  const { user, logout, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="app-container">
      <Toaster position="top-right" />
      <NotificationManager />
      
      {/* Mobile Header Toggle */}
      <div style={{ 
        display: 'none', 
        padding: '14px 20px', 
        background: '#ffffff', 
        borderBottom: '1px solid #e2e8f0',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }} className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/img/logo.png" alt="CRM Logo" style={{ height: '48px' }} />
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ padding: '8px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isMobileMenuOpen ? <X size={22} color="#0f172a" /> : <Menu size={22} color="#0f172a" />}
        </button>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 35,
            display: 'block'
          }}
        />
      )}

      {/* Desktop Sidebar */}
      <aside style={{ 
        width: '260px', 
        borderRight: '1px solid #e2e8f0', 
        padding: '24px 16px',
        flexDirection: 'column',
        background: '#f8fafc', // Soft Light Gray background
        transition: 'all 0.3s ease',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto'
      }} className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        
        {/* Brand Header */}
        <div className="mobile-hide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/img/logo.png" alt="CRM Logo" style={{ height: '56px' }} />
            <div>
              <span style={{ fontSize: '9px', fontWeight: '700', color: '#475569', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', display: 'inline-block', marginTop: '2px', background: '#ffffff' }}>Enterprise</span>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav style={{ flex: 1, padding: '12px 0' }} onClick={() => setIsMobileMenuOpen(false)}>
          <div style={{ fontSize: '11px', fontWeight: '400', color: '#64748b', padding: '12px 12px 6px 12px' }}>Workspace</div>
          <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" />
          {user?.permissions?.leads?.view !== false && <SidebarLink to="/leads" icon={Users} label="Table View" />}
          {user?.permissions?.pipeline?.view !== false && <SidebarLink to="/pipeline" icon={Trello} label="Sales Pipeline" />}
          
          <div style={{ fontSize: '11px', fontWeight: '400', color: '#64748b', padding: '16px 12px 6px 12px' }}>Analytics</div>
          {user?.permissions?.reports?.view !== false && <SidebarLink to="/reports" icon={BarChart3} label="Analytics" />}
          
          <div style={{ fontSize: '11px', fontWeight: '400', color: '#64748b', padding: '16px 12px 6px 12px' }}>Operations</div>
          <SidebarLink to="/tasks" icon={Trello} label="Team Tasks" />
          <SidebarLink to="/archive" icon={Archive} label="Archive & Reports" />
          
          {user?.role === 'admin' && (
            <>
              <div style={{ fontSize: '11px', fontWeight: '400', color: '#64748b', padding: '16px 12px 6px 12px' }}>Administrative</div>
              <SidebarLink to="/settings" icon={SettingsIcon} label="Settings" />
            </>
          )}
        </nav>

        {/* User Profile Footer Widget */}
        <div style={{ 
          paddingTop: '16px', 
          borderTop: '1px solid #e2e8f0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingLeft: '8px',
          gap: '8px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              background: '#ffffff', 
              border: '1px solid #cbd5e1',
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: '800', 
              color: '#0f172a',
              fontSize: '12px',
              position: 'relative',
              flexShrink: 0
            }}>
              {user.username?.[0]?.toUpperCase() || 'U'}
              <span style={{ position: 'absolute', bottom: '0', right: '0', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', border: '1.5px solid white' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>{user.username}</p>
              <p style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.02em', marginTop: '1px' }}>
                {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : 'Sales Rep'}
              </p>
            </div>
          </div>
          <button 
            onClick={logout} 
            title="Logout Account"
            style={{ 
              width: '30px',
              height: '30px',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#64748b', 
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#fef2f2';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = '#fee2e2';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* Main Content Workspace with Top Bar */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        
        {/* Top Workspace Header Bar */}
        <header className="mobile-hide" style={{
          height: '64px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '0 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '320px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input 
                type="text" 
                placeholder="Search..." 
                style={{
                  width: '100%',
                  height: '36px',
                  background: '#f1f5f9',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  paddingLeft: '36px',
                  paddingRight: '60px',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                onFocus={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#7c3aed';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)';
                }}
                onBlur={e => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <div style={{ 
                position: 'absolute', 
                right: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '2px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '9px',
                color: '#64748b',
                fontWeight: '700',
                pointerEvents: 'none'
              }}>
                <span>Ctrl</span>
                <span>K</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />
            <button style={{ position: 'relative', background: '#f8fafc', border: '1px solid #e2e8f0', width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <Bell size={18} />
              <span style={{ position: 'absolute', top: '7px', right: '7px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }} />
            </button>
          </div>
        </header>

        <div style={{ flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/leads" element={<ProtectedLayout><Leads /></ProtectedLayout>} />
      <Route path="/leads/import" element={<ProtectedLayout><ImportLeads /></ProtectedLayout>} />
      <Route path="/leads/:id" element={<ProtectedLayout><LeadDetails /></ProtectedLayout>} />
      <Route path="/pipeline" element={<ProtectedLayout><Pipeline /></ProtectedLayout>} />
      <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
      <Route path="/settings/stages" element={<ProtectedLayout><LeadStageSettings /></ProtectedLayout>} />
      <Route path="/settings/users" element={<ProtectedLayout><UserManagement /></ProtectedLayout>} />
      <Route path="/settings/custom-fields" element={<ProtectedLayout><CustomFieldSettings /></ProtectedLayout>} />
      <Route path="/settings/workflows" element={<ProtectedLayout><WorkflowSettings /></ProtectedLayout>} />
      <Route path="/settings/integrations" element={<ProtectedLayout><Integrations /></ProtectedLayout>} />
      <Route path="/campaigns" element={<ProtectedLayout><Campaigns /></ProtectedLayout>} />
      <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
      <Route path="/tasks" element={<ProtectedLayout><InternalTasks /></ProtectedLayout>} />
      <Route path="/archive" element={<ProtectedLayout><LostTaskReport /></ProtectedLayout>} />
    </Routes>
  );
}

export default App;
