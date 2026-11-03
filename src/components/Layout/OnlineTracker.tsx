import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const OnlineTracker: React.FC = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const updateOnlineStatus = async () => {
            try {
                const userRef = doc(db, 'userPreferences', user.uid);
                await setDoc(userRef, {
                    lastActiveAt: serverTimestamp(),
                    isOnline: true
                }, { merge: true });
            } catch (error) {
                // Silencioso para no molestar al usuario si falla tracking
                console.error("Error updating online status", error);
            }
        };

        // Actualizar inmediatamente y luego cada 2 minutos
        updateOnlineStatus();
        const interval = setInterval(updateOnlineStatus, 2 * 60 * 1000);

        // Opcional: Manejar cierre de pestaña para poner offline (best effort)
        const handleDisconnect = () => {
            // No podemos usar async/await fiablemente en beforeunload, 
            // pero con Firestore a veces funciona sendBeacon o similar, 
            // o simplemente confiamos en el timeout del "lastActiveAt".
        };

        // window.addEventListener('beforeunload', handleDisconnect);

        return () => {
            clearInterval(interval);
            // window.removeEventListener('beforeunload', handleDisconnect);
        };
    }, [user]);

    return null; // Componente invisible
};

export default OnlineTracker;
