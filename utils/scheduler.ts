import { League } from '../types';

export const calculateLeagueWindow = (league: League): { isOpen: boolean, deadlineDate: Date } => {
  // 1. Manual Override Check
  // If automatic deadlines are DISABLED, the market is ALWAYS OPEN regardless of time/day.
  if (league.enable_automatic_deadlines === false) {
    const openIndefinitely = new Date();
    openIndefinitely.setDate(openIndefinitely.getDate() + 365); // Just a future date to keep UI happy
    return { isOpen: true, deadlineDate: openIndefinitely };
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

  // 2. Strict Sunday Blackout
  // The cycle is Mon-Sat. Sunday is always closed (waiting for reset) IF automation is on.
  if (currentDay === 0) {
    const closedDate = new Date(now);
    closedDate.setHours(0, 0, 0, 0); // Just a past date
    return { isOpen: false, deadlineDate: closedDate };
  }

  // 3. Calculate Deadline for the current week
  // We assume the 'Game Week' started on Monday.
  // We calculate the deadline date based on the league's deadline day relative to today.
  
  const deadline = new Date(now);
  const diff = league.pick_deadline_day - currentDay;
  
  // Set the date to the target deadline day
  deadline.setDate(now.getDate() + diff);
  // Set the time
  deadline.setHours(league.pick_deadline_hour, 0, 0, 0);

  // 4. Determine Status
  // If now is before the deadline, it's OPEN.
  // If now is after the deadline, it's CLOSED (until next Monday).
  const isOpen = now < deadline;

  return { isOpen, deadlineDate: deadline };
};