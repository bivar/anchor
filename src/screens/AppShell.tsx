import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Toast } from '../components/Toast';
import { TodayTab } from './TodayTab';
import { QuestsTab } from './QuestsTab';
import { PetTab } from './PetTab';
import { SettingsTab } from './SettingsTab';
import { StatsTab } from './StatsTab';
import { FocusFlow } from '../flows/FocusFlow';
import { LaunchpadFlow } from '../flows/LaunchpadFlow';
import { TornadoFlow } from '../flows/TornadoFlow';
import { LogDialog } from '../flows/LogDialog';

export function AppShell() {
  const { state } = useStore();
  const mainRef = useRef<HTMLDivElement>(null);
  const flowOpen = state.activeFlow !== null;

  // Keep keyboard and screen-reader focus inside an open flow.
  useEffect(() => {
    mainRef.current?.toggleAttribute('inert', flowOpen);
  }, [flowOpen]);

  useEffect(() => {
    mainRef.current?.querySelector('.app-body')?.scrollTo?.({ top: 0 });
  }, [state.tab]);

  return (
    <>
      <div ref={mainRef} className="app-main">
        <Header />
        <main className="app-body shell-scroll">
          {state.tab === 'today' && <TodayTab />}
          {state.tab === 'quests' && <QuestsTab />}
          {state.tab === 'stats' && <StatsTab />}
          {state.tab === 'pet' && <PetTab />}
          {state.tab === 'settings' && <SettingsTab />}
        </main>
        <BottomNav />
      </div>

      <FocusFlow />
      <LaunchpadFlow />
      <TornadoFlow />
      <LogDialog />
      <Toast />
    </>
  );
}
