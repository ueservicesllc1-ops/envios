import React, { useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { emailService } from '../services/emailService';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';

const TestEmail: React.FC = () => {
    const [testEmail, setTestEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSendPayPalTest = async () => {
        if (!testEmail || !testEmail.includes('@')) {
            toast.error('Por favor ingresa un email válido');
            return;
        }

        setSending(true);
        setLastResult(null);

        try {
            await emailService.sendCompraExitosa({
                customerName: 'Cliente de Prueba',
                customerEmail: testEmail,
                orderNumber: `TEST-PAYPAL-${Date.now()}`,
                securityCode: '123456',
                totalAmount: 99.99,
                items: [
                    { name: 'Producto Test 1', quantity: 2, price: 25.00 },
                    { name: 'Producto Test 2', quantity: 1, price: 49.99 }
                ],
                deliveryAddress: 'Av. Principal 123, Quito, Ecuador',
                estimatedDate: format(addDays(new Date(), 7), 'dd/MM/yyyy')
            });

            setLastResult({ success: true, message: 'Email de PayPal enviado correctamente' });
            toast.success('✅ Email de prueba PayPal enviado');
        } catch (error) {
            console.error(error);
            setLastResult({ success: false, message: 'Error al enviar email' });
            toast.error('❌ Error al enviar email');
        } finally {
            setSending(false);
        }
    };

    const handleSendDepositTest = async () => {
        if (!testEmail || !testEmail.includes('@')) {
            toast.error('Por favor ingresa un email válido');
            return;
        }

        setSending(true);
        setLastResult(null);

        try {
            await emailService.sendCompraExitosa({
                customerName: 'Cliente de Prueba',
                customerEmail: testEmail,
                orderNumber: `TEST-DEPOSIT-${Date.now()}`,
                securityCode: '789012',
                totalAmount: 157.50,
                items: [
                    { name: 'Producto Depósito 1', quantity: 1, price: 75.00 },
                    { name: 'Producto Depósito 2', quantity: 3, price: 27.50 }
                ],
                deliveryAddress: 'Calle Secundaria 456, Guayaquil, Ecuador',
                estimatedDate: format(addDays(new Date(), 7), 'dd/MM/yyyy')
            });

            setLastResult({ success: true, message: 'Email de Depósito enviado correctamente' });
            toast.success('✅ Email de prueba Depósito enviado');
        } catch (error) {
            console.error(error);
            setLastResult({ success: false, message: 'Error al enviar email' });
            toast.error('❌ Error al enviar email');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                    <div className="bg-blue-100 p-3 rounded-full">
                        <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Test de Emails</h1>
                        <p className="text-sm text-gray-500">Prueba el envío de notificaciones por email</p>
                    </div>
                </div>

                {/* Input Email */}
                <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email de Prueba (Cliente)
                    </label>
                    <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="cliente@ejemplo.com"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        💡 El email se enviará a esta dirección para que puedas ver cómo lo recibe el cliente
                    </p>
                </div>

                {/* Botones de Prueba */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* PayPal Test */}
                    <button
                        onClick={handleSendPayPalTest}
                        disabled={sending || !testEmail}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                    >
                        <Send className="h-5 w-5" />
                        {sending ? 'Enviando...' : 'Test Email PayPal'}
                    </button>

                    {/* Depósito Test */}
                    <button
                        onClick={handleSendDepositTest}
                        disabled={sending || !testEmail}
                        className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-lg font-bold hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                    >
                        <Send className="h-5 w-5" />
                        {sending ? 'Enviando...' : 'Test Email Depósito'}
                    </button>
                </div>

                {/* Resultado */}
                {lastResult && (
                    <div className={`p-4 rounded-lg flex items-start gap-3 ${lastResult.success
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                        }`}>
                        {lastResult.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                            <p className={`font-medium ${lastResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                {lastResult.message}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                {lastResult.success
                                    ? `Revisa la bandeja de entrada de ${testEmail}`
                                    : 'Verifica la consola del navegador para más detalles'
                                }
                            </p>
                        </div>
                    </div>
                )}

                {/* Información */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-bold text-blue-900 mb-2">ℹ️ Información</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• <strong>Test Email PayPal:</strong> Simula una compra exitosa por PayPal</li>
                        <li>• <strong>Test Email Depósito:</strong> Simula aprobación de depósito bancario</li>
                        <li>• El email incluye código de retiro, resumen de compra y fecha estimada</li>
                        <li>• Si no recibes el email, revisa la carpeta de Spam/Correo no deseado</li>
                    </ul>
                </div>

                {/* Configuración */}
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-2">⚙️ Configuración Actual</h3>
                    <div className="text-sm text-gray-700 space-y-1">
                        <p>• <strong>Service ID:</strong> service_k2tpxk9</p>
                        <p>• <strong>Template ID:</strong> template_bnf8vrj</p>
                        <p>• <strong>From Email:</strong> ueconsorcio@gmail.com</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestEmail;
