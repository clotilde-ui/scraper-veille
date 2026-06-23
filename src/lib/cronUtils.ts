import { CronExpressionParser } from 'cron-parser';

export function getNextRunAt(cronExpression: string): string {
  try {
    const interval = CronExpressionParser.parse(cronExpression, { tz: 'Europe/Paris' });
    return interval.next().toISOString() as string;
  } catch {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}

export function validateCron(expression: string): boolean {
  try {
    CronExpressionParser.parse(expression);
    return true;
  } catch {
    return false;
  }
}

export const CRON_PRESETS = [
  { label: 'Tous les lundis à 9h', value: '0 9 * * 1' },
  { label: 'Tous les jours à 8h', value: '0 8 * * *' },
  { label: 'Tous les jours à 18h', value: '0 18 * * *' },
  { label: 'Tous les vendredis à 17h', value: '0 17 * * 5' },
  { label: 'Le 1er du mois à 9h', value: '0 9 1 * *' },
  { label: 'Toutes les heures', value: '0 * * * *' },
];

export function describeCron(expression: string): string {
  const preset = CRON_PRESETS.find(p => p.value === expression);
  if (preset) return preset.label;
  return expression;
}
