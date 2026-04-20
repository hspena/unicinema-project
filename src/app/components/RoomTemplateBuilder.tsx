import React, { useState, useEffect } from 'react';
import {
  RoomTemplate, SectionConfig, SectionKey,
  sectionKey, parseSectionKey, templateSeatCount,
  createTemplate, saveTemplate,
} from '.././services/templateService';
import { useAuth } from '.././context/AuthContext';

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  existing?: RoomTemplate;           // pass to edit, omit to create new
  onSaved?:  (t: RoomTemplate) => void;
  onCancel?: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_SEAT_ROWS = 5;
const DEFAULT_SEAT_COLS = 8;

const buildDefaultSections = (
  gridRows: number,
  gridCols: number,
  existing?: Record<SectionKey, SectionConfig>
): Record<SectionKey, SectionConfig> => {
  const out: Record<SectionKey, SectionConfig> = {};
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const key = sectionKey(r, c);
      out[key] = existing?.[key] ?? {
        seatRows: DEFAULT_SEAT_ROWS,
        seatCols: DEFAULT_SEAT_COLS,
        name: `Section ${r * gridCols + c + 1}`,
      };
    }
  }
  return out;
};

// ─── Mini seat grid preview inside each section block ─────────────────────────
const SectionPreview = ({
  config, selected, bookedSeats = [], interactive = false,
  onSeatClick, selectedSeats = [],
}: {
  config:       SectionConfig;
  selected:     boolean;
  bookedSeats?: string[];
  interactive?: boolean;
  onSeatClick?: (seatIdx: number) => void;
  selectedSeats?: number[];
}) => {
  const { seatRows = 5, seatCols = 8 } = config ?? {};
  const totalSeats = seatRows * seatCols;

  return (
    <div className={`rtb-section-preview ${selected ? 'rtb-section-selected' : ''}`}>
      {/* Section name label */}
      <div className="rtb-section-label">{config.name}</div>

      {/* Seat grid */}
      <div
        className="rtb-seat-grid"
        style={{
          gridTemplateColumns: `repeat(${seatCols}, 1fr)`,
        }}
      >
        {Array.from({ length: totalSeats }, (_, idx) => {
          const isBooked   = bookedSeats.includes(String(idx));
          const isSelected = selectedSeats.includes(idx);
          return (
            <div
              key={idx}
              className={`rtb-seat ${
                isBooked   ? 'rtb-seat-booked' :
                isSelected ? 'rtb-seat-picked' :
                             'rtb-seat-free'
              }`}
              onClick={() => interactive && !isBooked && onSeatClick?.(idx)}
              title={`Seat ${idx + 1}`}
            >
              {interactive ? idx + 1 : ''}
            </div>
          );
        })}
      </div>

      {/* Seat count badge */}
      <div className="rtb-section-count">
        {seatRows}×{seatCols} = {totalSeats} seats
      </div>
    </div>
  );
};

// ─── Section editor panel (shown when a section is selected) ──────────────────
const SectionEditor = ({
  secKey, config, onChange,
}: {
  secKey:   SectionKey;
  config:   SectionConfig;
  onChange: (key: SectionKey, cfg: SectionConfig) => void;
}) => {
  const { row, col } = parseSectionKey(secKey);

  return (
    <div className="rtb-editor-panel">
      <div className="rtb-editor-title">
        Edit Section — Row {row + 1}, Col {col + 1}
      </div>

      <div className="input-group">
        <label className="input-label">Section Name</label>
        <input
          className="input-field"
          value={config.name ?? ''}
          onChange={e => onChange(secKey, { ...config, name: e.target.value })}
          placeholder="e.g. VIP, Standard, Balcony"
        />
      </div>

      <div className="input-row">
        <div className="input-group">
          <label className="input-label">Seat Rows</label>
          <input
            className="input-field"
            type="number"
            min={1} max={20}
            value={config.seatRows}
            onChange={e => onChange(secKey, {
              ...config,
              seatRows: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)),
            })}
          />
        </div>
        <div className="input-group">
          <label className="input-label">Seat Columns</label>
          <input
            className="input-field"
            type="number"
            min={1} max={30}
            value={config.seatCols}
            onChange={e => onChange(secKey, {
              ...config,
              seatCols: Math.max(1, Math.min(30, parseInt(e.target.value) || 1)),
            })}
          />
        </div>
      </div>

      <div className="rtb-editor-hint">
        Total: <strong style={{ color: 'var(--gold)' }}>
          {config.seatRows * config.seatCols} seats
        </strong> in this section
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const RoomTemplateBuilder = ({ existing, onSaved, onCancel }: Props) => {
  const { uid } = useAuth();

  const [name,     setName]     = useState(existing?.name     ?? '');
  const [gridRows, setGridRows] = useState(existing?.gridRows ?? 2);
  const [gridCols, setGridCols] = useState(existing?.gridCols ?? 3);
  const [sections, setSections] = useState<Record<SectionKey, SectionConfig>>(
    buildDefaultSections(existing?.gridRows ?? 2, existing?.gridCols ?? 3, existing?.sections)
  );
  const [activeKey,  setActiveKey]  = useState<SectionKey | null>(null);
  const [isSaving,   setIsSaving]   = useState(false);
  const [saveError,  setSaveError]  = useState('');

  // Rebuild sections when grid dimensions change
  useEffect(() => {
    setSections(prev => buildDefaultSections(gridRows, gridCols, prev));
    setActiveKey(null);
  }, [gridRows, gridCols]);

  const updateSection = (key: SectionKey, cfg: SectionConfig) => {
    setSections(prev => ({ ...prev, [key]: cfg }));
  };

  const totalSeats = Object.values(sections).reduce(
    (sum, s) => sum + s.seatRows * s.seatCols, 0
  );

  const handleSave = async () => {
    if (!name.trim()) { setSaveError('Please enter a template name.'); return; }
    setIsSaving(true);
    setSaveError('');
    try {
      const payload = {
        name:      name.trim(),
        gridRows,
        gridCols,
        sections,
        createdBy: uid ?? 'unknown',
        createdAt: new Date().toISOString(),
      };

      let saved: RoomTemplate;
      if (existing) {
        saved = { ...existing, ...payload };
        await saveTemplate(saved);
      } else {
        saved = await createTemplate(payload);
      }
      onSaved?.(saved);
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save template.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rtb-root">

      {/* ── Header ── */}
      <div className="rtb-header">
        <div>
          <h3 className="rtb-heading">
            {existing ? 'Edit Template' : 'New Room Template'}
          </h3>
          <p className="rtb-subheading">
            Configure the section grid and seat layout for this cinema room.
          </p>
        </div>
      </div>

      {/* ── Template name + grid size controls ── */}
      <div className="rtb-controls">
        <div className="input-group" style={{ flex: 2 }}>
          <label className="input-label">Template Name</label>
          <input
            className="input-field"
            placeholder="e.g. Galaxy Hall — Standard"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Section Rows</label>
          <input
            className="input-field"
            type="number"
            min={1} max={6}
            value={gridRows}
            onChange={e => setGridRows(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Section Columns</label>
          <input
            className="input-field"
            type="number"
            min={1} max={6}
            value={gridCols}
            onChange={e => setGridCols(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
          />
        </div>

        <div className="rtb-summary">
          <span className="rtb-summary-value">{gridRows * gridCols}</span>
          <span className="rtb-summary-label">sections</span>
          <span className="rtb-summary-value" style={{ marginLeft: 12 }}>{totalSeats}</span>
          <span className="rtb-summary-label">total seats</span>
        </div>
      </div>

      <div className="rtb-body">

        {/* ── Section grid (the big visual) ── */}
        <div className="rtb-canvas-wrap">
          {/* Screen indicator */}
          <div className="rtb-screen">
            <div className="rtb-screen-bar" />
            <span>SCREEN</span>
          </div>

          {/* Sections grid */}
          <div
            className="rtb-grid"
            style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
          >
            {Array.from({ length: gridRows }, (_, r) =>
              Array.from({ length: gridCols }, (_, c) => {
                const key = sectionKey(r, c);
                const cfg = sections[key];

                if (!cfg) return null;

                return (
                  <div
                    key={key}
                    className={`rtb-section-cell ${activeKey === key ? 'rtb-section-active' : ''}`}
                    onClick={() => setActiveKey(prev => prev === key ? null : key)}
                  >
                    <SectionPreview
                      config={cfg}
                      selected={activeKey === key}
                    />
                  </div>
                );
              })
            )}
          </div>

          {/* Grid dimension label */}
          <div className="rtb-grid-label">
            {gridRows} row{gridRows > 1 ? 's' : ''} × {gridCols} col{gridCols > 1 ? 's' : ''} of sections
          </div>
        </div>

        {/* ── Section editor sidebar ── */}
        <div className="rtb-sidebar">
          {activeKey ? (
            <SectionEditor
              secKey={activeKey}
              config={sections[activeKey]}
              onChange={updateSection}
            />
          ) : (
            <div className="rtb-sidebar-hint">
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>👆</div>
              <div>Click any section block to configure its seat rows and columns.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer actions ── */}
      {saveError && (
        <div className="auth-error" style={{ marginTop: 12 }}>
          ⚠️ {saveError}
        </div>
      )}

      <div className="rtb-footer">
        {onCancel && (
          <button className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? '⏳ Saving…' : existing ? '💾 Save Changes' : '💾 Save Template'}
        </button>
      </div>
    </div>
  );
};

export default RoomTemplateBuilder;