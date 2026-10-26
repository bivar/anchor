import { StoreProvider, useStore } from './state/store';
import type { AppState } from './state/types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Setup } from './screens/Setup';
import { Onboarding } from './screens/Onboarding';
import { AppShell } from './screens/AppShell';

function Root() {
  const { state } = useStore();
  return (
    <div className="page">
      <div className="shell">
        {state.screen === 'setup' && <Setup />}
        {state.screen === 'onboarding' && <Onboarding />}
        {state.screen === 'app' && <AppShell />}
      </div>
    </div>
  );
}

export default function App({ initial }: { initial?: AppState }) {
  return (
    <ErrorBoundary>
      <StoreProvider initial={initial}>
        <Root />
      </StoreProvider>
    </ErrorBoundary>
  );
}
