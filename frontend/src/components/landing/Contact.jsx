import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, ShieldCheck, Loader2, Cpu } from 'lucide-react';
import apiService from '../../services/api';

const EMAIL_INFO = 'info@puma-code.com';
const EMAIL_SECURITY = 'security@puma-code.com';
const TEL_DISPLAY = '+54 261 651 2165';
const WHATSAPP = '5492616512165'; // 54 9 + 261 651 2165

export default function Contact() {
  const [form, setForm] = useState({ nombre: '', bodega: '', email: '', telefono: '', mensaje: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSending(true);
    try {
      await apiService.enviarContacto(form);
      setSent(true);
    } catch (err) {
      const txt = encodeURIComponent(
        `Hola AgroTech Mendoza! Soy ${form.nombre} de ${form.bodega}. Email: ${form.email}. ` +
        `Tel: ${form.telefono}. Consulta: ${form.mensaje}`
      );
      window.open(`https://wa.me/${WHATSAPP}?text=${txt}`, '_blank');
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contacto" className="bg-[#121a14] border-t border-[#2a3a2c]/40 py-24">
      <div className="max-w-[1100px] mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-12">
        <div>
          <span className="inline-flex items-center gap-2 text-[#9bcc44] text-[10px] font-black uppercase tracking-[0.25em]">
            <Cpu size={12} /> Soluciones Hardware &amp; Software
          </span>
          <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white mt-3">
            Llevemos los datos a<br />tu <span className="text-[#9bcc44]">bodega</span>
          </h2>
          <p className="text-[#aebaa8] mt-5 leading-relaxed">
            Contanos cuántas hectáreas tenés y qué querés resolver. Coordinamos una visita técnica
            sin cargo y te armamos una propuesta a medida.
          </p>

          <div className="mt-8 space-y-4">
            <a href={`mailto:${EMAIL_INFO}`}
              className="flex items-center gap-3 text-[#cdd8c8] hover:text-[#9bcc44] transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-[#18211b] border border-[#2a3a2c]/60 flex items-center justify-center text-[#9bcc44] group-hover:border-[#9bcc44]/50">
                <Mail size={18} />
              </div>
              <div>
                <span className="block text-sm font-semibold">{EMAIL_INFO}</span>
                <span className="block text-[11px] text-[#5d6f5a]">Consultas y presupuestos</span>
              </div>
            </a>

            <a href={`mailto:${EMAIL_SECURITY}`}
              className="flex items-center gap-3 text-[#cdd8c8] hover:text-[#9bcc44] transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-[#18211b] border border-[#2a3a2c]/60 flex items-center justify-center text-[#9bcc44] group-hover:border-[#9bcc44]/50">
                <ShieldCheck size={18} />
              </div>
              <div>
                <span className="block text-sm font-semibold">{EMAIL_SECURITY}</span>
                <span className="block text-[11px] text-[#5d6f5a]">Seguridad</span>
              </div>
            </a>

            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 text-[#cdd8c8] hover:text-[#9bcc44] transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-[#18211b] border border-[#2a3a2c]/60 flex items-center justify-center text-[#9bcc44] group-hover:border-[#9bcc44]/50">
                <Phone size={18} />
              </div>
              <span className="text-sm font-semibold">{TEL_DISPLAY}</span>
            </a>

            <a href="https://www.puma-code.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 text-[#cdd8c8] hover:text-[#9bcc44] transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-[#18211b] border border-[#2a3a2c]/60 flex items-center justify-center text-[#9bcc44] group-hover:border-[#9bcc44]/50">
                <MapPin size={18} />
              </div>
              <span className="text-sm font-semibold">Mendoza, Argentina · puma-code.com</span>
            </a>
          </div>
        </div>

        <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-3xl p-8">
          {sent ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <CheckCircle2 className="text-[#9bcc44] mb-4" size={48} />
              <h3 className="text-xl font-black text-white uppercase italic">¡Gracias!</h3>
              <p className="text-sm text-[#8a9787] mt-2 max-w-xs">
                Recibimos tu consulta y te respondemos a la brevedad desde {EMAIL_INFO}.
              </p>
              <button onClick={() => { setSent(false); setForm({ nombre: '', bodega: '', email: '', telefono: '', mensaje: '' }); }}
                className="mt-6 text-[#9bcc44] text-xs font-black uppercase tracking-widest">Enviar otra consulta</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl">{error}</div>}
              {[
                { k: 'nombre', ph: 'Tu nombre', type: 'text' },
                { k: 'bodega', ph: 'Bodega / Finca', type: 'text' },
                { k: 'email', ph: 'Email', type: 'email' },
                { k: 'telefono', ph: 'Teléfono / WhatsApp', type: 'text' },
              ].map(f => (
                <input key={f.k} type={f.type} required placeholder={f.ph}
                  value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                  className="w-full bg-[#121a14] border-2 border-transparent p-4 rounded-2xl outline-none focus:border-[#9bcc44] text-white text-sm font-semibold placeholder-[#5d6f5a]" />
              ))}
              <textarea required placeholder="¿Qué querés resolver? (heladas, riego, cosecha, plagas…)" rows={3}
                value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                className="w-full bg-[#121a14] border-2 border-transparent p-4 rounded-2xl outline-none focus:border-[#9bcc44] text-white text-sm font-semibold placeholder-[#5d6f5a] resize-none" />
              <button type="submit" disabled={sending}
                className="w-full bg-[#9bcc44] text-[#0e1512] py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {sending ? <><Loader2 size={16} className="animate-spin" /> Enviando…</> : <><Send size={16} /> Enviar consulta</>}
              </button>
              <p className="text-center text-[11px] text-[#5d6f5a]">Tu consulta llega directo a {EMAIL_INFO}</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
