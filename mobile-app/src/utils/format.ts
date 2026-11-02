/** ₹ with Indian digit grouping: 1250000 → ₹12,50,000. */
export function rupees(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `₹${rest},${last3}`;
}

export function timeAgo(at: number, now = Date.now()): string {
  const m = Math.max(0, Math.floor((now - at) / 60000));
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(at: number): string {
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function clock(at: number): string {
  const d = new Date(at);
  const h = d.getHours();
  return `${((h + 11) % 12) + 1}:${d.getMinutes().toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function firstName(name?: string | null): string {
  return (name ?? '').trim().split(/\s+/)[0] || '';
}

/** "9820145210" → "98201 45210". */
export function phoneFmt(p?: string | null): string {
  const d = (p ?? '').replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

export function daysLeft(until: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((until - now) / 86400000));
}
