const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Leer el .env manualmente para evitar problemas con dotenv en una sola línea
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT='({.*})'/);

if (!match) {
  console.error('FIREBASE_SERVICE_ACCOUNT not found in .env');
  process.exit(1);
}

const serviceAccount = JSON.parse(match[1]);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findNote() {
  const number = 'NS-1774311832332';
  console.log(`Searching for note: ${number}`);
  
  const snapshot = await db.collection('exitNotes').where('number', '==', number).get();
  
  if (snapshot.empty) {
    console.log('Note NOT found in Firestore');
    
    // Buscar todas las notas para ver si hay algo parecido
    console.log('Searching for notes with similar numbers...');
    const allSnapshot = await db.collection('exitNotes').limit(10).get();
    allSnapshot.forEach(doc => {
      console.log(`Found note: ${doc.data().number}`);
    });
  } else {
    snapshot.forEach(doc => {
      console.log('Note FOUND:');
      console.log(JSON.stringify({id: doc.id, ...doc.data()}, null, 2));
    });
  }
}

findNote().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
