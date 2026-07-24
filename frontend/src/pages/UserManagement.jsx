import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Shield, User, Mail, Trash2, ArrowLeft, Key, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import UserModal from '../components/UserModal';

const UserManagement = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('users/');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this team member?')) return;
        try {
            await api.delete(`users/${id}/`);
            fetchUsers();
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleNewUser = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    return (
        <div className="page-container">
            <button 
                onClick={() => navigate('/settings')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', color: 'var(--text-secondary)', marginBottom: '24px' }}
            >
                <ArrowLeft size={18} /> Back to Settings
            </button>

            <header className="page-header-responsive" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>User & Role Management</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage team access and permissions (BRD 6.1).</p>
                </div>
                <button 
                    onClick={handleNewUser}
                    className="btn-primary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={20} /> Invite Team Member
                </button>
            </header>

            <UserModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onRefresh={fetchUsers}
                editingUser={editingUser}
            />

            <div className="glass-card table-container" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>User Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Active Modules</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Loading users...</td></tr>
                        ) : users.map((u) => (
                            <tr key={u.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', background: 'var(--bg-tertiary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--brand-blue)' }}>
                                            {u.username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <span style={{ fontWeight: '600' }}>{u.username}</span>
                                    </div>
                                </td>
                                <td>{u.email}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand-blue)', fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>
                                        <Shield size={14} /> {u.role || 'Full Access'}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {u.permissions && Object.keys(u.permissions).filter(k => u.permissions[k].view).length > 0 ? (
                                            Object.keys(u.permissions)
                                                .filter(k => u.permissions[k].view)
                                                .slice(0, 3)
                                                .map(k => (
                                                    <span key={k} style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.05)', color: 'var(--brand-blue)', padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>
                                                        {k.replace('_', ' ')}
                                                    </span>
                                                ))
                                        ) : (
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Full Access</span>
                                        )}
                                        {u.permissions && Object.keys(u.permissions).filter(k => u.permissions[k].view).length > 3 && (
                                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>+more</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span style={{ fontSize: '12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
                                        Active
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button 
                                            onClick={() => handleEdit(u)}
                                            style={{ color: 'var(--brand-blue)', background: 'none' }} 
                                            title="Edit User"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(u.id)}
                                            style={{ color: 'var(--danger)', background: 'none' }} 
                                            title="Remove User"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
