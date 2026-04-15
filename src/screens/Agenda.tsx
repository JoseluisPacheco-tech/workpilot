import { agendaItems } from '../data/sampleData';
export default function Agenda() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-2">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: '#0f0e0c' }}>Agenda de hoy</h1>
        <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{agendaItems.length} bloques programados</p>
      </div>
      <div className="card p-4 flex items-center justify-between" style={{ background: '#0f0e0c' }}>
        <div>
          <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Bloque actual</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: '#fff' }}>{agendaItems.find(i => i.isCurrent)?.title ?? '–'}</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#2a5cff', color: '#fff' }}>En curso</span>
      </div>
      <div className="relative">
        <div className="absolute left-[52px] top-0 bottom-0 w-px" style={{ background: 'rgba(0,0,0,0.07)' }} />
        <div className="flex flex-col gap-0">
          {agendaItems.map((item, i) => (
            <div key={i} className="flex items-start gap-3 relative mb-4">
              <div className="flex-shrink-0 text-right" style={{ width: '44px' }}>
                <span className="text-[10px] font-medium leading-tight" style={{ color: '#9ca3af' }}>{item.timeRange.split('–')[0].trim()}</span>
                <br />
                <span className="text-[9px]" style={{ color: '#d1d5db' }}>{item.timeRange.split('–')[1]?.trim()}</span>
              </div>
              <div className="relative z-10 flex-shrink-0 mt-1">
                {item.isCurrent
                  ? <div className="w-3 h-3 rounded-full" style={{ background: '#2a5cff', outline: '3px solid rgba(42,92,255,0.2)' }} />
                  : <div className="w-3 h-3 rounded-full" style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,0.2)' }} />}
              </div>
              <div className="flex-1 rounded-xl p-3" style={{ background: item.isCurrent ? '#2a5cff' : '#ffffff', border: item.isCurrent ? 'none' : '0.5px solid rgba(0,0,0,0.1)' }}>
                <p className="text-sm font-semibold" style={{ color: item.isCurrent ? '#fff' : '#0f0e0c' }}>{item.title}</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: item.isCurrent ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}>{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
