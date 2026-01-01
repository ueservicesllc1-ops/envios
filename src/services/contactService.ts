import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    updateDoc,
    doc,
    deleteDoc,
    where
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface ContactMessage {
    id: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    createdAt: Date;
    read: boolean;
}

const COLLECTION_NAME = 'contact_messages';

export const contactService = {
    async createMessage(data: Omit<ContactMessage, 'id' | 'createdAt' | 'read'>): Promise<string> {
        try {
            const docRef = await addDoc(collection(db, COLLECTION_NAME), {
                ...data,
                createdAt: new Date(),
                read: false
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating contact message:', error);
            throw error;
        }
    },

    async getAllMessages(): Promise<ContactMessage[]> {
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            })) as ContactMessage[];
        } catch (error) {
            console.error('Error getting contact messages:', error);
            throw error;
        }
    },

    async markAsRead(id: string): Promise<void> {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, { read: true });
        } catch (error) {
            console.error('Error marking message as read:', error);
            throw error;
        }
    },

    async deleteMessage(id: string): Promise<void> {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    },

    async getUnreadCount(): Promise<number> {
        try {
            const q = query(collection(db, COLLECTION_NAME), where('read', '==', false));
            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }
};
