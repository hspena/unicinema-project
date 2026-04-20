import React, { useState } from 'react';
import { Button, Modal, InputField } from '../../components/ui';
import { SNACKS } from '../../utils/mockData';

const SnacksManagement = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Snacks Management</h2>
        <p>Manage the global snack and beverage catalogue.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button icon="+" onClick={() => setShowModal(true)}>Add Item</Button>
      </div>

      <div className="two-col">
        {SNACKS.map((s) => (
          <div key={s.id} className="snack-card">
            <span className="snack-icon">{s.emoji}</span>
            <div style={{ flex: 1 }}>
              <div className="snack-name">{s.name}</div>
              <div className="snack-price">RM {s.price.toFixed(2)}</div>
              <div className="snack-stock">Stock: {s.stock} units</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="icon-btn btn-icon">✏️</button>
              <button className="icon-btn btn-icon" style={{ color: 'var(--danger)' }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        title="Add Snack / Beverage"
        open={showModal}
        onClose={() => setShowModal(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button>Add Item</Button>
          </>
        }
      >
        <InputField label="Item Name" placeholder="e.g. Large Popcorn" />
        <div className="input-row">
          <InputField label="Price (RM)" type="number" placeholder="8.50" />
          <InputField label="Initial Stock" type="number" placeholder="100" />
        </div>
        <InputField label="Emoji Icon" placeholder="🍿" />
      </Modal>
    </div>
  );
};

export default SnacksManagement;
