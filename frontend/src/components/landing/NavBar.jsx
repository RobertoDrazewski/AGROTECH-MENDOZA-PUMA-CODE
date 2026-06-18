import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Leaf, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

// Cambia el idioma modificando la cookie raíz y recargando para forzar la traducción completa
function changeLanguage(langCode) {
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';
  
  if (langCode !== 'es') {
    document.cookie = `googtrans=/es/${langCode}; path=/`;
    document.cookie = `googtrans=/es/${langCode}; path=/; domain=${window.location.hostname};`;
  }
  window.location.reload();
}

// Obtiene el idioma actualmente configurado en las cookies
function getActiveLang() {
  const match = document.cookie.match(/googtrans=\/es\/(\w+)/);
  return match ? match[1] : 'es';
}

const LANGS = [
  { code: 'es', label: 'Español', flag: <svg viewBox="0 0 36 24" width="20" height="14"><rect width="36" height="24" fill="#74ACDF"/><rect y="8" width="36" height="8" fill="#fff"/><circle cx="18" cy="12" r="2.5" fill="#F6B40E" stroke="#85340A" strokeWidth="0.3"/></svg> },
  { code: 'en', label: 'English', flag: <svg viewBox="0 0 36 24" width="20" height="14"><rect width="36" height="24" fill="#B22234"/><rect y="2" width="36" height="2" fill="#fff"/><rect y="6" width="36" height="2" fill="#fff"/><rect y="10" width="36" height="2" fill="#fff"/><rect y="14" width="36" height="2" fill="#fff"/><rect y="18" width="36" height="2" fill="#fff"/><rect y="22" width="36" height="2" fill="#fff"/><rect width="14" height="12" fill="#3C3B6E"/></svg> },
  { code: 'fr', label: 'Français', flag: <svg viewBox="0 0 36 24" width="20" height="14"><rect width="12" height="24" fill="#002395"/><rect x="12" width="12" height="24" fill="#fff"/><rect x="24" width="12" height="24" fill="#ED2939"/></svg> },
  { code: 'it', label: 'Italiano', flag: <svg viewBox="0 0 36 24" width="20" height="14"><rect width="12" height="24" fill="#009246"/><rect x="12" width="12" height="24" fill="#fff"/><rect x="24" width="12" height="24" fill="#CD212A"/></svg> },
  { code: 'pt', label: 'Português', flag: <svg viewBox="0 0 36 24" width="20" height="14"><rect width="36" height="24" fill="#009C3B"/><polygon points="18,3 33,12 18,21 3,12" fill="#FFDF00"/><circle cx="18" cy="12" r="4.5" fill="#002776"/></svg> },
  { code: 'de', label: 'Deutsch', flag: <svg viewBox="0 0 36 24" width="20" height="14"><rect width="36" height="8" fill="#000"/><rect y="8" width="36" height="8" fill="#D00"/><rect y="16" width="36" height="8" fill="#FFCE00"/></svg> }
];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeLang, setActiveLang] = useState('es');
  const [hiding, setHiding] = useState(false);
  const hideTimer = useRef(null);

  useEffect(() => {
    setActiveLang(getActiveLang());
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const links = [
    { to: '/servicios', label: 'Qué hacemos' },
    { to: '/industrias', label: 'Soluciones' },
    { to: '/video', label: 'Video' },
    { to: '/demo', label: 'Demo en vivo' },
    { to: '/contacto', label: 'Contacto' },
  ];

  const handleLangSelect = (code) => {
    setHiding(true);
    hideTimer.current = setTimeout(() => {
      changeLanguage(code);
    }, 300);
  };

  return (
    <>
      <style>{`
        .goog-te-banner-frame, .goog-te-balloon-frame, .skiptranslate { display: none !important; }
        body { top: 0 !important; }
        .lang-container {
          display: flex;
          align-items: center;
          gap: 4px;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .lang-container.hiding {
          opacity: 0;
          transform: translateY(-4px);
        }
        .flag-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 2px 4px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .flag-btn:hover {
          background: rgba(155,204,68,0.15);
          border-color: rgba(155,204,68,0.4);
          transform: scale(1.05);
        }
        .flag-btn.active {
          background: rgba(155,204,68,0.2);
          border-color: rgba(155,204,68,0.5);
          cursor: default;
        }
        .flag-btn span {
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          color: #9bcc44;
        }
        .flag-btn svg {
          border-radius: 2px;
        }
      `}</style>

      <nav className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 flex items-center ${scrolled ? 'h-14 bg-[#18211b]/90 backdrop-blur-lg shadow-2xl border-b border-[#2a3a2c]/50' : 'h-16 bg-gradient-to-b from-[#0e1512]/90 to-transparent'}`}>
        <div className="max-w-[1440px] h-full mx-auto px-4 md:px-12 flex justify-between items-center w-full">
          
          <Link to="/" className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#9bcc44]/10 rounded-lg text-[#9bcc44] border border-[#9bcc44]/20">
              <Leaf size={18} />
            </div>
            <div className="leading-none text-left">
              <span className="block text-sm font-black uppercase italic tracking-tighter text-white">AgroTech</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            {links.map(l => (
              <Link key={l.to} to={l.to} className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90 hover:text-[#9bcc44] transition-colors">
                {l.label}
              </Link>
            ))}

            {/* Selector de idiomas horizontal de escritorio */}
            <div className={`lang-container ${hiding ? 'hiding' : ''}`}>
              {LANGS.map(l => (
                <button 
                  key={l.code} 
                  className={`flag-btn ${activeLang === l.code ? 'active' : ''}`}
                  onClick={() => activeLang !== l.code && handleLangSelect(l.code)}
                  title={l.label}
                >
                  {l.flag}
                  <span>{l.code}</span>
                </button>
              ))}
            </div>

            <Link to="/login" className="flex items-center gap-1.5 bg-[#9bcc44] text-[#0e1512] text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-white transition-all">
              <Lock size={12} /> Acceso
            </Link>
          </div>

          <button onClick={() => setOpen(!open)} className="lg:hidden w-9 h-9 rounded-full flex items-center justify-center bg-[#18211b]/60 text-white border border-[#2a3a2c]/40">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Menú Desplegable Mobile */}
        {open && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-[#18211b] border-b border-[#2a3a2c]/50 px-4 py-6 flex flex-col gap-4 shadow-2xl">
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-[13px] font-black uppercase tracking-[0.2em] text-white hover:text-[#9bcc44] transition-colors">
                {l.label}
              </Link>
            ))}
            
            {/* Selector de idiomas en grilla responsiva móvil */}
            <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-[#2a3a2c]/30 my-2">
              {LANGS.map(l => (
                <button 
                  key={l.code} 
                  className={`flag-btn justify-center py-2 ${activeLang === l.code ? 'active' : ''}`}
                  onClick={() => { if(activeLang !== l.code) { setOpen(false); handleLangSelect(l.code); } }}
                >
                  {l.flag}
                  <span className="ml-1">{l.code}</span>
                </button>
              ))}
            </div>

            <Link to="/login" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1.5 bg-[#9bcc44] text-[#0e1512] text-[13px] font-black uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-white transition-all">
              <Lock size={14} /> Acceso Operador
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}