import type { Task, Meeting, InsightCard, AgendaItem, EnergyPoint } from '../types';
export const userName = 'Usuario';
export const energyLevel = 74;
export const energyLabel = 'Foco alto';
export const energyWindow = '9:00 – 11:30 am';
export const tasks: Task[] = [
  { id: '1', title: 'Revisar unidades simulacro Q1', dueLabel: 'Urgente', priority: 'urgent', priorityLabel: 'Urgente', dotColor: '#ef4444', badgeColor: '#b91c1c', badgeBg: '#fef2f2' },
  { id: '2', title: 'Seguimiento licitación 2026', dueLabel: 'Esta semana', priority: 'thisweek', priorityLabel: 'Esta semana', dotColor: '#2a5cff', badgeColor: '#1d4ed8', badgeBg: '#eff6ff' },
  { id: '3', title: 'Convenio modificatorio U-1747', dueLabel: 'En proceso', priority: 'inprogress', priorityLabel: 'En proceso', dotColor: '#16a34a', badgeColor: '#15803d', badgeBg: '#f0fdf4' },
];
export const upcomingMeeting: Meeting = { title: 'Junta departamental', location: 'Sala de juntas A', minutesAway: 45 };
export const energyPoints: EnergyPoint[] = [
  { hour: 7, label: '7am', value: 42 }, { hour: 8, label: '8am', value: 58 },
  { hour: 9, label: '9am', value: 74 }, { hour: 10, label: '10am', value: 86 },
  { hour: 11, label: '11am', value: 83 }, { hour: 12, label: '12pm', value: 68 },
  { hour: 13, label: '1pm', value: 52 }, { hour: 14, label: '2pm', value: 47 },
  { hour: 15, label: '3pm', value: 58 }, { hour: 16, label: '4pm', value: 64 },
  { hour: 17, label: '5pm', value: 56 }, { hour: 18, label: '6pm', value: 41 },
];
export const energiaInsights: InsightCard[] = [
  { borderColor: '#16a34a', label: 'Ventana óptima', title: 'Trabaja en lo más difícil de 9 a 11 am', description: 'Tu nivel cognitivo alcanza su pico en esta ventana. Reserva las tareas de mayor concentración.' },
  { borderColor: '#f59e0b', label: 'Alerta de fatiga', title: 'Después de la comida, evita decisiones críticas', description: 'Entre la 1 y las 2 pm tu energía cae un 35%. Usa ese tiempo para reuniones de bajo impacto.' },
  { borderColor: '#2a5cff', label: 'Recuperación', title: 'Bloque de revisión a las 4 pm', description: 'Tu segunda ventana de foco moderado es de 3:30 a 5 pm. Ideal para revisar documentos y correos.' },
];
export const agendaItems: AgendaItem[] = [
  { timeRange: '8:00 – 8:30', title: 'Revisión matutina', subtitle: 'Revisar pendientes y prioridades del día', isCurrent: false },
  { timeRange: '9:00 – 11:00', title: 'Bloque de trabajo profundo', subtitle: 'Revisar unidades simulacro Q1', isCurrent: true },
  { timeRange: '11:15 – 12:00', title: 'Junta departamental', subtitle: 'Sala de juntas A · con 6 participantes', isCurrent: false },
  { timeRange: '13:00 – 14:00', title: 'Comida', subtitle: 'Pausa · sin reuniones ni notificaciones', isCurrent: false },
  { timeRange: '14:00 – 15:30', title: 'Tareas administrativas', subtitle: 'Correos, convenios y seguimientos', isCurrent: false },
  { timeRange: '17:30 – 18:00', title: 'Cierre del día', subtitle: 'Capturar pendientes y planear mañana', isCurrent: false },
];
export const globalInsights: InsightCard[] = [
  { borderColor: '#16a34a', label: 'Patrón detectado', title: 'Eres 2.4× más productivo de 9 a 11 am', description: 'Completas el 68% de tus tareas críticas en esta ventana. Protégela de reuniones innecesarias.' },
  { borderColor: '#ef4444', label: 'Impacto negativo', title: 'Las reuniones consecutivas reducen tu foco un 41%', description: 'Cuando tienes más de 2 reuniones seguidas, tu productividad del resto del día cae significativamente.' },
  { borderColor: '#2a5cff', label: 'Mejora sugerida', title: 'Agrupar correos en 2 bloques mejora productividad 18%', description: 'Revisar emails solo a las 9am y 4pm reduce interrupciones y aumenta tu tiempo de foco continuo.' },
  { borderColor: '#f59e0b', label: 'Tendencia semanal', title: 'Lunes y martes son tus días más productivos', description: 'Aprovecha el inicio de semana para las iniciativas más importantes y deja los viernes para cierres.' },
];
export const featurePills = [
  { emoji: '⚡', label: 'Análisis de energía' }, { emoji: '📋', label: 'Priorización IA' },
  { emoji: '🕐', label: 'Bloqueo de tiempo' }, { emoji: '📊', label: 'Reportes semanales' },
  { emoji: '🔔', label: 'Alertas de foco' }, { emoji: '🤝', label: 'Sync de equipo' },
];
