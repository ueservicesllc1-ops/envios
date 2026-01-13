import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const OnlineTracker: React.FC = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const updateOnlineStatus = async () => {
            try {
                const userRef = doc(db, 'userPreferences', user.uid);
                // Actualizamos solo el timestamp, es una operación ligera
                await updateDoc(userRef, {
                    lastActiveAt: serverTimestamp(),
                    isOnline: true // Flag explícito útil para consultas simples
                });
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
