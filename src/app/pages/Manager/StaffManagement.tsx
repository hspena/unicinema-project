import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal, InputField } from '../../components/ui';
import { User } from '../../types';
import {
  subscribeToUsers,
  createUser,
  updateUser,
  deleteUser,
  generateUniqueUsername,
} from '../../services/userService';
import { AlertTriangle, Plus, Pencil, Trash2, Hourglass, Users } from '../../utils/icons';

const emptyForm = { name: '', email: '', password: '' };

const StaffManagement = () => {
  const [users,     setUsers]     = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser,  setEditUser]  = useState<User | null>(null);
  const [form,      setForm]      = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving,  setIsSaving]  = useState(false);
  const [loaded,    setLoaded]    = useState(false);

  useEffect(() => {
    return subscribeToUsers((data) => { setUsers(data); setLoaded(true); });
  }, []);

  const staff = users
    .filter((u) => u.role === 'Staff')
    .sort((a, b) => a.name.localeCompare(b.name));

  const openAdd = () => {
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setForm({ name: u.name, email: u.email, password: '' });
    setFormError('');
    setEditUser(u);
  };

  const closeModals = () => {
    setShowModal(false);
    setEditUser(null);
    setFormError('');
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setFormError('All fields are required.');
      return;
    }
    if (form.password.length < 6) {
      setFormError('Temporary password must be at least 6 characters.');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      // No username field in the modal — derive a unique handle from the email.
      const username = await generateUniqueUsername(
        form.email.split('@')[0] || form.name
      );
      await createUser({
        name:        form.name.trim(),
        displayName: form.name.trim(),
        username,
        email:       form.email.trim(),
        password:    form.password,
        role:        'Staff',
      });
      closeModals();
    } catch (err: any) {
      setFormError(authErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      await updateUser(editUser.id, {
        name:        form.name.trim(),
        displayName: form.name.trim(),
      });
      closeModals();
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to update staff member.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (u: User) => {
    await updateUser(u.id, { status: u.status === 'active' ? 'inactive' : 'active' });
  };

  const handleRemove = async (u: User) => {
    if (!window.confirm(`Remove ${u.name} from staff? They will lose access immediately.`)) return;
    await deleteUser(u.id);
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Staff Management</h2>
        <p>Manage staff members who scan tickets and serve snacks.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button icon={<Plus size={14} />} onClick={openAdd}>Add Staff</Button>
      </div>

      <Card>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.id}>
                  <td><code style={{ fontSize: '0.72rem', color: 'var(--gold)' }}>{u.id.slice(0, 8)}…</code></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>{u.name[0]}</div>
                      {u.name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>
                    <Badge
                      variant={u.status === 'active' ? 'success' : 'danger'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleToggleStatus(u)}
                    >
                      {u.status}
                    </Badge>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.joined}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="outline" size="sm" icon={<Pencil size={13} />} onClick={() => openEdit(u)}>Edit</Button>
                      <Button variant="danger"  size="sm" icon={<Trash2 size={13} />} onClick={() => handleRemove(u)}>Remove</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {staff.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">{loaded ? <Users size={28} /> : <Hourglass size={28} />}</div>
            <div className="empty-state-text">
              {loaded ? 'No staff members yet. Click "Add Staff" to create one.' : 'Loading staff…'}
            </div>
          </div>
        )}
      </Card>

      {/* ── Add Staff ── */}
      <Modal
        title="Add Staff Member"
        open={showModal}
        onClose={closeModals}
        footer={
          <>
            <Button variant="outline" onClick={closeModals}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? 'Creating…' : 'Create Staff'}
            </Button>
          </>
        }
      >
        <FormError message={formError} />
        <InputField
          label="Full Name" placeholder="e.g. James Walton"
          value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <InputField
          label="Email" type="email" placeholder="james@unicinema.com"
          value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        />
        <InputField
          label="Temporary Password" type="password" placeholder="Min. 6 characters"
          value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
        />
      </Modal>

      {/* ── Edit Staff ── */}
      <Modal
        title="Edit Staff Member"
        open={!!editUser}
        onClose={closeModals}
        footer={
          <>
            <Button variant="outline" onClick={closeModals}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <FormError message={formError} />
        <InputField
          label="Full Name"
          value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <InputField
          label="Email" value={form.email} readOnly
          style={{ opacity: 0.6, cursor: 'not-allowed' }}
        />
      </Modal>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FormError = ({ message }: { message: string }) =>
  message ? (
    <div className="auth-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
      <AlertTriangle size={14} /> {message}
    </div>
  ) : null;

/** Turn Firebase Auth error codes into something a manager can act on. */
const authErrorMessage = (err: any): string => {
  switch (err?.code) {
    case 'auth/email-already-in-use': return 'That email already has an account.';
    case 'auth/invalid-email':        return 'Please enter a valid email address.';
    case 'auth/weak-password':        return 'Password is too weak — use at least 6 characters.';
    default:                          return err?.message ?? 'Failed to create staff member.';
  }
};

export default StaffManagement;
