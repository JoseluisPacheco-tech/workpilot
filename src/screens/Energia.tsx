import EnergyChart from '../components/EnergyChart';
import { energyPoints, energiaInsights } from '../data/sampleData';
const statCards = [
  { label: 'Foco profundo hoy', value: '3h 20m', color: '#2a5cff' },
  { label: 'Interrupciones', value: '4', color: '#f59e0b' },
  { label: 'Tareas completadas', value: '5 / 8', color: '#16a34a' },
];
export default function Energia() {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-2">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: '#0f0e0c' }}>Energía cognitiva</h1>
        <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Curva del día · basada en tu historial</p>
      </div>
      <div className="card p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold" style={{ color: '#0f0e0c' }}>Curva de energía · Hoy</p>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: '#eff6ff', color: '#2a5cff' }}>Pico: 10am</span>
        </div>
        <EnergyChart points={energyPoints} currentHour={currentHour} />
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1.5"><span className="w-5 h-0.5 rounded inline-block" style={{ background: '#2a5cff' }} /><span className="text-[10px]" style={{ color: '#6b7280' }}>Energía</span></div>
          <div className="flex items-center gap-1.5"><span className="inline-block w-4" style={{ borderTop: '1px dashed rgba(0,0,0,0.35)' }} /><span className="text-[10px]" style={{ color: '#6b7280' }}>Ahora</span></div>
        </div>
      </div>
      <div className="flex gap-2">
        {statCards.map((s) => (<div key={s.label} className="card flex-1 p-3 flex flex-col gap-1"><p className="text-base font-semibold" style={{ color: s.color }}>{s.value}</p><p className="text-[10px] leading-tight" style={{ color: '#6b7280' }}>{s.label}</p></div>))}
      </div>
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#0f0e0c' }}>Recomendaciones IA</h2>
        <div className="flex flex-col gap-3">
          {energiaInsights.map((insight, i) => (
            <div key={i} className="card p-4" style={{ borderLeft: `3px solid ${insight.borderColor}` }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: insight.borderColor }}>{insight.label}</span>
              <p className="text-sm font-semibold mt-1 mb-1" style={{ color: '#0f0e0c' }}>{insight.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>{insight.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
