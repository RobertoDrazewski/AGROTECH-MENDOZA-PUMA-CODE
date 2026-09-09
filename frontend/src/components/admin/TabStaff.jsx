import React, { useState, useEffect } from 'react';
import apiService from '../../services/api';
import { Users, UserPlus, Loader2, Copy, CheckCircle2, Link as LinkIcon, Mail, RotateCcw } from 'lucide-react';

export default function TabStaff() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [reseteando, setReseteando] = useState('');

  const load = () => {
    apiService.getAdmins().then(d => setAdmins(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const reenviarAcceso = async (a) => {
    if (!window.confirm(`¿Invalidar la contraseña actual de "${a.nombre || a.username}" y generarle un link nuevo para que la vuelva a crear?`)) return;
    setReseteando(a.username);
    setError('');
    try {
      const res = await apiService.resetearAcceso(a.username);
      const url = `${window.location.origin}${res.setup_url}`;
      setInvite({ ...res, url, esReenvio: true, nombre: a.nombre || a.username });
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo reenviar el acceso.');
    } finally {
      setReseteando('');
    }
  };

  const crear = async (e) => {
    e.preventDefault();
    setError(''); setInvite(null); setSending(true);
    try {
      const res = await apiService.invite(nombre, email);
      const url = `${window.location.origin}/setup-password?email=${encodeURIComponent(email)}`;
      setInvite({ ...res, url });
      setNombre(''); setEmail(''); load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'No se pudo crear la invitación.');
    } finally {
      setSending(false);
    }
  };

  const copy = () => {
    navigator.clipboard?.writeText(invite.url);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Staff & accesos</h2>
        <p className="text-xs text-[#8a9787]">Invitá operadores de la bodega y generá su enlace de creación de contraseña.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crear invitación */}
        <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#9fb09c] mb-4 flex items-center gap-2">
            <UserPlus size={14} className="text-[#9bcc44]" /> Nuevo acceso
          </h3>
          {error && <div className="mb-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl">{error}</div>}
          <form onSubmit={crear} className="space-y-3">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Nombre del operador"
              className="w-full bg-[#121a14] border-2 border-transparent p-3.5 rounded-xl outline-none focus:border-[#9bcc44] text-white text-sm placeholder-[#5d6f5a]" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email"
              className="w-full bg-[#121a14] border-2 border-transparent p-3.5 rounded-xl outline-none focus:border-[#9bcc44] text-white text-sm placeholder-[#5d6f5a]" />
            <button type="submit" disabled={sending}
              className="w-full bg-[#9bcc44] text-[#0e1512] py-3.5 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Generar invitación
            </button>
          </form>

          {invite && (
            <div className="mt-4 bg-[#9bcc44]/8 border border-[#9bcc44]/25 rounded-xl p-4">
              <p className="text-[11px] text-[#9bcc44] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <LinkIcon size={12} /> {invite.esReenvio ? `Nuevo enlace para ${invite.nombre}` : 'Enlace de creación de contraseña'}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] text-[#cdd8c8] bg-[#121a14] p-2.5 rounded-lg break-all">{invite.url}</code>
                <button onClick={copy} className="shrink-0 w-9 h-9 rounded-lg bg-[#9bcc44] text-[#0e1512] flex items-center justify-center">
                  {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                </button>
              </div>
              <p className="text-[10px] text-[#8a9787] mt-2">
                {invite.esReenvio
                  ? 'La contraseña anterior quedó invalidada. Compartí este enlace para que defina una nueva.'
                  : 'Compartí este enlace con la bodega/operador para que defina su contraseña. Es la única forma de activar el acceso: ya no se puede crear una cuenta escribiendo el email directamente en el login.'}
              </p>
            </div>
          )}
        </div>

        {/* Lista de admins */}
        <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-2xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#9fb09c] mb-4 flex items-center gap-2">
            <Users size={14} className="text-[#9bcc44]" /> Operadores ({admins.length})
          </h3>
          {loading ? (
            <div className="h-32 flex items-center justify-center"><Loader2 className="animate-spin text-[#9bcc44]" /></div>
          ) : admins.length === 0 ? (
            <p className="text-xs text-[#5d6f5a] py-6 text-center">Aún no hay operadores invitados.</p>
          ) : (
            <div className="space-y-2">
              {admins.map((a, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#121a14] rounded-xl p-3 border border-[#2a3a2c]/40">
                  <div className="w-9 h-9 rounded-lg bg-[#9bcc44]/10 border border-[#9bcc44]/20 text-[#9bcc44] flex items-center justify-center shrink-0">
                    <Mail size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{a.nombre || a.username}</p>
                    <p className="text-[11px] text-[#8a9787] truncate">{a.email}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 ${a.activo ? 'text-[#9bcc44] bg-[#9bcc44]/10' : 'text-amber-300 bg-amber-500/10'}`}>
                    {a.activo ? 'Activo' : 'Pendiente'}
                  </span>
                  <button onClick={() => reenviarAcceso(a)} disabled={reseteando === a.username}
                    title="Invalidar contraseña actual y generar un link nuevo"
                    className="shrink-0 p-1.5 rounded-lg border border-[#2a3a2c] text-[#9fb09c] hover:border-[#9bcc44] hover:text-[#9bcc44] disabled:opacity-40 transition-colors">
                    {reseteando === a.username ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
