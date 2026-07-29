import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, MoreHorizontal, User, Mail, Phone,
  Users, Upload, Trash2, AlertCircle, CheckCircle2, Clock,
  ChevronRight, ArrowRight, X, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import LeadModal from '../components/LeadModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

const Leads = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, current: 1 });
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ stage: '', assigned_to: '' });
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [isBulkStageModalOpen, setIsBulkStageModalOpen] = useState(false);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [targetStageId, setTargetStageId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // --- Theme Constants ---
  const colors = {
    primary: '#7c3aed', // Violet
    atRisk: '#f59e0b',  // Amber
    success: '#10b981', // Emerald
    textMain: '#0f172a',
    textSub: '#64748b',
    border: '#e2e8f0',
    glassBg: '#ffffff',
  };

  const fetchLeads = async (page = 1) => {
    setLoading(true);
    try {
      const stageId = searchParams.get('stage');
      const assignedToId = searchParams.get('assigned_to');
      const atRisk = searchParams.get('at_risk');
      const missedFollowups = searchParams.get('missed_followups_only');
      const pendingFollowups = searchParams.get('pending_followups');
      let url = `leads/?page=${page}&exclude_final=true`;

      if (user?.role === 'sales' || user?.role === 'agent') {
        url += `&user_priority_view=true`;
      }

      if (stageId) url += `&stage=${stageId}`;
      if (assignedToId) url += `&assigned_to=${assignedToId}`;
      if (atRisk) url += `&at_risk=true`;
      if (missedFollowups) url += `&missed_followups_only=true`;
      if (pendingFollowups) url += `&pending_followups=true`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (dateRange.startDate) url += `&start_date=${dateRange.startDate}`;
      if (dateRange.endDate) url += `&end_date=${dateRange.endDate}`;
      const res = await api.get(url);
      setLeads(Array.isArray(res.data.results) ? res.data.results : []);
      setPagination({ count: res.data.count || 0, current: page });
    } catch (err) {
      console.error('Fetch leads error:', err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };


  const fetchStages = async () => {
    try {
      const res = await api.get('stages/');
      setStages(Array.isArray(res.data) ? res.data : []);
    } catch (err) { }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('users/');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) { }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    fetchStages();
    if (user?.role === 'admin') {
      fetchUsers();
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const stageId = searchParams.get('stage') || '';
    const assignedToId = searchParams.get('assigned_to') || '';
    setFilters({ stage: stageId, assigned_to: assignedToId });
    if (stageId || assignedToId) setShowFilters(true);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => fetchLeads(1), searchQuery ? 500 : 0);
    return () => clearTimeout(timer);
  }, [searchParams, searchQuery, dateRange]);

  // --- Handlers ---
  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length) setSelectedLeads([]);
    else setSelectedLeads(leads.map(l => l.id));
  };

  const toggleSelectOne = (id) => {
    if (selectedLeads.includes(id)) setSelectedLeads(selectedLeads.filter(sid => sid !== id));
    else setSelectedLeads([...selectedLeads, id]);
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedLeads.length} leads permanently?`)) {
      try {
        await Promise.all(selectedLeads.map(id => api.delete(`leads/${id}/`)));
        fetchLeads(pagination.current);
        setSelectedLeads([]);
      } catch (err) { console.error(err); }
    }
  };


  const handleBulkStageUpdate = async () => {
    if (!targetStageId) return;

    const targetStage = stages.find(s => s.id === parseInt(targetStageId));
    let lostReason = null;

    if (targetStage && (targetStage.name.toLowerCase().includes('lost') || targetStage.name.toLowerCase().includes('next intake'))) {
      const reason = window.prompt("Please enter the reason (mandatory):");
      if (reason === null || reason.trim() === '') {
        import('react-hot-toast').then(m => m.toast.error('A reason is required for this stage.'));
        return;
      }
      lostReason = reason.trim();
    }

    try {
      const payload = { stage: targetStageId };
      if (lostReason) payload.lost_reason = lostReason;

      await Promise.all(selectedLeads.map(id => api.patch(`leads/${id}/`, payload)));
      fetchLeads(pagination.current);
      setSelectedLeads([]);
      setIsBulkStageModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const handleBulkAssignUser = async () => {
    if (!targetUserId) return;
    try {
      await Promise.all(selectedLeads.map(id => api.patch(`leads/${id}/`, { assigned_to: targetUserId })));
      fetchLeads(pagination.current);
      setSelectedLeads([]);
      setIsBulkAssignModalOpen(false);
    } catch (err) { console.error(err); }
  };

  // --- UI Components ---
  const StatusBadge = ({ isAtRisk, lastContacted, isFinal }) => {
    if (isAtRisk) return (
      <div className="badge badge-amber">
        <span className="badge-dot" /> Follow Up Missing
      </div>
    );
    if (!lastContacted && !isFinal) return (
      <div className="badge badge-indigo">
        <span className="badge-dot" /> New
      </div>
    );
    return (
      <div className="badge badge-emerald">
        <span className="badge-dot" /> Healthy
      </div>
    );
  };

  const renderMobileCards = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
      {leads.map(lead => (
        <div key={lead.id} className="glass-card" style={{
          padding: '16px',
          borderLeft: lead.is_at_risk ? `4px solid ${colors.atRisk}` : `4px solid ${colors.primary}`,
          background: 'white',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleSelectOne(lead.id)} />
              <Link to={`/leads/${lead.id}`} style={{ fontWeight: '700', color: colors.textMain }}>{lead.name}</Link>
            </div>
            <div style={{ fontWeight: '800', color: colors.primary, fontSize: '12px' }}>{lead.lead_score}%</div>
          </div>
          <div style={{ fontSize: '13px', color: colors.textSub, marginBottom: '12px' }}>{lead.company || 'No Company'}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusBadge isAtRisk={lead.is_at_risk} lastContacted={lead.last_contacted_at} isFinal={lead.is_final} />
            <Link to={`/leads/${lead.id}`}><ChevronRight size={18} color={colors.textSub} /></Link>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page-container" style={{ background: '#f8fafc', minHeight: '100vh', padding: isMobile ? '10px' : '40px' }}>
      {/* Header Section */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: colors.textMain, letterSpacing: '-0.02em' }}>Leads Pipeline</h1>
            {(user?.role === 'sales' || user?.role === 'agent') && (
              <span style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} /> My Assigned Leads Only
              </span>
            )}
          </div>
          <p style={{ color: colors.textSub, fontSize: '15px' }}>{pagination.count} active prospects in your funnel</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
          {user?.role === 'admin' && !isMobile && (
            <button onClick={() => navigate('/leads/import')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white' }}>
              <Upload size={18} /> Import
            </button>
          )}
          <button onClick={() => setIsModalOpen(true)} className="btn-primary" style={{ flex: isMobile ? 1 : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Plus size={20} /> Create Lead
          </button>
        </div>
      </header>

      <LeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onRefresh={fetchLeads} />

      {/* Main Table Card */}
      <div className="glass-card" style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', background: 'white', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}>

        {/* Controls Row */}
        <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: colors.textSub }} />
            <input
              type="text"
              className="glass-input"
              placeholder="Search by name, company or email..."
              style={{ paddingLeft: '44px', width: '100%', height: '48px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '48px', width: isMobile ? '100%' : 'auto', justifyContent: 'center', borderRadius: '12px', background: (showFilters || dateRange.startDate || dateRange.endDate) ? '#f5f3ff' : 'white', borderColor: (dateRange.startDate || dateRange.endDate) ? '#ddd6fe' : '#e2e8f0', color: (dateRange.startDate || dateRange.endDate) ? '#7c3aed' : colors.textMain }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} /> Filters {(dateRange.startDate || dateRange.endDate) ? '(Active)' : ''} {showFilters && <X size={14} />}
          </button>
        </div>

        {/* Expandable Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
            >
              <div style={{ padding: '24px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: '200px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: colors.textSub, marginBottom: '8px', display: 'block' }}>PIPELINE STAGE</label>
                  <select className="glass-input" style={{ width: '100%', background: 'white' }} value={filters.stage} onChange={e => {
                    const newParams = new URLSearchParams(searchParams);
                    if (e.target.value) newParams.set('stage', e.target.value); else newParams.delete('stage');
                    navigate(`/leads?${newParams.toString()}`);
                  }}>
                    <option value="">All Stages</option>
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {user?.role === 'admin' && (
                  <div style={{ minWidth: '200px', flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: colors.textSub, marginBottom: '8px', display: 'block' }}>ASSIGNED TO</label>
                    <select
                      className="glass-input"
                      style={{ width: '100%', background: 'white' }}
                      value={searchParams.get('assigned_to') || ''}
                      onChange={e => {
                        const newParams = new URLSearchParams(searchParams);
                        if (e.target.value) newParams.set('assigned_to', e.target.value); else newParams.delete('assigned_to');
                        navigate(`/leads?${newParams.toString()}`);
                      }}
                    >
                      <option value="">All Users</option>
                      <option value="unassigned" style={{ fontWeight: 'bold' }}>Unassigned Leads</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                  </div>
                )}

                <div style={{ minWidth: '180px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: colors.textSub, marginBottom: '8px', display: 'block' }}>START DATE (CREATED)</label>
                  <input
                    type="date"
                    className="glass-input"
                    style={{ width: '100%', background: 'white' }}
                    value={dateRange.startDate}
                    onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div style={{ minWidth: '180px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: colors.textSub, marginBottom: '8px', display: 'block' }}>END DATE (CREATED)</label>
                  <input
                    type="date"
                    className="glass-input"
                    style={{ width: '100%', background: 'white' }}
                    value={dateRange.endDate}
                    onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                {user?.role === 'admin' && (
                  <div style={{ minWidth: '180px', flex: 1, display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '42px', padding: '0 16px', borderRadius: '12px', background: searchParams.get('at_risk') ? '#fee2e2' : 'white', border: `1px solid ${searchParams.get('at_risk') ? '#ef4444' : '#e2e8f0'}`, color: searchParams.get('at_risk') ? '#ef4444' : colors.textMain, fontWeight: '600', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={!!searchParams.get('at_risk')}
                        onChange={e => {
                          const newParams = new URLSearchParams(searchParams);
                          if (e.target.checked) newParams.set('at_risk', 'true'); else newParams.delete('at_risk');
                          navigate(`/leads?${newParams.toString()}`);
                        }}
                        style={{ display: 'none' }}
                      />
                      <AlertCircle size={16} />
                      {searchParams.get('at_risk') ? 'Showing At-Risk Only' : 'Show Not Contacted'}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '42px', padding: '0 16px', borderRadius: '12px', background: searchParams.get('missed_followups_only') ? '#fee2e2' : 'white', border: `1px solid ${searchParams.get('missed_followups_only') ? '#ef4444' : '#e2e8f0'}`, color: searchParams.get('missed_followups_only') ? '#ef4444' : colors.textMain, fontWeight: '600', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={!!searchParams.get('missed_followups_only')}
                        onChange={e => {
                          const newParams = new URLSearchParams(searchParams);
                          if (e.target.checked) newParams.set('missed_followups_only', 'true'); else newParams.delete('missed_followups_only');
                          navigate(`/leads?${newParams.toString()}`);
                        }}
                        style={{ display: 'none' }}
                      />
                      <Clock size={16} />
                      {searchParams.get('missed_followups_only') ? 'Showing Missed Followups' : 'Missed Followups'}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '42px', padding: '0 16px', borderRadius: '12px', background: searchParams.get('pending_followups') ? '#fef3c7' : 'white', border: `1px solid ${searchParams.get('pending_followups') ? '#f59e0b' : '#e2e8f0'}`, color: searchParams.get('pending_followups') ? '#d97706' : colors.textMain, fontWeight: '600', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={!!searchParams.get('pending_followups')}
                        onChange={e => {
                          const newParams = new URLSearchParams(searchParams);
                          if (e.target.checked) newParams.set('pending_followups', 'true'); else newParams.delete('pending_followups');
                          navigate(`/leads?${newParams.toString()}`);
                        }}
                        style={{ display: 'none' }}
                      />
                      <Calendar size={16} />
                      {searchParams.get('pending_followups') ? 'Showing Pending Followups' : 'Pending Followups'}
                    </label>
                  </div>
                )}
                {(dateRange.startDate || dateRange.endDate) && (
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      onClick={() => setDateRange({ startDate: '', endDate: '' })}
                      className="btn-secondary"
                      style={{ height: '42px', fontSize: '13px', background: '#fee2e2', color: '#ef4444' }}
                    >
                      Clear Dates
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isMobile ? renderMobileCards() : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '16px', width: '40px' }}>
                    <input type="checkbox" checked={selectedLeads.length === leads.length && leads.length > 0} onChange={toggleSelectAll} />
                  </th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', color: colors.textSub }}>Lead Details</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', color: colors.textSub }}>Health</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', color: colors.textSub }}>Contact</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', color: colors.textSub }}>Value</th>
                  <th style={{ textAlign: 'left', padding: '16px', fontSize: '13px', color: colors.textSub }}>Current Stage</th>
                  <th style={{ padding: '16px' }}></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan="7" style={{ padding: '20px' }}><div className="animate-pulse" style={{ height: '40px', background: '#f1f5f9', borderRadius: '8px' }}></div></td></tr>
                  ))
                ) : leads.map((lead) => (
                  <tr key={lead.id} className="table-row-hover" style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: selectedLeads.includes(lead.id) ? '#f5f7ff' : 'transparent',
                    position: 'relative'
                  }}>
                    <td style={{ padding: '16px' }}>
                      <input type="checkbox" checked={selectedLeads.includes(lead.id)} onChange={() => toggleSelectOne(lead.id)} />
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '10px',
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: '800', fontSize: '13px',
                          boxShadow: '0 2px 8px rgba(124, 58, 237, 0.15)'
                        }}>
                          {lead.name?.[0]?.toUpperCase() || 'L'}
                        </div>
                        <div>
                          <Link to={`/leads/${lead.id}`} style={{ fontWeight: '700', color: '#0f172a', fontSize: '14.5px', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = '#7c3aed'} onMouseLeave={e => e.currentTarget.style.color = '#0f172a'}>{lead.name}</Link>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{lead.company || 'Private Individual'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <StatusBadge isAtRisk={lead.is_at_risk} lastContacted={lead.last_contacted_at} isFinal={lead.is_final} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <div style={{ flex: 1, minWidth: '60px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${lead.lead_score || 0}%`, background: (lead.lead_score || 0) > 75 ? '#10b981' : (lead.lead_score || 0) > 40 ? '#f59e0b' : '#ef4444', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{lead.lead_score || 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', fontWeight: '500' }}><Mail size={12} color="#94a3b8" /> {lead.email || '-'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155', fontWeight: '500' }}><Phone size={12} color="#94a3b8" /> {lead.phone || '-'}</div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>₹{(parseFloat(lead.deal_value) || 0).toLocaleString('en-IN')}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700',
                        background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', display: 'inline-block'
                      }}>
                        {lead.stage_name || 'Inbox'}
                      </span>
                      {lead.lost_reason && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#ef4444', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={10} /> {lead.lost_reason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button onClick={() => setActiveDropdown(activeDropdown === lead.id ? null : lead.id)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                        <MoreHorizontal size={20} color={colors.textSub} />
                      </button>
                      {activeDropdown === lead.id && (
                        <div className="glass-card" style={{ position: 'absolute', right: '40px', zIndex: 100, width: '180px', padding: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', background: 'white', border: '1px solid #e2e8f0' }}>
                          <button onClick={() => navigate(`/leads/${lead.id}`)} style={{ width: '100%', textAlign: 'left', padding: '10px', background: 'none', border: 'none', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ChevronRight size={14} /> View Details
                          </button>
                          <button onClick={handleBulkDelete} style={{ width: '100%', textAlign: 'left', padding: '10px', background: 'none', border: 'none', fontSize: '13px', fontWeight: '600', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Pagination */}
        <div style={{ padding: '20px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: colors.textSub, fontWeight: '600' }}>Showing {leads.length} of {pagination.count} leads</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button disabled={pagination.current === 1} onClick={() => fetchLeads(pagination.current - 1)} className="btn-secondary" style={{ height: '36px', padding: '0 16px', background: 'white' }}>Previous</button>
            <button disabled={pagination.current * 10 >= pagination.count} onClick={() => fetchLeads(pagination.current + 1)} className="btn-primary" style={{ height: '36px', padding: '0 16px' }}>Next</button>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedLeads.length > 0 && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            style={{
              position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(30, 41, 59, 0.9)', backdropFilter: 'blur(12px)',
              padding: '12px 24px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', zIndex: 1000, border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>{selectedLeads.length} Selected</div>
            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              {user?.role === 'admin' && (
                <button onClick={() => setIsBulkAssignModalOpen(true)} className="btn-secondary" style={{ height: '32px', fontSize: '12px', background: 'white' }}>Assign User</button>
              )}
              <button onClick={() => setIsBulkStageModalOpen(true)} className="btn-secondary" style={{ height: '32px', fontSize: '12px', background: 'white' }}>Update Stage</button>
              <button onClick={handleBulkDelete} style={{ height: '32px', fontSize: '12px', background: '#ef4444', color: 'white', border: 'none' }}>Delete</button>
            </div>
            <button onClick={() => setSelectedLeads([])} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}><X size={18} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals - Standard Select Styling */}
      {(isBulkStageModalOpen || isBulkAssignModalOpen) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ width: '400px', padding: '32px', background: 'white', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '20px', fontWeight: '800' }}>{isBulkStageModalOpen ? 'Bulk Stage Update' : 'Bulk Reassign Leads'}</h3>
            <p style={{ color: colors.textSub, marginBottom: '24px', fontSize: '14px' }}>This will affect {selectedLeads.length} selected records.</p>

            <select
              className="glass-input"
              style={{ width: '100%', marginBottom: '24px', height: '48px', borderRadius: '12px' }}
              value={isBulkStageModalOpen ? targetStageId : targetUserId}
              onChange={e => isBulkStageModalOpen ? setTargetStageId(e.target.value) : setTargetUserId(e.target.value)}
            >
              <option value="">Choose target...</option>
              {(isBulkStageModalOpen ? stages : users).map(item => (
                <option key={item.id} value={item.id}>{item.name || item.username}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ flex: 1, height: '48px' }} onClick={() => { setIsBulkStageModalOpen(false); setIsBulkAssignModalOpen(false); }}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, height: '48px' }} onClick={isBulkStageModalOpen ? handleBulkStageUpdate : handleBulkAssignUser}>Apply Changes</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Leads;