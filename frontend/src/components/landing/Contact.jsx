import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageCircle } from 'lucide-react';

export default function Contact() {
  const [form, setForm] = useState({ nombre: '', bodega: '', email: '', telefono: '', mensaje: '' });
  const [sent, setSent] = useState(false);

  const WHATSAPP = '5492610000000'; // Reemplazá por tu número real
  const EMAIL = 'hola@puma-code.com';

  const handleSubmit = (e) => {
    e.preventDefault();
    // Sin backend de correo: abrimos WhatsApp con el mensaje pre-armado (funciona ya mismo).
    const txt = encodeURIComponent(
      `Hola AgroTech Mendoza! Soy ${form.nombre} de ${form.bodega}. ` +
      `Email: ${form.email}. Tel: ${form.telefono}. Consulta: ${form.mensaje}`
    );
    window.open(`https://wa.me/${WHATSAPP}?text=${txt}`, '_blank');
    setSent(true);
  };

  return (
    <section id="contacto" className="bg-[#121a14] border-t border-[#2a3a2c]/40 py-24">
      <div className="max-w-[1100px] mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-12">
        {/* Info */}
        <div>
          <span className="text-[#9bcc44] text-[10px] font-black uppercase tracking-[0.25em]">Contacto</span>
          <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white mt-3">
            Llevemos los datos a<br />tu <span className="text-[#9bcc44]">bodega</span>
          </h2>
          <p className="text-[#aebaa8] mt-5 leading-relaxed">
            Contanos cuántas hectáreas tenés y qué querés resolver. Coordinamos una visita técnica
            sin cargo y te armamos una propuesta a medida.
          </p>

          <div className="mt-8 space-y-4">
            {[
              { icon: Mail, t: EMAIL, href: `mailto:${EMAIL}` },
              { icon: Phone, t: '+54 9 261 000 0000', href: `https://wa.me/${WHATSAPP}` },
              { icon: MapPin, t: 'Mendoza, Argentina · puma-code.com', href: 'https://www.puma-code.com' },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <a key={i} href={c.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[#cdd8c8] hover:text-[#9bcc44] transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-[#18211b] border border-[#2a3a2c]/60 flex items-center justify-center text-[#9bcc44] group-hover:border-[#9bcc44]/50">
                    <Icon size={18} />
                  </div>
                  <span className="text-sm font-semibold">{c.t}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-3xl p-8">
          {sent ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <CheckCircle2 className="text-[#9bcc44] mb-4" size={48} />
              <h3 className="text-xl font-black text-white uppercase italic">¡Gracias!</h3>
              <p className="text-sm text-[#8a9787] mt-2 max-w-xs">
                Abrimos WhatsApp con tu consulta. Si no se abrió, escribinos a {EMAIL}.
              </p>
              <button onClick={() => setSent(false)}
                className="mt-6 text-[#9bcc44] text-xs font-black uppercase tracking-widest">Enviar otra consulta</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <textarea required placeholder="¿Qué querés resolver? (heladas, riego, cosecha…)" rows={3}
                value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                className="w-full bg-[#121a14] border-2 border-transparent p-4 rounded-2xl outline-none focus:border-[#9bcc44] text-white text-sm font-semibold placeholder-[#5d6f5a] resize-none" />
              <button type="submit"
                className="w-full bg-[#9bcc44] text-[#0e1512] py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-2">
                <MessageCircle size={16} /> Enviar por WhatsApp
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
