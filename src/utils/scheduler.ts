import { League } from '../types';

export const calculateLeagueWindow = (league: League): { isOpen: boolean, deadlineDate: Date } => {
  // 1. Manual Override Check
  if (league.enable_automatic_deadlines !== true) {
    const manualOpen = league.market_manual_open ?? true;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7); // Future placeholder
    return { isOpen: manualOpen, deadlineDate: deadline };
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const currentHour = now.getHours();

  // 2. Automated Logic Window: Sunday 23:00 to [Deadline Day] [Deadline Hour]
  const deadlineDay = league.pick_deadline_day ?? 5; // Default Friday
  const deadlineHour = league.pick_deadline_hour ?? 23; // Default 11PM

  // Determine if we are in the "Closed" zone (Saturday after deadline until Sunday 23:00)

  // Create a Date object for this week's deadline
  const thisWeekDeadline = new Date(now);
  const diffToDeadline = deadlineDay - currentDay;
  thisWeekDeadline.setDate(now.getDate() + diffToDeadline);
  thisWeekDeadline.setHours(deadlineHour, 0, 0, 0);

  // If today is Sunday (0)
  if (currentDay === 0) {
    // Open only if it's after 23:00
    const isOpen = currentHour >= 23;

    // If it's Sunday, the "Next Deadline" is the NEXT Friday
    const nextDeadline = new Date(now);
    // Calculate days until the next deadlineDay (e.g., next Friday)
    // If deadlineDay is 0 (Sunday), and currentDay is 0, it means the deadline is today.
    // Otherwise, calculate days until the next occurrence of deadlineDay.
    const daysUntilNextDeadline = (deadlineDay - currentDay + 7) % 7;
    nextDeadline.setDate(now.getDate() + daysUntilNextDeadline);
    nextDeadline.setHours(deadlineHour, 0, 0, 0);

    return { isOpen, deadlineDate: nextDeadline };
  }

  // If today is Monday-Saturday
  // It's OPEN if we are before the deadline
  const isOpen = now < thisWeekDeadline;

  return { isOpen, deadlineDate: thisWeekDeadline };
};