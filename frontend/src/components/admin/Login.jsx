import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import apiService from '../../services/api';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await apiService.login(username, password);
      if (res?.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('adminUser', res.nombre || res.username || username);
        onLoginSuccess?.();
        navigate('/admin');
      } else {
        setError('Credenciales inválidas.');
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo iniciar sesión. Verificá el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1512] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-[#9bcc44]/8 blur-[160px] rounded-full" />
      <a href="/" className="absolute top-6 left-6 flex items-center gap-2 text-[#8a9787] hover:text-[#9bcc44] text-xs font-black uppercase tracking-widest">
        <ArrowLeft size={14} /> Volver al sitio
      </a>

      <div className="relative w-full max-w-md bg-[#18211b] border border-[#2a3a2c]/60 rounded-3xl p-8 shadow-2xl animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-[#9bcc44]/10 rounded-2xl text-[#9bcc44] border border-[#9bcc44]/20 mb-4">
            <Leaf size={28} />
          </div>
          <h1 className="text-xl font-black uppercase italic tracking-tighter text-white">Acceso Bodega</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#9bcc44] mt-1">AgroTech Mendoza · Control OS</p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <User className="w-4 h-4 text-[#5d6f5a] absolute left-4 top-1/2 -translate-y-1/2" />
            <input value={username} onChange={(e) => setUsername(e.target.value)} required
              placeholder="Usuario" autoFocus
              className="w-full bg-[#121a14] border-2 border-transparent pl-11 pr-4 py-4 rounded-2xl outline-none focus:border-[#9bcc44] text-white text-sm font-semibold placeholder-[#5d6f5a]" />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#5d6f5a] absolute left-4 top-1/2 -translate-y-1/2" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              placeholder="Contraseña"
              className="w-full bg-[#121a14] border-2 border-transparent pl-11 pr-4 py-4 rounded-2xl outline-none focus:border-[#9bcc44] text-white text-sm font-semibold placeholder-[#5d6f5a]" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#9bcc44] text-[#0e1512] py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Ingresando…</> : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-[11px] text-[#5d6f5a] mt-6">
          ¿Primer acceso? <a href="/setup-password" className="text-[#9bcc44] font-bold hover:underline">Creá tu contraseña</a>
        </p>
        <p className="text-center text-[10px] text-[#3d4a3a] mt-3 font-mono">
          Demo: usuario <span className="text-[#8a9787]">roberto</span> · clave <span className="text-[#8a9787]">agrotech2026</span>
        </p>
      </div>
    </div>
  );
}
