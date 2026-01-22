import { League } from '../types';

// Return a Date representing the current time in Europe/London
const nowInLondon = (): Date => {
  return new Date(new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }));
};

// Given a base London date, compute the weekend window [Fri 23:00, Sun 23:00)
const getWeekendWindowLondon = (base: Date): { friday2300: Date; sunday2300: Date } => {
  const d = new Date(base);
  const currentDay = d.getDay(); // 0=Sun .. 5=Fri .. 6=Sat
  const deltaToLastFriday = ((currentDay + 7) - 5) % 7; // days since last Friday
  const friday = new Date(d);
  friday.setDate(d.getDate() - deltaToLastFriday);
  friday.setHours(23, 0, 0, 0);

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 0, 0, 0);

  return { friday2300: friday, sunday2300: sunday };
};

export const calculateLeagueWindow = (league: League): { isOpen: boolean; deadlineDate: Date } => {
  // Manual mode: explicit open/close via admin
  if (league.enable_automatic_deadlines === false) {
    const manualOpen = league.market_manual_open === undefined ? true : !!league.market_manual_open;
    // For display, show next Friday 23:00 UK
    const nowLon = nowInLondon();
    const { friday2300 } = getWeekendWindowLondon(nowLon);
    const deadline = nowLon >= friday2300 ? new Date(friday2300.getTime() + 7 * 24 * 60 * 60 * 1000) : friday2300;
    return { isOpen: manualOpen, deadlineDate: deadline };
  }

  // Automated: closed from Fri 23:00 to Sun 23:00 UK time, open otherwise
  const nowLon = nowInLondon();
  const { friday2300, sunday2300 } = getWeekendWindowLondon(nowLon);
  const isWeekendClosed = nowLon >= friday2300 && nowLon < sunday2300;
  const isOpen = !isWeekendClosed;

  // Display upcoming Friday 23:00 UK as deadline
  const deadline = nowLon >= friday2300 ? new Date(friday2300.getTime() + 7 * 24 * 60 * 60 * 1000) : friday2300;
  return { isOpen, deadlineDate: deadline };
};
