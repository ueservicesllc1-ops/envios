import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { 
  Product, 
  InventoryItem, 
  EntryNote, 
  ExitNote
} from '../types';

// Utilidades para conversión de fechas
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

const convertToTimestamp = (date: Date) => Timestamp.fromDate(date);

// Servicios para Productos
export const productService = {
  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date();
    const docRef = await addDoc(collection(db, 'products'), {
      ...product,
      createdAt: convertToTimestamp(now),
      updatedAt: convertToTimestamp(now)
    });
    return docRef.id;
  },

  async update(id: string, product: Partial<Product>): Promise<void> {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      ...product,
      updatedAt: convertToTimestamp(new Date())
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'products', id));
  },

  async getById(id: string): Promise<Product | null> {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Product;
    }
    return null;
  },

  async getAll(): Promise<Product[]> {
    const querySnapshot = await getDocs(collection(db, 'products'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data().createdAt),
      updatedAt: convertTimestamp(doc.data().updatedAt)
    })) as Product[];
  }
};

// Servicios para Inventario
export const inventoryService = {
  async create(item: Omit<InventoryItem, 'id' | 'lastUpdated'>): Promise<string> {
    const now = new Date();
    const docRef = await addDoc(collection(db, 'inventory'), {
      ...item,
      lastUpdated: convertToTimestamp(now)
    });
    return docRef.id;
  },

  async update(id: string, item: Partial<InventoryItem>): Promise<void> {
    const docRef = doc(db, 'inventory', id);
    await updateDoc(docRef, {
      ...item,
      lastUpdated: convertToTimestamp(new Date())
    });
  },

  async getByProductId(productId: string): Promise<InventoryItem | null> {
    const q = query(collection(db, 'inventory'), where('productId', '==', productId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        lastUpdated: convertTimestamp(data.lastUpdated)
      } as InventoryItem;
    }
    return null;
  },

  async getAll(): Promise<InventoryItem[]> {
    const querySnapshot = await getDocs(collection(db, 'inventory'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastUpdated: convertTimestamp(doc.data().lastUpdated)
    })) as InventoryItem[];
  }
};

// Servicios para Notas de Entrada
export const entryNoteService = {
  async create(note: Omit<EntryNote, 'id' | 'createdAt'>): Promise<string> {
    const now = new Date();
    const docRef = await addDoc(collection(db, 'entryNotes'), {
      ...note,
      date: convertToTimestamp(note.date),
      createdAt: convertToTimestamp(now)
    });
    return docRef.id;
  },

  async update(id: string, note: Partial<EntryNote>): Promise<void> {
    const docRef = doc(db, 'entryNotes', id);
    const updateData: any = { ...note };
    if (note.date) {
      updateData.date = convertToTimestamp(note.date);
    }
    await updateDoc(docRef, updateData);
  },

  async getAll(): Promise<EntryNote[]> {
    const q = query(collection(db, 'entryNotes'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: convertTimestamp(doc.data().date),
      createdAt: convertTimestamp(doc.data().createdAt)
    })) as EntryNote[];
  }
};

// Servicios para Notas de Salida
export const exitNoteService = {
  async create(note: Omit<ExitNote, 'id' | 'createdAt'>): Promise<string> {
    const now = new Date();
    const docRef = await addDoc(collection(db, 'exitNotes'), {
      ...note,
      date: convertToTimestamp(note.date),
      createdAt: convertToTimestamp(now)
    });
    return docRef.id;
  },

  async update(id: string, note: Partial<ExitNote>): Promise<void> {
    const docRef = doc(db, 'exitNotes', id);
    const updateData: any = { ...note };
    if (note.date) {
      updateData.date = convertToTimestamp(note.date);
    }
    await updateDoc(docRef, updateData);
  },

  async getAll(): Promise<ExitNote[]> {
    const q = query(collection(db, 'exitNotes'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: convertTimestamp(doc.data().date),
      createdAt: convertTimestamp(doc.data().createdAt)
    })) as ExitNote[];
  }
};

// Servicios para Storage (imágenes)
export const storageService = {
  async uploadImage(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  },

  async deleteImage(url: string): Promise<void> {
    const imageRef = ref(storage, url);
    await deleteObject(imageRef);
  }
};
