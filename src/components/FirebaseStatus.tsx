import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const FirebaseStatus: React.FC = () => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Intentar leer un documento para verificar la conexión
        const testDoc = doc(db, 'test', 'connection');
        await getDoc(testDoc);
        setStatus('connected');
      } catch (error) {
        console.error('Firebase connection error:', error);
        setStatus('error');
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
