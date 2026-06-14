import React, { useState } from 'react';
import {
  RoomTemplate, SectionConfig, SectionKey,
  sectionKey, parseSectionKey,
} from '../../services/templateService';
import { X, Ticket } from '../../utils/icons';

interface SeatMapProps {
  template:     RoomTemplate;
  bookedSeats?: string[];
  onConfirm?:   (seats: string[]) => void;
}

const makeSeatId = (secKey: SectionKey, idx: number) => `${secKey}-${idx}`;

const SeatMap = ({ template, bookedSeats = [], onConfirm }: SeatMapProps) => {
  const [selected, setSelected] = useState<string[]>([]);
  const { gridRows, gridCols, sections } = template;

  const toggle = (id: string) => {
    if (bookedSeats.includes(id)) return;
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const seatState = (id: string) => {
    if (bookedSeats.includes(id)) return 'booked';
    if (selected.includes(id))    return 'picked';
    return 'free';
  };

  return (
    <div className="sm-root">

      {/* Screen */}
      <div className="sm-screen">
        <div className="sm-screen-bar" />
        <span>SCREEN</span>
      </div>

      {/* Section grid */}
      <div
        className="sm-grid"
        style={{ gridTemplateColumns: `repeat(${gridCols}, auto)` }}
      >
        {Array.from({ length: gridRows }, (_, r) =>
          Array.from({ length: gridCols }, (_, c) => {
            const key = sectionKey(r, c);
            const sec = sections[key];
            if (!sec) return null;

            return (
              <div key={key} className="sm-section">
                <div className="sm-section-header">
                  <span className="sm-section-name">{sec.name}</span>
                  <span className="sm-section-meta">{sec.seatRows}×{sec.seatCols}</span>
                </div>

                <div
                  className="sm-seats"
                  style={{ gridTemplateColumns: `repeat(${sec.seatCols}, 1fr)` }}
                >
                  {Array.from({ length: sec.seatRows * sec.seatCols }, (_, idx) => {
                    const id         = makeSeatId(key, idx);
                    const state      = seatState(id);
                    const rowLetter  = String.fromCharCode(65 + Math.floor(idx / sec.seatCols));
                    const colNum     = (idx % sec.seatCols) + 1;

                    return (
                      <div
                        key={id}
                        className={`sm-seat sm-seat-${state}`}
                        onClick={() => toggle(id)}
                        title={`${sec.name} — Row ${rowLetter}, Seat ${colNum}`}
                      >
                        {idx + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="sm-legend">
        <span className="sm-legend-item"><span className="sm-legend-dot sm-seat-free" /> Available</span>
        <span className="sm-legend-item"><span className="sm-legend-dot sm-seat-picked" /> Selected</span>
        <span className="sm-legend-item"><span className="sm-legend-dot sm-seat-booked" /> Booked</span>
      </div>

      {/* Selection panel */}
      {selected.length > 0 && (
        <div className="sm-selection">
          <div className="sm-selection-title">
            {selected.length} seat{selected.length > 1 ? 's' : ''} selected
          </div>
          <div className="sm-chips">
            {selected.map(id => {
              const parts   = id.split('-');
              const seatIdx = parseInt(parts[parts.length - 1]) + 1;
              const secK    = parts.slice(0, -1).join('-');
              const sec     = sections[secK];
              return (
                <span key={id} className="sm-chip">
                  {sec?.name?.[0] ?? '?'}{seatIdx}
                  <span className="sm-chip-x" onClick={() => setSelected(p => p.filter(s => s !== id))}><X size={11} /></span>
                </span>
              );
            })}
          </div>
          <div className="sm-selection-actions">
            <button className="btn btn-outline btn-sm" onClick={() => setSelected([])}>Clear All</button>
            {onConfirm && (
              <button className="btn btn-primary btn-sm" onClick={() => onConfirm(selected)}>
                <Ticket size={14} style={{ verticalAlign: -2, marginRight: 4 }} /> Confirm {selected.length} Seat{selected.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatMap;