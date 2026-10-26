import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from '../App';
import { initialState } from '../state/reducer';
import type { AppState } from '../state/types';

function renderApp(overrides: Partial<AppState> = {}) {
  return render(<App initial={{ ...initialState(), language: 'en', ...overrides }} />);
}

describe('App', () => {
  it('walks through the 4-step setup and onboarding into the app', () => {
    renderApp();
    // 1. Pet & routine
    fireEvent.change(screen.getByLabelText("What's their name?"), { target: { value: 'Fred' } });
    fireEvent.change(screen.getByLabelText('After work'), { target: { value: 'play' } });
    expect(screen.getByText('Walk 2× a day · Play 1× a day')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // 2. Day start + work
    fireEvent.change(screen.getByLabelText('When does your day start?'), { target: { value: '06:00' } });
    expect(screen.getByText(/A new day begins at 03:00/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // 3. Movement: add a third exercise
    fireEvent.click(screen.getByRole('button', { name: '+ Add exercise' }));
    expect(screen.getAllByLabelText('Exercise')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // 4. Focus
    const finish = screen.getByRole('button', { name: 'Finish setup' }) as HTMLButtonElement;
    expect(finish.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/current struggle/i), { target: { value: 'Thesis' } });
    fireEvent.click(finish);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    // Onboarding summarizes the anchors that were just configured.
    expect(screen.getByText('Starts at 06:00')).toBeTruthy();
    expect(screen.getByText(/8h · 09:00 – 17:00 · Mon, Tue, Wed, Thu, Fri/)).toBeTruthy();
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: "Let's go" }));
    expect(screen.getByRole('heading', { name: "How's your energy right now?" })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy();
  });

  it('shows the analytics page with charts and data tables', () => {
    const history = {
      '2026-10-20': { today: '2026-10-20', energy: 'low' as const, completedBlocks: ['launchpad' as const, 'work' as const], skippedBlocks: [], xpEarned: 45, success: false, plannedBlocks: ['launchpad' as const, 'work' as const, 'focus' as const], focusResistance: 4, focusWorked: true },
      '2026-10-21': { today: '2026-10-21', energy: 'high' as const, completedBlocks: ['launchpad' as const, 'focus' as const], skippedBlocks: [], xpEarned: 60, success: true, plannedBlocks: ['launchpad' as const, 'focus' as const], focusResistance: 2, focusWorked: false },
    };
    renderApp({ screen: 'app', tab: 'stats', today: '2026-10-22', history, pet: { name: 'Fred', species: 'dog', routine: { morning: 'walk', afterWork: null, evening: 'walk' } }, struggle: { label: 'Thesis' } });
    expect(screen.getByRole('heading', { name: 'Your analytics' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Daily follow-through' })).toBeTruthy();
    expect(screen.getByText('80%')).toBeTruthy(); // 4 of 5 planned blocks done
    expect(screen.getByRole('group', { name: 'How heavy starting felt' })).toBeTruthy();
    expect(screen.getAllByText('Show as table').length).toBeGreaterThan(1);
    // Keyboard reaches the same details as hover.
    const daily = screen.getByRole('group', { name: 'Daily follow-through' });
    fireEvent.focus(daily);
    fireEvent.keyDown(daily, { key: 'ArrowLeft' });
    expect(daily.textContent).toMatch(/Tue, Oct 21|21/);
  });

  it('renders in Portuguese', () => {
    renderApp({ screen: 'app', language: 'pt', pet: { name: 'Fred', species: 'dog', routine: { morning: 'walk', afterWork: null, evening: 'walk' } }, struggle: { label: 'Tese' } });
    expect(screen.getByText('Como está sua energia agora?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ajustes' })).toBeTruthy();
  });

  it('opens a flow as a labelled dialog and closes it with Escape', () => {
    renderApp({ screen: 'app', pet: { name: 'Fred', species: 'dog', routine: { morning: 'walk', afterWork: null, evening: 'walk' } }, struggle: { label: 'Thesis' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog', { name: 'Launch Sequence' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
