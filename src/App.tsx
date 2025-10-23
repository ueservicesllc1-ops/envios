import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AuthWrapper from './components/Auth/AuthWrapper';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Warehouse from './pages/Warehouse';
import Inventory from './pages/Inventory';
import EntryNotes from './pages/EntryNotes';
import ExitNotes from './pages/ExitNotes';
import PaymentNotes from './pages/PaymentNotes';
import Shipping from './pages/Shipping';
import Accounting from './pages/Accounting';
import Sellers from './pages/Sellers';
import SellerDetails from './pages/SellerDetails';
import SellerPanel from './pages/SellerPanel';
import Settings from './pages/Settings';
import MobileScanner from './pages/MobileScanner';

function App() {
  return (
    <Router>
      <div className="App">
        <AuthWrapper>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/warehouse" element={<Warehouse />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/entry-notes" element={<EntryNotes />} />
              <Route path="/exit-notes" element={<ExitNotes />} />
              <Route path="/payment-notes" element={<PaymentNotes />} />
              <Route path="/shipping" element={<Shipping />} />
              <Route path="/accounting" element={<Accounting />} />
              <Route path="/sellers" element={<Sellers />} />
              <Route path="/sellers/:id" element={<SellerDetails />} />
              <Route path="/seller-panel/:id" element={<SellerPanel />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/mobile-scanner" element={<MobileScanner />} />
            </Routes>
          </Layout>
        </AuthWrapper>
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
