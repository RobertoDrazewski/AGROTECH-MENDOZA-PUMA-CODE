import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Leaf, Loader2, FileText, ArrowLeft } from 'lucide-react';
import apiService from '../../services/api';

export default function ChatIA() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('chat'); // 'chat' | 'budget'
  const [budget, setBudget] = useState({ name: '', email: '', bodega: '' });
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy el asesor de AgroTech Mendoza. Contame sobre tu viñedo (hectáreas, qué querés resolver: heladas, riego, cosecha, plagas) y cuando quieras te armo un presupuesto a medida.' },
  ]);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open, mode]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMsgs = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs); setInput(''); setLoading(true);
    try {
      const res = await apiService.chat(text, newMsgs.slice(-8));
      setMessages([...newMsgs, { role: 'assistant', content: res.response }]);
    } catch (e) {
      setMessages([...newMsgs, { role: 'assistant', content: 'No pude conectarme ahora. Escribinos a info@puma-code.com y te respondemos enseguida.' }]);
    } finally { setLoading(false); }
  };

  const enviarPresupuesto = async () => {
    if (!budget.name.trim() || !budget.email.includes('@') || loading) return;
    setLoading(true);
    const historyForApi = messages.map(m => ({ role: m.role, content: m.content }));
    try {
      const res = await apiService.pedirPresupuesto(historyForApi, budget);
      const msg = res.resumen_cliente || 'Te preparamos el presupuesto y te lo enviamos por mail. ¡Gracias!';
      setMessages([...messages, { role: 'assistant', content: msg }]);
    } catch (e) {
      setMessages([...messages, { role: 'assistant', content: 'No pude generar el presupuesto en este momento. Dejanos tu consulta en el formulario de contacto o escribinos a info@puma-code.com.' }]);
    } finally {
      setLoading(false); setMode('chat');
      setBudget({ name: '', email: '', bodega: '' });
    }
  };

  const quick = ['¿Cómo detectan heladas?', '¿Cómo funciona el riego?', 'Quiero un presupuesto'];

  return (
    <>
      <button onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[1100] w-14 h-14 rounded-full bg-[#9bcc44] text-[#0e1512] shadow-2xl flex items-center justify-center hover:scale-110 transition-transform">
        {open ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[1100] w-[92vw] max-w-sm h-[70vh] max-h-[580px] bg-[#18211b] border border-[#2a3a2c]/70 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-up">
          <div className="bg-[#121a14] border-b border-[#2a3a2c]/60 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#9bcc44]/15 border border-[#9bcc44]/25 text-[#9bcc44] flex items-center justify-center">
              <Leaf size={18} />
            </div>
            <div className="leading-tight flex-1">
              <p className="text-sm font-black text-white uppercase italic tracking-tight">Asesor AgroTech</p>
              <p className="text-[10px] text-[#9bcc44] font-bold uppercase tracking-widest">by puma-code.com</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${m.role === 'user' ? 'bg-[#9bcc44] text-[#0e1512] font-semibold rounded-br-md' : 'bg-[#121a14] text-[#cdd8c8] border border-[#2a3a2c]/50 rounded-bl-md'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#121a14] border border-[#2a3a2c]/50 px-4 py-3 rounded-2xl rounded-bl-md">
                  <Loader2 size={16} className="animate-spin text-[#9bcc44]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {mode === 'budget' ? (
            <div className="p-4 border-t border-[#2a3a2c]/60 space-y-2.5">
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => setMode('chat')} className="text-[#8a9787] hover:text-white"><ArrowLeft size={16} /></button>
                <p className="text-xs font-black uppercase tracking-widest text-[#9bcc44]">Datos para tu presupuesto</p>
              </div>
              <input value={budget.name} onChange={(e) => setBudget({ ...budget, name: e.target.value })} placeholder="Tu nombre"
                className="w-full bg-[#121a14] border border-[#2a3a2c]/60 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#9bcc44] placeholder-[#5d6f5a]" />
              <input value={budget.email} onChange={(e) => setBudget({ ...budget, email: e.target.value })} placeholder="Tu email" type="email"
                className="w-full bg-[#121a14] border border-[#2a3a2c]/60 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#9bcc44] placeholder-[#5d6f5a]" />
              <input value={budget.bodega} onChange={(e) => setBudget({ ...budget, bodega: e.target.value })} placeholder="Bodega / Finca (opcional)"
                className="w-full bg-[#121a14] border border-[#2a3a2c]/60 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#9bcc44] placeholder-[#5d6f5a]" />
              <button onClick={enviarPresupuesto} disabled={loading}
                className="w-full bg-[#9bcc44] text-[#0e1512] py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} Generar presupuesto
              </button>
              <p className="text-[10px] text-[#5d6f5a] text-center">Calculamos el dólar del día y te lo enviamos a tu mail.</p>
            </div>
          ) : (
            <>
              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  {quick.map(q => (
                    <button key={q} onClick={() => q.includes('presupuesto') ? setMode('budget') : setInput(q)}
                      className="text-[11px] bg-[#121a14] border border-[#2a3a2c]/60 text-[#9fb09c] px-3 py-1.5 rounded-full hover:border-[#9bcc44]/50 hover:text-white transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <div className="px-4 pt-1">
                <button onClick={() => setMode('budget')}
                  className="w-full mb-2 flex items-center justify-center gap-2 text-[#9bcc44] bg-[#9bcc44]/10 border border-[#9bcc44]/25 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#9bcc44]/20 transition-all">
                  <FileText size={13} /> Pedir presupuesto
                </button>
              </div>
              <div className="p-3 pt-0 flex items-center gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Escribí tu consulta…"
                  className="flex-1 bg-[#121a14] border border-[#2a3a2c]/60 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#9bcc44] placeholder-[#5d6f5a]" />
                <button onClick={send} disabled={loading}
                  className="w-10 h-10 rounded-xl bg-[#9bcc44] text-[#0e1512] flex items-center justify-center hover:bg-white transition-all disabled:opacity-50">
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
