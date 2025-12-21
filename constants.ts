import { League, LeagueMember, Pick, Team, User, UserRole, Week } from "./types";

// Seed Data for Development/Preview

export const CURRENT_USER_ID = "u1"; // 'u1' is Admin. Change to 'u2' or 'u3' to test other roles.

export const TEAMS: Team[] = [
  { id: "t1", name: "Cardiff City", country: "Wales" },
  { id: "t2", name: "Swansea City", country: "Wales" },
  { id: "t3", name: "Newport County", country: "Wales" },
  { id: "t4", name: "Wrexham", country: "Wales" },
  { id: "t5", name: "Bristol City", country: "England" },
  { id: "t6", name: "Leeds United", country: "England" },
  { id: "t7", name: "Leicester City", country: "England" },
  { id: "t8", name: "Southampton", country: "England" },
  { id: "t9", name: "Man City", country: "England" },
  { id: "t10", name: "Liverpool", country: "England" },
  { id: "t11", name: "Arsenal", country: "England" },
  { id: "t12", name: "Man Utd", country: "England" },
  { id: "t13", name: "Chelsea", country: "England" },
  { id: "t14", name: "Spurs", country: "England" },
  { id: "t15", name: "Newcastle", country: "England" },
  { id: "t16", name: "Aston Villa", country: "England" },
];

export const MOCK_USERS: User[] = [
  { id: "u1", email: "gareth@example.com", display_name: "Gareth Bale", role: UserRole.LEAGUE_ADMIN, wallet_balance_pence: 2500 },
  { id: "u2", email: "aaron@example.com", display_name: "Aaron R", role: UserRole.USER, wallet_balance_pence: 500 },
  { id: "u3", email: "giggsy@example.com", display_name: "Ryan G", role: UserRole.USER, wallet_balance_pence: 1200 },
  { id: "u4", email: "dan@example.com", display_name: "Dan James", role: UserRole.USER, wallet_balance_pence: 0 },
];

export const MOCK_LEAGUES: League[] = [
  { 
    id: "l1", 
    name: "Valleys Premier League", 
    owner_id: "u1", 
    privacy: "private", 
    weekly_fee_pence: 2000, // £20 total
    pot_deduction_pence: 200, // £2 stays in pot, £18 to bet
    current_pot_pence: 15000, 
    max_players: 20, 
    start_date: "2023-08-12",
    pick_deadline_day: 5, // Friday
    pick_deadline_hour: 23, // 11 PM
    enable_automatic_deadlines: true
  },
  { 
    id: "l2", 
    name: "Cardiff Pub Quiz", 
    owner_id: "u2", 
    privacy: "public", 
    weekly_fee_pence: 1000, // £10 total
    pot_deduction_pence: 200, // £2 stays in pot, £8 to bet
    current_pot_pence: 4500, 
    max_players: 50, 
    start_date: "2023-09-01",
    pick_deadline_day: 5, // Friday
    pick_deadline_hour: 23, // 11 PM
    enable_automatic_deadlines: true
  }
];

// NOTE: In a real app, this would be a DB table. 
// We use a mutable array here to simulate state changes in the demo.
export const MOCK_MEMBERS: LeagueMember[] = [
  { id: "m1", league_id: "l1", user_id: "u1", status: "approved", is_admin: true, joined_at: "2023-08-01", represented_team_id: "t1", points: 14, wins: 7 },
  { id: "m2", league_id: "l1", user_id: "u2", status: "approved", is_admin: false, joined_at: "2023-08-02", represented_team_id: "t2", points: 12, wins: 6 },
  // u3 is pending approval in l1
  { id: "m3", league_id: "l1", user_id: "u3", status: "pending", is_admin: false, joined_at: "2023-08-05", represented_team_id: "t4", points: 0, wins: 0 },
];

export const MOCK_WEEKS: Week[] = [
  { 
    id: "w1", 
    league_id: "l1", 
    week_number: 1, 
    status: "approved", 
    deadline_at: "2023-08-12T19:00:00Z", 
    coupon_winnings_pence: 0,
    pick_order: ['u1', 'u2'],
    current_turn_user_id: null,
    draft_round: 2,
    draft_status: 'completed'
  },
  { 
    id: "w2", 
    league_id: "l1", 
    week_number: 2, 
    status: "approved", 
    deadline_at: "2023-08-19T19:00:00Z", 
    coupon_winnings_pence: 14000,
    pick_order: ['u2', 'u1'],
    current_turn_user_id: null,
    draft_round: 2,
    draft_status: 'completed'
  },
  { 
    id: "w3", 
    league_id: "l1", 
    week_number: 3, 
    status: "open", 
    deadline_at: new Date(Date.now() + 86400000 * 2).toISOString(), // Placeholder
    pick_order: ['u1', 'u2'], // u1 goes first this week
    current_turn_user_id: 'u1',
    draft_round: 1,
    draft_status: 'active'
  },
  { 
    id: "w-l2-1", 
    league_id: "l2", 
    week_number: 1, 
    status: "open", 
    deadline_at: new Date(Date.now() + 86400000 * 4).toISOString(),
    pick_order: ['u2'], 
    current_turn_user_id: 'u2',
    draft_round: 1,
    draft_status: 'active'
  },
];

export const MOCK_PICKS: Pick[] = [
    // Past weeks...
    { id: "p1", week_id: "w1", user_id: "u1", pick1_team_id: "t1", pick2_team_id: "t2", submitted_at: "2023-08-20T10:00:00Z" },
    { id: "p2", week_id: "w1", user_id: "u2", pick1_team_id: "t5", pick2_team_id: "t6", submitted_at: "2023-08-20T11:30:00Z" }
];

export const ADMIN_CHECKLIST = [
  { id: 1, text: "Verify user is 18+ (DOB Check)", required: true },
  { id: 2, text: "KYC: Upload ID if withdrawing > £500", required: false },
  { id: 3, text: "GDPR: Ensure privacy policy is linked on signup", required: true },
  { id: 4, text: "UK Gambling Commission: Check 'Private Society Lottery' exemption rules", required: true },
];