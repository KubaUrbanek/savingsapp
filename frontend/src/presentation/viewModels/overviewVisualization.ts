import type { OverviewGrouping } from '../../domain/portfolio/overviewVisualization.js';
import { TYPE_LABELS } from './formatters.js';

const assetLabels: Record<string, string> = {
  BONDS: 'Obligacje',
  STOCKS: 'Akcje',
  GOLD: 'Złoto',
  CASH: 'Gotówka',
  UNCLASSIFIED: 'Nieznany skład'
};
const styles: Record<string, { color: string; dash: string }> = {
  OBLIGACJE: { color: '#1f6840', dash: '8 3' },
  GIELDA: { color: '#246b9c', dash: '3 3' },
  IKE: { color: '#855a9f', dash: '10 3 2 3' },
  IKZE: { color: '#a04963', dash: '12 5' },
  KONTO_OSZCZEDNOSCIOWE: { color: '#8a610c', dash: '2 4' },
  KONTO_BANKOWE: { color: '#317477', dash: '10 3 2 3 2 3' },
  PPK: { color: '#a25324', dash: '6 3 6 6' },
  PPO: { color: '#626476', dash: '14 3 2 3' },
  BONDS: { color: '#1f6840', dash: '8 3' },
  STOCKS: { color: '#246b9c', dash: '3 3' },
  GOLD: { color: '#8a610c', dash: '10 3 2 3' },
  CASH: { color: '#855a9f', dash: '12 5' },
  UNCLASSIFIED: { color: '#a25324', dash: '2 4' }
};

export function overviewGroupLabel(key: string, grouping: OverviewGrouping): string {
  const labels: Record<string, string> = grouping === 'accounts' ? TYPE_LABELS : assetLabels;
  return labels[key] ?? key;
}

export function overviewGroupStyle(key: string) {
  return styles[key] ?? { color: '#626476', dash: '4 4' };
}

export function overviewDateLabel(date: string) {
  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`)
  );
}
