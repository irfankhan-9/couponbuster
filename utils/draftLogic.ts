import { Team, Pick, Week, LeagueMember } from '../types';

/**
 * Generates the initial draft order based on "First In, First Pick".
 * Sorts members by their 'joined_at' timestamp.
 */
export const getInitialDraftOrder = (members: LeagueMember[]): string[] => {
  return members
    .filter(m => m.status === 'approved')
    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
    .map(m => m.user_id);
};

/**
 * Rotates the pick order for the next week.
 * First player moves to last position. Everyone else shifts up.
 * [A, B, C] -> [B, C, A]
 */
export const rotateWeeklyOrder = (previousOrder: string[]): string[] => {
  if (previousOrder.length <= 1) return previousOrder;
  const newOrder = [...previousOrder];
  const first = newOrder.shift();
  if (first) newOrder.push(first);
  return newOrder;
};

/**
 * Returns available teams for selection, filtering out any team that has 
 * ALREADY been picked by ANYONE in the current week.
 * 
 * Rule: "No one can ever pick the same team. Always different."
 */
export const getAvailableTeams = (allTeams: Team[], currentPicks: Pick[], currentWeekId: string): Team[] => {
    // Filter picks for this week
    const picksForWeek = currentPicks.filter(p => p.week_id === currentWeekId);
    
    // Collect all team IDs already picked in this week (Banker OR Cover)
    const takenTeamIds = new Set<string>();
    
    picksForWeek.forEach(p => {
        if (p.pick1_team_id) takenTeamIds.add(p.pick1_team_id);
        if (p.pick2_team_id) takenTeamIds.add(p.pick2_team_id);
    });

    return allTeams.filter(t => !takenTeamIds.has(t.id));
};

/**
 * Logic to decide who goes next.
 * IMPLEMETATION: Linear Draft (1, 2, 3 -> 1, 2, 3)
 */
export const processTurnHandover = (week: Week, currentOrder: string[]): Partial<Week> => {
    const currentIndex = currentOrder.indexOf(week.current_turn_user_id || '');
    
    // Safety check: if current user not found, default to first or stay null
    if (currentIndex === -1 && currentOrder.length > 0) {
        return { current_turn_user_id: currentOrder[0] };
    }
    if (currentIndex === -1) return {};

    const isLastInOrder = currentIndex === currentOrder.length - 1;

    if (isLastInOrder) {
        if (week.draft_round === 1) {
            // End of Round 1 -> Go to Round 2, RESET to First User (Linear Draft)
            return {
                current_turn_user_id: currentOrder[0],
                draft_round: 2
            };
        } else {
            // End of Round 2 -> Complete
            return {
                current_turn_user_id: null,
                draft_status: 'completed'
            };
        }
    } else {
        // Next person in the list
        return {
            current_turn_user_id: currentOrder[currentIndex + 1]
        };
    }
};