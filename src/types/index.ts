export type Screen = 'hoy' | 'energia' | 'agenda' | 'insights';
export interface Task { id: string; title: string; dueLabel: string; priority: 'urgent' | 'thisweek' | 'inprogress'; priorityLabel: string; dotColor: string; badgeColor: string; badgeBg: string; }
export interface Meeting { title: string; location: string; minutesAway: number; }
export interface InsightCard { borderColor: string; label: string; title: string; description: string; }
export interface AgendaItem { timeRange: string; title: string; subtitle: string; isCurrent: boolean; }
export interface EnergyPoint { hour: number; label: string; value: number; }
