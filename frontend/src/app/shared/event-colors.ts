// System-palette accent per event type — shared by public + admin so a given
// category always reads in the same color (mirrors the design reference).
const EVENT_TYPE_COLORS: Record<string, string> = {
  concert: '#3e7bfa',
  art_exhibition: '#8b5cf6',
  festival: '#f59e2c',
  fair: '#3fc7c7',
  party: '#c084fc',
  conference: '#5b8efb',
  dinner: '#f2c53d',
  sports: '#4bcd79',
}

export function eventTypeColor(key: string | null | undefined): string {
  return (key && EVENT_TYPE_COLORS[key]) || '#9aa0b4'
}
