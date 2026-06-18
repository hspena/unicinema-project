import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal } from '../../components/ui';
import RoomTemplateBuilder            from '../../components/RoomTemplateBuilder';
import {
  RoomTemplate, Room,
  subscribeToTemplates, subscribeToRooms,
  createRoom, updateRoom, deleteRoom, deleteTemplate,
  setRoomManagers, roomManagerIds,
  templateSeatCount,
} from '../../services/templateService';
import {
  createUser, subscribeToUsers,
  isUsernameAvailable,
} from '../../services/userService';
import { User } from '../../types';
import {
  Folder, Building2, AlertTriangle, CheckCircle2, Check, X, Hourglass,
  ArrowLeft, ArrowRight, RefreshCw, Pencil, Trash2, Plus, Save, Users,
} from '../../utils/icons';

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

  // ── Edit room ────────────────────────────────────────────────────────────────
  const [editRoom,       setEditRoom]       = useState<Room | null>(null);
  const [eName,          setEName]          = useState('');
  const [eTplId,         setETplId]         = useState('');
  const [eStatus,        setEStatus]        = useState<'active' | 'inactive'>('inactive');
  const [eManagerIds,    setEManagerIds]    = useState<string[]>([]);
  const [eAddMgrId,      setEAddMgrId]      = useState('');
  const [eError,         setEError]         = useState('');
  const [eSaving,        setESaving]        = useState(false);

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

  // ── Edit room ────────────────────────────────────────────────────────────────
  const openEdit = (room: Room) => {
    setEditRoom(room);
    setEName(room.name);
    setETplId(room.templateId);
    setEStatus(room.status);
    setEManagerIds(roomManagerIds(room));
    setEAddMgrId('');
    setEError('');
  };

  const addEditManager = () => {
    if (!eAddMgrId) return;
    setEManagerIds(ids => ids.includes(eAddMgrId) ? ids : [...ids, eAddMgrId]);
    setEAddMgrId('');
  };

  const removeEditManager = (id: string) => {
    setEManagerIds(ids => ids.filter(m => m !== id));
  };

  const handleSaveEdit = async () => {
    if (!editRoom) return;
    setEError('');
    if (!eName.trim()) { setEError('Room name is required.'); return; }
    if (!eTplId)       { setEError('Please select a template.'); return; }

    setESaving(true);
    try {
      await updateRoom(editRoom.id, { name: eName.trim(), templateId: eTplId, status: eStatus });
      await setRoomManagers(editRoom.id, eManagerIds);
      setEditRoom(null);
    } catch (e: any) {
      setEError(e.message ?? 'Failed to save room.');
    } finally {
      setESaving(false);
    }
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
          <Folder size={14} style={{ verticalAlign: -2, marginRight: 5 }} /> Seat Templates ({templates.length})
        </button>
        <button className={`rm-tab ${tab === 'rooms' ? 'active' : ''}`} onClick={() => setTab('rooms')}>
          <Building2 size={14} style={{ verticalAlign: -2, marginRight: 5 }} /> Cinema Rooms ({rooms.length})
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
                  <div className="empty-state-icon"><Folder size={32} /></div>
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
              <div className="empty-state-icon"><Building2 size={32} /></div>
              <div className="empty-state-text">No rooms yet.</div>
            </div>
          ) : (
            <div className="room-grid">
              {rooms.map(r => {
                const tpl = templates.find(t => t.id === r.templateId);
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
                    {(() => {
                      const assigned = roomManagerIds(r)
                        .map(id => managers.find(m => m.id === id))
                        .filter(Boolean) as User[];
                      return (
                        <div className="room-stat" style={{ alignItems: 'flex-start' }}>
                          <span>{assigned.length > 1 ? 'Managers' : 'Manager'}</span>
                          <span style={{ fontSize: '0.75rem', textAlign: 'right' }}>
                            {assigned.length > 0
                              ? assigned.map(m => (
                                  <span key={m.id} style={{ display: 'block' }}>
                                    <strong>{m.displayName || m.name}</strong> @{m.username}
                                  </span>
                                ))
                              : <span style={{ color: 'var(--warning)' }}>Unassigned</span>
                            }
                          </span>
                        </div>
                      );
                    })()}
                    <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                      <Button variant="outline" size="sm" style={{ flex: 1 }} icon={<Pencil size={13} />} onClick={() => openEdit(r)}>Edit</Button>
                      <Button variant="danger" size="sm" style={{ flex: 1 }} icon={<Trash2 size={13} />} onClick={() => handleDeleteRoom(r.id)}>Delete</Button>
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
        title={createdInfo ? <><CheckCircle2 size={16} style={{ verticalAlign: -3, marginRight: 6 }} /> Room Created!</> : step === 1 ? 'Step 1 — Room Info' : 'Step 2 — Manager Account'}
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
                Next <ArrowRight size={14} style={{ verticalAlign: -2, marginLeft: 4 }} />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} icon={<ArrowLeft size={14} />}>Back</Button>
              <Button onClick={handleCreate} disabled={isCreating} icon={isCreating ? <Hourglass size={14} /> : <Building2 size={14} />}>
                {isCreating ? 'Creating…' : 'Create Room & Manager'}
              </Button>
            </>
          )
        }
      >
        {createdInfo ? (
          /* ── Success screen ── */
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ marginBottom: 8, color: 'var(--gold)', display: 'flex', justifyContent: 'center' }}><Building2 size={48} /></div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{createdInfo.roomName}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Room created and manager account set up.
              </div>
            </div>
            <div style={{
              padding: 14, background: 'var(--navy)', borderRadius: 'var(--radius)',
              border: '1px solid var(--gold)', marginBottom: 12,
            }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} /> Share these credentials with the manager. They should change the password after first login.
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
            {formError && <div className="auth-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {formError}</div>}
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
              <Building2 size={13} style={{ verticalAlign: -2, marginRight: 4 }} /> In the next step, you'll create a Cinema Room Manager account for this room.
            </div>
          </>
        ) : (
          /* ── Step 2 ── */
          <>
            {formError && <div className="auth-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {formError}</div>}

            <div className="input-group">
              <label className="input-label">Manager's Full Name *</label>
              <input className="input-field" placeholder="e.g. Ahmad Fadzli"
                value={mgrName} onChange={e => setMgrName(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">
                Username *
                {usernameStatus === 'available' && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} /> Available</span>}
                {usernameStatus === 'taken'     && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><X size={12} /> Taken</span>}
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
                  style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--gold)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                  onClick={() => { const pw = generateTempPassword(); setMgrPassword(pw); }}
                >
                  <RefreshCw size={12} /> Regenerate
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

      {/* ── Edit Room Modal ── */}
      <Modal
        title={<><Pencil size={16} style={{ verticalAlign: -3, marginRight: 6 }} /> Edit Room</>}
        open={!!editRoom}
        onClose={() => setEditRoom(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditRoom(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={eSaving} icon={eSaving ? <Hourglass size={14} /> : <Save size={14} />}>
              {eSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </>
        }
      >
        {editRoom && (
          <>
            {eError && <div className="auth-error" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> {eError}</div>}

            <div className="input-group">
              <label className="input-label">Room Name *</label>
              <input className="input-field" value={eName} onChange={e => setEName(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Seat Template *</label>
              <select className="select-field" value={eTplId} onChange={e => setETplId(e.target.value)}>
                <option value="">Select a template…</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — {templateSeatCount(t)} seats</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Status</label>
              <select className="select-field" value={eStatus} onChange={e => setEStatus(e.target.value as 'active' | 'inactive')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Managers */}
            <div className="input-group">
              <label className="input-label">
                <Users size={13} style={{ verticalAlign: -2, marginRight: 4 }} /> Assigned Managers ({eManagerIds.length})
              </label>

              {eManagerIds.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--warning)', marginBottom: 8 }}>No managers assigned.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {eManagerIds.map(id => {
                    const m = managers.find(u => u.id === id);
                    return (
                      <div key={id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '7px 10px', background: 'var(--navy)', borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)', fontSize: '0.8rem',
                      }}>
                        <span>
                          {m ? <><strong>{m.displayName || m.name}</strong> <span style={{ color: 'var(--text-muted)' }}>@{m.username}</span></> : <span style={{ color: 'var(--text-muted)' }}>{id}</span>}
                        </span>
                        <span
                          style={{ cursor: 'pointer', color: 'var(--danger)', display: 'inline-flex' }}
                          title="Remove manager"
                          onClick={() => removeEditManager(id)}
                        >
                          <X size={15} />
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  className="select-field"
                  style={{ flex: 1 }}
                  value={eAddMgrId}
                  onChange={e => setEAddMgrId(e.target.value)}
                >
                  <option value="">Add an existing manager…</option>
                  {managers
                    .filter(m => !eManagerIds.includes(m.id))
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.displayName || m.name} (@{m.username})
                      </option>
                    ))}
                </select>
                <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={addEditManager} disabled={!eAddMgrId}>
                  Add
                </Button>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                To create a brand-new manager account, use “Add Room + Manager”.
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default RoomManagement;