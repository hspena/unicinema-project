import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Modal } from '../../components/ui';
import RoomTemplateBuilder            from '../../components/RoomTemplateBuilder';
import {
  RoomTemplate, Room,
  subscribeToTemplates, subscribeToRooms,
  createRoom, updateRoom, deleteRoom, deleteTemplate,
  templateSeatCount,
} from '../../services/templateService';
import SeatMap from '../../components/ui/SeatMap';

const RoomManagement = () => {
  const [templates,   setTemplates]   = useState<RoomTemplate[]>([]);
  const [rooms,       setRooms]       = useState<Room[]>([]);
  const [tab,         setTab]         = useState<'templates' | 'rooms'>('templates');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editTemplate,setEditTemplate]= useState<RoomTemplate | undefined>();
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomName,    setRoomName]    = useState('');
  const [roomTplId,   setRoomTplId]   = useState('');
  const [isCreating,  setIsCreating]  = useState(false);

  useEffect(() => {
    const u1 = subscribeToTemplates(setTemplates);
    const u2 = subscribeToRooms(setRooms);
    return () => { u1(); u2(); };
  }, []);

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    await deleteTemplate(id);
  };

  const handleDeleteRoom = async (id: string) => {
    if (!window.confirm('Delete this room?')) return;
    await deleteRoom(id);
  };

  const handleCreateRoom = async () => {
    if (!roomName || !roomTplId) return;
    setIsCreating(true);
    await createRoom({ name: roomName, templateId: roomTplId, status: 'inactive' });
    setRoomName(''); setRoomTplId(''); setShowAddRoom(false);
    setIsCreating(false);
  };

  const handleToggleStatus = async (room: Room) => {
    await updateRoom(room.id, {
      status: room.status === 'active' ? 'inactive' : 'active',
    });
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2>Room Management</h2>
        <p>Build seating templates and deploy cinema rooms.</p>
      </div>

      {/* Tabs */}
      <div className="rm-tabs">
        <button
          className={`rm-tab ${tab === 'templates' ? 'active' : ''}`}
          onClick={() => setTab('templates')}
        >
          🗂️ Seat Templates ({templates.length})
        </button>
        <button
          className={`rm-tab ${tab === 'rooms' ? 'active' : ''}`}
          onClick={() => setTab('rooms')}
        >
          🏟️ Cinema Rooms ({rooms.length})
        </button>
      </div>

      {/* ── Templates tab ── */}
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
                  <div className="empty-state-text">No templates yet. Create one to get started.</div>
                </div>
              ) : (
                <div className="room-grid">
                  {templates.map(t => (
                    <div key={t.id} className="room-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div className="room-name">{t.name}</div>
                          <div className="room-meta" style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--gold)' }}>
                            ID: {t.id.slice(0, 10)}…
                          </div>
                        </div>
                      </div>
                      <div className="room-stat">
                        <span>Section Grid</span>
                        <span style={{ fontWeight: 600 }}>{t.gridRows} × {t.gridCols}</span>
                      </div>
                      <div className="room-stat">
                        <span>Total Sections</span>
                        <span style={{ fontWeight: 600 }}>{t.gridRows * t.gridCols}</span>
                      </div>
                      <div className="room-stat">
                        <span>Total Seats</span>
                        <span style={{ fontWeight: 600 }}>{templateSeatCount(t)}</span>
                      </div>
                      <div className="room-stat">
                        <span>Created</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {t.createdAt?.split('T')[0]}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                        <Button
                          variant="outline" size="sm"
                          style={{ flex: 1 }}
                          onClick={() => { setEditTemplate(t); setShowBuilder(true); }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger" size="sm"
                          style={{ flex: 1 }}
                          onClick={() => handleDeleteTemplate(t.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Rooms tab ── */}
      {tab === 'rooms' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button icon="+" onClick={() => setShowAddRoom(true)}>Add Room</Button>
          </div>

          {rooms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏟️</div>
              <div className="empty-state-text">No rooms yet. Add one using a template.</div>
            </div>
          ) : (
            <div className="room-grid">
              {rooms.map(r => {
                const tpl = templates.find(t => t.id === r.templateId);
                return (
                  <div key={r.id} className="room-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div className="room-name">{r.name}</div>
                        <div className="room-meta">{tpl?.name ?? 'Unknown template'}</div>
                      </div>
                      <Badge
                        variant={r.status === 'active' ? 'success' : 'muted'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggleStatus(r)}
                      >
                        {r.status}
                      </Badge>
                    </div>
                    {tpl && (
                      <>
                        <div className="room-stat">
                          <span>Sections</span>
                          <span style={{ fontWeight: 600 }}>{tpl.gridRows * tpl.gridCols}</span>
                        </div>
                        <div className="room-stat">
                          <span>Total Seats</span>
                          <span style={{ fontWeight: 600 }}>{templateSeatCount(tpl)}</span>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                      <Button
                        variant="danger" size="sm"
                        style={{ flex: 1 }}
                        onClick={() => handleDeleteRoom(r.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Room Modal */}
          <Modal
            title="Add Cinema Room"
            open={showAddRoom}
            onClose={() => setShowAddRoom(false)}
            footer={
              <>
                <Button variant="outline" onClick={() => setShowAddRoom(false)}>Cancel</Button>
                <Button onClick={handleCreateRoom} disabled={isCreating || !roomName || !roomTplId}>
                  {isCreating ? 'Creating…' : 'Create Room'}
                </Button>
              </>
            }
          >
            <div className="input-group">
              <label className="input-label">Room Name</label>
              <input
                className="input-field"
                placeholder="e.g. Galaxy Hall"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Seat Template</label>
              <select
                className="select-field"
                value={roomTplId}
                onChange={e => setRoomTplId(e.target.value)}
              >
                <option value="">Select a template…</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {templateSeatCount(t)} seats
                  </option>
                ))}
              </select>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default RoomManagement;