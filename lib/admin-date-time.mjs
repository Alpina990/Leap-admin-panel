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

// Registration timestamp split so the time can be emphasised separately.
export function formatAdminRegistered(value) {
  if (!value) return { date: '—', time: '' };
  const parts = tashkentParts(value);
  return { date: `${parts.day}-${parts.month}|`, time: `${parts.hour}:${parts.minute}` };
}
