import { useState, useEffect } from 'react';

const API_KEY = '6076d9772ed064d9ee17efa4e1b85e48';
const CACHE_KEY = 'coupon_busters_bet365_weekend_odds_v1';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

const LEAGUE_KEY_MAP: Record<string, string> = {
  pl: 'soccer_epl',
  ch: 'soccer_efl_champ',
  l1: 'soccer_england_league1',
  l2: 'soccer_england_league2',
  spl: 'soccer_spl',
  laliga: 'soccer_spain_la_liga',
  bundesliga: 'soccer_germany_bundesliga',
  seriea: 'soccer_italy_serie_a',
  ligue1: 'soccer_france_ligue_one',
  eredivisie: 'soccer_netherlands_eredivisie',
  superlig: 'soccer_turkey_super_league',
  portugal: 'soccer_portugal_primeira_liga',
  jupiler: 'soccer_belgium_first_div',
  greek: 'soccer_greece_super_league',
  swiss: 'soccer_switzerland_superleague',
  austrian: 'soccer_austria_bundesliga',
  danish: 'soccer_denmark_superliga',
  norwegian: 'soccer_norway_eliteserien',
  swedish: 'soccer_sweden_allsvenskan',
  polish: 'soccer_poland_ekstraklasa',
};

export interface TeamOdds {
  odds: number;
  fractionalOdds: string;
  bookmaker: string;
  opponent: string;
  isHome: boolean;
  commenceTime: string;
  dayOfWeek: string;
}

// Convert Decimal Odds to authentic UK Fractional Odds (e.g., 2.50 -> "6/4", 2.00 -> "EVS")
export function decimalToFractional(decimal: number): string {
  if (!decimal || decimal <= 1) return 'EVS';

  const ukFractions = [
    { dec: 1.01, frac: '1/100' }, { dec: 1.05, frac: '1/20' }, { dec: 1.10, frac: '1/10' },
    { dec: 1.12, frac: '1/8' }, { dec: 1.14, frac: '1/7' }, { dec: 1.17, frac: '1/6' },
    { dec: 1.20, frac: '1/5' }, { dec: 1.22, frac: '2/9' }, { dec: 1.25, frac: '1/4' },
    { dec: 1.29, frac: '2/7' }, { dec: 1.30, frac: '3/10' }, { dec: 1.33, frac: '1/3' },
    { dec: 1.36, frac: '4/11' }, { dec: 1.40, frac: '2/5' }, { dec: 1.44, frac: '4/9' },
    { dec: 1.50, frac: '1/2' }, { dec: 1.53, frac: '8/15' }, { dec: 1.57, frac: '4/7' },
    { dec: 1.62, frac: '8/13' }, { dec: 1.67, frac: '4/6' }, { dec: 1.73, frac: '8/11' },
    { dec: 1.75, frac: '3/4' }, { dec: 1.80, frac: '4/5' }, { dec: 1.83, frac: '5/6' },
    { dec: 1.91, frac: '10/11' }, { dec: 2.00, frac: 'EVS' }, { dec: 2.10, frac: '11/10' },
    { dec: 2.20, frac: '6/5' }, { dec: 2.25, frac: '5/4' }, { dec: 2.30, frac: '13/10' },
    { dec: 2.38, frac: '11/8' }, { dec: 2.40, frac: '7/5' }, { dec: 2.50, frac: '6/4' },
    { dec: 2.60, frac: '8/5' }, { dec: 2.63, frac: '13/8' }, { dec: 2.75, frac: '7/4' },
    { dec: 2.88, frac: '15/8' }, { dec: 3.00, frac: '2/1' }, { dec: 3.25, frac: '9/4' },
    { dec: 3.40, frac: '12/5' }, { dec: 3.50, frac: '5/2' }, { dec: 3.75, frac: '11/4' },
    { dec: 4.00, frac: '3/1' }, { dec: 4.33, frac: '10/3' }, { dec: 4.50, frac: '7/2' },
    { dec: 5.00, frac: '4/1' }, { dec: 5.50, frac: '9/2' }, { dec: 6.00, frac: '5/1' },
    { dec: 6.50, frac: '11/2' }, { dec: 7.00, frac: '6/1' }, { dec: 7.50, frac: '13/2' },
    { dec: 8.00, frac: '7/1' }, { dec: 8.50, frac: '15/2' }, { dec: 9.00, frac: '8/1' },
    { dec: 10.0, frac: '9/1' }, { dec: 11.0, frac: '10/1' }, { dec: 13.0, frac: '12/1' },
    { dec: 15.0, frac: '14/1' }, { dec: 17.0, frac: '16/1' }, { dec: 21.0, frac: '20/1' },
    { dec: 26.0, frac: '25/1' }, { dec: 34.0, frac: '33/1' }, { dec: 41.0, frac: '40/1' },
    { dec: 51.0, frac: '50/1' }, { dec: 67.0, frac: '66/1' }, { dec: 101.0, frac: '100/1' }
  ];

  let closest = ukFractions[0];
  let minDiff = Math.abs(decimal - closest.dec);

  for (const item of ukFractions) {
    const diff = Math.abs(decimal - item.dec);
    if (diff < minDiff) {
      minDiff = diff;
      closest = item;
    }
  }

  return closest.frac;
}

// Global in-memory cache to share across components during session
let memoryOddsCache: Record<string, TeamOdds> = {};
let lastFetchTimestamp: number = 0;

export function normalizeName(name: string): string {
  if (!name) return '';
  let s = name.toLowerCase().trim();
  s = s.replace(/manchester city|man city/g, 'mancity');
  s = s.replace(/manchester united|man utd|manchester utd/g, 'manutd');
  s = s.replace(/nottingham forest|nottm forest/g, 'nottmforest');
  s = s.replace(/tottenham hotspur|tottenham/g, 'tottenham');
  s = s.replace(/brighton and hove albion|brighton & hove albion|brighton/g, 'brighton');
  s = s.replace(/west ham united|west ham/g, 'westham');
  s = s.replace(/sheffield united|sheffield utd/g, 'sheffieldutd');
  s = s.replace(/wolverhampton wanderers|wolves/g, 'wolves');
  s = s.replace(/paris saint-germain|psg/g, 'psg');
  s = s.replace(/bayern munich|bayern munchen|bayern/g, 'bayern');

  if (['mancity', 'manutd', 'nottmforest', 'westham', 'sheffieldutd', 'wolves', 'psg', 'bayern'].includes(s)) {
    return s;
  }

  s = s.replace(/\bfc\b|\butd\b|\bunited\b|\bcity\b|\btown\b|\brover\b|\brovers\b|\balbion\b|\bathletic\b|\bwanderers\b|\bhotspur\b/g, '');
  return s.replace(/[^a-z0-9]/g, '').trim();
}

// Check if a fixture falls on a Saturday (6) or Sunday (0)
export function isWeekendMatch(commenceTime: string): boolean {
  if (!commenceTime) return false;
  const d = new Date(commenceTime);
  const day = d.getUTCDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

export async function fetchAllBet365Odds(forceRefresh = false): Promise<Record<string, TeamOdds>> {
  const now = Date.now();

  // 1. Check local storage cache if not forcing refresh
  if (!forceRefresh) {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.timestamp && now - parsed.timestamp < CACHE_TTL_MS && parsed.data) {
          memoryOddsCache = parsed.data;
          lastFetchTimestamp = parsed.timestamp;
          return parsed.data;
        }
      }
    } catch (e) {
      console.warn('Error reading odds cache from localStorage', e);
    }
  }

  // If memory cache is fresh within 30 mins, return it
  if (lastFetchTimestamp && now - lastFetchTimestamp < CACHE_TTL_MS && Object.keys(memoryOddsCache).length > 0) {
    return memoryOddsCache;
  }

  // 2. Fetch from The Odds API for major leagues
  const oddsMap: Record<string, TeamOdds> = {};
  const leaguesToFetch = ['pl', 'ch', 'laliga', 'bundesliga', 'seriea', 'ligue1'];

  try {
    for (const leagueId of leaguesToFetch) {
      const apiKeySport = LEAGUE_KEY_MAP[leagueId];
      if (!apiKeySport) continue;

      const url = `https://api.the-odds-api.com/v4/sports/${apiKeySport}/odds/?apiKey=${API_KEY}&regions=uk,eu&markets=h2h`;

      const response = await fetch(url);
      if (!response.ok) continue;

      const matches = await response.json();
      if (!Array.isArray(matches)) continue;

      // Filter STRICTLY for Saturday and Sunday matches
      const weekendMatches = matches.filter((m: any) => isWeekendMatch(m.commence_time));

      // Sort weekend matches by commence_time ascending so earliest upcoming weekend fixture is prioritized
      weekendMatches.sort((a: any, b: any) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime());

      for (const match of weekendMatches) {
        const homeTeam = match.home_team;
        const awayTeam = match.away_team;
        const commenceTime = match.commence_time;
        const dayOfWeek = new Date(commenceTime).getUTCDay() === 6 ? 'Sat' : 'Sun';

        // Locate Bet365 bookmaker or fallback to first available
        const bet365Bookie =
          match.bookmakers?.find((b: any) => b.key === 'bet365') || match.bookmakers?.[0];

        if (!bet365Bookie) continue;

        const h2hMarket = bet365Bookie.markets?.find((m: any) => m.key === 'h2h');
        if (!h2hMarket?.outcomes) continue;

        const homeOutcome = h2hMarket.outcomes.find((o: any) => o.name === homeTeam);
        const awayOutcome = h2hMarket.outcomes.find((o: any) => o.name === awayTeam);

        if (homeOutcome?.price) {
          const normHome = normalizeName(homeTeam);
          const lowerHome = homeTeam.toLowerCase();
          // Store only if not already set by an earlier upcoming weekend match
          if (!oddsMap[normHome]) {
            oddsMap[normHome] = {
              odds: homeOutcome.price,
              fractionalOdds: decimalToFractional(homeOutcome.price),
              bookmaker: bet365Bookie.title || 'Bet365',
              opponent: awayTeam,
              isHome: true,
              commenceTime,
              dayOfWeek,
            };
            oddsMap[lowerHome] = oddsMap[normHome];
          }
        }

        if (awayOutcome?.price) {
          const normAway = normalizeName(awayTeam);
          const lowerAway = awayTeam.toLowerCase();
          // Store only if not already set by an earlier upcoming weekend match
          if (!oddsMap[normAway]) {
            oddsMap[normAway] = {
              odds: awayOutcome.price,
              fractionalOdds: decimalToFractional(awayOutcome.price),
              bookmaker: bet365Bookie.title || 'Bet365',
              opponent: homeTeam,
              isHome: false,
              commenceTime,
              dayOfWeek,
            };
            oddsMap[lowerAway] = oddsMap[normAway];
          }
        }
      }
    }

    memoryOddsCache = oddsMap;
    lastFetchTimestamp = now;

    // Save to localStorage
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: now, data: oddsMap })
      );
    } catch (e) {
      console.warn('Failed to store odds in localStorage', e);
    }
  } catch (err) {
    console.error('Error fetching weekend odds from The Odds API', err);
  }

  return memoryOddsCache;
}

export function useSyndicateOdds() {
  const [oddsData, setOddsData] = useState<Record<string, TeamOdds>>(memoryOddsCache);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function loadOdds() {
      const data = await fetchAllBet365Odds();
      if (mounted) {
        setOddsData(data);
        setLoading(false);
      }
    }

    loadOdds();

    // Check & trigger refresh every 30 minutes
    const interval = setInterval(() => {
      loadOdds();
    }, CACHE_TTL_MS);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const getOddsForTeam = (teamName: string): TeamOdds | null => {
    if (!teamName) return null;
    const lowerName = teamName.toLowerCase();
    const norm = normalizeName(teamName);

    return oddsData[norm] || oddsData[lowerName] || null;
  };

  return { oddsData, getOddsForTeam, loading };
}
