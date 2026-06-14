import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal, IconPicker } from '../../components/ui';
import {
  Snack, SnackPayload, SnackCategory,
  subscribeToSnacks, createSnack, updateSnack,
  deleteSnack, restockSnack,
  SNACK_CATEGORIES, CATEGORY_ICONS,
  seedDefaultSnacks,
} from '../../services/snackService';
import {
  AlertTriangle, Search, ShoppingBag, XCircle, DollarSign, Plus, Hourglass,
  Eye, EyeOff, Trash2, Save, Popcorn, IconGlyph, SNACK_ICON_KEYS, LayoutGrid, Menu,
} from '../../utils/icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyForm = (): SnackPayload => ({
  name:        '',
  category:    'Food',
  price:       5.00,
  stock:       100,
  emoji:       '',
  description: '',
  available:   true,
});

const stockBadge = (stock: number) => {
  if (stock === 0)   return { variant: 'danger'  as const, label: 'Out of Stock' };
  if (stock <= 20)   return { variant: 'warning' as const, label: 'Low Stock'    };
  return               { variant: 'success' as const, label: 'In Stock'      };
};

// ─── Snack Form ───────────────────────────────────────────────────────────────

const SnackForm = ({
  form, setForm, error,
}: {
  form:    SnackPayload;
  setForm: React.Dispatch<React.SetStateAction<SnackPayload>>;
  error:   string;
}) => (
  <>
    {error && <div className="auth-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {error}</div>}

    {/* Live preview */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: 12,
      background: 'var(--navy)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', marginBottom: 18,
    }}>
      <span style={{ color: 'var(--gold)' }}>
        <IconGlyph iconKey={form.emoji || CATEGORY_ICONS[form.category]} size={36} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          {form.name || 'Item Name'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gold)', marginTop: 2 }}>
          RM {form.price.toFixed(2)}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
          Stock: {form.stock} units · {form.category}
        </div>
      </div>
      <Badge variant={form.available ? 'success' : 'muted'}>
        {form.available ? 'Available' : 'Hidden'}
      </Badge>
    </div>

    {/* Name */}
    <div className="input-group">
      <label className="input-label">Item Name *</label>
      <input
        className="input-field"
        placeholder="e.g. Large Popcorn"
        value={form.name}
        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
      />
    </div>

    {/* Icon */}
    <div className="input-group">
      <label className="input-label">Icon (optional — defaults to category icon)</label>
      <IconPicker
        value={form.emoji}
        onChange={key => setForm(p => ({ ...p, emoji: p.emoji === key ? '' : key }))}
        options={SNACK_ICON_KEYS}
      />
    </div>

    {/* Category */}
    <div className="input-group">
      <label className="input-label">Category *</label>
      <select
        className="select-field"
        value={form.category}
        onChange={e => setForm(p => ({ ...p, category: e.target.value as SnackCategory }))}
      >
        {SNACK_CATEGORIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>

    {/* Price + Stock */}
    <div className="input-row">
      <div className="input-group">
        <label className="input-label">Price (RM) *</label>
        <input
          className="input-field" type="number" min={0} step={0.50}
          value={form.price}
          onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
        />
      </div>
      <div className="input-group">
        <label className="input-label">Initial Stock *</label>
        <input
          className="input-field" type="number" min={0}
          value={form.stock}
          onChange={e => setForm(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))}
        />
      </div>
    </div>

    {/* Description */}
    <div className="input-group">
      <label className="input-label">Description</label>
      <input
        className="input-field"
        placeholder="e.g. Buttered large popcorn, freshly popped"
        value={form.description}
        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
      />
    </div>

    {/* Availability toggle */}
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', background: 'var(--navy)',
      border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    }}>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
          Visible to Moviegoers
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
          Hide items that are temporarily unavailable
        </div>
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, cursor: 'pointer' }}>
        <input
          type="checkbox" checked={form.available}
          onChange={e => setForm(p => ({ ...p, available: e.target.checked }))}
          style={{ opacity: 0, width: 0, height: 0 }}
        />
        <span className="toggle-slider" style={{
          position: 'absolute', inset: 0,
          background: form.available ? 'var(--gold-dim)' : 'var(--surface-raised)',
          borderRadius: 99, border: `1px solid ${form.available ? 'var(--gold)' : 'var(--border)'}`,
          transition: 'all var(--transition)',
        }}>
          <span style={{
            position: 'absolute',
            width: 16, height: 16,
            borderRadius: '50%',
            top: '50%', transform: 'translateY(-50%)',
            left: form.available ? 'calc(100% - 18px)' : '2px',
            background: form.available ? 'var(--gold)' : 'var(--text-muted)',
            transition: 'all var(--transition)',
          }} />
        </span>
      </label>
    </div>
  </>
);

// ─── Restock Modal ────────────────────────────────────────────────────────────

const RestockModal = ({
  snack, open, onClose,
}: {
  snack:   Snack | null;
  open:    boolean;
  onClose: () => void;
}) => {
  const [amount,  setAmount]  = useState(50);
  const [saving,  setSaving]  = useState(false);

  const handleRestock = async () => {
    if (!snack || amount <= 0) return;
    setSaving(true);
    await restockSnack(snack.id, amount);
    setSaving(false);
    onClose();
  };

  return (
    <Modal
      title={`Restock — ${snack?.name}`}
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleRestock} disabled={saving} icon={saving ? <Hourglass size={14} /> : <Plus size={14} />}>
            {saving ? 'Restocking…' : `Add ${amount} units`}
          </Button>
        </>
      }
    >
      {snack && (
        <div>
          {/* Current stock display */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: 14,
            background: 'var(--navy)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', marginBottom: 20,
          }}>
            <span style={{ color: 'var(--gold)' }}><IconGlyph iconKey={snack.emoji || CATEGORY_ICONS[snack.category]} size={28} /></span>
            <div>
              <div style={{ fontWeight: 600 }}>{snack.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Current stock: <strong style={{ color: snack.stock <= 20 ? 'var(--warning)' : 'var(--success)' }}>
                  {snack.stock} units
                </strong>
              </div>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Units to Add</label>
            <input
              className="input-field" type="number" min={1}
              value={amount}
              onChange={e => setAmount(parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Quick amounts */}
          <div style={{ display: 'flex', gap: 8, marginTop: -8 }}>
            {[10, 25, 50, 100].map(n => (
              <button
                key={n}
                className={`btn btn-sm ${amount === n ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setAmount(n)}
              >
                +{n}
              </button>
            ))}
          </div>

          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: 'var(--gold-dim)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', fontSize: '0.8rem', color: 'var(--text-secondary)',
          }}>
            New stock after restock: <strong style={{ color: 'var(--gold)' }}>
              {snack.stock + amount} units
            </strong>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const SnacksManagement = () => {
  const [snacks,       setSnacks]       = useState<Snack[]>([]);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState<'All' | SnackCategory>('All');
  const [showAdd,      setShowAdd]      = useState(false);
  const [editSnack,    setEditSnack]    = useState<Snack | null>(null);
  const [restockSnackItem, setRestockSnackItem] = useState<Snack | null>(null);
  const [form,         setForm]         = useState<SnackPayload>(emptyForm());
  const [formError,    setFormError]    = useState('');
  const [isSaving,     setIsSaving]     = useState(false);

  // View toggle: grid or table
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  useEffect(() => {
    seedDefaultSnacks();
    return subscribeToSnacks(setSnacks);
  }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = snacks.filter(s => {
    const q = search.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(q)        ||
      s.category.toLowerCase().includes(q)    ||
      s.description?.toLowerCase().includes(q);
    const matchCat = catFilter === 'All' || s.category === catFilter;
    return matchSearch && matchCat;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalItems    = snacks.length;
  const outOfStock    = snacks.filter(s => s.stock === 0).length;
  const lowStock      = snacks.filter(s => s.stock > 0 && s.stock <= 20).length;
  const totalValue    = snacks.reduce((sum, s) => sum + s.price * s.stock, 0);

  // ── Open Add ───────────────────────────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm());
    setFormError('');
    setShowAdd(true);
  };

  // ── Open Edit ──────────────────────────────────────────────────────────────
  const openEdit = (s: Snack) => {
    setForm({
      name: s.name, category: s.category, price: s.price,
      stock: s.stock, emoji: s.emoji, description: s.description,
      available: s.available,
    });
    setFormError('');
    setEditSnack(s);
  };

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.name.trim()) return 'Item name is required.';
    if (form.price < 0)    return 'Price cannot be negative.';
    if (form.stock < 0)    return 'Stock cannot be negative.';
    return '';
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setIsSaving(true);
    try {
      const payload = { ...form, emoji: form.emoji || CATEGORY_ICONS[form.category] };
      if (editSnack) {
        await updateSnack(editSnack.id, payload);
        setEditSnack(null);
      } else {
        await createSnack(payload);
        setShowAdd(false);
      }
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to save item.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (s: Snack) => {
    if (!window.confirm(`Delete "${s.name}"?`)) return;
    await deleteSnack(s.id);
  };

  // ── Toggle availability ────────────────────────────────────────────────────
  const handleToggleAvailable = async (s: Snack) => {
    await updateSnack(s.id, { available: !s.available });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Snacks Management</h2>
        <p>Manage the snack and beverage catalogue, stock levels and availability.</p>
      </div>

      {/* ── Stats row ── */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { icon: <ShoppingBag size={20} />, value: totalItems,              label: 'Total Items'   },
          { icon: <AlertTriangle size={20} />, value: lowStock,                label: 'Low Stock',    },
          { icon: <XCircle size={20} />,     value: outOfStock,              label: 'Out of Stock'  },
          { icon: <DollarSign size={20} />,  value: `RM ${totalValue.toFixed(0)}`, label: 'Stock Value' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-value">{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="table-toolbar" style={{ marginBottom: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
          <span className="search-icon"><Search size={14} /></span>
          <input
            className="input-field"
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="select-field" style={{ width: 'auto' }}
          value={catFilter}
          onChange={e => setCatFilter(e.target.value as any)}
        >
          <option value="All">All Categories</option>
          {SNACK_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {/* View toggle */}
        <button
          className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          onClick={() => setViewMode('grid')}
          title="Grid view"
        ><LayoutGrid size={14} /></button>
        <button
          className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          onClick={() => setViewMode('table')}
          title="Table view"
        ><Menu size={14} /></button>
        <Button icon={<Plus size={14} />} onClick={openAdd}>Add Item</Button>
      </div>

      {/* ── Category filter pills ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {(['All', ...SNACK_CATEGORIES] as const).map(c => {
          const count = c === 'All' ? snacks.length : snacks.filter(s => s.category === c).length;
          if (c !== 'All' && count === 0) return null;
          return (
            <div
              key={c}
              onClick={() => setCatFilter(c as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 99, cursor: 'pointer',
                fontSize: '0.74rem', fontWeight: 500,
                background: catFilter === c ? 'var(--gold)' : 'var(--surface)',
                color:      catFilter === c ? 'var(--navy)' : 'var(--text-muted)',
                border: '1px solid var(--border)', transition: 'all var(--transition)',
              }}
            >
              <IconGlyph iconKey={c === 'All' ? 'shopping-bag' : CATEGORY_ICONS[c as SnackCategory]} size={13} /> {c} ({count})
            </div>
          );
        })}
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Popcorn size={32} /></div>
          <div className="empty-state-text">
            {snacks.length === 0 ? 'No items yet. Add one to get started.' : 'No items match your search.'}
          </div>
        </div>
      )}

      {/* ── Grid view ── */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <div className="two-col">
          {filtered.map(s => {
            const sb = stockBadge(s.stock);
            return (
              <div key={s.id} className="snack-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span className="snack-icon" style={{ color: 'var(--gold)' }}>
                    <IconGlyph iconKey={s.emoji || CATEGORY_ICONS[s.category]} size={32} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="snack-name">{s.name}</div>
                      {!s.available && (
                        <Badge variant="muted">Hidden</Badge>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      <IconGlyph iconKey={CATEGORY_ICONS[s.category]} size={12} /> {s.category}
                      {s.description && <> · {s.description}</>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="snack-price">RM {s.price.toFixed(2)}</div>
                    <Badge variant={sb.variant} style={{ marginTop: 3 }}>{sb.label}</Badge>
                  </div>
                </div>

                {/* Stock bar */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Stock</span>
                    <span style={{ color: s.stock <= 20 ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: 600 }}>
                      {s.stock} units
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--surface-raised)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${Math.min(100, (s.stock / 200) * 100)}%`,
                      background: s.stock === 0 ? 'var(--danger)' : s.stock <= 20 ? 'var(--warning)' : 'var(--gold)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <Button variant="outline" size="sm" style={{ flex: 1 }} onClick={() => openEdit(s)}>Edit</Button>
                  <Button variant="outline" size="sm" style={{ flex: 1 }} icon={<Plus size={13} />} onClick={() => setRestockSnackItem(s)}>
                    Restock
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleToggleAvailable(s)}
                    title={s.available ? 'Hide from moviegoers' : 'Show to moviegoers'}
                  >
                    {s.available ? <Eye size={14} /> : <EyeOff size={14} />}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(s)}><Trash2 size={14} /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Table view ── */}
      {viewMode === 'table' && filtered.length > 0 && (
        <Card>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Available</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const sb = stockBadge(s.stock);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ color: 'var(--gold)' }}><IconGlyph iconKey={s.emoji || CATEGORY_ICONS[s.category]} size={20} /></span>
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.name}</div>
                            {s.description && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td><Badge variant="muted">{s.category}</Badge></td>
                      <td style={{ color: 'var(--gold)', fontWeight: 600 }}>RM {s.price.toFixed(2)}</td>
                      <td style={{ fontWeight: 600 }}>{s.stock}</td>
                      <td><Badge variant={sb.variant}>{sb.label}</Badge></td>
                      <td>
                        <Badge
                          variant={s.available ? 'success' : 'muted'}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleToggleAvailable(s)}
                        >
                          {s.available ? 'Visible' : 'Hidden'}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button variant="outline" size="sm" onClick={() => setRestockSnackItem(s)}><Plus size={13} /></Button>
                          <Button variant="outline" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                          <Button variant="danger"  size="sm" onClick={() => handleDelete(s)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Add Modal ── */}
      <Modal
        title="Add Snack / Beverage"
        open={showAdd}
        onClose={() => setShowAdd(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} icon={isSaving ? <Hourglass size={14} /> : <Popcorn size={14} />}>
              {isSaving ? 'Adding…' : 'Add Item'}
            </Button>
          </>
        }
      >
        <SnackForm form={form} setForm={setForm} error={formError} />
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        title={`Edit — ${editSnack?.name}`}
        open={!!editSnack}
        onClose={() => setEditSnack(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditSnack(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} icon={isSaving ? <Hourglass size={14} /> : <Save size={14} />}>
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <SnackForm form={form} setForm={setForm} error={formError} />
      </Modal>

      {/* ── Restock Modal ── */}
      <RestockModal
        snack={restockSnackItem}
        open={!!restockSnackItem}
        onClose={() => setRestockSnackItem(null)}
      />
    </div>
  );
};

export default SnacksManagement;