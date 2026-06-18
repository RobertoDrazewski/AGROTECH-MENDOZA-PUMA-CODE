import React, { useState, useEffect } from 'react';
import { Menu, X, Leaf, Lock } from 'lucide-react';

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#servicios', label: 'Qué hacemos' },
    { href: '#industrias', label: 'Soluciones' },
    { href: '#video', label: 'Video' },
    { href: '#demo', label: 'Demo en vivo' },
    { href: '#contacto', label: 'Contacto' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 flex items-center ${scrolled ? 'h-14 bg-[#18211b]/90 backdrop-blur-lg shadow-2xl border-b border-[#2a3a2c]/50' : 'h-16 bg-gradient-to-b from-[#0e1512]/90 to-transparent'}`}>
      <div className="max-w-[1440px] h-full mx-auto px-4 md:px-12 flex justify-between items-center w-full">
        {/* Marca Textual */}
        <a href="#top" className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#9bcc44]/10 rounded-lg text-[#9bcc44] border border-[#9bcc44]/20">
            <Leaf size={18} />
          </div>
          <div className="leading-none text-left">
            <span className="block text-sm font-black uppercase italic tracking-tighter text-white">AgroTech Mendoza</span>
            <span className="block text-[8px] font-black uppercase tracking-[0.25em] text-[#9bcc44]">by puma-code.com</span>
          </div>
        </a>

        {/* Links desktop */}
        <div className="hidden lg:flex items-center gap-8">
          {links.map(l => (
            <a key={l.href} href={l.href}
              className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90 hover:text-[#9bcc44] transition-colors">
              {l.label}
            </a>
          ))}
          <a href="/login"
            className="flex items-center gap-1.5 bg-[#9bcc44] text-[#0e1512] text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white transition-all">
            <Lock size={12} /> Acceso Bodega
          </a>
        </div>

        {/* Mobile */}
        <button onClick={() => setOpen(!open)}
          className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center bg-[#18211b]/60 text-white border border-[#2a3a2c]/40">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="absolute top-[105%] left-4 right-4 bg-[#18211b]/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-[#2a3a2c]/60 lg:hidden">
          <div className="flex flex-col gap-5">
            {links.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="text-sm font-black uppercase text-white hover:text-[#9bcc44]">{l.label}</a>
            ))}
            <a href="/login" onClick={() => setOpen(false)}
              className="text-sm font-black uppercase text-[#9bcc44]">Acceso Bodega →</a>
          </div>
        </div>
      )}
    </nav>
  );
}