import { collection, doc, addDoc, setDoc, getDoc, updateDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Conversation {
    id?: string;
    participants?: string[];
    participantNames?: Record<string, string>;
    participantAvatars?: Record<string, string>;
    lastMessage?: string;
    lastMessageAt?: any;
    updatedAt?: any;
    
    // Old fields expected by AdminChats.tsx
    userId?: string;
    userName?: string;
    userEmail?: string;
    unreadCount?: number;
    lastMessageTime?: any;
    status?: string;
}

export interface ChatMessage {
    id?: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    text?: string;
    message?: string; // Old expected
    type?: 'text' | 'product_card' | 'system_warning';
    productData?: any;
    createdAt?: any;
    timestamp?: any; // Old expected
    isAdmin?: boolean; // Old expected
    imageUrl?: string;
    imageFileName?: string;
}

// Anti-Leak RegExp
const BANNED_KEYWORDS = /whatsapp|wa\.me|telegram|transferencia|deposito|depósito|zelle|pichincha|guayaquil|produbanco|pacifico/i;
const PHONE_NUMBER_PATTERN = /\b\d{4}[\s-]?\d{3,4}\b|\b\d{7,10}\b/;

export const chatService = {
    checkAntiLeak(text: string): { isValid: boolean; reason?: string } {
        if (BANNED_KEYWORDS.test(text)) {
            return { isValid: false, reason: 'El mensaje contiene palabras no permitidas (referencias a pagos externos o redes sociales).' };
        }
        if (PHONE_NUMBER_PATTERN.test(text.replace(/\s/g, ''))) {
            return { isValid: false, reason: 'Por tu seguridad, no está permitido enviar números de teléfono.' };
        }
        return { isValid: true };
    },

    // Merged signature to support old calls (3 args) and new calls (4 args)
    async getOrCreateConversation(arg1: string, arg2: any, arg3?: any, arg4?: any): Promise<string> {
        // If it's the old call: (userId, userName, userEmail)
        if (typeof arg2 === 'string' && typeof arg3 === 'string' && arg4 === undefined) {
            const userId = arg1;
            const userName = arg2;
            const userEmail = arg3;
            
            const q = query(collection(db, 'conversations'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) return snapshot.docs[0].id;
            
            const newRef = await addDoc(collection(db, 'conversations'), {
                userId, userName, userEmail,
                participants: [userId],
                status: 'active',
                unreadCount: 0,
                lastMessage: 'Conversación iniciada',
                lastMessageTime: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return newRef.id;
        } 
        
        // New call: (currentUserId, currentUserData, targetUserId, targetUserData)
        const currentUserId = arg1;
        const currentUserData = arg2;
        const targetUserId = arg3;
        const targetUserData = arg4;

        const q = query(
            collection(db, 'conversations'), 
            where('participants', 'array-contains', currentUserId)
        );
        const snapshot = await getDocs(q);
        
        let existingId = null;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.participants && data.participants.includes(targetUserId)) {
                existingId = doc.id;
            }
        });

        if (existingId) return existingId;

        const newRef = await addDoc(collection(db, 'conversations'), {
            participants: [currentUserId, targetUserId],
            participantNames: {
                [currentUserId]: currentUserData.name,
                [targetUserId]: targetUserData.name
            },
            participantAvatars: {
                [currentUserId]: currentUserData.avatar,
                [targetUserId]: targetUserData.avatar
            },
            lastMessage: 'Conversación iniciada',
            lastMessageAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        return newRef.id;
    },

    // New signature for AdminChats.tsx
    async startConversation(userId: string, userName: string, userEmail: string): Promise<string> {
        return this.getOrCreateConversation(userId, userName, userEmail);
    },

    subscribeToInbox(userId: string, callback: (conversations: Conversation[]) => void) {
        const q = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', userId),
            orderBy('updatedAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
            callback(convos);
        });
    },

    // Expected by AdminChats.tsx
    subscribeToConversations(callback: (conversations: Conversation[]) => void) {
        const q = query(collection(db, 'conversations'), orderBy('updatedAt', 'desc'));
        return onSnapshot(q, (snapshot) => {
            const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
            callback(convos);
        });
    },

    subscribeToMessages(conversationId: string, callback: (messages: ChatMessage[]) => void) {
        const q = query(
            collection(db, 'chatMessages'),
            where('conversationId', '==', conversationId),
            orderBy('createdAt', 'asc') // Note: Using createdAt or timestamp
        );

        return onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
            callback(msgs);
        });
    },

    // Supports both old and new calls by checking arguments
    async sendMessage(...args: any[]) {
        const conversationId = args[0];
        const senderId = args[1];
        const senderName = args[2];
        
        let text = '';
        let type = 'text';
        let productData = null;
        let isAdmin = false;
        let imageUrl = '';
        let imageFileName = '';

        // If old signature: (convId, senderId, senderName, senderEmail, message, isAdmin, imageUrl, fileName)
        if (args.length >= 6 && typeof args[5] === 'boolean') {
            text = args[4];
            isAdmin = args[5];
            imageUrl = args[6];
            imageFileName = args[7];
        } else {
            // New signature: (convId, senderId, senderName, text, type, productData)
            text = args[3];
            type = args[4] || 'text';
            productData = args[5];
        }

        // Anti-leak for text
        if (type === 'text' && !isAdmin) {
            const leakCheck = this.checkAntiLeak(text);
            if (!leakCheck.isValid) {
                text = `[MENSAJE BLOQUEADO] ${leakCheck.reason}`;
                type = 'system_warning';
            }
        }

        const msg: any = {
            conversationId,
            senderId,
            senderName,
            text: text,
            message: text, // Save in both to satisfy old/new
            type: type,
            isAdmin: isAdmin,
            createdAt: serverTimestamp(),
            timestamp: serverTimestamp() // Save in both
        };

        if (productData) msg.productData = productData;
        if (imageUrl) msg.imageUrl = imageUrl;
        if (imageFileName) msg.imageFileName = imageFileName;

        await addDoc(collection(db, 'chatMessages'), msg);

        await updateDoc(doc(db, 'conversations', conversationId), {
            lastMessage: type === 'product_card' ? '📦 Tarjeta de Producto' : (imageUrl ? 'Imagen adjunta' : text),
            lastMessageAt: serverTimestamp(),
            lastMessageTime: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: 'active'
        });

        return type !== 'system_warning';
    },

    // Expected by ChatBubble.tsx
    async markMessagesAsRead(conversationId: string, userId: string) {
        await updateDoc(doc(db, 'conversations', conversationId), {
            unreadCount: 0
        });
    },

    // Expected by AdminChats.tsx
    async closeConversation(conversationId: string) {
        await updateDoc(doc(db, 'conversations', conversationId), {
            status: 'closed'
        });
    }
};
