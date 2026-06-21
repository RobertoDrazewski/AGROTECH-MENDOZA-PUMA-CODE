import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  Loader2, LayoutDashboard, CloudSnow, Droplets,
  BarChart3, Users, LogOut, Menu, X, ExternalLink, Leaf, Bug,
} from 'lucide-react';

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
const TabHeladas    = React.lazy(() => import('./components/admin/TabHeladas'));
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
        {/* Rutas Públicas de Ventanas Independientes */}
        <Route path="/" element={<Home />}>
          <Route index element={<Hero />} />
          <Route path="servicios" element={<Services />} />
          <Route path="industrias" element={<Industries />} />
          <Route path="video" element={<VideoSection />} />
          <Route path="demo" element={<LiveDemo />} />
          <Route path="contacto" element={<Contact />} />
        </Route>

        {/* Rutas Privadas */}
        <Route path="/setup-password" element={<SetupPassword />} />
        <Route path="/login" element={
          authToken ? <Navigate to="/admin" replace />
            : <Login onLoginSuccess={() => setAuthToken(localStorage.getItem('token'))} />
        } />
        <Route path="/admin" element={
          authToken ? <AdminLayout onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('adminUser');
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const adminUser = localStorage.getItem('adminUser') || 'admin';

  const menu = [
    { id: 'TabTelemetria', label: 'Telemetría en Vivo', icon: LayoutDashboard },
    { id: 'TabHeladas',    label: 'Clima & Heladas',     icon: CloudSnow },
    { id: 'TabRiego',      label: 'Riego Inteligente',   icon: Droplets },
    { id: 'TabAnalisis',   label: 'Análisis Anual/Mes',  icon: BarChart3 },
    { id: 'TabFitosanitario', label: 'Sanidad IA (Plagas)', icon: Bug },
    { id: 'TabStaff',      label: 'Staff & Accesos',     icon: Users },
  ];

  const LoadingTab = () => (
    <div className="w-full h-64 flex flex-col items-center justify-center gap-3">
      <Loader2 className="animate-spin text-[#9bcc44]" size={32} />
      <p className="text-xs font-black uppercase tracking-widest text-[#5d6f5a]">Cargando módulo…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0e1512] text-white font-sans antialiased flex relative">
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-[#18211b] border border-[#2a3a2c] rounded-xl text-white shadow-2xl">
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <aside className={`fixed lg:static inset-y-0 left-0 w-72 bg-[#18211b] border-r border-[#2a3a2c]/60 flex flex-col transition-transform duration-300 z-40 p-5 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="pt-2 lg:pt-0 border-b border-[#2a3a2c]/50 pb-4 mb-4 flex items-center gap-2.5">
          <div className="p-2 bg-[#9bcc44]/10 rounded-xl text-[#9bcc44] border border-[#9bcc44]/20">
            <Leaf size={18} />
          </div>
          <div className="text-left">
            <h1 className="text-base font-black uppercase italic tracking-tighter leading-none">AgroTech</h1>
            <span className="text-[#5d6f5a] font-black text-[9px] uppercase tracking-widest block mt-1">Mendoza · Control OS</span>
          </div>
        </div>

        <div className="bg-[#121a14] p-3 rounded-xl border border-[#2a3a2c]/40 flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-[#9bcc44]/10 border border-[#9bcc44]/20 text-[#9bcc44] rounded-lg flex items-center justify-center">
            <Users size={16} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[9px] text-[#5d6f5a] font-black uppercase tracking-wider">Operador</p>
            <p className="text-xs font-bold text-white truncate font-mono">{adminUser}</p>
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

        <div className="flex flex-col gap-2 mt-3">
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 text-[#9bcc44] hover:text-white bg-[#9bcc44]/10 hover:bg-[#9bcc44]/20 py-3 rounded-xl border border-[#9bcc44]/20 text-xs font-black uppercase tracking-widest transition-all">
            <ExternalLink size={13} /> Ver Sitio Web
          </a>
          <button onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 py-3 rounded-xl border border-rose-500/10 text-xs font-black uppercase tracking-widest transition-all">
            <LogOut size={13} /> Desconectar
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 min-h-screen flex flex-col bg-[#0e1512]">
        <header className="h-20 border-b border-[#2a3a2c]/30 px-6 lg:px-10 flex items-center justify-between bg-[#18211b]/10 backdrop-blur-md sticky top-0 z-30">
          <div className="pl-12 lg:pl-0 text-left">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-[#5d6f5a]">Consola Agronómica</h2>
            <p className="text-sm font-black text-white uppercase italic mt-0.5 tracking-tight">
              {menu.find(m => m.id === activeTab)?.label}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-full uppercase tracking-wider font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> IoT SYNC: ACTIVE
          </div>
        </header>

        <main className="p-4 md:p-8 lg:p-10 flex-1 overflow-y-auto w-full">
          <div className="max-w-6xl mx-auto w-full">
            <Suspense fallback={<LoadingTab />}>
              {activeTab === 'TabTelemetria' && <TabTelemetria />}
              {activeTab === 'TabHeladas' && <TabHeladas />}
              {activeTab === 'TabRiego' && <TabRiego />}
              {activeTab === 'TabAnalisis' && <TabAnalisis />}
              {activeTab === 'TabFitosanitario' && <TabFitosanitario />}
              {activeTab === 'TabStaff' && <TabStaff />}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}