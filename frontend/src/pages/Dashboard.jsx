import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Target, TrendingUp, Clock, Plus, BarChart3, CheckCircle2, Sparkles, Zap, ArrowRight, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area
} from 'recharts';
import api from '../api/client';

const StatCard = ({ icon: Icon, title, value, trend }) => (
  <div
    style={{
      flex: 1,
      minWidth: '220px',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: '0 1px 2px 0 rgba(15, 23, 42, 0.05)'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      <Icon size={18} color="#64748b" />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
      <span style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>{value}</span>
      {trend && (
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          color: trend.includes('+') || trend === 'Optimal' ? '#059669' : '#334155',
          background: trend.includes('+') || trend === 'Optimal' ? '#ecfdf5' : '#f1f5f9',
          padding: '2px 8px',
          borderRadius: '4px',
          border: trend.includes('+') || trend === 'Optimal' ? '1px solid #a7f3d0' : '1px solid #e2e8f0'
        }}>
          {trend}
        </span>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [pipelineStats, setPipelineStats] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [stats, setStats] = useState({
    totalLeads: 0,
    activePiepline: 0,
    pipelineValue: 0,
    winRate: '0%',
    pendingFollowups: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const results = await Promise.allSettled([
          api.get('leads/?no_pagination=true'),
          api.get('reminders/'),
          api.get('stages/'),
          api.get('users/'),
          api.get('leads/pipeline_stats/'),
          api.get('internal-tasks/daily_briefing/')
        ]);

        const [leadsRes, followupsRes, stagesRes, usersRes, pipelineRes, briefingRes] = results;

        if (pipelineRes.status === 'fulfilled') setPipelineStats(pipelineRes.value.data);
        if (briefingRes.status === 'fulfilled') {
          setBriefing(briefingRes.value.data);
          setBriefingLoading(false);
        } else {
          setBriefingLoading(false);
          console.error("Briefing failed:", briefingRes.reason);
        }

        if (leadsRes.status === 'fulfilled') {
          const leadsData = leadsRes.value.data;
          const active = leadsData.filter(l => !l.is_final).length;
          const won = leadsData.filter(l => l.stage_name === 'Closed Won').length;
          const pipelineValue = leadsData.reduce((sum, l) => sum + parseFloat(l.deal_value || 0), 0);

          setLeads(leadsData);
          setStats(prev => ({
            ...prev,
            totalLeads: leadsData.length,
            activePiepline: active,
            pipelineValue: pipelineValue,
            winRate: leadsData.length > 0 ? `${Math.round((won / leadsData.length) * 100)}%` : '0%'
          }));
        }

        if (followupsRes.status === 'fulfilled') {
          const followupsData = followupsRes.value.data;
          setReminders(followupsData);
          setStats(prev => ({
            ...prev,
            pendingFollowups: followupsData.filter(r => r.status === 'pending').length
          }));
        }

        if (stagesRes.status === 'fulfilled') {
          setStages(stagesRes.value.data.sort((a, b) => a.order - b.order));
        }

        if (usersRes.status === 'fulfilled') {
          setUsers(usersRes.value.data);
        }
      } catch (err) {
        console.error("Global dashboard fetch error:", err);
      }
    };
    fetchStats();
  }, []);

  // Process data for charts
  const trendData = useMemo(() => {
    if (!leads.length) return [];

    // Group leads by month
    const groups = leads.reduce((acc, lead) => {
      const date = new Date(lead.created_at);
      const month = date.toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    // Last 6 months order (approximate)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      last6Months.push(months[(currentMonth - i + 12) % 12]);
    }

    return last6Months.map(m => ({
      name: m,
      leads: groups[m] || 0
    }));
  }, [leads]);

  const pieData = useMemo(() => {
    if (!pipelineStats?.source_breakdown) return [];
    return pipelineStats.source_breakdown.map(s => ({
      name: s.lead_source || 'Unknown',
      value: s.count
    }));
  }, [pipelineStats]);

  const COLORS = ['#7c3aed', '#a78bfa', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleToggleReminderStatus = async (reminderId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
      await api.patch(`reminders/${reminderId}/`, { status: newStatus });
      const res = await api.get('reminders/');
      setReminders(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateWidth = (val, total) => {
    if (!total || total === 0) return '0%';
    const pct = (val / total) * 100;
    return `${Math.min(100, Math.max(0, pct))}%`;
  };

  return (
    <div className="page-container" style={{ padding: '32px 40px' }}>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '13.5px', fontWeight: '500' }}>
            Overview of your sales activities, pipeline value, and conversion performance.
          </p>
        </div>
        {user?.permissions?.leads?.create && (
          <button
            className="btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 18px', 
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: '700',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
            }}
            onClick={() => navigate('/leads')}
          >
            <Plus size={16} /> New Lead
          </button>
        )}
      </header>

      <AnimatePresence>
        {briefing && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card mobile-stack"
            style={{
              marginBottom: '32px',
              padding: '24px 30px',
              background: '#ffffff',
              borderLeft: '5px solid #7c3aed',
              borderTop: '1px solid #e2e8f0',
              borderRight: '1px solid #e2e8f0',
              borderBottom: '1px solid #e2e8f0',
              borderRadius: '16px',
              display: 'flex',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: '24px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)'
            }}
          >
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)',
              zIndex: 1,
              flexShrink: 0
            }}>
              <Sparkles size={20} />
            </div>

            <div style={{ flex: 1, zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Strategic Briefing</span>
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }}></div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p style={{ fontSize: '14.5px', lineHeight: '1.6', color: '#334155', fontWeight: '500' }}>
                {briefing.briefing.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#7c3aed', fontWeight: '700' }}>{part}</strong> : part)}
              </p>
            </div>

            <button
              onClick={() => navigate('/tasks')}
              className="btn-secondary mobile-full"
              style={{
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '40px',
                fontSize: '13px',
                fontWeight: '700',
                borderRadius: '10px'
              }}
            >
              Action Center <ArrowRight size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

       <div className="stat-grid" style={{ marginBottom: '32px' }}>
        <StatCard icon={Users} title="Total Leads" value={stats.totalLeads} trend="+12.4% MoM" />
        <StatCard icon={TrendingUp} title="Pipeline Value" value={`₹${stats.pipelineValue.toLocaleString('en-IN')}`} trend="+₹12.5k" />
        <StatCard icon={Target} title="Win Rate" value={stats.winRate} trend="Optimal" />
        <StatCard icon={Clock} title="Due Follow-ups" value={stats.pendingFollowups} trend="Action Required" />
      </div>

      {/* New Visual Intelligence Grid */}
      <div className="dashboard-grid" style={{ marginBottom: '40px' }}>
        <div className="glass-card" style={{ padding: '32px', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Inbound Lead Flow</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>New leads over the last 6 months</p>
            </div>
            <Activity size={20} color="var(--brand-blue)" />
          </div>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.06)', padding: '12px', background: '#ffffff' }}
                  itemStyle={{ fontWeight: 'bold', color: '#7c3aed' }}
                />
                <Area type="monotone" dataKey="leads" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Source Distribution</h3>
            <PieChartIcon size={20} color="var(--brand-blue)" />
          </div>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {pieData.slice(0, 4).map((entry, index) => (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '40px' }}>
        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Pipeline Forecast</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Projected revenue based on deal probability</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Weighted Total</p>
              <p style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>₹{Math.round(pipelineStats?.total_forecasted_revenue || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pipelineStats?.stage_breakdown?.map((stage) => (
              <div key={stage.stage}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ fontWeight: '600' }}>{stage.stage} <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>({stage.count} leads)</span></span>
                  <span style={{ fontWeight: '700' }}>₹{stage.value.toLocaleString('en-IN')} <span style={{ fontSize: '11px', color: '#10b981' }}>({stage.probability}% prob.)</span></span>
                </div>
                <div style={{ height: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: calculateWidth(stage.value, stats.pipelineValue) }}
                    style={{ height: '100%', background: stage.color || 'var(--brand-blue)', borderRadius: '6px' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Win Rate Leaderboard</h3>
            <Target size={20} color="var(--success)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {users.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>No team data found.</p>
            ) : (
              users
                .filter(u => {
                  if (user?.role === 'admin' || user?.role === 'manager') return true;
                  return u.id === user?.id;
                })
                .slice(0, 5).map(u => {
                  const userLeads = leads.filter(l => l.assigned_to === u.id);
                  const wonLeads = userLeads.filter(l => l.is_final && l.stage_name?.toLowerCase()?.includes('won')).length;
                  const rate = userLeads.length > 0 ? Math.round((wonLeads / userLeads.length) * 100) : 0;

                  return (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800', color: '#7c3aed' }}>
                          {u.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600' }}>{u.username}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{userLeads.length} Leads</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--success)' }}>{rate}%</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Win Rate</div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-card" style={{ minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px' }}>Lead Conversion Funnel</h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Live Analytics</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0' }}>
            {leads.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '60px' }}>
                <BarChart3 size={48} style={{ opacity: 0.1, marginBottom: '16px', display: 'block', margin: '0 auto' }} />
                No lead data available for funnel.
              </div>
            ) : (
              stages.slice(0, 6).map((stage, i) => {
                const count = leads.filter(l => l.stage === stage.id).length;
                const percentage = Math.round((count / leads.length) * 100) || 0;
                const width = `${Math.max(15, percentage)}%`;

                return (
                  <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '120px', fontSize: '13px', textAlign: 'right', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {stage.name}
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: width }}
                        style={{ height: '32px', background: stage.color || '#3b82f6', borderRadius: '4px', opacity: 0.8, display: 'flex', alignItems: 'center', padding: '0 12px', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                        {count}
                      </motion.div>
                    </div>
                    <div style={{ width: '60px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {percentage}%
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px' }}>Upcoming Reminders</h2>
            <div style={{ fontSize: '12px', fontWeight: '800', background: 'rgba(30, 58, 138, 0.08)', padding: '4px 12px', borderRadius: '20px', color: 'var(--brand-blue)' }}>
              {reminders.filter(r => r.status === 'pending').length} Actions
            </div>
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px',
            flex: 1
          }}>
            {reminders.filter(r => r.status === 'pending').length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '60px' }}>
                 <Clock size={48} style={{ opacity: 0.1, marginBottom: '16px', display: 'block', margin: '0 auto' }} />
                 No pending follow-ups.
              </div>
            ) : (
              reminders.filter(r => r.status === 'pending').slice(0, 200).map(rem => (
                <div key={rem.id} style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  borderBottom: '1px solid var(--border-color)', 
                  paddingBottom: '20px', 
                  position: 'relative',
                  transition: 'background 0.2s'
                }}>
                  <button
                    onClick={() => handleToggleReminderStatus(rem.id, rem.status)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--success)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <div
                    onClick={() => navigate(`/leads/${rem.lead}`)}
                    style={{ cursor: 'pointer', flex: 1 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{rem.note || 'Unnamed Task'}</h4>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: 'var(--brand-blue)', background: 'rgba(30, 58, 138, 0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                         <Target size={12} /> {rem.lead_name || 'Lead'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {new Date(rem.scheduled_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {reminders.filter(r => r.status === 'pending').length > 10 && (
            <button 
              onClick={() => navigate('/archive')} 
              style={{ padding: '16px 0', borderTop: '1px solid var(--border-color)', width: '100%', background: 'none', color: 'var(--brand-blue)', fontSize: '13px', fontWeight: '700', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px' }}
            >
              See All Archive & Reports <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
