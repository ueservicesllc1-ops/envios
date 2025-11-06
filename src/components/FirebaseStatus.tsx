import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, getDocs, query, limit } from 'firebase/firestore';

const FirebaseStatus: React.FC = () => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Verificar la conexión usando una consulta simple a la colección 'sellers'
        // que tiene permisos de lectura pública
        const sellersRef = collection(db, 'sellers');
        // Intentamos obtener máximo 1 documento para verificar la conexión
        const q = query(sellersRef, limit(1));
        const querySnapshot = await getDocs(q);
        // Si llegamos aquí, la conexión funciona
        setStatus('connected');
      } catch (error: any) {
        // Si el error es de permisos pero la conexión funciona, consideramos conectado
        // Solo marcamos como error si es un error de red o conexión real
        if (error?.code === 'permission-denied') {
          // Permisos denegados, pero la conexión a Firebase funciona
          setStatus('connected');
        } else if (error?.code === 'unavailable' || error?.code === 'deadline-exceeded') {
          // Error real de conexión
          console.error('Firebase connection error:', error);
          setStatus('error');
        } else {
          // Otros errores, pero la conexión funciona
          setStatus('connected');
        }
      }
    };

    checkConnection();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Conectado a Firebase';
      case 'error':
        return 'Error de conexión';
      default:
        return 'Conectando...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      {getStatusIcon()}
      <span className={getStatusColor()}>
        {getStatusText()}
      </span>
    </div>
  );
};

export default FirebaseStatus;
