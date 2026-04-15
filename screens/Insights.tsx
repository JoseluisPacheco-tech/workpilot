import { globalInsights, featurePills } from '../data/sampleData';
import { TrendingUp } from 'lucide-react';
export default function Insights() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-2">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: '#0f0e0c' }}>Insights</h1>
        <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Patrones de trabajo detectados por IA</p>
      </div>
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#0f0e0c' }}>
        <TrendingUp size={20} style={{ color: '#2a5cff' }} strokeWidth={2} />
        <div>
          <p className="text-xs font-semibold" style={{ color: '#fff' }}>Semana en curso</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Tu productividad esta semana está un <span style={{ color: '#4ade80', fontWeight: 600 }}>+12%</span> por encima de tu promedio</p>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#0f0e0c' }}>Observaciones IA</h2>
        <div className="flex flex-col gap-3">
          {globalInsights.map((insight, i) => (
            <div key={i} className="card p-4" style={{ borderLeft: `3px solid ${insight.borderColor}` }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: insight.borderColor }}>{insight.label}</span>
              <p className="text-sm font-semibold mt-1 mb-1" style={{ color: '#0f0e0c' }}>{insight.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>{insight.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#0f0e0c' }}>Capacidades WorkPilot</h2>
        <div className="grid grid-cols-3 gap-2">
          {featurePills.map((pill, i) => (
            <div key={i} className="card flex flex-col items-center justify-center gap-1.5 py-3 px-2">
              <span className="text-xl">{pill.emoji}</span>
              <span className="text-[10px] font-medium text-center leading-tight" style={{ color: '#0f0e0c' }}>{pill.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
