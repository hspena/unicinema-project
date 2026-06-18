import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal, InputField, SelectField } from '../../components/ui';
import { User, UserRole } from '../../types';
import { getRoleBadgeVariant } from '../../utils/helpers';
import { Search, Trash2, Hourglass, AlertTriangle, Plus, ArrowUp } from '../../utils/icons';
import {
  subscribeToUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../../services/userService';


const UserManagement = () => {
  const [users,      setUsers]      = useState<User[]>([]);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [sortCol,    setSortCol]    = useState('id');
  const [showModal,  setShowModal]  = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError,  setFormError]  = useState('');

  // Form state
  const [newName,     setNewName]     = useState('');
  const [newEmail,    setNewEmail]    = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole,     setNewRole]     = useState<UserRole>('Moviegoer');

  // Subscribe to real-time user updates
  useEffect(() => {
    const unsubscribe = subscribeToUsers((data) => setUsers(data));
    return () => unsubscribe();
  }, []);

  const filtered = users.filter((u) => {
    const q           = search.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(q)  ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)  ||
      u.id.toLowerCase().includes(q);
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleCreate = async () => {
    if (!newName || !newEmail || !newPassword) {
      setFormError('All fields are required.');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      // Modal has no username field, so derive a unique handle from the email
      // (falling back to the name). createUser rejects duplicates.
      const base = (newEmail.split('@')[0] || newName)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const username = base || `user${Date.now()}`;

      await createUser({
        name: newName,
        displayName: newName,
        username,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      setShowModal(false);
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('Moviegoer');
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to create user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    await updateUser(user.id, {
      status: user.status === 'active' ? 'inactive' : 'active',
    });
  };

  const handleDelete = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    await deleteUser(uid);
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>User Management</h2>
        <p>Manage all registered users and their permissions.</p>
      </div>

      <Card>
        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
            <span className="search-icon"><Search size={14} /></span>
            <input
              className="input-field"
              placeholder="Search by name, email, role or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select-field"
            style={{ width: 'auto' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            {['All', 'Admin', 'Cinema Room', 'Staff', 'Moviegoer'].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <Button icon={<Plus size={14} />} onClick={() => setShowModal(true)}>Add User</Button>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {['ID', 'Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((col) => (
                  <th key={col} onClick={() => setSortCol(col.toLowerCase())}>
                    {col} {sortCol === col.toLowerCase() && <ArrowUp size={11} style={{ verticalAlign: -1 }} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td><code style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>{u.id.slice(0, 8)}…</code></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>{u.name[0]}</div>
                      {u.name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td><Badge variant={getRoleBadgeVariant(u.role) as any}>{u.role}</Badge></td>
                  <td>
                    <Badge variant={u.status === 'active' ? 'success' : 'danger'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleToggleStatus(u)}
                    >
                      {u.status}
                    </Badge>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.joined}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => handleDelete(u.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">{users.length === 0 ? <Hourglass size={28} /> : <Search size={28} />}</div>
            <div className="empty-state-text">
              {users.length === 0 ? 'Loading users…' : 'No users match your search.'}
            </div>
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      <Modal
        title="Add New User"
        open={showModal}
        onClose={() => { setShowModal(false); setFormError(''); }}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create User'}
            </Button>
          </>
        }
      >
        {formError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', marginBottom: 12, background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', borderRadius: 'var(--radius)', color: 'var(--danger)', fontSize: '0.82rem' }}>
            <AlertTriangle size={14} /> {formError}
          </div>
        )}
        <div className="input-row">
          <InputField label="Full Name"     placeholder="e.g. John Smith"      value={newName}     onChange={(e) => setNewName(e.target.value)}     />
          <InputField label="Email Address" type="email" placeholder="john@email.com" value={newEmail}    onChange={(e) => setNewEmail(e.target.value)}    />
        </div>
        <SelectField
          label="Role"
          value={newRole}
          options={[
            { value: 'Admin',       label: 'Admin'       },
            { value: 'Cinema Room', label: 'Cinema Room' },
            { value: 'Staff',       label: 'Staff'       },
            { value: 'Moviegoer',   label: 'Moviegoer'   },
          ]}
          onChange={(e) => setNewRole(e.target.value as UserRole)}
        />
        <InputField label="Password" type="password" placeholder="Min. 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </Modal>
    </div>
  );
};

export default UserManagement;
