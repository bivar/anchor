import type { Messages } from '../i18n';
import type { BlockId, InsightId } from '../state/types';

export function insightText(m: Messages, insight: { id: InsightId; block?: BlockId }, labelFor: (id: BlockId) => string): string {
  const text = m.insights[insight.id];
  return typeof text === 'function' ? text(insight.block ? labelFor(insight.block) : '') : text;
}
