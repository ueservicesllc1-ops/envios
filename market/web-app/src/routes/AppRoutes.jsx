import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ProtectedRoute from './ProtectedRoute';

// Pages
import Home from '../pages/Home';
import Marketplace from '../pages/Marketplace';
import ProductDetail from '../pages/ProductDetail';
import Cart from '../pages/Cart';
import Checkout from '../pages/Checkout';
import Orders from '../pages/Orders';
import SellerDashboard from '../pages/SellerDashboard';
import SellerProducts from '../pages/seller/SellerProducts';
import NewProduct from '../pages/seller/NewProduct';
import EditProduct from '../pages/seller/EditProduct';
import CreatorDashboard from '../pages/creator/CreatorDashboard';
import LiveShopping from '../pages/LiveShopping';
import VibeFeed from '../pages/VibeFeed';
import Rewards from '../pages/Rewards';
import Referrals from '../pages/Referrals';
import Messages from '../pages/Messages';
import NotFound from '../pages/NotFound';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Profile from '../pages/Profile';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="product/:id" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        
        {/* Protected Routes */}
        <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        
        {/* Rutas de Vendedor */}
        <Route path="seller" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
        <Route path="seller/products" element={<ProtectedRoute requiredRole="seller"><SellerProducts /></ProtectedRoute>} />
        <Route path="seller/products/new" element={<ProtectedRoute requiredRole="seller"><NewProduct /></ProtectedRoute>} />
        <Route path="seller/products/:id/edit" element={<ProtectedRoute requiredRole="seller"><EditProduct /></ProtectedRoute>} />
        
        {/* Rutas de Creador/Afiliado */}
        <Route path="creator" element={<ProtectedRoute><CreatorDashboard /></ProtectedRoute>} />
        
        <Route path="live" element={<LiveShopping />} />
        <Route path="vibe" element={<VibeFeed />} />
        <Route path="rewards" element={<Rewards />} />
        <Route path="referrals" element={<Referrals />} />
        
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
