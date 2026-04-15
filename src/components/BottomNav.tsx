import { Home, Zap, CalendarDays, BarChart2 } from 'lucide-react';
import type { Screen } from '../types';
interface BottomNavProps { active: Screen; onChange: (screen: Screen) => void; }
const navItems: { id: Screen; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { id: 'hoy', label: 'Hoy', icon: Home },
  { id: 'energia', label: 'Energía', icon: Zap },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'insights', label: 'Insights', icon: BarChart2 },
];
export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderBottom: 'none' }} className="fixed bottom-0 left-0 right-0 bg-white z-50">
      <div className="max-w-md mx-auto flex items-stretch">
        {navItems.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => onChange(item.id)} className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors relative" style={{ color: isActive ? '#2a5cff' : '#9ca3af' }}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium tracking-wide" style={{ color: isActive ? '#2a5cff' : '#9ca3af' }}>{item.label}</span>
              {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-b" style={{ background: '#2a5cff' }} />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
