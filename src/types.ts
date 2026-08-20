// Domain Types mapping to DB Schema

export enum UserRole {
  USER = 'user',
  LEAGUE_ADMIN = 'league-admin',
  GLOBAL_ADMIN = 'global-admin',
}

// Rank Titles for top performers
export enum RankTitle {
  GLOBAL_CROWN_CHAMPION = 'global_crown_champion',
  CROWN_CHAMPION = 'crown_champion',
  SILVER_SULTAN = 'silver_sultan',
  BRONZE_BOSS = 'bronze_boss',
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  wallet_balance_pence: number;
  avatar_url?: string;
  rank_title?: RankTitle | null;
  league_champion_of?: string | null;
  is_global_crown_champion?: boolean;
}

export interface Team {
  id: string;
  name: string;
  country: string; // e.g., 'Wales', 'England'
  league_id: string;
  logo_url?: string;
}

export interface League {
  id: string;
  name: string;
  owner_id: string;
  privacy: 'public' | 'private';
  weekly_fee_pence: number;
  pot_deduction_pence: number; // Amount kept in pot (rest goes to weekly bet)
  current_pot_pence: number;
  max_players: number;
  start_date: string;
  pick_deadline_day: number; // 5 = Friday
  pick_deadline_hour: number; // 19 = 7PM
  enable_automatic_deadlines: boolean; // true = enforced by scheduler, false = manual mode
  market_manual_open?: boolean; // when in manual mode (enable_automatic_deadlines === false): true=open, false=closed
  league_admins?: string[]; // Array of User IDs who can also manage this league
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  represented_team_id?: string; // The team chosen when joining
  is_admin: boolean;
  joined_at: string;
  // Denormalized points for the leaderboard view (in a real DB this might be a separate table or view)
  points: number;
  wins: number;
  adjustment_points?: number;
}

export interface Week {
  id: string;
  league_id: string;
  week_number: number;
  status: 'open' | 'closed' | 'pending_admin' | 'approved';
  deadline_at: string;
  coupon_winnings_pence?: number | null; // Total won on the real-world bet
  // Draft System Fields
  pick_order: string[]; // Array of User IDs defining the sequence
  custom_draft_order?: string[] | null; // Admin override for Week 1 initial order
  current_turn_user_id: string | null; // The user currently on the clock
  draft_round: 1 | 2; // 1 = Banker, 2 = Cover
  draft_status: 'upcoming' | 'active' | 'completed' | 'paused';
}

export interface Pick {
  id: string;
  week_id: string;
  user_id: string;
  pick1_team_id?: string; // Optional during draft
  pick2_team_id?: string; // Optional during draft
  submitted_at: string;
  // Computed after results
  pick1_won?: boolean;
  pick2_won?: boolean;
  points_awarded?: number;
}

export interface MatchResult {
  team_id: string;
  opponent: string;
  score: string;
  won: boolean;
}

export interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  points: number;
  wins: number;
  adjustment_points?: number;
  rank_title?: RankTitle | null;
}

// League Champions - stores #1, #2, #3 for each league
export interface LeagueChampion {
  league_id: string;
  league_name: string;
  champion_user_id: string | null;
  champion_name: string;
  points: number;
  wins: number;
  second_user_id: string | null;
  second_name: string;
  second_points: number;
  third_user_id: string | null;
  third_name: string;
  third_points: number;
  updated_at: string;
}

// Global Leaderboard Entry - shows who's #1 in each league
export interface GlobalLeaderboardEntry {
  league_id: string;
  league_name: string;
  user_id: string;
  user_name: string;
  rank: number;
  points: number;
  wins: number;
  rank_title: RankTitle | null;
}

// Global League - configuration for the global competition
export interface GlobalLeague {
  id: string;
  entry_stake_pence: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Global League Entry - individual entry in the global competition
export interface GlobalLeagueEntry {
  id: string;
  global_league_id: string;
  user_id: string;
  display_name: string;
  total_points: number;
  wins: number;
  rank: number;
  is_global_crown_champion: boolean;
  joined_at: string;
}

// Aggregated user stats across all leagues
export interface AggregatedUserStats {
  user_id: string;
  user_name: string;
  total_points: number;
  total_wins: number;
  leagues_count: number;
  leagues: string[];
}