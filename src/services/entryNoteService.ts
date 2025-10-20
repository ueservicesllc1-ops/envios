import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  getDocs, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { EntryNote } from '../types';
import { entryNoteAccountingService } from './entryNoteAccountingService';
import toast from 'react-hot-toast';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

// Generar número de nota automáticamente
const generateNoteNumber = async (): Promise<string> => {
  try {
    const q = query(collection(db, 'entryNotes'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return 'NE-001';
    }
    
    const lastNote = querySnapshot.docs[0].data();
    const lastNumber = lastNote.number || 'NE-000';
    const nextNumber = parseInt(lastNumber.split('-')[1]) + 1;
    
    return `NE-${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating note number:', error);
    return `NE-${Date.now()}`;
  }
};

export const entryNoteService = {
  // Crear nota de entrada
  async create(note: Omit<EntryNote, 'id' | 'number' | 'createdAt'>): Promise<string> {
    try {
      const now = new Date();
      const noteNumber = await generateNoteNumber();
      
      const docRef = await addDoc(collection(db, 'entryNotes'), {
        ...note,
        number: noteNumber,
        date: convertToTimestamp(note.date),
        createdAt: convertToTimestamp(now)
      });
      
      toast.success(`Nota de entrada ${noteNumber} creada exitosamente`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating entry note:', error);
      toast.error('Error al crear la nota de entrada');
      throw error;
    }
  },

  // Actualizar nota de entrada
  async update(id: string, note: Partial<EntryNote>): Promise<void> {
    try {
      const docRef = doc(db, 'entryNotes', id);
      const updateData: any = { ...note };
      if (note.date) {
        updateData.date = convertToTimestamp(note.date);
      }
      await updateDoc(docRef, updateData);
      
      toast.success('Nota de entrada actualizada exitosamente');
    } catch (error) {
      console.error('Error updating entry note:', error);
      toast.error('Error al actualizar la nota de entrada');
      throw error;
    }
  },

  // Obtener todas las notas de entrada
  async getAll(): Promise<EntryNote[]> {
    try {
      const q = query(collection(db, 'entryNotes'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: convertTimestamp(doc.data().date),
        createdAt: convertTimestamp(doc.data().createdAt)
      })) as EntryNote[];
    } catch (error) {
      console.error('Error getting entry notes:', error);
      toast.error('Error al cargar las notas de entrada');
      throw error;
    }
  },

  // Obtener nota por ID
  async getById(id: string): Promise<EntryNote | null> {
    try {
      const docRef = doc(db, 'entryNotes', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          date: convertTimestamp(data.date),
          createdAt: convertTimestamp(data.createdAt)
        } as EntryNote;
      }
      return null;
    } catch (error) {
      console.error('Error getting entry note:', error);
      toast.error('Error al obtener la nota de entrada');
      throw error;
    }
  }
};
