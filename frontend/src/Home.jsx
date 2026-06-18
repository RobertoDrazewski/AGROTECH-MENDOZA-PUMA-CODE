import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './components/landing/NavBar';
import Footer from './components/landing/Footer';
import ChatIA from './components/landing/ChatIA';

// Importamos los componentes para el modo Scroll Móvil
import Hero from './components/landing/Hero';
import Services from './components/landing/Services';
import Industries from './components/landing/Industries';
import VideoSection from './components/landing/VideoSection';
import LiveDemo from './components/landing/LiveDemo';
import Contact from './components/landing/Contact';

function injectGoogleTranslate() {
  if (document.getElementById('gt-script')) return;

  window.googleTranslateElementInit = () => {
    new window.google.translate.TranslateElement(
      { pageLanguage: 'es', autoDisplay: false },
      'google_translate_element'
    );
  };

  const script = document.createElement('script');
  script.id = 'gt-script';
  script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.body.appendChild(script);

  const div = document.createElement('div');
  div.id = 'google_translate_element';
  div.style.display = 'none';
  document.body.appendChild(div);
}

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    injectGoogleTranslate();

    // Detectar tamaño de pantalla para activar el scroll continuo en móvil
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024); // 1024px es el breakpoint 'lg' de Tailwind
    };

    handleResize(); // Ejecución inicial
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#0e1512] text-[#e8ede6] font-sans overflow-x-hidden selection:bg-[#9bcc44] selection:text-[#0e1512]">
      <NavBar />
      
      <main>
        {isMobile ? (
          /* En móvil, se apilan todas las secciones con IDs para poder scrollear de corrido */
          <div className="flex flex-col">
            <div id="inicio"><Hero /></div>
            <div id="servicios"><Services /></div>
            <div id="industrias"><Industries /></div>
            <div id="video"><VideoSection /></div>
            <div id="demo"><LiveDemo /></div>
            <div id="contacto"><Contact /></div>
          </div>
        ) : (
          /* En Desktop, se mantiene tu hermosa estructura por páginas independientes */
          <Outlet />
        )}
      </main>
      
      <Footer />
      <ChatIA />
    </div>
  );
}