import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Lock, Mail, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import apiService from '../../services/api';

export default function SetupPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get('email');
    if (e) setEmail(e);
  }, []);

  const submit = async (ev) => {
    ev.preventDefault();
    setError('');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setLoading(true);
    try {
      const res = await apiService.setupPassword(email, password);
      if (res?.success || res?.status === 'success') setDone(true);
      else setError('No se pudo crear la contraseña.');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al crear la contraseña. Verificá el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1512] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-[#9bcc44]/8 blur-[160px] rounded-full" />
      <a href="/login" className="absolute top-6 left-6 flex items-center gap-2 text-[#8a9787] hover:text-[#9bcc44] text-xs font-black uppercase tracking-widest">
        <ArrowLeft size={14} /> Volver al login
      </a>

      <div className="relative w-full max-w-md bg-[#18211b] border border-[#2a3a2c]/60 rounded-3xl p-8 shadow-2xl animate-fade-up">
        {done ? (
          <div className="flex flex-col items-center text-center py-6">
            <CheckCircle2 className="text-[#9bcc44] mb-4" size={52} />
            <h1 className="text-xl font-black uppercase italic text-white">¡Contraseña creada!</h1>
            <p className="text-sm text-[#8a9787] mt-2">Ya podés ingresar al panel con tu nuevo acceso.</p>
            <button onClick={() => navigate('/login')}
              className="mt-6 w-full bg-[#9bcc44] text-[#0e1512] py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all">
              Ir al login
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="p-3 bg-[#9bcc44]/10 rounded-2xl text-[#9bcc44] border border-[#9bcc44]/20 mb-4">
                <Leaf size={28} />
              </div>
              <h1 className="text-xl font-black uppercase italic tracking-tighter text-white">Crear contraseña</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#9bcc44] mt-1">Primer acceso al panel</p>
            </div>

            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl text-center">{error}</div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5d6f5a] absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="Tu email"
                  className="w-full bg-[#121a14] border-2 border-transparent pl-11 pr-4 py-4 rounded-2xl outline-none focus:border-[#9bcc44] text-white text-sm font-semibold placeholder-[#5d6f5a]" />
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5d6f5a] absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="Nueva contraseña (mín. 6)"
                  className="w-full bg-[#121a14] border-2 border-transparent pl-11 pr-4 py-4 rounded-2xl outline-none focus:border-[#9bcc44] text-white text-sm font-semibold placeholder-[#5d6f5a]" />
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5d6f5a] absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                  placeholder="Repetir contraseña"
                  className="w-full bg-[#121a14] border-2 border-transparent pl-11 pr-4 py-4 rounded-2xl outline-none focus:border-[#9bcc44] text-white text-sm font-semibold placeholder-[#5d6f5a]" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#9bcc44] text-[#0e1512] py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Creando…</> : 'Crear contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
