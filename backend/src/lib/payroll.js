export const REQUIRED_HOURS_PER_DAY = 9;
export const PF_RATE = 0.12;
export const ESI_RATE = 0.0075;
export const TDS_RATE = 0.1;

export function getWeekdaysInMonth(year, monthOneBased) {
  const daysInMonth = new Date(year, monthOneBased, 0).getDate();
  let weekdays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, monthOneBased - 1, d).getDay();
    if (day !== 0 && day !== 6) weekdays++;
  }
  return weekdays;
}

export function calculatePayrollBreakdown({
  baseSalary,
  workedHours,
  requiredHours,
  paidHolidayHours,
}) {
  const gross = Number(baseSalary || 0);
  const safeRequired = Number(requiredHours || 0);
  const safeWorked = Number(workedHours || 0);
  const safeHoliday = Number(paidHolidayHours || 0);

  const payableHours = Math.max(0, Math.min(safeRequired, safeWorked + safeHoliday));
  const unpaidHours = Math.max(0, safeRequired - payableHours);
  const lop = safeRequired > 0 ? (gross * unpaidHours) / safeRequired : 0;

  const pf = gross * PF_RATE;
  const esi = gross * ESI_RATE;
  const tds = gross * TDS_RATE;
  const net = Math.max(0, gross - pf - esi - tds - lop);

  return { gross, pf, esi, tds, lop, net, payableHours, unpaidHours };
}
