import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, Users, 
  Target, Calendar, ArrowUpRight, ArrowDownRight,
  Filter, Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api/client';

const Reports = () => {
  const [pipelineStats, setPipelineStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, campRes, usersRes, leadsRes] = await Promise.all([
          api.get('leads/pipeline_stats/'),
          api.get('campaigns/'),
          api.get('users/'),
          api.get('leads/?no_pagination=true')
        ]);
        setPipelineStats(statsRes.data);
        setCampaigns(campRes.data);
        setUsers(usersRes.data || []);
        setLeads(leadsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const employeeStats = useMemo(() => {
    if (!users.length || !leads.length) return [];
    return users.map(u => {
      const userLeads = leads.filter(l => l.assigned_to === u.id);
      const won = userLeads.filter(l => l.stage_name?.toLowerCase() === 'closed won');
      const conversionRate = userLeads.length ? Math.round((won.length / userLeads.length) * 100) : 0;
      const pipelineValue = userLeads.reduce((sum, l) => sum + (parseFloat(l.deal_value) || 0), 0);
      const wonValue = won.reduce((sum, l) => sum + (parseFloat(l.deal_value) || 0), 0);
      return {
        ...u,
        leadsCount: userLeads.length,
        wonCount: won.length,
        conversionRate,
        pipelineValue,
        wonValue
      };
    }).sort((a, b) => b.wonValue - a.wonValue);
  }, [users, leads]);

  if (loading) return <div style={{ padding: '40px' }}>Loading reports...</div>;

  return (
    <div className="page-container" style={{ padding: '32px 40px' }}>
      <header className="page-header-responsive" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '4px' }}>Analytics & Reports</h1>
          <p style={{ color: '#64748b', fontSize: '13.5px', fontWeight: '500' }}>Performance insights, representative reports, and sales forecasting.</p>
        </div>
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600' }}>
          <Download size={16} /> Export Report
        </button>
      </header>

      <div className="stat-grid" style={{ marginBottom: '32px' }}>
        <div style={{ flex: 1, minWidth: '220px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 2px 0 rgba(15, 23, 42, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forecasted Revenue</span>
            <TrendingUp size={18} color="#64748b" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>₹{Math.round(pipelineStats?.total_forecasted_revenue || 0).toLocaleString('en-IN')}</span>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
              +12%
            </span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '220px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 2px 0 rgba(15, 23, 42, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Won Deals</span>
            <Users size={18} color="#64748b" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>{pipelineStats?.won_leads_count || 0}</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '220px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 2px 0 rgba(15, 23, 42, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Campaigns</span>
            <Target size={18} color="#64748b" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>{campaigns.filter(c => c.status === 'active').length}</span>
          </div>
        </div>
      </div>

      <div className="grid-equal">
        <div className="glass-card" style={{ padding: '32px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart3 size={20} color="var(--brand-blue)" /> Sales Funnel Conversion
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pipelineStats?.stage_breakdown?.map((stage, idx) => (
              <div key={stage.stage} style={{ position: 'relative' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '16px 20px', 
                  background: '#f8fafc', 
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  zIndex: 2,
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: stage.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>
                      {idx + 1}
                    </div>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>{stage.stage}</p>
                      <p style={{ fontSize: '12px', color: '#64748b' }}>{stage.count} Leads</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>₹{stage.value.toLocaleString('en-IN')}</p>
                    <p style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>{stage.probability}% Probability</p>
                  </div>
                </div>
                {idx < (pipelineStats?.stage_breakdown?.length || 0) - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                    <div style={{ width: '2px', height: '12px', background: '#e2e8f0' }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '32px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PieChart size={20} color="var(--brand-blue)" /> Campaign Performance
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             {campaigns.length === 0 ? (
               <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>No campaigns to analyze.</p>
             ) : (
               campaigns.map(camp => (
                 <div key={camp.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a' }}>{camp.name}</span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>{camp.lead_count} leads</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (camp.lead_count / 20) * 100)}%` }}
                        style={{ height: '100%', background: '#2563eb', borderRadius: '4px' }}
                      />
                    </div>
                 </div>
               ))
             )}
          </div>
        </div>
      </div>

      {/* Sales Representative Performance Section */}
      <div className="glass-card" style={{ padding: '32px', marginTop: '40px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={20} color="var(--brand-blue)" /> Sales Representative Performance
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '14px 16px', color: '#64748b', fontWeight: '600' }}>Representative</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', color: '#64748b', fontWeight: '600' }}>Leads Assigned</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', color: '#64748b', fontWeight: '600' }}>Closed Won</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', color: '#64748b', fontWeight: '600' }}>Pipeline Value</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', color: '#64748b', fontWeight: '600' }}>Won Value</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', color: '#64748b', fontWeight: '600' }}>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {employeeStats.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                    No sales representative statistics available.
                  </td>
                </tr>
              ) : (
                employeeStats.map(emp => (
                  <tr key={emp.id} className="table-row-hover" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        background: '#f1f5f9', 
                        border: '1px solid #cbd5e1', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '11px', 
                        fontWeight: '700', 
                        color: '#0f172a' 
                      }}>
                        {emp.username?.[0]?.toUpperCase()}
                      </div>
                      {emp.username}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>{emp.leadsCount}</td>
                    <td style={{ padding: '14px 16px', color: '#059669', fontWeight: '600' }}>{emp.wonCount}</td>
                    <td style={{ padding: '14px 16px', color: '#334155' }}>₹{emp.pipelineValue.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '14px 16px', color: '#2563eb', fontWeight: '700' }}>₹{emp.wonValue.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: '60px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${emp.conversionRate}%`, background: '#10b981', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{emp.conversionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
