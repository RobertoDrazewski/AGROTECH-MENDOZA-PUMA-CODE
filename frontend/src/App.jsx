import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import {
  Loader2, LayoutDashboard, CloudSun, Droplets,
  BarChart3, Users, LogOut, Menu, X, ExternalLink, Leaf, Bug,
} from 'lucide-react';
import apiService from './services/api';
import AlarmBell from './components/admin/AlarmBell';

import Home from './Home';
import Login from './components/admin/Login';
import SetupPassword from './components/admin/SetupPassword';

// Importación de componentes de la Landing Page
import Hero from './components/landing/Hero';
import Services from './components/landing/Services';
import Industries from './components/landing/Industries';
import VideoSection from './components/landing/VideoSection';
import LiveDemo from './components/landing/LiveDemo';
import Contact from './components/landing/Contact';

const TabTelemetria = React.lazy(() => import('./components/admin/TabTelemetria'));
const TabControlClimatico = React.lazy(() => import('./components/admin/TabControlClimatico'));
const TabRiego      = React.lazy(() => import('./components/admin/TabRiego'));
const TabAnalisis   = React.lazy(() => import('./components/admin/TabAnalisis'));
const TabFitosanitario = React.lazy(() => import('./components/admin/TabFitosanitario'));
const TabStaff      = React.lazy(() => import('./components/admin/TabStaff'));

export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('token'));
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setAuthToken(localStorage.getItem('token'));
    setChecking(false);
  }, []);

  if (checking) return (
    <div className="min-h-screen bg-[#0e1512] flex items-center justify-center text-white">
      <div className="w-12 h-12 border-4 border-[#9bcc44] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route index element={<Hero />} />
          <Route path="servicios" element={<Services />} />
          <Route path="industrias" element={<Industries />} />
          <Route path="video" element={<VideoSection />} />
          <Route path="demo" element={<LiveDemo />} />
          <Route path="contacto" element={<Contact />} />
        </Route>

        <Route path="/setup-password" element={<SetupPassword />} />
        <Route path="/login" element={
          authToken ? <Navigate to="/admin" replace />
            : <Login onLoginSuccess={() => setAuthToken(localStorage.getItem('token'))} />
        } />
        <Route path="/admin" element={
          authToken ? <AdminLayout onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminRole');
            setAuthToken(null);
          }} /> : <Navigate to="/login" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function AdminLayout({ onLogout }) {
  const [activeTab, setActiveTab] = useState('TabTelemetria');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const adminUser = localStorage.getItem('adminUser') || 'admin';
  const [adminRole, setAdminRole] = useState(localStorage.getItem('adminRole') || null);

  // Preguntamos al backend quién soy realmente (no confiamos solo en lo que
  // quedó cacheado en localStorage): así, si el rol cambia del lado del
  // servidor, el panel lo refleja apenas se refresca la página.
  useEffect(() => {
    apiService.me()
      .then((r) => {
        if (r?.rol) {
          setAdminRole(r.rol);
          localStorage.setItem('adminRole', r.rol);
        }
      })
      .catch(() => {});
  }, []);

  const esSuperAdmin = adminRole === 'superadmin';

  const menuCompleto = [
    { id: 'TabTelemetria', label: 'Panel General',        icon: LayoutDashboard },
    { id: 'TabControlClimatico', label: 'Control Climático', icon: CloudSun },
    { id: 'TabRiego',      label: 'Riego Inteligente',    icon: Droplets },
    { id: 'TabAnalisis',   label: 'Análisis Anual/Mes',   icon: BarChart3 },
    { id: 'TabFitosanitario', label: 'Control de Plagas', icon: Bug },
    { id: 'TabStaff',      label: 'Staff & Accesos',      icon: Users, soloSuperAdmin: true },
  ];

  // El demo público (y cualquier operador que no sea super admin) no ve
  // "Staff & Accesos" en el menú. El backend igual lo bloquea aunque alguien
  // fuerce la URL: esto es solo para que la UI no muestre algo que no puede usar.
  const menu = menuCompleto.filter((item) => !item.soloSuperAdmin || esSuperAdmin);

  useEffect(() => {
    if (activeTab === 'TabStaff' && !esSuperAdmin) setActiveTab('TabTelemetria');
  }, [activeTab, esSuperAdmin]);

  const LoadingTab = () => (
    <div className="w-full h-64 flex flex-col items-center justify-center gap-3">
      <Loader2 className="animate-spin text-[#9bcc44]" size={32} />
      <p className="text-xs font-black uppercase tracking-widest text-[#5d6f5a]">Cargando módulo…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0e1512] text-white font-sans antialiased relative">
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-[#18211b] border border-[#2a3a2c] rounded-xl text-white shadow-2xl">
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar: en escritorio queda SIEMPRE fija y entera (nav + volver/salir
          nunca requieren scroll); en móvil es un panel off-canvas que se abre
          como menú hamburguesa. */}
      <aside className={`fixed top-0 left-0 h-screen w-72 bg-[#18211b] border-r border-[#2a3a2c]/60 flex flex-col z-40 p-5 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="pt-2 lg:pt-0 border-b border-[#2a3a2c]/50 pb-4 mb-4 flex items-center gap-2.5 shrink-0">
          <div className="p-2 bg-[#9bcc44]/10 rounded-xl text-[#9bcc44] border border-[#9bcc44]/20">
            <Leaf size={18} />
          </div>
          <div className="text-left">
            <h1 className="text-base font-black uppercase italic tracking-tighter leading-none">AgroTech</h1>
            <span className="text-[#5d6f5a] font-black text-[9px] uppercase tracking-widest block mt-1">Mendoza · Control OS</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0 scrollbar-none">
          {menu.map(item => {
            const Icon = item.icon;
            const sel = activeTab === item.id;
            return (
              <button key={item.id}
                onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all text-left group ${sel ? 'bg-[#9bcc44] text-[#0e1512] shadow-lg' : 'text-[#9fb09c] hover:text-white hover:bg-[#121a14]/60'}`}>
                <Icon size={14} className={sel ? 'text-[#0e1512]' : 'text-[#5d6f5a] group-hover:text-[#9bcc44]'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Volver al sitio / Cerrar sesión — siempre visibles, sin scroll,
            porque el <aside> es h-screen + flex-col y esta franja va shrink-0. */}
        <div className="pt-4 mt-4 border-t border-[#2a3a2c]/50 space-y-1 shrink-0">
          <Link to="/"
            onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-[#9fb09c] hover:text-white hover:bg-[#121a14]/60 transition-all">
            <ExternalLink size={14} className="text-[#5d6f5a]" /> Volver al sitio
          </Link>
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-[#9fb09c] hover:text-rose-400 hover:bg-[#121a14]/60 transition-all text-left">
            <LogOut size={14} className="text-[#5d6f5a]" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay para cerrar el menú tocando afuera, solo en móvil */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Contenido: en escritorio se corre a la derecha del ancho fijo del
          sidebar (lg:pl-72), porque el <aside> ahora es fixed siempre. */}
      <div className="lg:pl-72 min-h-screen flex flex-col bg-[#0e1512]">
        <header className="h-20 border-b border-[#2a3a2c]/30 px-6 lg:px-10 flex items-center justify-between bg-[#18211b]/10 backdrop-blur-md sticky top-0 z-20">
          <div className="pl-12 lg:pl-0 text-left">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-[#5d6f5a]">Consola Agronómica</h2>
            <p className="text-sm font-black text-white uppercase italic mt-0.5 tracking-tight">
              {menu.find(m => m.id === activeTab)?.label}
            </p>
          </div>
          <AlarmBell />
        </header>

        <main className="p-4 md:p-8 lg:p-10 flex-1 overflow-y-auto w-full">
          <div className="max-w-6xl mx-auto w-full">
            <Suspense fallback={<LoadingTab />}>
              {activeTab === 'TabTelemetria' && <TabTelemetria onNavigate={setActiveTab} />}
              {activeTab === 'TabControlClimatico' && <TabControlClimatico />}
              {activeTab === 'TabRiego' && <TabRiego />}
              {activeTab === 'TabAnalisis' && <TabAnalisis />}
              {activeTab === 'TabFitosanitario' && <TabFitosanitario />}
              {activeTab === 'TabStaff' && esSuperAdmin && <TabStaff />}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
