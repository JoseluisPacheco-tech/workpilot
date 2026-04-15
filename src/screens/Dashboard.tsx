import { Bell, ChevronRight, Clock } from 'lucide-react';
import { tasks, upcomingMeeting, energyLevel, energyLabel, energyWindow, userName } from '../data/sampleData';
function getTodayLabel() {
  const now = new Date();
  const days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${days[now.getDay()].charAt(0).toUpperCase() + days[now.getDay()].slice(1)}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
}
function getGreeting() { const h = new Date().getHours(); if (h < 12) return 'Buenos días'; if (h < 19) return 'Buenas tardes'; return 'Buenas noches'; }
export default function Dashboard() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-2">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: '#0f0e0c' }}>{getGreeting()}, {userName}</h1>
          <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{getTodayLabel()}</p>
        </div>
        <button className="w-9 h-9 rounded-full flex items-center justify-center relative" style={{ border: '0.5px solid rgba(0,0,0,0.1)', background: '#fff' }}>
          <Bell size={16} style={{ color: '#0f0e0c' }} strokeWidth={1.8} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: '#2a5cff' }} />
        </button>
      </div>
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium" style={{ color: '#6b7280' }}>Energía cognitiva</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-semibold" style={{ color: '#0f0e0c' }}>{energyLevel}%</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#eff6ff', color: '#2a5cff' }}>{energyLabel}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg" style={{ background: 'rgba(42,92,255,0.08)' }}>⚡</div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
          <div className="h-full rounded-full" style={{ width: `${energyLevel}%`, background: '#2a5cff' }} />
        </div>
        <p className="text-xs mt-2.5" style={{ color: '#6b7280' }}>Ventana óptima de foco: <span className="font-medium" style={{ color: '#0f0e0c' }}>{energyWindow}</span></p>
      </div>
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: '#0f0e0c' }}>Prioridades de hoy</h2>
          <button className="flex items-center gap-0.5 text-xs font-medium" style={{ color: '#2a5cff' }}>Ver todas <ChevronRight size={12} /></button>
        </div>
        <div className="flex flex-col gap-2.5">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg" style={{ border: '0.5px solid rgba(0,0,0,0.07)', background: '#fafafa' }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: task.dotColor }} />
              <p className="text-sm font-medium flex-1 truncate" style={{ color: '#0f0e0c' }}>{task.title}</p>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: task.badgeBg, color: task.badgeColor }}>{task.dueLabel}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card p-4 flex items-center gap-4" style={{ borderLeft: '3px solid #2a5cff' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(42,92,255,0.08)' }}>
          <Clock size={18} style={{ color: '#2a5cff' }} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium mb-0.5" style={{ color: '#6b7280' }}>Próxima reunión</p>
          <p className="text-sm font-semibold truncate" style={{ color: '#0f0e0c' }}>{upcomingMeeting.title}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{upcomingMeeting.location}</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: 'rgba(42,92,255,0.1)', color: '#2a5cff' }}>en {upcomingMeeting.minutesAway} min</span>
      </div>
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#0f0e0c' }}>
        <span className="text-xl">💡</span>
        <p className="text-xs leading-relaxed flex-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
          Tienes 2 horas de foco disponibles antes de tu reunión.{' '}
          <span style={{ color: '#fff', fontWeight: 600 }}>Aprovecha la ventana de 9–11am.</span>
        </p>
      </div>
    </div>
  );
}
