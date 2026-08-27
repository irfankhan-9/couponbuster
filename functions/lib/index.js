"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeAdminTitleForUser = exports.revokeAdminTitle = exports.grantAdminTitle = exports.deleteAdminTitle = exports.updateAdminTitle = exports.createAdminTitle = exports.initializeLeagueChampions = exports.recalculateAllRankings = exports.onPointsUpdate = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
// Rank titles mapping
const RANK_TITLES = {
    0: 'crown_champion', // #1
    1: 'silver_sultan', // #2
    2: 'bronze_boss' // #3
};
// Title metadata for each rank position
const TITLE_META = {
    0: { type: 'league_champion', rank_label: '#1', badge_variant: 'crown_champion' },
    1: { type: 'league_runner_up', rank_label: '#2', badge_variant: 'silver_sultan' },
    2: { type: 'league_third', rank_label: '#3', badge_variant: 'bronze_boss' }
};
/**
 * Build (or refresh) the EarnedTitle record for a specific league+rank placement.
 * Returns the EarnedTitle object; same id is reused so users don't accumulate dupes.
 * NEW: tags the title as auto_current_season + is_temporary so it can be revoked
 * automatically when the user drops out of the top 3.
 */
function buildEarnedTitle(leagueId, leagueName, rankIndex, points) {
    const meta = TITLE_META[rankIndex];
    const id = `${leagueId}_${meta.badge_variant}`;
    return {
        id,
        type: meta.type,
        source_id: leagueId,
        source_name: leagueName,
        rank_label: meta.rank_label,
        earned_at: new Date().toISOString(),
        badge_variant: meta.badge_variant,
        points_at_earn: points,
        category: 'auto_current_season',
        is_temporary: true
    };
}
/**
 * Ensure the caller is a global admin. Looks up the user doc and verifies role.
 */
async function ensureGlobalAdmin(context) {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }
    const callerUid = context.auth.uid;
    const callerDoc = await db.collection('users').doc(callerUid).get();
    const role = callerDoc.exists ? (_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role : null;
    if (role !== 'global_admin') {
        throw new functions.https.HttpsError('permission-denied', 'Global admin role required.');
    }
    return callerUid;
}
/**
 * Cloud Function: onPointsUpdate
 *
 * Triggered when a member's points are updated.
 * Automatically recalculates league rankings and assigns/removes titles.
 *
 * Reliability behaviors:
 *  - Tag newly-issued titles as category='auto_current_season' + is_temporary=true.
 *  - Sweep away any auto_current_season EarnedTitle whose user has been
 *    displaced from the top 3, so titles only stick while the user actually
 *    holds the spot. Admin-historical titles are NOT touched.
 */
exports.onPointsUpdate = functions.firestore
    .document('members/{memberId}')
    .onWrite(async (change, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const memberId = context.params.memberId;
    const before = change.before.data();
    const after = change.after.data();
    // Only process if points actually changed (not on delete or no-op updates)
    if (!after) {
        // Member was deleted
        return null;
    }
    // Skip if points haven't changed
    if ((before === null || before === void 0 ? void 0 : before.points) === (after === null || after === void 0 ? void 0 : after.points)) {
        return null;
    }
    const leagueId = after === null || after === void 0 ? void 0 : after.league_id;
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
            if (b.points !== a.points)
                return b.points - a.points;
            return b.adjustment_points - a.adjustment_points;
        });
        // 3. Get league info
        const leagueDoc = await db.collection('leagues').doc(leagueId).get();
        const leagueName = leagueDoc.exists ? ((_a = leagueDoc.data()) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown League' : 'Unknown League';
        // 4. Get user info for top 3
        const top3UserIds = sortedMembers.slice(0, 3).map(m => m.user_id).filter(Boolean);
        const usersSnapshot = await db
            .collection('users')
            .where(admin.firestore.FieldPath.documentId(), 'in', top3UserIds)
            .get();
        const userNames = {};
        usersSnapshot.docs.forEach(doc => {
            var _a;
            userNames[doc.id] = ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.display_name) || 'Unknown';
        });
        // 5. Update league_champions collection
        const championData = {
            league_id: leagueId,
            league_name: leagueName,
            champion_user_id: ((_b = sortedMembers[0]) === null || _b === void 0 ? void 0 : _b.user_id) || null,
            champion_name: userNames[(_c = sortedMembers[0]) === null || _c === void 0 ? void 0 : _c.user_id] || 'TBD',
            points: ((_d = sortedMembers[0]) === null || _d === void 0 ? void 0 : _d.points) || 0,
            wins: ((_e = sortedMembers[0]) === null || _e === void 0 ? void 0 : _e.wins) || 0,
            second_user_id: ((_f = sortedMembers[1]) === null || _f === void 0 ? void 0 : _f.user_id) || null,
            second_name: userNames[(_g = sortedMembers[1]) === null || _g === void 0 ? void 0 : _g.user_id] || 'TBD',
            second_points: ((_h = sortedMembers[1]) === null || _h === void 0 ? void 0 : _h.points) || 0,
            third_user_id: ((_j = sortedMembers[2]) === null || _j === void 0 ? void 0 : _j.user_id) || null,
            third_name: userNames[(_k = sortedMembers[2]) === null || _k === void 0 ? void 0 : _k.user_id] || 'TBD',
            third_points: ((_l = sortedMembers[2]) === null || _l === void 0 ? void 0 : _l.points) || 0,
            updated_at: new Date().toISOString()
        };
        await db.collection('league_champions').doc(leagueId).set(championData);
        // 6. Update user titles (single rank_title kept for backward compatibility,
        //    plus the multi-title EarnedTitle catalogue).
        const batch = db.batch();
        // 6a. Clear any user's single rank_title/league_champion_of for this league
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
        // 6b. Assign top-3 rank_title (legacy field) + EarnedTitle records.
        const currentTop3 = new Set(top3UserIds);
        for (let i = 0; i < sortedMembers.length && i < 3; i++) {
            const member = sortedMembers[i];
            if (member === null || member === void 0 ? void 0 : member.user_id) {
                const userRef = db.collection('users').doc(member.user_id);
                batch.update(userRef, {
                    rank_title: RANK_TITLES[i],
                    league_champion_of: leagueId
                });
                // Append this league's earned title to the user's earned_titles array.
                // Use arrayUnion so we never duplicate the same id; the timestamp updates
                // each time it changes hands, which is fine for display purposes.
                const earned = buildEarnedTitle(leagueId, leagueName, i, member.points || 0);
                batch.update(userRef, {
                    earned_titles: admin.firestore.FieldValue.arrayUnion(earned)
                });
            }
        }
        await batch.commit();
        // 6c. Revoke auto_current_season titles from users who have dropped out of
        //     the top 3 in this league. ONLY auto_current_season entries are
        //     affected — admin_historical titles are permanent.
        await revokeDisplacedTitles(leagueId, currentTop3, admin.firestore.FieldValue);
        console.log(`Updated rankings for league ${leagueId}: Champion is ${championData.champion_name}`);
        return null;
    }
    catch (error) {
        console.error('Error in onPointsUpdate:', error);
        throw error;
    }
});
/**
 * Sweep users whose earned_titles array contains an auto_current_season title
 * for this league but who are no longer in the top 3. Remove that entry from
 * their earned_titles array, and clear displayed_title_id / pinned_title_ids
 * if any referenced the lost title.
 *
 * This is the core "instant revocation" behavior — titles are only kept
 * while the user actually holds the rank.
 */
async function revokeDisplacedTitles(leagueId, currentTop3, fv) {
    var _a, _b;
    // Find users whose earned_titles contains any auto_current_season entry
    // for this league. The straightforward field-equals query is:
    //   users where earned_titles contains { source_id: leagueId, category: 'auto_current_season' }
    // Firestore's array-contains on a complex object requires a precise equality,
    // so we use a simpler approach: scan users in this league via the legacy
    // members-indexed rank_title / league_champion_of fields, plus any user who
    // held auto_current_season titles for this league.
    const candidates = new Map();
    // 1. Anyone currently listed as champion of this league (the legacy
    //    league_champion_of field) — even if they didn't make the new top 3,
    //    they may still have an auto_current_season title entry.
    const legacyHolders = await db
        .collection('users')
        .where('league_champion_of', '==', leagueId)
        .get();
    legacyHolders.docs.forEach(d => candidates.set(d.id, d.ref));
    // 2. Anyone whose rank_title is set (in any league). For each, check whether
    //    they have an auto_current_season EarnedTitle for THIS league. This catches
    //    users who already had their legacy fields cleared but the title record
    //    still lingered.
    const rankTitleHolders = await db
        .collection('users')
        .where('rank_title', 'in', ['crown_champion', 'silver_sultan', 'bronze_boss'])
        .get();
    rankTitleHolders.docs.forEach(d => candidates.set(d.id, d.ref));
    if (candidates.size === 0)
        return;
    // For each candidate, inspect their earned_titles and decide what to revoke.
    const userRefs = Array.from(candidates.values());
    // Firestore 'in' query supports up to 30 ids per call
    const chunks = [];
    for (let i = 0; i < userRefs.length; i += 30)
        chunks.push(userRefs.slice(i, i + 30));
    for (const chunk of chunks) {
        const snapshot = await db.getAll(...chunk);
        const batch = db.batch();
        let batchHasWrites = false;
        for (const docSnap of snapshot) {
            if (!docSnap.exists)
                continue;
            const data = (_a = docSnap.data()) !== null && _a !== void 0 ? _a : {};
            const titles = Array.isArray(data.earned_titles) ? data.earned_titles : [];
            const toRevoke = titles.filter((t) => t && t.category === 'auto_current_season' && t.source_id === leagueId);
            if (toRevoke.length === 0)
                continue;
            const stillInTop3 = currentTop3.has(docSnap.id);
            // If user is no longer in top 3, remove the titles.
            const revokeIds = new Set(toRevoke.map((t) => t.id));
            const newEarnedTitles = stillInTop3
                ? titles
                : titles.filter((t) => !revokeIds.has(t.id));
            const update = {
                earned_titles: newEarnedTitles
            };
            // If the displayed title was one of the revoked ones, clear it.
            const displayedId = (_b = data.displayed_title_id) !== null && _b !== void 0 ? _b : null;
            if (!stillInTop3 && displayedId && revokeIds.has(displayedId)) {
                update.displayed_title_id = null;
            }
            // Strip any revoked ids from pinned_title_ids.
            const pinned = Array.isArray(data.pinned_title_ids) ? data.pinned_title_ids : [];
            if (!stillInTop3 && pinned.some((id) => revokeIds.has(id))) {
                update.pinned_title_ids = pinned.filter((id) => !revokeIds.has(id));
            }
            batch.update(docSnap.ref, update);
            batchHasWrites = true;
        }
        if (batchHasWrites) {
            await batch.commit();
        }
    }
}
/**
 * Cloud Function: recalculateAllRankings
 *
 * Scheduled function to recalculate all league rankings.
 * Runs daily to ensure data consistency.
 */
exports.recalculateAllRankings = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
            if (membersSnapshot.empty)
                continue;
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
            const userNames = {};
            usersSnapshot.docs.forEach(doc => {
                var _a;
                userNames[doc.id] = ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.display_name) || 'Unknown';
            });
            // Update champions doc
            await db.collection('league_champions').doc(leagueId).set({
                league_id: leagueId,
                league_name: leagueDoc.data().name || 'Unknown',
                champion_user_id: ((_a = sortedMembers[0]) === null || _a === void 0 ? void 0 : _a.user_id) || null,
                champion_name: userNames[(_b = sortedMembers[0]) === null || _b === void 0 ? void 0 : _b.user_id] || 'TBD',
                points: ((_c = sortedMembers[0]) === null || _c === void 0 ? void 0 : _c.points) || 0,
                wins: ((_d = sortedMembers[0]) === null || _d === void 0 ? void 0 : _d.wins) || 0,
                second_user_id: ((_e = sortedMembers[1]) === null || _e === void 0 ? void 0 : _e.user_id) || null,
                second_name: userNames[(_f = sortedMembers[1]) === null || _f === void 0 ? void 0 : _f.user_id] || 'TBD',
                second_points: ((_g = sortedMembers[1]) === null || _g === void 0 ? void 0 : _g.points) || 0,
                third_user_id: ((_h = sortedMembers[2]) === null || _h === void 0 ? void 0 : _h.user_id) || null,
                third_name: userNames[(_j = sortedMembers[2]) === null || _j === void 0 ? void 0 : _j.user_id] || 'TBD',
                third_points: ((_k = sortedMembers[2]) === null || _k === void 0 ? void 0 : _k.points) || 0,
                updated_at: new Date().toISOString()
            });
        }
        console.log('Daily ranking recalculation completed');
        return null;
    }
    catch (error) {
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
exports.initializeLeagueChampions = functions.firestore
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
/**
 * Cloud Function: createAdminTitle
 *
 * Admin creates a new title template (e.g. "Plumbing League Champion").
 * Auth: global-admin only.
 */
exports.createAdminTitle = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
    await ensureGlobalAdmin(context);
    const label = ((_a = data === null || data === void 0 ? void 0 : data.label) !== null && _a !== void 0 ? _a : '').toString().trim();
    const rankLabel = ((_b = data === null || data === void 0 ? void 0 : data.rank_label) !== null && _b !== void 0 ? _b : '#1').toString();
    const emoji = ((_c = data === null || data === void 0 ? void 0 : data.emoji) !== null && _c !== void 0 ? _c : '🏆').toString();
    if (!label) {
        throw new functions.https.HttpsError('invalid-argument', 'Title label is required.');
    }
    const ref = db.collection('admin_titles').doc();
    const payload = {
        id: ref.id,
        label,
        rank_label: rankLabel,
        emoji,
        created_at: new Date().toISOString(),
        created_by: context.auth.uid
    };
    await ref.set(payload);
    return payload;
});
/**
 * Cloud Function: updateAdminTitle
 *
 * Admin edits an existing title template's label/rank/emoji.
 */
exports.updateAdminTitle = functions.https.onCall(async (data, context) => {
    var _a;
    await ensureGlobalAdmin(context);
    const id = ((_a = data === null || data === void 0 ? void 0 : data.id) !== null && _a !== void 0 ? _a : '').toString();
    if (!id)
        throw new functions.https.HttpsError('invalid-argument', 'Title id required.');
    const updates = {};
    if (typeof (data === null || data === void 0 ? void 0 : data.label) === 'string')
        updates.label = data.label.trim();
    if (typeof (data === null || data === void 0 ? void 0 : data.rank_label) === 'string')
        updates.rank_label = data.rank_label;
    if (typeof (data === null || data === void 0 ? void 0 : data.emoji) === 'string')
        updates.emoji = data.emoji;
    if (Object.keys(updates).length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'No updates provided.');
    }
    await db.collection('admin_titles').doc(id).update(updates);
    return Object.assign({ id }, updates);
});
/**
 * Cloud Function: deleteAdminTitle
 *
 * Admin deletes a title template. Existing EarnedTitle entries that were
 * created from this template will remain on user profiles (admin grants
 * are permanent), but no new grants can be made.
 */
exports.deleteAdminTitle = functions.https.onCall(async (data, context) => {
    var _a;
    await ensureGlobalAdmin(context);
    const id = ((_a = data === null || data === void 0 ? void 0 : data.id) !== null && _a !== void 0 ? _a : '').toString();
    if (!id)
        throw new functions.https.HttpsError('invalid-argument', 'Title id required.');
    await db.collection('admin_titles').doc(id).delete();
    return { id };
});
/**
 * Cloud Function: grantAdminTitle
 *
 * Admin grants an admin-defined title to a user. The grant is permanent
 * (admin_historical category, is_temporary=false). The user receives a new
 * EarnedTitle entry appended to their earned_titles array.
 *
 * Calling grant twice for the same (userId, adminTitleId) creates two
 * EarnedTitle entries, which the UI renders as a multi-emoji badge
 * (e.g. Carl 🏆🏆).
 */
exports.grantAdminTitle = functions.https.onCall(async (data, context) => {
    var _a, _b;
    await ensureGlobalAdmin(context);
    const userId = ((_a = data === null || data === void 0 ? void 0 : data.userId) !== null && _a !== void 0 ? _a : '').toString();
    const adminTitleId = ((_b = data === null || data === void 0 ? void 0 : data.adminTitleId) !== null && _b !== void 0 ? _b : '').toString();
    if (!userId || !adminTitleId) {
        throw new functions.https.HttpsError('invalid-argument', 'userId and adminTitleId required.');
    }
    const titleSnap = await db.collection('admin_titles').doc(adminTitleId).get();
    if (!titleSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Admin title definition not found.');
    }
    const def = titleSnap.data();
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Target user not found.');
    }
    const earnedId = `${userId}_${adminTitleId}_${Date.now()}`;
    const earned = {
        id: earnedId,
        type: 'admin_custom',
        source_id: adminTitleId,
        source_name: def.label,
        rank_label: def.rank_label,
        earned_at: new Date().toISOString(),
        badge_variant: 'crown_champion',
        points_at_earn: 0,
        category: 'admin_historical',
        is_temporary: false,
        custom_label: def.label,
        custom_emoji: def.emoji
    };
    await userRef.update({
        earned_titles: admin.firestore.FieldValue.arrayUnion(earned)
    });
    return { ok: true, earnedId };
});
/**
 * Cloud Function: revokeAdminTitle
 *
 * Admin revokes a previously-granted admin title from a user. Removes the
 * matching EarnedTitle entry from the user's earned_titles array, and clears
 * displayed_title_id / pinned_title_ids if they referenced it.
 */
exports.revokeAdminTitle = functions.https.onCall(async (data, context) => {
    var _a, _b;
    await ensureGlobalAdmin(context);
    const userId = ((_a = data === null || data === void 0 ? void 0 : data.userId) !== null && _a !== void 0 ? _a : '').toString();
    const earnedTitleId = ((_b = data === null || data === void 0 ? void 0 : data.earnedTitleId) !== null && _b !== void 0 ? _b : '').toString();
    if (!userId || !earnedTitleId) {
        throw new functions.https.HttpsError('invalid-argument', 'userId and earnedTitleId required.');
    }
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found.');
    }
    const data2 = userSnap.data() || {};
    const titles = Array.isArray(data2.earned_titles) ? data2.earned_titles : [];
    const target = titles.find((t) => t && t.id === earnedTitleId);
    if (!target) {
        throw new functions.https.HttpsError('not-found', 'Title entry not found on user.');
    }
    const newTitles = titles.filter((t) => t && t.id !== earnedTitleId);
    const updates = { earned_titles: newTitles };
    if (data2.displayed_title_id === earnedTitleId) {
        updates.displayed_title_id = null;
    }
    const pinned = Array.isArray(data2.pinned_title_ids) ? data2.pinned_title_ids : [];
    if (pinned.includes(earnedTitleId)) {
        updates.pinned_title_ids = pinned.filter((id) => id !== earnedTitleId);
    }
    await userRef.update(updates);
    return { ok: true, revokedId: earnedTitleId };
});
/**
 * Cloud Function: revokeAdminTitleForUser
 *
 * Admin revokes ALL instances of a given adminTitleId from a user (e.g. revoke
 * both Plumbing League Champion wins). Useful when the admin wants to clean
 * up duplicates or undo a previously-granted definition.
 */
exports.revokeAdminTitleForUser = functions.https.onCall(async (data, context) => {
    var _a, _b;
    await ensureGlobalAdmin(context);
    const userId = ((_a = data === null || data === void 0 ? void 0 : data.userId) !== null && _a !== void 0 ? _a : '').toString();
    const adminTitleId = ((_b = data === null || data === void 0 ? void 0 : data.adminTitleId) !== null && _b !== void 0 ? _b : '').toString();
    if (!userId || !adminTitleId) {
        throw new functions.https.HttpsError('invalid-argument', 'userId and adminTitleId required.');
    }
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found.');
    }
    const data2 = userSnap.data() || {};
    const titles = Array.isArray(data2.earned_titles) ? data2.earned_titles : [];
    const matchedIds = new Set(titles.filter((t) => t && t.source_id === adminTitleId).map((t) => t.id));
    if (matchedIds.size === 0) {
        return { ok: true, revokedCount: 0 };
    }
    const newTitles = titles.filter((t) => !matchedIds.has(t.id));
    const updates = { earned_titles: newTitles };
    if (data2.displayed_title_id && matchedIds.has(data2.displayed_title_id)) {
        updates.displayed_title_id = null;
    }
    const pinned = Array.isArray(data2.pinned_title_ids) ? data2.pinned_title_ids : [];
    if (pinned.some((id) => matchedIds.has(id))) {
        updates.pinned_title_ids = pinned.filter((id) => !matchedIds.has(id));
    }
    await userRef.update(updates);
    return { ok: true, revokedCount: matchedIds.size };
});
//# sourceMappingURL=index.js.map