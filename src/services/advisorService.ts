import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase/config';

export interface AdvisorData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
}

export const advisorService = {
    async createAdvisor(data: AdvisorData) {
        // Inicializar una app secundaria para no cerrar la sesión del admin actual
        const secondaryApp = initializeApp(firebaseConfig, "AdvisorCreationApp");
        const secondaryAuth = getAuth(secondaryApp);

        try {
            // Crear usuario en Auth
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
            const user = userCredential.user;

            const displayName = `${data.firstName} ${data.lastName}`;
            await updateProfile(user, { displayName });

            // Guardar datos en Firestore (usando la instancia principal 'db' con permisos de admin)
            await setDoc(doc(db, 'userPreferences', user.uid), {
                email: data.email,
                displayName: displayName,
                profile: {
                    phone: data.phone,
                    role: 'advisor'
                },
                role: 'advisor', // Asegurar que el rol esté en el nivel superior para fácil acceso
                createdAt: new Date(),
                updatedAt: new Date()
            }, { merge: true });

            console.log('Asesor creado con éxito:', user.uid);

            // Cerrar sesión en la app secundaria y limpiarla
            await signOut(secondaryAuth);
            // deleteApp(secondaryApp); // Eliminar la app da error a veces si es muy rápido, podemos dejarla o manejarla con cuidado

            return user;
        } catch (error: any) {
            console.error('Error creando asesor:', error);
            if (error.code === 'auth/email-already-in-use') {
                throw new Error('Este correo electrónico ya está registrado por otro usuario.');
            }
            if (error.code === 'auth/weak-password') {
                throw new Error('La contraseña es muy débil. Debe tener al menos 6 caracteres.');
            }
            if (error.code === 'auth/invalid-email') {
                throw new Error('El formato del correo electrónico no es válido.');
            }
            throw error;
        } finally {
            // Intentar limpiar
            try { await deleteApp(secondaryApp); } catch (e) { }
        }
    }
};
