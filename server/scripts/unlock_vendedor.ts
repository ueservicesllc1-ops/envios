import { adminDb } from '../services/firebaseAdmin';

async function unlock() {
    await adminDb().collection('pos_staff').doc('vendedor').update({
        failedAttempts: 0,
        lockedUntil: null
    });
    console.log(">>> VENDEDOR UNLOCKED SUCCESSFULLY in Firestore! <<<");
    process.exit(0);
}

unlock().catch(err => {
    console.error("Error unlocking:", err);
    process.exit(1);
});
