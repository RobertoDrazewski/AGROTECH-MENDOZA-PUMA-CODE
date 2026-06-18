import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, Loader2, Cpu, MessageCircle } from 'lucide-react';
import apiService from '../../services/api';

const EMAIL_INFO = 'info@puma-code.com';
const WHATSAPP_LINK = 'https://wa.me/5492616512165';

export default function Contact() {
  const [form, setForm] = useState({ nombre: '', bodega: '', email: '', telefono: '', mensaje: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      // 1. Intentamos el envío por la API de tu backend
      await apiService.enviarContacto(form);
      // 2. Solo si responde exitosamente, mostramos la pantalla de éxito
      setSent(true);
    } catch (err) {
      console.error("Error crítico en API, ejecutando fallback a mailto:", err);
      
      const subject = encodeURIComponent(`Consulta AgroTech - ${form.bodega || form.nombre}`);
      const body = encodeURIComponent(
        `Nombre: ${form.nombre}\nBodega: ${form.bodega}\nEmail: ${form.email}\nTel: ${form.telefono}\n\nMensaje:\n${form.mensaje}`
      );
      
      // 3. Fallback: abrimos el cliente de correo
      window.location.href = `mailto:${EMAIL_INFO}?subject=${subject}&body=${body}`;
      
      // 4. Alertamos al usuario en lugar de mentirle con setSent(true)
      alert("Hubo un error de conexión con el servidor. Se abrirá tu aplicación de correo para enviar la consulta manualmente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contacto" className="relative py-24 border-t border-[#2a3a2c]/40 bg-[#0e1512] overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          
          <div>
            <span className="text-[#9bcc44] text-[10px] font-black uppercase tracking-[0.25em]">Contacto</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white mt-3 leading-[0.95]">
              Asistencia para tu <span className="text-[#9bcc44]">viñedo</span>
            </h2>
            
            <div className="mt-12 flex flex-col gap-6">
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 bg-[#25d366]/10 border border-[#25d366]/20 p-4 rounded-2xl hover:bg-[#25d366]/20 transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#25d366] text-white flex items-center justify-center">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Comunicate con nuestro asistente en persona</h4>
                  <p className="text-[#aebaa8] text-xs">Hablar directo por WhatsApp</p>
                </div>
              </a>
              
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#18211b] border border-[#2a3a2c] flex items-center justify-center text-[#9bcc44]">
                  <Mail size={20} />
                </div>
                <p className="text-[#aebaa8] text-sm">{EMAIL_INFO}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#18211b]/80 border border-[#2a3a2c]/60 rounded-[2rem] p-8 md:p-10 backdrop-blur-md">
            {sent ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-center">
                <CheckCircle2 size={48} className="text-[#9bcc44] mb-4" />
                <h3 className="text-white font-black uppercase">¡Consulta enviada!</h3>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <input required placeholder="Nombre" className="bg-[#121a14] p-4 rounded-2xl text-white outline-none focus:border-[#9bcc44] border-2 border-transparent" 
                    onChange={e => setForm({...form, nombre: e.target.value})} />
                  <input required placeholder="Bodega" className="bg-[#121a14] p-4 rounded-2xl text-white outline-none focus:border-[#9bcc44] border-2 border-transparent"
                    onChange={e => setForm({...form, bodega: e.target.value})} />
                </div>
                <input required type="email" placeholder="Email" className="bg-[#121a14] p-4 rounded-2xl text-white outline-none focus:border-[#9bcc44] border-2 border-transparent"
                  onChange={e => setForm({...form, email: e.target.value})} />
                <input required type="tel" placeholder="Teléfono" className="bg-[#121a14] p-4 rounded-2xl text-white outline-none focus:border-[#9bcc44] border-2 border-transparent"
                  onChange={e => setForm({...form, telefono: e.target.value})} />
                <textarea required placeholder="Mensaje" rows={4} className="bg-[#121a14] p-4 rounded-2xl text-white outline-none focus:border-[#9bcc44] border-2 border-transparent"
                  onChange={e => setForm({...form, mensaje: e.target.value})} />
                
                <button type="submit" disabled={sending}
                  className="w-full bg-[#9bcc44] text-[#0e1512] py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all">
                  {sending ? <Loader2 className="animate-spin mx-auto" /> : "Enviar consulta"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}