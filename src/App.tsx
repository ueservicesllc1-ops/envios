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
import Sellers from './pages/Sellers';
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

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Ruta pública para la página de inicio (tienda en línea) */}
          <Route path="/" element={<Home />} />
          
          {/* Ruta pública para login */}
          <Route path="/login" element={<Login />} />
          
          {/* Ruta pública para la tienda del vendedor - sin Layout ni AuthWrapper */}
          <Route path="/store/:slug" element={<PublicStore />} />
          
          {/* Rutas protegidas con AuthWrapper y Layout */}
          <Route
            path="/*"
            element={
              <AuthWrapper>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/warehouse" element={<Warehouse />} />
                    <Route path="/warehouse-ecuador" element={<WarehouseEcuador />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/entry-notes" element={<EntryNotes />} />
                    <Route path="/exit-notes" element={<ExitNotes />} />
                    <Route path="/payment-notes" element={<PaymentNotes />} />
                    <Route path="/shipping" element={<Shipping />} />
                    <Route path="/accounting" element={<Accounting />} />
                    <Route path="/sellers" element={<Sellers />} />
                    <Route path="/sellers/:id" element={<SellerDetails />} />
                    <Route path="/seller-panel/:id" element={<SellerPanel />} />
                    <Route path="/seller-dashboard/:id" element={<SellerDashboard />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/compound-interest" element={<CompoundInterest />} />
                    <Route path="/returns" element={<Returns />} />
                    <Route path="/perfumes" element={<Perfumes />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/mobile-scanner" element={<MobileScanner />} />
                  </Routes>
                </Layout>
              </AuthWrapper>
            }
          />
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
    </Router>
  );
}

export default App;
