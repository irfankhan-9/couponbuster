const admin = require('firebase-admin');

// Initialize with the project ID provided by the user
admin.initializeApp({
    projectId: 'couponbusters-c4645'
});

const db = admin.firestore();

async function listLeagues() {
    try {
        console.log('Fetching leagues...');
        const snapshot = await db.collection('leagues').limit(20).get();

        if (snapshot.empty) {
            console.log('No leagues found.');
            return;
        }

        const leagues = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                owner_id: data.owner_id,
                enable_automatic_deadlines: data.enable_automatic_deadlines,
                market_manual_open: data.market_manual_open,
                pick_deadline_day: data.pick_deadline_day,
                pick_deadline_hour: data.pick_deadline_hour
            };
        });

        console.log(JSON.stringify(leagues, null, 2));
    } catch (error) {
        console.error('Error fetching leagues:', error);
    }
}

listLeagues();
