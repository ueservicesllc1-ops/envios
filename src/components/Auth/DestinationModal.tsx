import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, LayoutDashboard, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface DestinationModalProps {
  isOpen: boolean;
  userName: string;
  onClose: () => void;
}

const DestinationModal: React.FC<DestinationModalProps> = ({ isOpen, userName, onClose }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleAdminPanel = () => {
    navigate('/dashboard');
    onClose();
  };

  const handleStore = () => {
    navigate('/');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {t('auth.welcome')} {userName}!
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6 text-center">
            {t('auth.selectDestination')}
          </p>

          <div className="space-y-3">
            {/* Botón Panel de Admin */}
            <button
              onClick={handleAdminPanel}
              className="w-full flex items-center space-x-4 p-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md"
            >
              <div className="flex-shrink-0">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-lg">{t('auth.adminPanel')}</h3>
                <p className="text-sm text-primary-100">{t('auth.adminPanelDescription')}</p>
              </div>
            </button>

            {/* Botón Tienda en Línea */}
            <button
              onClick={handleStore}
              className="w-full flex items-center space-x-4 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
            >
              <div className="flex-shrink-0">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-lg">{t('auth.onlineStore')}</h3>
                <p className="text-sm text-green-100">{t('auth.onlineStoreDescription')}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationModal;











