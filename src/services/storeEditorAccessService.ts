import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export interface StoreEditorAccess {
    authorizedEmails: string[];
    updatedAt: Date;
}

export const storeEditorAccessService = {
    async getAuthorizedEmails(): Promise<string[]> {
        try {
            const docRef = doc(db, 'settings', 'storeEditorAccess');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as StoreEditorAccess;
                return data.authorizedEmails || [];
            }

            return [];
        } catch (error) {
            console.error('Error loading authorized emails:', error);
            return [];
        }
    },

    async saveAuthorizedEmails(emails: string[]): Promise<void> {
        try {
            const docRef = doc(db, 'settings', 'storeEditorAccess');
            await setDoc(docRef, {
                authorizedEmails: emails,
                updatedAt: new Date()
            });
            toast.success('✅ Lista de accesos actualizada');
        } catch (error) {
            console.error('Error saving authorized emails:', error);
            toast.error('Error al guardar la lista de accesos');
            throw error;
        }
    },

    async addEmail(email: string): Promise<void> {
        try {
            const emails = await this.getAuthorizedEmails();
            if (!emails.includes(email.toLowerCase())) {
                emails.push(email.toLowerCase());
                await this.saveAuthorizedEmails(emails);
            }
        } catch (error) {
            console.error('Error adding email:', error);
            throw error;
        }
    },

    async removeEmail(email: string): Promise<void> {
        try {
            const emails = await this.getAuthorizedEmails();
            const filtered = emails.filter(e => e !== email.toLowerCase());
            await this.saveAuthorizedEmails(filtered);
        } catch (error) {
            console.error('Error removing email:', error);
            throw error;
        }
    },

    async isAuthorized(email: string): Promise<boolean> {
        try {
            const emails = await this.getAuthorizedEmails();
            return emails.includes(email.toLowerCase());
        } catch (error) {
            console.error('Error checking authorization:', error);
            return false;
        }
    }
};
