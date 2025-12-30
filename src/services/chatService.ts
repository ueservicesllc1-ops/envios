import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    getDocs,
    setDoc,
    getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    message: string;
    timestamp: Timestamp;
    isAdmin: boolean;
    read: boolean;
}

export interface Conversation {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    lastMessage: string;
    lastMessageTime: Timestamp;
    unreadCount: number;
    status: 'active' | 'closed';
    createdAt: Timestamp;
}

export const chatService = {
    // Crear o obtener conversación del usuario
    async getOrCreateConversation(userId: string, userName: string, userEmail: string): Promise<string> {
        try {
            const conversationsRef = collection(db, 'conversations');
            const q = query(conversationsRef, where('userId', '==', userId));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                return snapshot.docs[0].id;
            }

            // Crear nueva conversación
            const newConversation = {
                userId,
                userName,
                userEmail,
                lastMessage: '',
                lastMessageTime: Timestamp.now(),
                unreadCount: 0,
                status: 'active',
                createdAt: Timestamp.now()
            };

            const docRef = await addDoc(conversationsRef, newConversation);
            return docRef.id;
        } catch (error) {
            console.error('Error getting/creating conversation:', error);
            throw error;
        }
    },

    // Enviar mensaje
    async sendMessage(
        conversationId: string,
        senderId: string,
        senderName: string,
        senderEmail: string,
        message: string,
        isAdmin: boolean = false
    ): Promise<void> {
        try {
            const messagesRef = collection(db, 'chatMessages');
            await addDoc(messagesRef, {
                conversationId,
                senderId,
                senderName,
                senderEmail,
                message,
                timestamp: Timestamp.now(),
                isAdmin,
                read: false
            });

            // Actualizar última mensaje en conversación
            const conversationRef = doc(db, 'conversations', conversationId);
            await updateDoc(conversationRef, {
                lastMessage: message,
                lastMessageTime: Timestamp.now(),
                unreadCount: isAdmin ? 0 : (await getDoc(conversationRef)).data()?.unreadCount || 0 + 1
            });
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    },

    // Suscribirse a mensajes de una conversación
    subscribeToMessages(conversationId: string, callback: (messages: ChatMessage[]) => void) {
        const messagesRef = collection(db, 'chatMessages');
        const q = query(
            messagesRef,
            where('conversationId', '==', conversationId),
            orderBy('timestamp', 'asc')
        );

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatMessage));
            callback(messages);
        });
    },

    // Suscribirse a todas las conversaciones (para admin)
    subscribeToConversations(callback: (conversations: Conversation[]) => void) {
        const conversationsRef = collection(db, 'conversations');
        const q = query(conversationsRef, orderBy('lastMessageTime', 'desc'));

        return onSnapshot(q, (snapshot) => {
            const conversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Conversation));
            callback(conversations);
        });
    },

    // Marcar mensajes como leídos
    async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
        try {
            const messagesRef = collection(db, 'chatMessages');
            const q = query(
                messagesRef,
                where('conversationId', '==', conversationId),
                where('senderId', '!=', userId),
                where('read', '==', false)
            );

            const snapshot = await getDocs(q);
            const updatePromises = snapshot.docs.map(doc =>
                updateDoc(doc.ref, { read: true })
            );

            await Promise.all(updatePromises);

            // Resetear contador de no leídos en conversación
            const conversationRef = doc(db, 'conversations', conversationId);
            await updateDoc(conversationRef, { unreadCount: 0 });
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    },

    // Cerrar conversación
    async closeConversation(conversationId: string): Promise<void> {
        try {
            const conversationRef = doc(db, 'conversations', conversationId);
            await updateDoc(conversationRef, { status: 'closed' });
        } catch (error) {
            console.error('Error closing conversation:', error);
            throw error;
        }
    }
};
