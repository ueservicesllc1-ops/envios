import React, { useState } from 'react';
import { X, Smartphone, Camera, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface ManualBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

const ManualBarcodeScanner: React.FC<ManualBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = "Lector de Códigos de Barras"
}) => {
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleClose = () => {
    setBarcode('');
    setIsScanning(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      onScan(barcode.trim());
      setBarcode('');
      toast.success(`Código escaneado: ${barcode}`);
    }
  };

  const handleTestScan = () => {
    const testCode = `TEST_${Date.now()}`;
    onScan(testCode);
    toast.success(`Código de prueba: ${testCode}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Instrucciones */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Smartphone className="h-8 w-8 text-blue-600 mr-2" />
              <span className="text-lg font-medium text-gray-900">Ingresa el código</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Escribe manualmente el código de barras del producto
            </p>
          </div>

          {/* Formulario de entrada */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Barras (SKU)
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 1234567890123"
                autoFocus
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center"
                disabled={!barcode.trim()}
              >
                <Check className="h-4 w-4 mr-2" />
                Agregar Código
              </button>
              <button
                type="button"
                onClick={handleTestScan}
                className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center justify-center"
              >
                <Camera className="h-4 w-4 mr-2" />
                Probar
              </button>
            </div>
          </form>

          {/* Instrucciones adicionales */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 font-medium mb-1">💡 Consejos:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Puedes escribir el código manualmente</li>
              <li>• O usar una app de escáner en tu celular</li>
              <li>• Luego copiar y pegar el código aquí</li>
            </ul>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualBarcodeScanner;
