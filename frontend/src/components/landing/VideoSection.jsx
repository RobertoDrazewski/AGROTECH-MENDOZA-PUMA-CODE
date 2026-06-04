import React, { useState } from 'react';
import { Play } from 'lucide-react';

export default function VideoSection() {
  const [playing, setPlaying] = useState(false);

  // Reemplazá VIDEO_URL por el embed de tu video (YouTube/Vimeo) cuando lo grabes,
  // o dejá un archivo en /public/promo.mp4 y descomentá el bloque <video>.
  const VIDEO_URL = ''; // ej: "https://www.youtube.com/embed/XXXXXXXX"

  return (
    <section id="video" className="max-w-[1100px] mx-auto px-6 md:px-12 py-24">
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <span className="text-[#9bcc44] text-[10px] font-black uppercase tracking-[0.25em]">Conocé el proyecto</span>
        <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white mt-3">
          AgroTech Mendoza en <span className="text-[#9bcc44]">2 minutos</span>
        </h2>
      </div>

      <div className="relative rounded-[2rem] overflow-hidden border border-[#2a3a2c]/60 aspect-video bg-[#18211b] shadow-2xl">
        {VIDEO_URL && playing ? (
          <iframe className="w-full h-full" src={`${VIDEO_URL}?autoplay=1`}
            title="AgroTech Mendoza" allow="autoplay; encrypted-media" allowFullScreen />
        ) : (
          // {/* <video src="/promo.mp4" controls className="w-full h-full object-cover" /> */}
          <button onClick={() => VIDEO_URL && setPlaying(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#9bcc44]/10 to-[#0e1512]/60" />
            <div className="relative w-20 h-20 rounded-full bg-[#9bcc44] text-[#0e1512] flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <Play size={32} className="ml-1" fill="currentColor" />
            </div>
            <p className="relative text-white font-black uppercase tracking-widest text-sm">
              {VIDEO_URL ? 'Reproducir presentación' : 'Espacio reservado para tu video'}
            </p>
            {!VIDEO_URL && (
              <p className="relative text-[#8a9787] text-xs max-w-md text-center px-6">
                Grabá tu video promocional y pegá el enlace en <code className="text-[#9bcc44]">VIDEO_URL</code> dentro de
                VideoSection.jsx, o subí <code className="text-[#9bcc44]">promo.mp4</code> a la carpeta /public.
              </p>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
