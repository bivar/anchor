import { Component, type ReactNode } from 'react';
import { messagesFor } from '../i18n';
import { saveFile } from '../platform/backup';
import { recordError } from '../platform/errorLog';
import { clearAll, loadRaw } from '../platform/storage';

/** Last line of defence: a render error shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    recordError(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const m = messagesFor('auto').error;
    return (
      <div className="page">
        <div className="shell">
          <div className="setup-screen" role="alert">
            <h1 style={{ fontSize: 26, margin: 0 }}>{m.title}</h1>
            <p className="card-body">{m.body}</p>
            <button className="btn btn-primary btn-block" onClick={() => location.reload()}>
              {m.reload}
            </button>
            <button
              className="btn btn-secondary btn-block"
              onClick={() => void saveFile('anchor-backup-recovery.json', loadRaw() ?? '{}', 'application/json', 'Anchor')}
            >
              {m.export}
            </button>
            <button
              className="btn btn-ghost btn-block"
              onClick={() => {
                if (window.confirm(m.reset + '?')) {
                  clearAll();
                  location.reload();
                }
              }}
            >
              {m.reset}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
