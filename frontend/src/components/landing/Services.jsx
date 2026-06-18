import React from 'react';
import { Radio, LayoutDashboard, BrainCircuit, CloudSnow, Droplets, FileBarChart, Bug } from 'lucide-react';

const SERVICES = [
  {
    icon: Radio,
    title: 'Telemetría IoT en campo',
    desc: 'Despliegue de nodos Heltec con LoRaWAN y GPS. Monitoreo autónomo de clima y suelo con alcance de largo alcance, diseñado para viñedos extensos sin dependencia de WiFi.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboards con KPIs',
    desc: 'Tableros de control en tiempo real: visualización del mapa de finca, curvas climáticas y métricas vivas desde cualquier dispositivo, PC o smartphone.',
  },
  {
    icon: BrainCircuit,
    title: 'IA: predicción de cosecha',
    desc: 'Algoritmos propios que analizan la evolución de azúcar (Brix) y acidez (pH) para determinar la ventana exacta de vendimia según tu perfil de vino.',
  },
  {
    icon: CloudSnow,
    title: 'Alerta Heladas y Clima',
    desc: 'API meteorológica integrada que anticipa eventos extremos, heladas, granizo y golpes de calor, calculando riesgo mediante punto de rocío y variables locales.',
  },
  {
    icon: Droplets,
    title: 'Riego inteligente',
    desc: 'Automatización basada en datos: activamos tu sistema de riego solo cuando los sensores capacitivos lo requieren, maximizando el ahorro hídrico.',
  },
  {
    icon: FileBarChart,
    title: 'Análisis Histórico',
    desc: 'Reportes exhaustivos de cada cuartel: temperatura, grados-día y precipitaciones. Datos precisos para gestión operativa y planificación financiera.',
  },
  {
    icon: Bug,
    title: 'Detección de Plagas IA',
    desc: 'Trampas cromáticas inteligentes con visión por computadora. Detección automática de Lobesia botrana para tratar solo cuando el umbral de daño lo requiere.',
  },
];

export default function Services() {
  return (
    <section id="servicios" className="relative py-24 bg-[#0e1512] border-t border-[#2a3a2c]/40 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 relative z-10">
        
        {/* Cabecera de sección */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="text-[#9bcc44] text-[10px] font-black uppercase tracking-[0.25em]">
            Qué hacemos
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white mt-3 leading-[0.95]">
            Del sensor a la <span className="text-[#9bcc44]">decisión</span>
          </h2>
          <p className="text-[#aebaa8] mt-6 text-sm md:text-base leading-relaxed">
            Conectamos el mundo físico de tu finca con la nube y lo transformamos en información accionable. Tecnología desarrollada a medida por la división AgroTech de Puma-Code.com.
          </p>
        </div>

        {/* Grid de servicios */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((s, i) => {
            const Icon = s.icon;
            return (
              <div 
                key={i} 
                className="bg-[#18211b]/80 border border-[#2a3a2c]/60 rounded-[2rem] p-8 backdrop-blur-md hover:border-[#9bcc44]/50 transition-all duration-300 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-[#121a14] border border-[#2a3a2c] text-[#9bcc44] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Icon size={24} />
                </div>
                <h3 className="text-white text-lg font-black uppercase tracking-tight mb-3">
                  {s.title}
                </h3>
                <p className="text-[#aebaa8] text-sm leading-relaxed">
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}