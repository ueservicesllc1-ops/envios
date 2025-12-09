import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="relative">
      <button
        onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        title={language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      >
        <Globe className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700 uppercase">
          {language === 'es' ? 'ES' : 'EN'}
        </span>
      </button>
    </div>
  );
};

export default LanguageSelector;











