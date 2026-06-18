import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './components/landing/NavBar';
import Footer from './components/landing/Footer';
import ChatIA from './components/landing/ChatIA';

// Inicializa el script oficial y el contenedor oculto requerido
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
  useEffect(() => {
    injectGoogleTranslate();
  }, []);

  return (
    <div className="min-h-screen bg-[#0e1512] text-[#e8ede6] font-sans overflow-x-hidden selection:bg-[#9bcc44] selection:text-[#0e1512]">
      <NavBar />
      
      <main>
        <Outlet />
      </main>
      
      <Footer />
      <ChatIA />
    </div>
  );
}