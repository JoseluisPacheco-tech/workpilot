import { useState } from 'react';
import type { Screen } from './types';
import BottomNav from './components/BottomNav';
import Dashboard from './screens/Dashboard';
import Energia from './screens/Energia';
import Agenda from './screens/Agenda';
import Insights from './screens/Insights';

export default function App() {
  const [screen, setScreen] = useState<Screen>('hoy');
  const renderScreen = () => {
    switch (screen) {
      case 'hoy': return <Dashboard />;
      case 'energia': return <Energia />;
      case 'agenda': return <Agenda />;
      case 'insights': return <Insights />;
    }
  };
  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: '#f0f0f0' }}>
      <div className="w-full max-w-md relative flex flex-col" style={{ background: '#f8f8f8', minHeight: '100dvh' }}>
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
          {renderScreen()}
        </div>
        <BottomNav active={screen} onChange={setScreen} />
      </div>
    </div>
  );
}
