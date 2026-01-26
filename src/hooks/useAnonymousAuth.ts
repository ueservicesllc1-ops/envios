import { useEffect, useState } from 'react';
import { auth } from '../firebase/config';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

/**
 * Hook para manejar autenticación anónima en la app móvil
 * Esto permite acceder a Firestore sin comprometer la seguridad
 */
export const useAnonymousAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        // Escuchar cambios en el estado de autenticación
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Ya hay un usuario autenticado (anónimo o normal)
                setUser(currentUser);
                setLoading(false);
            } else {
                // No hay usuario, iniciar sesión anónima
                try {
                    const result = await signInAnonymously(auth);
                    setUser(result.user);
                    console.log('✅ Autenticación anónima exitosa');
                } catch (err) {
                    console.error('❌ Error en autenticación anónima:', err);
                    setError(err as Error);
                } finally {
                    setLoading(false);
                }
            }
        });

        // Limpiar suscripción al desmontar
        return () => unsubscribe();
    }, []);

    return { user, loading, error };
};
