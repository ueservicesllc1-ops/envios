import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AuthWrapper from './components/Auth/AuthWrapper';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Warehouse from './pages/Warehouse';
import WarehouseEcuador from './pages/WarehouseEcuador';
import Inventory from './pages/Inventory';
import EntryNotes from './pages/EntryNotes';
import ExitNotes from './pages/ExitNotes';
import PaymentNotes from './pages/PaymentNotes';
import Shipping from './pages/Shipping';
import Accounting from './pages/Accounting';
import BillingDashboard from './pages/BillingDashboard';
import Sellers from './pages/Sellers';
import SellerBalances from './pages/SellerBalances';
import SellerBalanceDetails from './pages/SellerBalanceDetails';
import SellerDetails from './pages/SellerDetails';
import SellerPanel from './pages/SellerPanel';
import SellerDashboard from './pages/SellerDashboard';
import Orders from './pages/Orders';
import Settings from './pages/Settings';
import MobileScanner from './pages/MobileScanner';
import PublicStore from './pages/PublicStore';
import CompoundInterest from './pages/CompoundInterest';
import Returns from './pages/Returns';
import Perfumes from './pages/Perfumes';
import Home from './pages/Home';
import Login from './components/Auth/Login';
import CustomerOrders from './pages/CustomerOrders';
import OrderTracking from './pages/OrderTracking';
import AdminStore from './pages/AdminStore';
import StoreEditor from './pages/StoreEditor';
import StoreEditorAccessConfig from './pages/StoreEditorAccessConfig';
import AdminChats from './pages/AdminChats';
import AdvisorPanel from './pages/AdvisorPanel';
import AppMobile from './pages/AppMobile';
import AppEnCamino from './pages/AppEnCamino';
import AppEnCaminoDetalle from './pages/AppEnCaminoDetalle';
import AppBodegaUSA from './pages/AppBodegaUSA';
import AppBodegaEcuador from './pages/AppBodegaEcuador';
import AppProductos from './pages/AppProductos';
import AppVendedorDashboard from './pages/AppVendedorDashboard';
import AppInstallPage from './pages/AppInstallPage';

import { CartProvider } from './contexts/CartContext';
import CartPage from './pages/CartPage';
import PWAPrompt from './components/PWAPrompt';
import OrderSuccess from './pages/OrderSuccess';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ReturnsPolicyPage from './pages/ReturnsPolicyPage';
import UserAddresses from './pages/UserAddresses';
import UserProfile from './pages/UserProfile';
import TestEmail from './pages/TestEmail';

import OnlineTracker from './components/Layout/OnlineTracker';
import SplashScreen from './components/Layout/SplashScreen';
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

function App() {
  const isLegalPage = ['/terminos', '/politica', '/devoluciones'].includes(window.location.pathname);
  const [showSplash, setShowSplash] = React.useState(!isLegalPage);

  const paypalOptions = {
    clientId: process.env.REACT_APP_PAYPAL_CLIENT_ID || "AfU-04zHwad560P4nU6LVMd7qnrY41c0TOdA9LUbN_6-lmztaHfxJz1p7-ByIt6-uoqSGr6OcdaO3b3m",
    currency: "USD",
    intent: "capture",
    "disable-funding": "venmo,paylater"
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <PayPalScriptProvider options={paypalOptions}>
      <Router>
        <CartProvider>
          <OnlineTracker /> {/* Tracking de presencia */}
          <PWAPrompt />
          <div className="App">
            <Routes>
              {/* Ruta pública para la página de inicio (tienda en línea) */}
              <Route path="/" element={<Home />} />

              {/* Ruta del Carrito */}
              <Route path="/cart" element={<CartPage />} />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/terminos" element={<TermsPage />} />
              <Route path="/politica" element={<PrivacyPage />} />
              <Route path="/devoluciones" element={<ReturnsPolicyPage />} />

              {/* Ruta pública para login */}
              <Route path="/login" element={<Login />} />

              {/* Ruta para pedidos del cliente (requiere login) */}
              <Route path="/my-orders" element={<CustomerOrders />} />
              <Route path="/my-addresses" element={<UserAddresses />} />
              <Route path="/profile" element={<UserProfile />} />

              {/* Ruta para rastreo de pedido */}
              <Route path="/track-order/:orderId" element={<OrderTracking />} />

              {/* Ruta para App Mobile - sin Layout ni AuthWrapper */}
              <Route path="/app" element={<AppMobile />} />
              <Route path="/app/en-camino" element={<AppEnCamino />} />
              <Route path="/app/en-camino/:id" element={<AppEnCaminoDetalle />} />
              <Route path="/app/bodega-usa" element={<AppBodegaUSA />} />
              <Route path="/app/bodega-ecuador" element={<AppBodegaEcuador />} />
              <Route path="/app/productos" element={<AppProductos />} />
              <Route path="/app/vendedor/:id" element={<AppVendedorDashboard />} />

              {/* Landing de instalación de App */}
              <Route path="/instalar-app" element={<AppInstallPage />} />

              {/* Ruta pública para la tienda del vendedor - sin Layout ni AuthWrapper */}
              <Route path="/store/:slug" element={<PublicStore />} />

              {/* Rutas protegidas con AuthWrapper y Layout */}
              <Route path="/dashboard" element={<AuthWrapper><Layout><Dashboard /></Layout></AuthWrapper>} />
              <Route path="/products" element={<AuthWrapper><Layout><Products /></Layout></AuthWrapper>} />
              <Route path="/warehouse" element={<AuthWrapper><Layout><Warehouse /></Layout></AuthWrapper>} />
              <Route path="/warehouse-ecuador" element={<AuthWrapper><Layout><WarehouseEcuador /></Layout></AuthWrapper>} />
              <Route path="/inventory" element={<AuthWrapper><Layout><Inventory /></Layout></AuthWrapper>} />
              <Route path="/entry-notes" element={<AuthWrapper><Layout><EntryNotes /></Layout></AuthWrapper>} />
              <Route path="/exit-notes" element={<AuthWrapper><Layout><ExitNotes /></Layout></AuthWrapper>} />
              <Route path="/payment-notes" element={<AuthWrapper><Layout><PaymentNotes /></Layout></AuthWrapper>} />
              <Route path="/shipping" element={<AuthWrapper><Layout><Shipping /></Layout></AuthWrapper>} />
              <Route path="/accounting" element={<AuthWrapper><Layout><Accounting /></Layout></AuthWrapper>} />
              <Route path="/billing" element={<AuthWrapper><Layout><BillingDashboard /></Layout></AuthWrapper>} />
              <Route path="/sellers" element={<AuthWrapper><Layout><Sellers /></Layout></AuthWrapper>} />
              <Route path="/sellers/:id" element={<AuthWrapper><Layout><SellerDetails /></Layout></AuthWrapper>} />
              <Route path="/seller-balances" element={<AuthWrapper><Layout><SellerBalances /></Layout></AuthWrapper>} />
              <Route path="/seller-balances/:id" element={<AuthWrapper><Layout><SellerBalanceDetails /></Layout></AuthWrapper>} />
              <Route path="/seller-panel/:id" element={<AuthWrapper><Layout><SellerPanel /></Layout></AuthWrapper>} />
              <Route path="/seller-dashboard/:id" element={<AuthWrapper><Layout><SellerDashboard /></Layout></AuthWrapper>} />
              <Route path="/orders" element={<AuthWrapper><Layout><Orders /></Layout></AuthWrapper>} />
              <Route path="/compound-interest" element={<AuthWrapper><Layout><CompoundInterest /></Layout></AuthWrapper>} />
              <Route path="/returns" element={<AuthWrapper><Layout><Returns /></Layout></AuthWrapper>} />
              <Route path="/perfumes" element={<AuthWrapper><Layout><Perfumes /></Layout></AuthWrapper>} />
              <Route path="/admin-store" element={<AuthWrapper><Layout><AdminStore /></Layout></AuthWrapper>} />
              {/* Ruta independiente para editor de tienda (sin Layout) */}
              <Route path="/store-editor" element={<AuthWrapper><StoreEditor /></AuthWrapper>} />
              {/* Configuración de acceso al editor (con Layout) */}
              <Route path="/store-editor-access" element={<AuthWrapper><Layout><StoreEditorAccessConfig /></Layout></AuthWrapper>} />
              {/* Ruta para chat de soporte */}
              {/* Ruta para el Panel de Asesor */}
              <Route path="/asesor" element={<AdvisorPanel />} />

              <Route path="/admin/chats" element={<AuthWrapper><Layout><AdminChats /></Layout></AuthWrapper>} />
              <Route path="/test-email" element={<AuthWrapper><Layout><TestEmail /></Layout></AuthWrapper>} />
              <Route path="/settings" element={<AuthWrapper><Layout><Settings /></Layout></AuthWrapper>} />
              <Route path="/mobile-scanner" element={<AuthWrapper><Layout><MobileScanner /></Layout></AuthWrapper>} />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </div>
        </CartProvider>
      </Router>
    </PayPalScriptProvider>
  );
}

export default App;
