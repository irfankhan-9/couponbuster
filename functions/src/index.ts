import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();

// Rank titles mapping
const RANK_TITLES: Record<number, string | null> = {
  0: 'crown_champion',   // #1
  1: 'silver_sultan',    // #2
  2: 'bronze_boss'       // #3
};

/**
 * Cloud Function: onPointsUpdate
 *
 * Triggered when a member's points are updated.
 * Automatically recalculates league rankings and assigns/removes titles.
 */
export const onPointsUpdate = functions.firestore
  .document('members/{memberId}')
  .onWrite(async (change, context) => {
    const memberId = context.params.memberId;
    const before = change.before.data();
    const after = change.after.data();

    // Only process if points actually changed (not on delete or no-op updates)
    if (!after) {
      // Member was deleted, clean up if needed
      return null;
    }

    // Skip if points haven't changed
    if (before?.points === after?.points) {
      return null;
    }

    const leagueId = after?.league_id;
    if (!leagueId) {
      console.log('No league_id found for member:', memberId);
      return null;
    }

    try {
      // 1. Get all approved members of this league
      const membersSnapshot = await db
        .collection('members')
        .where('league_id', '==', leagueId)
        .where('status', '==', 'approved')
        .get();

      if (membersSnapshot.empty) {
        console.log('No approved members in league:', leagueId);
        return null;
      }

      // 2. Sort members by points (desc) then adjustment_points (desc)
      const sortedMembers = membersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          user_id: doc.data().user_id,
          points: doc.data().points || 0,
          wins: doc.data().wins || 0,
          adjustment_points: doc.data().adjustment_points || 0
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.adjustment_points - a.adjustment_points;
        });

      // 3. Get league info
      const leagueDoc = await db.collection('leagues').doc(leagueId).get();
      const leagueName = leagueDoc.exists ? leagueDoc.data()?.name || 'Unknown League' : 'Unknown League';

      // 4. Get user info for top 3
      const top3UserIds = sortedMembers.slice(0, 3).map(m => m.user_id).filter(Boolean);
      const usersSnapshot = await db
        .collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', top3UserIds)
        .get();

      const userNames: Record<string, string> = {};
      usersSnapshot.docs.forEach(doc => {
        userNames[doc.id] = doc.data()?.display_name || 'Unknown';
      });

      // 5. Update league_champions collection
      const championData = {
        league_id: leagueId,
        league_name: leagueName,
        champion_user_id: sortedMembers[0]?.user_id || null,
        champion_name: userNames[sortedMembers[0]?.user_id] || 'TBD',
        points: sortedMembers[0]?.points || 0,
        wins: sortedMembers[0]?.wins || 0,
        second_user_id: sortedMembers[1]?.user_id || null,
        second_name: userNames[sortedMembers[1]?.user_id] || 'TBD',
        second_points: sortedMembers[1]?.points || 0,
        third_user_id: sortedMembers[2]?.user_id || null,
        third_name: userNames[sortedMembers[2]?.user_id] || 'TBD',
        third_points: sortedMembers[2]?.points || 0,
        updated_at: new Date().toISOString()
      };

      await db.collection('league_champions').doc(leagueId).set(championData);

      // 6. Update user titles
      const batch = db.batch();

      // First, clear all existing titles for this league (we'll reassign)
      // Get all users who had league_champion_of set to this league
      const previousChampions = await db
        .collection('users')
        .where('league_champion_of', '==', leagueId)
        .get();

      previousChampions.docs.forEach(doc => {
        batch.update(doc.ref, {
          rank_title: null,
          league_champion_of: null
        });
      });

      // Assign titles to new top 3
      for (let i = 0; i < sortedMembers.length && i < 3; i++) {
        const member = sortedMembers[i];
        if (member?.user_id) {
          batch.update(db.collection('users').doc(member.user_id), {
            rank_title: RANK_TITLES[i],
            league_champion_of: leagueId
          });
        }
      }

      await batch.commit();

      console.log(`Updated rankings for league ${leagueId}: Champion is ${championData.champion_name}`);
      return null;

    } catch (error) {
      console.error('Error in onPointsUpdate:', error);
      throw error;
    }
  });

/**
 * Cloud Function: recalculateAllRankings
 *
 * Scheduled function to recalculate all league rankings.
 * Runs daily to ensure data consistency.
 */
export const recalculateAllRankings = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    console.log('Starting daily ranking recalculation...');

    try {
      // Get all leagues
      const leaguesSnapshot = await db.collection('leagues').get();

      for (const leagueDoc of leaguesSnapshot.docs) {
        const leagueId = leagueDoc.id;

        // Get all approved members
        const membersSnapshot = await db
          .collection('members')
          .where('league_id', '==', leagueId)
          .where('status', '==', 'approved')
          .get();

        if (membersSnapshot.empty) continue;

        // Sort by points
        const sortedMembers = membersSnapshot.docs
          .map(doc => ({
            user_id: doc.data().user_id,
            points: doc.data().points || 0,
            wins: doc.data().wins || 0
          }))
          .sort((a, b) => b.points - a.points);

        // Get user names
        const userIds = sortedMembers.map(m => m.user_id).filter(Boolean);
        const usersSnapshot = await db
          .collection('users')
          .where(admin.firestore.FieldPath.documentId(), 'in', userIds.slice(0, 10))
          .get();

        const userNames: Record<string, string> = {};
        usersSnapshot.docs.forEach(doc => {
          userNames[doc.id] = doc.data()?.display_name || 'Unknown';
        });

        // Update champions doc
        await db.collection('league_champions').doc(leagueId).set({
          league_id: leagueId,
          league_name: leagueDoc.data().name || 'Unknown',
          champion_user_id: sortedMembers[0]?.user_id || null,
          champion_name: userNames[sortedMembers[0]?.user_id] || 'TBD',
          points: sortedMembers[0]?.points || 0,
          wins: sortedMembers[0]?.wins || 0,
          second_user_id: sortedMembers[1]?.user_id || null,
          second_name: userNames[sortedMembers[1]?.user_id] || 'TBD',
          second_points: sortedMembers[1]?.points || 0,
          third_user_id: sortedMembers[2]?.user_id || null,
          third_name: userNames[sortedMembers[2]?.user_id] || 'TBD',
          third_points: sortedMembers[2]?.points || 0,
          updated_at: new Date().toISOString()
        });
      }

      console.log('Daily ranking recalculation completed');
      return null;

    } catch (error) {
      console.error('Error in recalculateAllRankings:', error);
      throw error;
    }
  });

/**
 * Cloud Function: initializeLeagueChampions
 *
 * Triggered when a new league is created.
 * Initializes the league_champions document.
 */
export const initializeLeagueChampions = functions.firestore
  .document('leagues/{leagueId}')
  .onCreate(async (snap, context) => {
    const leagueId = context.params.leagueId;
    const leagueData = snap.data();

    await db.collection('league_champions').doc(leagueId).set({
      league_id: leagueId,
      league_name: leagueData.name || 'New League',
      champion_user_id: null,
      champion_name: 'TBD',
      points: 0,
      wins: 0,
      second_user_id: null,
      second_name: 'TBD',
      second_points: 0,
      third_user_id: null,
      third_name: 'TBD',
      third_points: 0,
      updated_at: new Date().toISOString()
    });

    console.log('Initialized champions for new league:', leagueId);
    return null;
  });
