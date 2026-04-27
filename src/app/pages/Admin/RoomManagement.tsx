import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal } from '../../components/ui';
import RoomTemplateBuilder            from '../../components/RoomTemplateBuilder';
import {
  RoomTemplate, Room,
  subscribeToTemplates, subscribeToRooms,
  createRoom, updateRoom, deleteRoom, deleteTemplate,
  templateSeatCount,
} from '../../services/templateService';
import {
  createUser, subscribeToUsers,
  isUsernameAvailable,
} from '../../services/userService';
import { User } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const RoomManagement = () => {
  const [templates,    setTemplates]    = useState<RoomTemplate[]>([]);
  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [managers,     setManagers]     = useState<User[]>([]);
  const [tab,          setTab]          = useState<'templates' | 'rooms'>('templates');
  const [showBuilder,  setShowBuilder]  = useState(false);
  const [editTemplate, setEditTemplate] = useState<RoomTemplate | undefined>();

  // Add room + create manager form
  const [showAddRoom,  setShowAddRoom]  = useState(false);
  const [step,         setStep]         = useState<1 | 2>(1);  // 1=room info, 2=manager account

  // Step 1 fields
  const [roomName,     setRoomName]     = useState('');
  const [roomTplId,    setRoomTplId]    = useState('');

  // Step 2 fields — manager account
  const [mgrName,        setMgrName]        = useState('');
  const [mgrDisplayName, setMgrDisplayName] = useState('');
  const [mgrUsername,    setMgrUsername]     = useState('');
  const [mgrEmail,       setMgrEmail]       = useState('');
  const [mgrPassword,    setMgrPassword]    = useState('');
  const [autoPassword,   setAutoPassword]   = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'available' | 'taken'>('idle');
  const [formError,      setFormError]      = useState('');
  const [isCreating,     setIsCreating]     = useState(false);
  const [createdInfo,    setCreatedInfo]    = useState<{ roomName: string; email: string; password: string } | null>(null);

  useEffect(() => {
    const u1 = subscribeToTemplates(setTemplates);
    const u2 = subscribeToRooms(setRooms);
    const u3 = subscribeToUsers(all => setManagers(all.filter(u => u.role === 'Cinema Room')));
    return () => { u1(); u2(); u3(); };
  }, []);

  const resetAddRoom = () => {
    setStep(1);
    setRoomName(''); setRoomTplId('');
    setMgrName(''); setMgrDisplayName(''); setMgrUsername('');
    setMgrEmail(''); setMgrPassword(''); setAutoPassword('');
    setFormError(''); setUsernameStatus('idle');
    setCreatedInfo(null);
  };

  const openAddRoom = () => {
    resetAddRoom();
    const pw = generateTempPassword();
    setAutoPassword(pw);
    setMgrPassword(pw);
    setShowAddRoom(true);
  };

  // ── Username availability check ────────────────────────────────────────────
  const handleUsernameChange = async (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setMgrUsername(clean);
    if (!mgrDisplayName || mgrDisplayName === mgrUsername) setMgrDisplayName(clean);
    if (clean.length < 3) { setUsernameStatus('idle'); return; }
    const available = await isUsernameAvailable(clean);
    setUsernameStatus(available ? 'available' : 'taken');
  };

  // ── Create room + manager ──────────────────────────────────────────────────
  const handleCreate = async () => {
    setFormError('');

    // Validate step 2
    if (!mgrName.trim())        { setFormError('Manager name is required.'); return; }
    if (!mgrUsername.trim())    { setFormError('Username is required.'); return; }
    if (mgrUsername.length < 3) { setFormError('Username must be at least 3 characters.'); return; }
    if (!mgrEmail.trim())       { setFormError('Email is required.'); return; }
    if (mgrPassword.length < 6) { setFormError('Password must be at least 6 characters.'); return; }
    if (usernameStatus === 'taken') { setFormError('Username is already taken.'); return; }

    setIsCreating(true);
    try {
      // 1. Create the manager account
      const manager = await createUser({
        name:        mgrName,
        displayName: mgrDisplayName || mgrName,
        username:    mgrUsername,
        email:       mgrEmail,
        password:    mgrPassword,
        role:        'Cinema Room',
      });

      // 2. Create the room linked to this manager
      await createRoom({
        name:       roomName,
        templateId: roomTplId,
        status:     'inactive',
        managerId:  manager.id,
      });

      setCreatedInfo({ roomName, email: mgrEmail, password: mgrPassword });
    } catch (e: any) {
      setFormError(e.message ?? 'Failed to create room.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!window.confirm('Delete this room?')) return;
    await deleteRoom(id);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    await deleteTemplate(id);
  };

  const handleToggleStatus = async (room: Room) => {
    await updateRoom(room.id, { status: room.status === 'active' ? 'inactive' : 'active' });
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Room Management</h2>
        <p>Build seating templates, create cinema rooms, and assign managers.</p>
      </div>

      {/* Tabs */}
      <div className="rm-tabs" style={{ marginBottom: 20 }}>
        <button className={`rm-tab ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>
          🗂️ Seat Templates ({templates.length})
        </button>
        <button className={`rm-tab ${tab === 'rooms' ? 'active' : ''}`} onClick={() => setTab('rooms')}>
          🏟️ Cinema Rooms ({rooms.length})
        </button>
      </div>

      {/* ── Templates ── */}
      {tab === 'templates' && (
        <>
          {showBuilder ? (
            <Card title={editTemplate ? 'Edit Template' : 'New Template'}>
              <div className="card-body">
                <RoomTemplateBuilder
                  existing={editTemplate}
                  onSaved={() => { setShowBuilder(false); setEditTemplate(undefined); }}
                  onCancel={() => { setShowBuilder(false); setEditTemplate(undefined); }}
                />
              </div>
            </Card>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button icon="+" onClick={() => { setEditTemplate(undefined); setShowBuilder(true); }}>
                  New Template
                </Button>
              </div>
              {templates.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🗂️</div>
                  <div className="empty-state-text">No templates yet.</div>
                </div>
              ) : (
                <div className="room-grid">
                  {templates.map(t => (
                    <div key={t.id} className="room-card">
                      <div className="room-name">{t.name}</div>
                      <div className="room-stat"><span>Section Grid</span><span>{t.gridRows} × {t.gridCols}</span></div>
                      <div className="room-stat"><span>Total Seats</span><span>{templateSeatCount(t)}</span></div>
                      <div className="room-stat"><span>Created</span><span style={{ fontSize: '0.72rem' }}>{t.createdAt?.split('T')[0]}</span></div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                        <Button variant="outline" size="sm" style={{ flex: 1 }} onClick={() => { setEditTemplate(t); setShowBuilder(true); }}>Edit</Button>
                        <Button variant="danger"  size="sm" style={{ flex: 1 }} onClick={() => handleDeleteTemplate(t.id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Rooms ── */}
      {tab === 'rooms' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button icon="+" onClick={openAddRoom}>Add Room + Manager</Button>
          </div>
          {rooms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏟️</div>
              <div className="empty-state-text">No rooms yet.</div>
            </div>
          ) : (
            <div className="room-grid">
              {rooms.map(r => {
                const tpl     = templates.find(t => t.id === r.templateId);
                const manager = managers.find(m => m.id === r.managerId);
                return (
                  <div key={r.id} className="room-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div className="room-name">{r.name}</div>
                      <Badge
                        variant={r.status === 'active' ? 'success' : 'muted'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggleStatus(r)}
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <div className="room-stat"><span>Template</span><span>{tpl?.name ?? '—'}</span></div>
                    {tpl && <div className="room-stat"><span>Total Seats</span><span>{templateSeatCount(tpl)}</span></div>}
                    <div className="room-stat">
                      <span>Manager</span>
                      <span style={{ fontSize: '0.75rem' }}>
                        {manager
                          ? <><strong>{manager.displayName || manager.name}</strong><br />@{manager.username}</>
                          : <span style={{ color: 'var(--warning)' }}>Unassigned</span>
                        }
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                      <Button variant="danger" size="sm" style={{ flex: 1 }} onClick={() => handleDeleteRoom(r.id)}>Delete</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Add Room Modal ── */}
      <Modal
        title={createdInfo ? '✅ Room Created!' : step === 1 ? 'Step 1 — Room Info' : 'Step 2 — Manager Account'}
        open={showAddRoom}
        onClose={() => { resetAddRoom(); setShowAddRoom(false); }}
        footer={
          createdInfo ? (
            <Button onClick={() => { resetAddRoom(); setShowAddRoom(false); }}>Done</Button>
          ) : step === 1 ? (
            <>
              <Button variant="outline" onClick={() => setShowAddRoom(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!roomName.trim()) { setFormError('Room name is required.'); return; }
                  if (!roomTplId)       { setFormError('Please select a template.'); return; }
                  setFormError(''); setStep(2);
                }}
              >
                Next →
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? '⏳ Creating…' : '🏟️ Create Room & Manager'}
              </Button>
            </>
          )
        }
      >
        {createdInfo ? (
          /* ── Success screen ── */
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>🏟️</div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{createdInfo.roomName}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Room created and manager account set up.
              </div>
            </div>
            <div style={{
              padding: 14, background: 'var(--navy)', borderRadius: 'var(--radius)',
              border: '1px solid var(--gold)', marginBottom: 12,
            }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                ⚠️ Share these credentials with the manager. They should change the password after first login.
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Email: </span><strong style={{ color: 'var(--gold)' }}>{createdInfo.email}</strong></div>
                <div style={{ marginTop: 4 }}><span style={{ color: 'var(--text-muted)' }}>Password: </span><strong style={{ color: 'var(--gold)' }}>{createdInfo.password}</strong></div>
              </div>
            </div>
          </div>
        ) : step === 1 ? (
          /* ── Step 1 ── */
          <>
            {formError && <div className="auth-error" style={{ marginBottom: 12 }}>⚠️ {formError}</div>}
            <div className="input-group">
              <label className="input-label">Room Name *</label>
              <input className="input-field" placeholder="e.g. Galaxy Hall" value={roomName}
                onChange={e => setRoomName(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Seat Template *</label>
              <select className="select-field" value={roomTplId} onChange={e => setRoomTplId(e.target.value)}>
                <option value="">Select a template…</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — {templateSeatCount(t)} seats</option>
                ))}
              </select>
            </div>
            <div style={{
              padding: '10px 14px', background: 'var(--gold-dim)',
              borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              fontSize: '0.78rem', color: 'var(--text-muted)',
            }}>
              🏟️ In the next step, you'll create a Cinema Room Manager account for this room.
            </div>
          </>
        ) : (
          /* ── Step 2 ── */
          <>
            {formError && <div className="auth-error" style={{ marginBottom: 12 }}>⚠️ {formError}</div>}

            <div className="input-group">
              <label className="input-label">Manager's Full Name *</label>
              <input className="input-field" placeholder="e.g. Ahmad Fadzli"
                value={mgrName} onChange={e => setMgrName(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">
                Username *
                {usernameStatus === 'available' && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--success)' }}>✓ Available</span>}
                {usernameStatus === 'taken'     && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--danger)' }}>✗ Taken</span>}
              </label>
              <input className="input-field" placeholder="e.g. galaxyhall_mgr"
                value={mgrUsername} onChange={e => handleUsernameChange(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Display Name</label>
              <input className="input-field" placeholder="Same as username if left unchanged"
                value={mgrDisplayName} onChange={e => setMgrDisplayName(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Email *</label>
              <input className="input-field" type="email" placeholder="manager@email.com"
                value={mgrEmail} onChange={e => setMgrEmail(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">
                Temporary Password *
                <span
                  style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--gold)', cursor: 'pointer' }}
                  onClick={() => { const pw = generateTempPassword(); setMgrPassword(pw); }}
                >
                  🔄 Regenerate
                </span>
              </label>
              <input className="input-field" value={mgrPassword}
                onChange={e => setMgrPassword(e.target.value)} />
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                Share this with the manager — they should change it after first login.
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default RoomManagement;