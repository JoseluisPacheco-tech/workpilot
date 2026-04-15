import type { EnergyPoint } from '../types';
interface EnergyChartProps { points: EnergyPoint[]; currentHour: number; }
const W = 320; const H = 140;
const PADDING = { top: 12, right: 8, bottom: 28, left: 28 };
const INNER_W = W - PADDING.left - PADDING.right;
const INNER_H = H - PADDING.top - PADDING.bottom;
function toX(hour: number, minHour: number, maxHour: number) { return PADDING.left + ((hour - minHour) / (maxHour - minHour)) * INNER_W; }
function toY(value: number) { return PADDING.top + (1 - value / 100) * INNER_H; }
function buildPath(points: EnergyPoint[], minHour: number, maxHour: number) {
  if (points.length === 0) return '';
  return points.map((p, i) => {
    const x = toX(p.hour, minHour, maxHour); const y = toY(p.value);
    if (i === 0) return `M ${x} ${y}`;
    const prev = points[i - 1]; const px = toX(prev.hour, minHour, maxHour); const py = toY(prev.value); const cpx = (px + x) / 2;
    return `C ${cpx} ${py}, ${cpx} ${y}, ${x} ${y}`;
  }).join(' ');
}
function buildAreaPath(points: EnergyPoint[], minHour: number, maxHour: number) {
  const linePath = buildPath(points, minHour, maxHour);
  const lastX = toX(points[points.length - 1].hour, minHour, maxHour);
  const firstX = toX(points[0].hour, minHour, maxHour);
  const bottom = PADDING.top + INNER_H;
  return `${linePath} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`;
}
export default function EnergyChart({ points, currentHour }: EnergyChartProps) {
  const minHour = points[0]?.hour ?? 7; const maxHour = points[points.length - 1]?.hour ?? 18;
  const clampedHour = Math.min(Math.max(currentHour, minHour), maxHour);
  const currentX = toX(clampedHour, minHour, maxHour);
  const xLabels = points.filter((_, i) => i % 2 === 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto', maxHeight: '160px' }}>
      <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2a5cff" stopOpacity="0.12" /><stop offset="100%" stopColor="#2a5cff" stopOpacity="0" /></linearGradient></defs>
      {[25, 50, 75, 100].map((v) => (<g key={v}><line x1={PADDING.left} y1={toY(v)} x2={PADDING.left + INNER_W} y2={toY(v)} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" /><text x={PADDING.left - 4} y={toY(v) + 3} fontSize="7" fill="#9ca3af" textAnchor="end">{v}</text></g>))}
      <path d={buildAreaPath(points, minHour, maxHour)} fill="url(#areaGrad)" />
      <path d={buildPath(points, minHour, maxHour)} fill="none" stroke="#2a5cff" strokeWidth="2" strokeLinecap="round" />
      <line x1={currentX} y1={PADDING.top} x2={currentX} y2={PADDING.top + INNER_H} stroke="#0f0e0c" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
      <circle cx={currentX} cy={toY(points.find(p => p.hour === Math.round(clampedHour))?.value ?? 74)} r="4" fill="#2a5cff" stroke="white" strokeWidth="1.5" />
      {xLabels.map((p) => (<text key={p.hour} x={toX(p.hour, minHour, maxHour)} y={H - 4} fontSize="7.5" fill="#9ca3af" textAnchor="middle">{p.label}</text>))}
    </svg>
  );
}
