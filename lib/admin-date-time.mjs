const tashkentDateTime = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tashkent',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function tashkentParts(value) {
  return Object.fromEntries(
    tashkentDateTime.formatToParts(new Date(value)).map(part => [part.type, part.value]),
  );
}

export function formatAdminDateTime(value) {
  if (!value) return '—';
  const parts = tashkentParts(value);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

// Day, month and time without the year, e.g. "08-10|14:30".
export function formatAdminDayMonthTime(value) {
  if (!value) return '—';
  const parts = tashkentParts(value);
  return `${parts.day}-${parts.month}|${parts.hour}:${parts.minute}`;
}

// Last-activity indicator, e.g. "09-10 | 15 daqiqa oldin". The optional
// reference point keeps the relative phrase deterministic in tests.
export function formatAdminRelativeTime(value, now = Date.now()) {
  if (!value) return '—';
  const timestamp = new Date(value).getTime();
  const reference = typeof now === 'number' ? now : new Date(now).getTime();
  if (Number.isNaN(timestamp) || Number.isNaN(reference)) return '—';
  const parts = tashkentParts(value);
  const date = `${parts.day}-${parts.month}`;
  const seconds = Math.max(0, Math.floor((reference - timestamp) / 1000));
  if (seconds < 60) return `${date} | hozir`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${date} | ${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${date} | ${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${date} | ${days} kun oldin`;
  if (days < 30) return `${date} | ${Math.floor(days / 7)} hafta oldin`;
  if (days < 365) return `${date} | ${Math.floor(days / 30)} oy oldin`;
  return `${date} | ${Math.floor(days / 365)} yil oldin`;
}

// Registration timestamp split so the time can be emphasised separately.
export function formatAdminRegistered(value) {
  if (!value) return { date: '—', time: '' };
  const parts = tashkentParts(value);
  return { date: `${parts.day}-${parts.month}|`, time: `${parts.hour}:${parts.minute}` };
}
