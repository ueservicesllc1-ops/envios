import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Database, Globe, Save, Sparkles } from 'lucide-react';
import { perfumeSettingsService } from '../services/perfumeSettingsService';
import { perfumeService } from '../services/perfumeService';
import { Perfume } from '../types';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    companyName: 'Envíos Ecuador',
    companyEmail: 'info@envios-ecuador.com',
    companyPhone: '+593 2 123 4567',
    companyAddress: 'Quito, Ecuador',
    currency: 'USD',
    timezone: 'America/Guayaquil',
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30
    }
  });

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'perfumes', name: 'Perfumes', icon: Sparkles },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
    { id: 'security', name: 'Seguridad', icon: Shield },
    { id: 'database', name: 'Base de Datos', icon: Database },
    { id: 'integrations', name: 'Integraciones', icon: Globe }
  ];

  const [perfumeSettings, setPerfumeSettings] = useState<{ allowedBrands: string[] }>({ allowedBrands: [] });
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [loadingPerfumeSettings, setLoadingPerfumeSettings] = useState(false);

  useEffect(() => {
    if (activeTab === 'perfumes') {
      loadPerfumeSettings();
    }
  }, [activeTab]);

  const loadPerfumeSettings = async () => {
    try {
      setLoadingPerfumeSettings(true);
      const settings = await perfumeSettingsService.getSettings();
      setPerfumeSettings(settings);
      
      // Obtener todas las marcas disponibles
      const perfumes = await perfumeService.getAll();
      const brands = Array.from(new Set(perfumes.map(p => p.brand).filter(Boolean))).sort();
      setAllBrands(brands);
    } catch (error) {
      console.error('Error loading perfume settings:', error);
    } finally {
      setLoadingPerfumeSettings(false);
    }
  };

  const handleToggleBrand = (brand: string) => {
    const isSelected = perfumeSettings.allowedBrands.includes(brand);
    if (isSelected) {
      setPerfumeSettings({
        allowedBrands: perfumeSettings.allowedBrands.filter(b => b !== brand)
      });
    } else {
      setPerfumeSettings({
        allowedBrands: [...perfumeSettings.allowedBrands, brand]
      });
    }
  };

  const handleSavePerfumeSettings = async () => {
    try {
      await perfumeSettingsService.saveSettings(perfumeSettings);
    } catch (error) {
      console.error('Error saving perfume settings:', error);
    }
  };

  const handleSave = () => {
    // Aquí se guardarían los cambios en Firebase
    console.log('Configuración guardada:', settings);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600">Gestiona la configuración del sistema</p>
        </div>
        <button 
          onClick={handleSave}
          className="btn-primary flex items-center"
        >
          <Save className="h-4 w-4 mr-2" />
          Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <tab.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'general' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Configuración General</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Empresa
                    </label>
                    <input
                      type="text"
                      value={settings.companyName}
                      onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email de la Empresa
                    </label>
                    <input
                      type="email"
                      value={settings.companyEmail}
                      onChange={(e) => setSettings({...settings, companyEmail: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={settings.companyPhone}
                      onChange={(e) => setSettings({...settings, companyPhone: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={settings.companyAddress}
                      onChange={(e) => setSettings({...settings, companyAddress: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Moneda
                    </label>
                    <select
                      value={settings.currency}
                      onChange={(e) => setSettings({...settings, currency: e.target.value})}
                      className="input-field"
                    >
                      <option value="USD">USD - Dólar Americano</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="PEN">PEN - Sol Peruano</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zona Horaria
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                      className="input-field"
                    >
                      <option value="America/Guayaquil">Guayaquil (GMT-5)</option>
                      <option value="America/New_York">Nueva York (GMT-5)</option>
                      <option value="Europe/Madrid">Madrid (GMT+1)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'perfumes' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Configuración de Perfumes</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Marcas Permitidas en la Tienda
                  </h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Selecciona las marcas que quieres mostrar en la tienda en línea. Solo los perfumes de estas marcas y que estén publicados aparecerán.
                  </p>
                  
                  {loadingPerfumeSettings ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                      {allBrands.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No hay marcas disponibles. Importa perfumes primero.
                        </p>
                      ) : (
                        allBrands.map(brand => {
                          const isSelected = perfumeSettings.allowedBrands.includes(brand);
                          return (
                            <label
                              key={brand}
                              className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-primary-50 border-2 border-primary-200'
                                  : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleBrand(brand)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className={`ml-3 text-sm font-medium ${
                                isSelected ? 'text-primary-900' : 'text-gray-700'
                              }`}>
                                {brand}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{perfumeSettings.allowedBrands.length}</span> de{' '}
                        <span className="font-medium">{allBrands.length}</span> marcas seleccionadas
                      </p>
                    </div>
                    <button
                      onClick={handleSavePerfumeSettings}
                      className="btn-primary flex items-center"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Marcas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Configuración de Notificaciones</h3>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Notificaciones por Email</h4>
                      <p className="text-sm text-gray-500">Recibir notificaciones por correo electrónico</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.email}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: {...settings.notifications, email: e.target.checked}
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Notificaciones Push</h4>
                      <p className="text-sm text-gray-500">Recibir notificaciones en el navegador</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.push}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: {...settings.notifications, push: e.target.checked}
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Notificaciones SMS</h4>
                      <p className="text-sm text-gray-500">Recibir notificaciones por mensaje de texto</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.sms}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: {...settings.notifications, sms: e.target.checked}
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Configuración de Seguridad</h3>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Autenticación de Dos Factores</h4>
                      <p className="text-sm text-gray-500">Añadir una capa extra de seguridad a tu cuenta</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.security.twoFactor}
                        onChange={(e) => setSettings({
                          ...settings,
                          security: {...settings.security, twoFactor: e.target.checked}
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tiempo de Expiración de Sesión (minutos)
                    </label>
                    <input
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => setSettings({
                        ...settings,
                        security: {...settings.security, sessionTimeout: parseInt(e.target.value)}
                      })}
                      className="input-field"
                      min="5"
                      max="480"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Configuración de Base de Datos</h3>
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Estado de la Conexión</h4>
                  <p className="text-sm text-blue-700">Conectado a Firebase Firestore</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Respaldo Automático</h4>
                    <p className="text-sm text-gray-500 mb-4">Los datos se respaldan automáticamente en Firebase</p>
                    <button className="btn-secondary">Crear Respaldo Manual</button>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Limpieza de Datos</h4>
                    <p className="text-sm text-gray-500 mb-4">Eliminar datos antiguos y optimizar el rendimiento</p>
                    <button className="btn-secondary">Optimizar Base de Datos</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Integraciones</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Firebase Storage</h4>
                    <p className="text-sm text-gray-500 mb-4">Almacenamiento de imágenes de productos</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Conectado
                    </span>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Firebase Auth</h4>
                    <p className="text-sm text-gray-500 mb-4">Autenticación de usuarios</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Conectado
                    </span>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">API de Envíos</h4>
                    <p className="text-sm text-gray-500 mb-4">Integración con servicios de envío</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pendiente
                    </span>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Sistema de Pagos</h4>
                    <p className="text-sm text-gray-500 mb-4">Procesamiento de pagos en línea</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pendiente
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
