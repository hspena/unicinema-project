import React, { useState } from 'react';
import { Card, Badge, Button, Modal, InputField } from '../../components/ui';
import { USERS } from '../../utils/mockData';

const StaffManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const staff = USERS.filter((u) => u.role === 'Staff');

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Staff Management</h2>
        <p>Manage staff members for Galaxy Hall.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button icon="+" onClick={() => setShowModal(true)}>Add Staff</Button>
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
                  <td><code style={{ fontSize: '0.78rem', color: 'var(--gold)' }}>{u.id}</code></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>{u.name[0]}</div>
                      {u.name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td><Badge variant="success">{u.status}</Badge></td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.joined}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="danger"  size="sm">Remove</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        title="Add Staff Member"
        open={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button>Create Staff</Button>
          </>
        }
      >
        <InputField label="Full Name"           placeholder="e.g. James Walton" />
        <InputField label="Email"               type="email"    placeholder="james@unicinema.com" />
        <InputField label="Temporary Password"  type="password" placeholder="••••••••" />
      </Modal>
    </div>
  );
};

export default StaffManagement;
