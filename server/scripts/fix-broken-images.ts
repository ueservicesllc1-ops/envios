
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { uploadImageToB2 } from '../services/b2Service';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

// Firebase config (Client SDK)
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCn5b43XaNvTg56ErYYazHaCLc8Ntbx2tw",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "envios-aaf94.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "envios-aaf94",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "envios-aaf94.firebasestorage.app",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "301889994673",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:301889994673:web:4bf140b88c095b54890790",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-QCM8ZVYE36"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixImages() {
    console.log('🚀 Starting image fix for Shopify URLs...');

    try {
        const perfumesRef = collection(db, 'perfumes');
        const querySnapshot = await getDocs(perfumesRef);

        console.log(`📦 Total perfumes to check: ${querySnapshot.size}`);

        let fixed = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches/sequence to avoid overwhelming
        const docs = querySnapshot.docs;

        for (let i = 0; i < docs.length; i++) {
            const docSnap = docs[i];
            const data = docSnap.data();
            const originalUrl = data.imageUrl || '';
            const brand = data.brand || 'Unknown';
            const name = data.name || 'Unknown';

            // Check if it's a Shopify URL
            if (originalUrl.includes('cdn.shopify.com') || originalUrl.includes('shopify')) {
                console.log(`[${i + 1}/${docs.length}] Processing: ${brand} - ${name}`);

                try {
                    // Upload to B2
                    // We need to fetch and pass buffer? No, uploadImageToB2 takes a URL and does the fetch itself.
                    const uploadResult = await uploadImageToB2(originalUrl, brand, name);
                    const newUrl = uploadResult.url;

                    // Update Firestore
                    await updateDoc(doc(db, 'perfumes', docSnap.id), {
                        imageUrl: newUrl,
                        updatedAt: Timestamp.now()
                    });

                    console.log(`   ✅ Fixed! New URL: ${newUrl}`);
                    fixed++;

                    // Delay to be nice to B2 and Shopify
                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (error: any) {
                    console.error(`   ❌ Failed to upload: ${error.message}`);
                    errors++;
                }
            } else {
                skipped++;
            }
        }

        console.log(`\n🎉 Image fix completed!`);
        console.log(`✅ Fixed: ${fixed}`);
        console.log(`⏭️  Skipped (already corrected or empty): ${skipped}`);
        console.log(`❌ Errors: ${errors}`);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

fixImages()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
