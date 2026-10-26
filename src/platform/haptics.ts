const PATTERNS: Record<'light' | 'medium' | 'success', VibratePattern> = { light: 10, medium: 20, success: [15, 60, 30] };

/** Best-effort vibration (Android browsers; iOS Safari has no Vibration API). */
export function haptic(kind: keyof typeof PATTERNS): void {
  try {
    navigator.vibrate?.(PATTERNS[kind]);
  } catch {
    // Unsupported or blocked: haptics are decorative.
  }
}
