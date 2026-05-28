import { collection, doc, setDoc, updateDoc, onSnapshot, query, orderBy, limit, addDoc, getDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface LiveSession {
    id?: string;
    sellerId: string;
    sellerName: string;
    title: string;
    status: 'preparing' | 'active' | 'ended';
    featuredProductId: string | null;
    viewersCount: number;
    startedAt: any;
    endedAt?: any;
    products: any[]; // Vitrina products available in this live
}

export interface LiveChatMessage {
    id?: string;
    sessionId: string;
    userId: string;
    userName: string;
    text: string;
    type: 'message' | 'system' | 'purchase';
    createdAt: any;
}

export const liveSessionService = {
    // HOST: Create a new live session
    async createSession(sessionData: Omit<LiveSession, 'id'>) {
        // Find existing active session for this seller and end it
        const q = query(
            collection(db, 'liveSessions'), 
            where('sellerId', '==', sessionData.sellerId),
            where('status', 'in', ['preparing', 'active'])
        );
        const snapshot = await getDocs(q);
        snapshot.forEach(async (d) => {
            await updateDoc(doc(db, 'liveSessions', d.id), { status: 'ended', endedAt: serverTimestamp() });
        });

        // Create new
        const docRef = await addDoc(collection(db, 'liveSessions'), {
            ...sessionData,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    },

    // HOST: Update session status or featured product
    async updateSession(sessionId: string, data: Partial<LiveSession>) {
        await updateDoc(doc(db, 'liveSessions', sessionId), data);
    },

    // VIEWER: Listen to the active session (we'll just pick the first active one for demo, or a specific one)
    subscribeToActiveSession(callback: (session: LiveSession | null) => void) {
        const q = query(
            collection(db, 'liveSessions'),
            where('status', '==', 'active'),
            orderBy('startedAt', 'desc'),
            limit(1)
        );

        return onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                callback(null);
            } else {
                const doc = snapshot.docs[0];
                callback({ id: doc.id, ...doc.data() } as LiveSession);
            }
        });
    },

    // HOST/VIEWER: Listen to a specific session
    subscribeToSession(sessionId: string, callback: (session: LiveSession | null) => void) {
        return onSnapshot(doc(db, 'liveSessions', sessionId), (docSnap) => {
            if (docSnap.exists()) {
                callback({ id: docSnap.id, ...docSnap.data() } as LiveSession);
            } else {
                callback(null);
            }
        });
    },

    // CHAT: Send message
    async sendMessage(sessionId: string, userId: string, userName: string, text: string, type: 'message' | 'system' | 'purchase' = 'message') {
        await addDoc(collection(db, 'liveChat'), {
            sessionId,
            userId,
            userName,
            text,
            type,
            createdAt: serverTimestamp()
        });
    },

    // CHAT: Listen to messages
    subscribeToChat(sessionId: string, callback: (messages: LiveChatMessage[]) => void) {
        const q = query(
            collection(db, 'liveChat'),
            where('sessionId', '==', sessionId),
            orderBy('createdAt', 'asc'),
            limit(100)
        );

        return onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LiveChatMessage));
            callback(msgs);
        });
    }
};
