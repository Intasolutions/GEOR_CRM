import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Bell, X } from 'lucide-react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

const NotificationManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const notifiedSet = useRef(new Set());

  useEffect(() => {
    if (!user) return;

    const checkReminders = async () => {
      try {
        const res = await api.get('reminders/?no_pagination=true');
        const now = new Date();
        const remindersArr = Array.isArray(res.data) ? res.data : (res.data.results || []);
        
        remindersArr.forEach(rem => {
          if (rem.status === 'pending') {
            const scheduledTime = new Date(rem.scheduled_at);
            const timeDiff = now - scheduledTime;
            
            // Pop if due within last 60 minutes AND not yet popped this session
            if (timeDiff >= -10000 && timeDiff <= 60 * 60 * 1000 && !notifiedSet.current.has(rem.id)) {
              notifiedSet.current.add(rem.id);
              
              toast.custom((t) => (
                <div 
                  className="glass-card animate-fade-in" 
                  style={{ 
                    padding: '16px', 
                    display: 'flex', 
                    gap: '12px', 
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    borderLeft: '4px solid var(--brand-blue)',
                    maxWidth: '400px',
                    position: 'relative'
                  }}
                  onClick={() => {
                    toast.dismiss(t.id);
                    navigate(`/leads/${rem.lead}`);
                  }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(30, 58, 138, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-blue)', flexShrink: 0 }}>
                    <Bell size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h4 style={{ fontWeight: '700', fontSize: '14px', margin: 0 }}>Reminder Due!</h4>
                        <button onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }} style={{ background: 'none', padding: '4px', opacity: 0.5 }}>
                            <X size={14} />
                        </button>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>{rem.note || 'You have a scheduled task.'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--brand-blue)', marginTop: '8px', fontWeight: 'bold' }}>Click to view details</p>
                  </div>
                </div>
              ), { duration: 15000, position: 'top-right' });
            }
          }
        });
      } catch (err) {
        console.error('Failed to check reminders', err);
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 10000); // Check every 10 seconds (reduced frequency)

    return () => clearInterval(interval);
  }, [user, navigate]);

  return null;
};

export default NotificationManager;
