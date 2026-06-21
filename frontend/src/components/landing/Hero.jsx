import React from 'react';
import { ArrowRight, Activity, CloudSnow, Droplets, Grape } from 'lucide-react';
import heroBg from '../../assets/hero.png';
import logo from '../../assets/agrotech-logo.png';

export default function Hero() {
  return (
    <header id="top" className="relative min-h-screen flex items-center pt-36 md:pt-44 pb-16 overflow-hidden">
      {/* Fondo */}
      <div className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `linear-gradient(rgba(14,21,18,0.82), rgba(14,21,18,0.94)), url(${heroBg})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
      <div className="absolute top-0 left-0 w-[40rem] h-[40rem] bg-[#9bcc44]/10 blur-[160px] rounded-full -z-10" />

      <div className="max-w-[1440px] mx-auto px-6 md:px-12 w-full flex flex-col">
        
        {/* Superior: Logo al lado del Título */}
        <div className="flex flex-col lg:flex-row items-center lg:items-center gap-8 lg:gap-16 animate-fade-up">
          {/* Logo */}
          <img 
            src={logo} 
            alt="AgroTech Mendoza Logo" 
            className="logo-img h-64 md:h-[22rem] w-auto object-contain shrink-0" 
          />
          
          {/* Texto al lado del logo */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <span className="inline-flex items-center gap-2 bg-[#9bcc44]/10 border border-[#9bcc44]/25 text-[#9bcc44] text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-6">
              <Activity size={12} /> Agricultura 4.0 · IoT + IA · Mendoza
            </span>
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-[0.95] text-white">
              Cuidamos tu <span className="text-[#9bcc44]">viñedo</span><br />
              con datos en<br />tiempo real
            </h1>
          </div>
        </div>

        {/* Medio: Descripción, Botones y Texto de Bodegas */}
        <div className="mt-8 md:mt-12 animate-fade-up max-w-4xl flex flex-col items-center lg:items-start text-center lg:text-left">
          <p className="text-base md:text-lg text-[#aebaa8] leading-relaxed">
            En <strong className="text-white">Puma-Code.com</strong> capturamos la telemetría de tu finca con
            sensores IoT y la convertimos en dashboards con KPIs, predicción de cosecha por IA,
            alertas de helada, granizo y estrés hídrico, y riego inteligente. Para que tomes
            decisiones antes de perder una sola hilera.
          </p>

          <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-3">
            <a href="#demo"
              className="inline-flex items-center gap-2 bg-[#9bcc44] text-[#0e1512] font-black uppercase tracking-widest text-xs px-6 py-4 rounded-2xl hover:bg-white transition-all">
              Ver demo en vivo <ArrowRight size={16} />
            </a>
            <a href="#contacto"
              className="inline-flex items-center gap-2 bg-white/5 border border-[#2a3a2c] text-white font-black uppercase tracking-widest text-xs px-6 py-4 rounded-2xl hover:border-[#9bcc44]/50 transition-all">
              Solicitar visita técnica
            </a>
          </div>

          <p className="mt-6 text-[11px] uppercase tracking-widest text-[#5d6f5a] font-bold">
            Bodegas y viñedos de Luján de Cuyo · Maipú · Valle de Uco
          </p>
        </div>

        {/* Final: Los 4 bloques extendidos horizontalmente */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up w-full">
          {[
            { icon: CloudSnow, t: 'Alerta de heladas', d: 'Aviso horas antes con punto de rocío y tendencia térmica.', c: 'text-cyan-300' },
            { icon: Grape, t: 'Cosecha óptima', d: 'IA sobre curva Brix/pH para definir la vendimia.', c: 'text-[#9bcc44]' },
            { icon: Droplets, t: 'Riego inteligente', d: 'Regar solo cuando el suelo lo necesita.', c: 'text-blue-300' },
            { icon: Activity, t: 'Telemetría 24/7', d: 'Cada cuartel monitoreado en tiempo real.', c: 'text-amber-300' },
          ].map((x, i) => {
            const Icon = x.icon;
            return (
              <div key={i} className="bg-[#18211b]/80 border border-[#2a3a2c]/60 rounded-2xl p-5 backdrop-blur-md hover:border-[#9bcc44]/40 transition-all">
                <Icon className={`${x.c} mb-3`} size={26} />
                <h3 className="text-sm font-black text-white">{x.t}</h3>
                <p className="text-xs text-[#8a9787] mt-1.5 leading-relaxed">{x.d}</p>
              </div>
            );
          })}
        </div>

      </div>
    </header>
  );
}