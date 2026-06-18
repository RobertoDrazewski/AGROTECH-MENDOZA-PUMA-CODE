import React, { useState, useRef } from 'react';
import { Play } from 'lucide-react';
import promoVideo from '../../assets/gemini_generated_video_341DC080.MP4';

export default function VideoSection() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);

  const handlePlay = async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.play();
        setPlaying(true);
      }
    } catch (error) {
      console.error("Error del navegador al reproducir el video:", error);
    }
  };

  return (
    <section id="video" className="max-w-[1100px] mx-auto px-6 md:px-12 py-24">
      <div className="text-center mb-10 max-w-2xl mx-auto">
        <span className="text-[#9bcc44] text-[10px] font-black uppercase tracking-[0.25em]">Conocé el proyecto</span>
        <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white mt-3">
          AgroTech Mendoza en <span className="text-[#9bcc44]">2 minutos</span>
        </h2>
      </div>

      <div className="relative rounded-[2rem] overflow-hidden border border-[#2a3a2c]/60 aspect-video bg-[#18211b] shadow-2xl group">
        <video 
          ref={videoRef}
          src={promoVideo}
          controls={playing}
          playsInline
          className="w-full h-full object-cover"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        
        {!playing && (
          <div 
            onClick={handlePlay}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 cursor-pointer bg-black/20 hover:bg-black/10 transition-colors w-full h-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#9bcc44]/10 to-[#0e1512]/60 pointer-events-none" />
            <div className="relative w-20 h-20 rounded-full bg-[#9bcc44] text-[#0e1512] flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
              <Play size={32} className="ml-1" fill="currentColor" />
            </div>
            <p className="relative text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
              Reproducir presentación
            </p>
          </div>
        )}
      </div>
    </section>
  );
}