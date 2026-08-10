import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, MapPin, GraduationCap, Calendar, BarChart3, Filter, X, 
  Search, Globe, Database, HelpCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import api from '../api/client';

const COLORS = ['#7c3aed', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1'];

const MarketerDashboard = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters State
  const [filterAge, setFilterAge] = useState('');
  const [filterPlace, setFilterPlace] = useState('');
  const [filterQualification, setFilterQualification] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, current: 1 });

  const fetchLeads = async (page = 1) => {
    try {
      let url = `leads/?page=${page}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (filterAge) url += `&age=${filterAge}`;
      if (filterPlace) url += `&place=${encodeURIComponent(filterPlace)}`;
      if (filterQualification) url += `&qualification=${encodeURIComponent(filterQualification)}`;
      
      const res = await api.get(url);
      setLeads(Array.isArray(res.data.results) ? res.data.results : []);
      setPagination({ count: res.data.count || 0, current: page });
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('leads/marketer_analytics/');
      setAnalytics(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchLeads(1), fetchAnalytics()]);
      setLoading(false);
    };
    loadAll();
  }, [searchQuery, filterAge, filterPlace, filterQualification]);

  // Transform Age Data for Chart
  const ageData = analytics ? Object.keys(analytics.age_brackets).map(key => ({
    name: key,
    value: analytics.age_brackets[key]
  })) : [];

  if (loading && !analytics) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px', fontSize: '18px', color: '#7c3aed' }}>
        <div className="loading-spinner"></div>Loading Marketer Dashboard...
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '6px', letterSpacing: '-0.02em' }}>Marketer Insights</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Analyze student profiles, demographic details, and qualification metrics.</p>
        </div>
      </header>

      {/* Analytics Charts Grid */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          
          {/* Age Distribution Chart */}
          <div className="glass-card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#7c3aed" /> Age Demographics
            </h3>
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={ageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} leads`, 'Count']} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Places Chart */}
          <div className="glass-card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} color="#10b981" /> Top Student Regions
            </h3>
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer>
                <BarChart data={analytics.top_places} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Qualifications Chart */}
          <div className="glass-card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={18} color="#3b82f6" /> Top Qualifications
            </h3>
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer>
                <BarChart data={analytics.top_qualifications}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Leads Table & Controls Section */}
      <div className="glass-card" style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', background: 'white', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}>
        
        {/* Search Row */}
        <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="glass-input"
              placeholder="Search by student name, phone, course..."
              style={{ paddingLeft: '44px', width: '100%', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '48px', borderRadius: '12px', background: (showFilters || filterAge || filterPlace || filterQualification) ? '#f5f3ff' : 'white', borderColor: (filterAge || filterPlace || filterQualification) ? '#ddd6fe' : '#e2e8f0', color: (filterAge || filterPlace || filterQualification) ? '#7c3aed' : '#0f172a' }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} /> Filters {showFilters && <X size={14} />}
          </button>
        </div>

        {/* Filters Drawer */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
            >
              <div style={{ padding: '24px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: '200px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px', display: 'block' }}>AGE</label>
                  <input 
                    type="number"
                    className="glass-input" 
                    placeholder="Filter by exact age..." 
                    style={{ width: '100%', background: 'white' }}
                    value={filterAge}
                    onChange={e => setFilterAge(e.target.value)}
                  />
                </div>

                <div style={{ minWidth: '200px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px', display: 'block' }}>PLACE</label>
                  <input 
                    type="text"
                    className="glass-input" 
                    placeholder="Filter by city/place..." 
                    style={{ width: '100%', background: 'white' }}
                    value={filterPlace}
                    onChange={e => setFilterPlace(e.target.value)}
                  />
                </div>

                <div style={{ minWidth: '200px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px', display: 'block' }}>QUALIFICATION</label>
                  <input 
                    type="text"
                    className="glass-input" 
                    placeholder="Filter by qualification..." 
                    style={{ width: '100%', background: 'white' }}
                    value={filterQualification}
                    onChange={e => setFilterQualification(e.target.value)}
                  />
                </div>

                {(filterAge || filterPlace || filterQualification) && (
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      className="btn-secondary"
                      style={{ height: '42px', color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }}
                      onClick={() => {
                        setFilterAge('');
                        setFilterPlace('');
                        setFilterQualification('');
                      }}
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lead List Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="leads-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>STUDENT NAME</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>CONTACT</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>COURSE</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>AGE</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>PLACE</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>QUALIFICATION</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>STAGE</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                leads.map(lead => (
                  <tr 
                    key={lead.id} 
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', hover: { background: '#f8fafc' }, transition: 'background 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '16px 24px', fontWeight: '600', color: '#0f172a' }}>{lead.name}</td>
                    <td style={{ padding: '16px 24px', color: '#64748b' }}>{lead.phone || lead.email || '—'}</td>
                    <td style={{ padding: '16px 24px', color: '#334155', fontWeight: '500' }}>{lead.company || '—'}</td>
                    <td style={{ padding: '16px 24px', color: '#334155' }}>{lead.age || '—'}</td>
                    <td style={{ padding: '16px 24px', color: '#334155' }}>{lead.place || '—'}</td>
                    <td style={{ padding: '16px 24px', color: '#334155' }}>{lead.qualification || '—'}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                        {lead.stage_name || 'New'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        {pagination.count > 10 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Showing Page {pagination.current} of {Math.ceil(pagination.count / 10)} ({pagination.count} total leads)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                disabled={pagination.current === 1} 
                onClick={() => fetchLeads(pagination.current - 1)}
                className="btn-secondary" 
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button 
                disabled={pagination.current >= Math.ceil(pagination.count / 10)} 
                onClick={() => fetchLeads(pagination.current + 1)}
                className="btn-secondary" 
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center' }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MarketerDashboard;
