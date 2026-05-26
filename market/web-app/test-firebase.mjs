import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCn5b43XaNvTg56ErYYazHaCLc8Ntbx2tw",
  authDomain: "envios-aaf94.firebaseapp.com",
  projectId: "envios-aaf94",
  storageBucket: "envios-aaf94.firebasestorage.app",
  messagingSenderId: "301889994673",
  appId: "1:301889994673:web:4bf140b88c095b54890790"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

import { query, where } from 'firebase/firestore';

async function test() {
  try {
    const q = query(collection(db, 'products'), where('origin', '==', 'local'));
    const querySnapshot = await getDocs(q);
    const categories = new Set();
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.category) categories.add(data.category);
    });
    console.log(`Unique local categories:`, Array.from(categories));
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

test();
