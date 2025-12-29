
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Firebase config
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

async function checkMissingImages() {
    console.log('🚀 Checking for products with missing images...');

    try {
        const perfumesRef = collection(db, 'perfumes');
        const querySnapshot = await getDocs(perfumesRef);

        console.log(`📦 Total perfumes found: ${querySnapshot.size}`);

        const missingImages: any[] = [];
        const nonB2Images: any[] = [];
        const brandsWithIssues: Record<string, number> = {};

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const brand = data.brand || 'Unknown';

            if (!data.imageUrl) {
                missingImages.push({ id: doc.id, name: data.name, brand });
                brandsWithIssues[brand] = (brandsWithIssues[brand] || 0) + 1;
            } else if (!data.imageUrl.startsWith('/api/b2/image')) {
                nonB2Images.push({ id: doc.id, name: data.name, brand, url: data.imageUrl });
                // Usually these are just Shopify URLs, which is fine if they work, 
                // but if the user says "didn't pick up photos", maybe they are broken.
            }
        });

        console.log(`\n❌ Products with EMPTY imageUrl: ${missingImages.length}`);
        if (missingImages.length > 0) {
            console.log('Sample of products with empty images:');
            missingImages.slice(0, 5).forEach(p => console.log(` - [${p.brand}] ${p.name}`));

            console.log('\nBrands with empty images count:');
            console.table(brandsWithIssues);
        }

        console.log(`\n⚠️ Products with non-B2 imageUrl (e.g. Shopify direct): ${nonB2Images.length}`);

        // Search for "bell" in name or brand
        const searchTerms = ['bell', 'berl', 'bhar'];
        const targetProducts = nonB2Images.filter(p => {
            const text = (p.brand + ' ' + p.name).toLowerCase();
            return searchTerms.some(term => text.includes(term));
        });

        if (targetProducts.length > 0) {
            console.log(`\nFound ${targetProducts.length} products matching search terms in name/brand:`);
            targetProducts.forEach(p => console.log(` - [${p.brand}] ${p.name}\n   URL: ${p.url}`));
        } else {
            console.log('\nNo products found matching search terms.');
        }

    } catch (error) {
        console.error('❌ Error checking images:', error);
    }
}

checkMissingImages()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
