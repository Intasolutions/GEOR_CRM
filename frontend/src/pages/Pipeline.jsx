import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, User, Mail, Plus, List as ListIcon, Trello, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import LeadModal from '../components/LeadModal';
import { useAuth } from '../context/AuthContext';

const Pipeline = () => {
  const [stages, setStages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ count: 0, current: 1 });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dateRange]);


  const fetchData = async () => {
    setLoading(true);
    try {
      let leadsUrl = 'leads/?no_pagination=true';
      if (dateRange.startDate) leadsUrl += `&start_date=${dateRange.startDate}`;
      if (dateRange.endDate) leadsUrl += `&end_date=${dateRange.endDate}`;

      const [stagesRes, leadsRes] = await Promise.all([
        api.get('stages/'),
        api.get(leadsUrl)
      ]);

      const stagesData = Array.isArray(stagesRes.data) ? stagesRes.data : [];
      const leadsData = Array.isArray(leadsRes.data) ? leadsRes.data : leadsRes.data?.results || [];
      const totalCount = Array.isArray(leadsRes.data) ? leadsRes.data.length : (leadsRes.data?.count || 0);

      setStages(stagesData.sort((a, b) => (a.order || 0) - (b.order || 0)));
      setLeads(leadsData);
      setPagination({ count: totalCount, current: 1 });
    } catch (err) {
      console.error('Pipeline fetch error:', err);
      toast.error('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  };

  // Local filtering for fast search feedback
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery ||
      lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Horizontal Scroll Handler for Dragging
  const boardRef = React.useRef(null);
  const scrollInterval = React.useRef(null);

  const handleDragOverScroll = (e) => {
    onDragOver(e);

    if (!boardRef.current) return;

    const { clientX } = e;
    const { left, right, width } = boardRef.current.getBoundingClientRect();
    const scrollThreshold = 100; // Pixels from edge to start scrolling

    clearInterval(scrollInterval.current);

    if (clientX < left + scrollThreshold) {
      scrollInterval.current = setInterval(() => {
        boardRef.current.scrollLeft -= 10;
      }, 10);
    } else if (clientX > right - scrollThreshold) {
      scrollInterval.current = setInterval(() => {
        boardRef.current.scrollLeft += 10;
      }, 10);
    }
  };

  const stopScroll = () => {
    clearInterval(scrollInterval.current);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDragStart = (e, leadId) => {
    if (isMobile) return;
    e.dataTransfer.setData("leadId", leadId.toString()); // Ensure it's a string
    e.dataTransfer.effectAllowed = "move";
  };

  const [draggedOverStage, setDraggedOverStage] = useState(null);

  const onDragEnter = (e, stageId) => {
    e.preventDefault();
    setDraggedOverStage(stageId);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    // Only clear if we're actually leaving the column, not just moving between children
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDraggedOverStage(null);
  };

  const onDrop = async (e, stageId) => {
    e.preventDefault();
    stopScroll();
    setDraggedOverStage(null);
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) return;

    try {
      const currentLead = leads.find(l => l.id == leadId);
      const currentStageObj = stages.find(s => s.id === currentLead?.stage);
      const targetStage = stages.find(s => s.id === stageId);

      const isSalesOrAgent = user && ['sales', 'agent'].includes(user.role);
      if (isSalesOrAgent && currentStageObj && targetStage && currentStageObj.id !== targetStage.id) {
        const SPECIAL_STAGES = ['lost', 'next intake', 'domestic'];
        const targetNameLower = targetStage.name.toLowerCase();
        const isSpecial = SPECIAL_STAGES.some(s => targetNameLower.includes(s));

        if (!isSpecial && targetStage.order !== currentStageObj.order + 1) {
          toast.error("You can only move to the next sequential stage.");
          return;
        }
      }

      // Optimistic UI Update
      setLeads(prev => prev.map(l => l.id == leadId ? { ...l, stage: stageId } : l));

      let payload = { stage: stageId };
      
      if (targetStage && (targetStage.name.toLowerCase().includes('lost') || targetStage.name.toLowerCase().includes('next intake') || targetStage.name.toLowerCase().includes('domestic'))) {
        const reason = window.prompt("Please enter the reason (mandatory):");
        if (reason === null || reason.trim() === '') {
          import('react-hot-toast').then(m => m.toast.error('A reason is required for this stage.'));
          // Revert optimistic update
          setLeads(prev => prev.map(l => l.id == leadId ? { ...l, stage: leads.find(old => old.id == leadId)?.stage } : l));
          return;
        }
        payload.lost_reason = reason.trim();
      }

      const res = await api.patch(`leads/${leadId}/`, payload);
      toast.success(`Moved to ${targetStage?.name}`);
      fetchData();
    } catch (err) {
      console.error('Move failed:', err);
      fetchData();
      let errorMsg = 'Failed to move lead';
      if (err.response && err.response.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (data.non_field_errors && data.non_field_errors[0]) {
          errorMsg = data.non_field_errors[0];
        } else {
          const firstKey = Object.keys(data)[0];
          if (firstKey && Array.isArray(data[firstKey]) && data[firstKey][0]) {
            errorMsg = data[firstKey][0];
          }
        }
      }
      toast.error(errorMsg);
    }
  };

  if (loading) return <div className="page-container">Loading Pipeline...</div>;

  return (
    <div className="page-container" style={{
      height: 'calc(100vh - 40px)', // Fits perfectly within main area
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      paddingBottom: 0 // Allow board to touch the bottom
    }}>
      <header className="page-header-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '24px 0', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '24px' : '28px', marginBottom: '4px' }}>CRM Pipeline</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{isMobile ? 'Vertical List View' : 'Kanban Board View (Drag & Drop)'}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
          <button
            className={showFilters ? "btn-primary" : "btn-secondary"}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} /> Filters
          </button>
          <Link to="/leads" className="btn-secondary" style={{ flex: isMobile ? 1 : 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}>
            <ListIcon size={16} /> Table
          </Link>
          {user && !['sales', 'agent'].includes(user.role) && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
              style={{ flex: isMobile ? 1 : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
            >
              <Plus size={18} /> Add Lead
            </button>
          )}
        </div>
      </header>

      {/* Search and Filters Bar */}
      <AnimatePresence>
        {(showFilters || searchQuery) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              marginBottom: '20px',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '12px',
              padding: '16px',
              background: 'rgba(30, 58, 138, 0.03)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'relative', flex: 2 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search leads by name, email, phone or course..."
                className="glass-input"
                style={{ paddingLeft: '36px', height: '40px', fontSize: '14px' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {showFilters && (
              <>

                <div style={{ flex: 1 }}>
                  <input
                    type="date"
                    className="glass-input"
                    style={{ height: '40px', fontSize: '13px' }}
                    title="Start Date (Assigned/Created)"
                    value={dateRange.startDate}
                    onChange={e => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="date"
                    className="glass-input"
                    style={{ height: '40px', fontSize: '13px' }}
                    title="End Date (Assigned/Created)"
                    value={dateRange.endDate}
                    onChange={e => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                {(dateRange.startDate || dateRange.endDate) && (
                  <button
                    onClick={() => setDateRange({ startDate: '', endDate: '' })}
                    className="btn-secondary"
                    style={{ height: '40px', fontSize: '13px', background: '#fee2e2', color: '#ef4444' }}
                  >
                    Clear Dates
                  </button>
                )}
              </>
            )}
            {(searchQuery || selectedCampaign) && (
              <button
                className="btn-text"
                style={{ fontSize: '12px', color: 'var(--brand-blue)', fontWeight: '600' }}
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCampaign('');
                }}
              >
                Clear All
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>


      <div
        ref={boardRef}
        onDragLeave={stopScroll}
        onDrop={stopScroll}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          gap: '20px',
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: '20px',
          alignItems: 'stretch',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          minHeight: 0
        }}>
        {stages.map(stage => {
          const stageLeads = filteredLeads.filter(l => l.stage == stage.id);
          const stageTotal = stageLeads.reduce((sum, l) => sum + (parseFloat(l.deal_value) || 0), 0);
          return (
            <div
              key={stage.id}
              onDragOver={handleDragOverScroll}
              onDragEnter={(e) => onDragEnter(e, stage.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, stage.id)}
              style={{
                minWidth: isMobile ? '280px' : '320px',
                maxWidth: isMobile ? '280px' : '320px',
                flexBasis: isMobile ? '280px' : '320px',
                background: draggedOverStage === stage.id ? '#f5f3ff' : '#f8fafc',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                border: draggedOverStage === stage.id ? '2px dashed #7c3aed' : '1px solid #e2e8f0',
                flexShrink: 0,
                marginBottom: '0',
                boxShadow: draggedOverStage === stage.id ? '0 8px 24px rgba(124, 58, 237, 0.08)' : 'var(--shadow-sm)',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                scrollSnapAlign: 'start'
              }}
            >
              {/* Stage Header */}
              <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `4px solid ${stage.color || '#cbd5e1'}`, background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', color: draggedOverStage === stage.id ? '#7c3aed' : '#0f172a' }}>{stage.name}</span>
                    <span style={{ fontSize: '11px', background: '#f5f3ff', color: '#7c3aed', padding: '1px 6px', borderRadius: '8px', fontWeight: '700' }}>
                      {stageLeads.length}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>₹{stageTotal.toLocaleString('en-IN')}</span>
                </div>
                <MoreHorizontal size={16} style={{ color: '#64748b', cursor: 'pointer' }} />
              </div>

              {/* Card List Area */}
              <div
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, stage.id)}
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  overflowY: 'auto',
                  flex: 1,
                  minHeight: 0,
                  scrollbarWidth: 'thin',
                  background: draggedOverStage === stage.id ? 'rgba(37, 99, 235, 0.01)' : '#f8fafc'
                }}>
                <AnimatePresence>
                  {stageLeads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                      No active prospects
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <motion.div
                        layout
                        key={lead.id}
                        draggable={!isMobile}
                        onDragStart={(e) => onDragStart(e, lead.id)}
                        whileHover={{ scale: 1.01, y: -2 }}
                        className="glass-card"
                        style={{
                          padding: '16px',
                          cursor: isMobile ? 'default' : 'grab',
                          marginBottom: '0',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)'
                        }}
                      >
                        <Link to={`/leads/${lead.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '14.5px', color: '#0f172a' }}>{lead.name}</span>
                            <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#7c3aed' }}>₹{(parseFloat(lead.deal_value) || 0).toLocaleString('en-IN')}</span>
                          </div>
                          {lead.company && (
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', marginBottom: '10px' }}>
                              {lead.company}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '10px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>{new Date(lead.updated_at).toLocaleDateString()}</span>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: '800',
                              color: 'white'
                            }}>
                              {lead?.name?.[0]?.toUpperCase()}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
        <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
          Showing all {pagination.count} leads in the pipeline view.
        </p>
      </div>

      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRefresh={() => fetchData(pagination.current)}
      />
    </div>
  );
};

export default Pipeline;
