import React from 'react';
import { Radio, LayoutDashboard, BrainCircuit, CloudSnow, Droplets, FileBarChart, Bug } from 'lucide-react';

const SERVICES = [
  {
    icon: Radio,
    title: 'Telemetría IoT en campo',
    desc: 'Nodos ESP32 + LoRaWAN de bajo consumo y alimentación solar miden temperatura, humedad de aire y suelo, presión, Brix y pH estimados en cada cuartel. Alcance de varios kilómetros sin depender de WiFi.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboards con KPIs',
    desc: 'Tableros en tiempo real por cuartel: mapa de la finca, curvas climáticas y métricas vivas. Toda tu bodega en una sola pantalla, en la PC o el celular.',
  },
  {
    icon: BrainCircuit,
    title: 'IA: predicción de cosecha',
    desc: 'Modelos que analizan la curva de azúcar (Brix) y acidez (pH) para sugerir la ventana óptima de vendimia según el perfil de vino que buscás.',
  },
  {
    icon: CloudSnow,
    title: 'Heladas, granizo y clima',
    desc: 'API del clima conectada que pronostica heladas, granizo, golpe de calor y viento Zonda. Calculamos punto de rocío y enfriamiento para avisarte horas antes.',
  },
  {
    icon: Droplets,
    title: 'Riego inteligente',
    desc: 'Integramos tu sistema de riego existente. La plataforma decide y comanda cuándo regar y cuándo no según la humedad real del suelo, ahorrando agua.',
  },
  {
    icon: FileBarChart,
    title: 'Análisis por mes y por año',
    desc: 'Reportes históricos de cada viñedo: temperatura, precipitaciones, eventos de helada y grados-día. Datos para decidir y para presentar a tus socios.',
  },
  {
    icon: Bug,
    title: 'Monitoreo fitosanitario con IA',
    desc: 'Trampas inteligentes con cámara y un modelo de visión que detecta y cuenta plagas clave de la vid (como Lobesia botrana). Te avisa cuándo superás el umbral para tratar en el momento justo.',
  },
];

export default function Services() {
  return (
    <section id="servicios" className="max-w-[1440px] mx-auto px-6 md:px-12 py-24">
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <span className="text-[#9bcc44] text-[10px] font-black uppercase tracking-[0.25em]">Qué hacemos</span>
        <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white mt-3">
          Del sensor a la <span className="text-[#9bcc44]">decisión</span>
        </h2>
        <p className="text-[#aebaa8] mt-4 leading-relaxed">
          Conectamos el mundo físico de tu finca con la nube y lo transformamos en información
          accionable. Tecnología desarrollada a medida por la división AgroTech de Puma-Code.com.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SERVICES.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i}
              className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-3xl p-7 hover:border-[#9bcc44]/40 hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-[#9bcc44]/10 border border-[#9bcc44]/20 text-[#9bcc44] flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Icon size={22} />
              </div>
              <h3 className="text-lg font-black text-white mb-2">{s.title}</h3>
              <p className="text-sm text-[#8a9787] leading-relaxed">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
