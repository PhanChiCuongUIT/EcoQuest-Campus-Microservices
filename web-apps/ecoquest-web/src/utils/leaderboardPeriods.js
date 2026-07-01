export function isoWeekInfo(date = new Date()) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return { year: utc.getUTCFullYear(), week };
}

export function buildLeaderboardPeriodOptions(type, date = new Date()) {
  if (type === 'monthly') {
    const year = date.getFullYear();
    const currentMonth = date.getMonth() + 1;
    return Array.from({ length: currentMonth }, (_, index) => currentMonth - index)
      .map(month => ({
        key: `${year}-${String(month).padStart(2, '0')}`,
        label: month === currentMonth ? `Current month (${month}/${year})` : `Month ${month}/${year}`,
        params: { year, month },
      }));
  }

  const { year, week: currentWeek } = isoWeekInfo(date);
  return Array.from({ length: currentWeek }, (_, index) => currentWeek - index)
    .map(week => ({
      key: `${year}-W${String(week).padStart(2, '0')}`,
      label: week === currentWeek ? `Current week (W${week}/${year})` : `Week ${week}/${year}`,
      params: { year, week },
    }));
}

export function periodParamsFromKey(type, key) {
  if (!key) return {};
  if (type === 'monthly') {
    const [year, month] = key.split('-').map(Number);
    return Number.isFinite(year) && Number.isFinite(month) ? { year, month } : {};
  }
  const [year, weekPart] = key.split('-W');
  const parsedYear = Number(year);
  const week = Number(weekPart);
  return Number.isFinite(parsedYear) && Number.isFinite(week) ? { year: parsedYear, week } : {};
}
