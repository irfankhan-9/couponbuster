import { MatchResult, Pick } from "../types";

/**
 * Calculates the score for a specific pick entry based on match results.
 * 
 * Rule: 
 * 1 point per winning pick.
 * Max 2 points per week.
 */
export const calculateWeeklyScore = (
  pick: Pick, 
  results: MatchResult[]
): { points: number, pick1_won: boolean, pick2_won: boolean } => {
  
  let points = 0;
  
  // Find result for Pick 1
  const r1 = results.find(r => r.team_id === pick.pick1_team_id);
  const pick1_won = r1 ? r1.won : false;
  if (pick1_won) points++;

  // Find result for Pick 2
  const r2 = results.find(r => r.team_id === pick.pick2_team_id);
  const pick2_won = r2 ? r2.won : false;
  if (pick2_won) points++;

  return { points, pick1_won, pick2_won };
};

/**
 * Formats currency from pence to GBP string
 */
export const formatCurrency = (pence: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
};
