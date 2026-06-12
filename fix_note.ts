import { db } from './src/firebase/config';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

async function fixNote() {
  try {
    console.log('Buscando nota...');
    const q = query(collection(db, 'exitNotes'), where('number', '==', 'NS-1779494285595'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('Nota no encontrada');
      return;
    }

    const noteDoc = snapshot.docs[0];
    console.log('Nota encontrada, revirtiendo estado a delivered...');
    
    await updateDoc(doc(db, 'exitNotes', noteDoc.id), {
      status: 'delivered'
    });
    
    console.log('Estado revertido con éxito!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixNote();
