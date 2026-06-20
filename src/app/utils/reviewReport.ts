import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MovieStats, SortKey, sortMovieStats } from './reviewAnalytics';

interface ReportOptions {
  selectedIds: string[];   // movies to include; empty → include all
  sortKey:     SortKey;    // ranking basis ('watches' | 'rating' | 'title')
}

/**
 * Build and download a PDF ranking report of movies by watches and rating.
 * Always ranks descending on the chosen key so #1 is the strongest performer.
 */
export const generateRankingPdf = (
  stats: MovieStats[],
  { selectedIds, sortKey }: ReportOptions,
): void => {
  const chosen = selectedIds.length
    ? stats.filter(s => selectedIds.includes(s.movieId))
    : stats;
  const ranked = sortMovieStats(chosen, sortKey, 'desc');

  const doc = new jsPDF();
  const now = new Date();

  // ── Header ──
  doc.setFontSize(18);
  doc.text('UniCinema — Movie Performance Report', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  const basis = sortKey === 'rating' ? 'Average Rating' : sortKey === 'title' ? 'Title' : 'Total Watches';
  doc.text(`Ranked by: ${basis}`, 14, 25);
  doc.text(`Generated: ${now.toLocaleString('en-MY')}`, 14, 30);
  doc.text(`Movies included: ${ranked.length}`, 14, 35);

  // ── Table ──
  autoTable(doc, {
    startY: 42,
    head: [['#', 'Movie', 'Genre', 'Year', 'Watches', 'Avg Rating', 'Reviews']],
    body: ranked.map((s, i) => [
      String(i + 1),
      s.title,
      s.genre,
      String(s.year),
      String(s.watchesTotal),
      s.reviewCount ? s.avgRating.toFixed(2) : '—',
      String(s.reviewCount),
    ]),
    styles:     { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [201, 162, 39], textColor: [20, 20, 30] }, // gold-ish
    alternateRowStyles: { fillColor: [245, 245, 248] },
  });

  doc.save(`unicinema-movie-rankings-${now.toISOString().slice(0, 10)}.pdf`);
};
