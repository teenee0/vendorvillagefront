/** Диапазоны YYYY-MM-DD для быстрых фильтров расходов / платежей. Неделя — с понедельника по воскресенье. */

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function presetToday() {
  const t = new Date();
  const s = toISODate(t);
  return { start_date: s, end_date: s };
}

/** Понедельник–воскресенье текущей недели */
export function presetThisWeek() {
  const t = new Date();
  const day = t.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const mon = new Date(t);
  mon.setDate(t.getDate() + mondayOffset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start_date: toISODate(mon), end_date: toISODate(sun) };
}

export function presetThisMonth() {
  const t = new Date();
  const start = new Date(t.getFullYear(), t.getMonth(), 1);
  const end = new Date(t.getFullYear(), t.getMonth() + 1, 0);
  return { start_date: toISODate(start), end_date: toISODate(end) };
}

export function presetLastMonth() {
  const t = new Date();
  const start = new Date(t.getFullYear(), t.getMonth() - 1, 1);
  const end = new Date(t.getFullYear(), t.getMonth(), 0);
  return { start_date: toISODate(start), end_date: toISODate(end) };
}

/** Последние 7 календарных дней, включая сегодня */
export function presetLast7Days() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return { start_date: toISODate(start), end_date: toISODate(end) };
}

/** Последние 30 календарных дней, включая сегодня */
export function presetLast30Days() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { start_date: toISODate(start), end_date: toISODate(end) };
}
