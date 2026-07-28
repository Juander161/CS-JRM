import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './layout/AppLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import OrderApprovalPage from './modules/orderApproval/OrderApprovalPage.jsx';
import TrackingPage from './modules/tracking/TrackingPage.jsx';
import AdminUsersPage from './modules/admin/AdminUsersPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/order-approval" element={<OrderApprovalPage />} />
        <Route path="/tracking" element={<TrackingPage />} />
        <Route path="/admin" element={<AdminUsersPage />} />
      </Route>
    </Routes>
  );
}
