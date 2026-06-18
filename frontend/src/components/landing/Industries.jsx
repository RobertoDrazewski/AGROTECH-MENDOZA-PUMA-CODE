import React from 'react';
import { Cpu, Wifi, Sun, Camera, CloudRain, Thermometer, MapPin, Radio } from 'lucide-react';

export default function Industries() {
  const hardwareFeatures = [
    {
      icon: <Radio className="text-[#9bcc44]" size={32} />,
      title: "Nodo Sensor LoRa (Viñedo)",
      description: "Placa Heltec Wireless Tracker con ESP32-S3, LoRa SX1262 y GPS. Totalmente autónomo con panel solar de 2W y batería 18650 en gabinete IP65.",
      specs: ["Temperatura y Humedad (SHT31)", "Presión (BMP280)", "Temp. Suelo (DS18B20)"]
    },
    {
      icon: <Wifi className="text-[#9bcc44]" size={32} />,
      title: "Gateway de Bodega",
      description: "Unidad Heltec configurada como concentrador. Recibe la telemetría de todos los nodos vía LoRa y la retransmite a la nube de Puma-Code mediante WiFi.",
      specs: ["Sin límite de nodos", "Alimentación USB 5V", "Alta disponibilidad"]
    },
    {
      icon: <Camera className="text-[#9bcc44]" size={32} />,
      title: "Cámara Fitosanitaria IA",
      description: "Módulo ESP32-CAM autónomo con panel solar de 6W. Captura imágenes de trampas cromáticas para detección de Lobesia botrana mediante Inteligencia Artificial.",
      specs: ["Conexión WiFi directa", "Imágenes en Alta Resolución", "Batería 18650 x2"]
    }
  ];

  return (
    <section id="industries" className="relative py-24 bg-[#0e1512] overflow-hidden border-t border-[#2a3a2c]/40">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 relative z-10">
        
        {/* Cabecera de la sección */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#9bcc44] text-[10px] font-black uppercase tracking-[0.25em]">
            Hardware AgroTech
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white mt-3 leading-[0.95]">
            Infraestructura <span className="text-[#9bcc44]">IoT de Precisión</span>
          </h2>
          <p className="text-[#aebaa8] mt-6 text-sm md:text-base">
            Equipamiento diseñado y ensamblado en Mendoza. Combinamos microcontroladores de última generación con sensores de grado industrial para llevar los datos de tu viñedo a la nube en tiempo real.
          </p>
        </div>

        {/* Grid de Hardware Principal */}
        <div className="grid md:grid-cols-3 gap-8">
          {hardwareFeatures.map((feature, index) => (
            <div key={index} className="bg-[#18211b]/80 border border-[#2a3a2c]/60 rounded-[2rem] p-8 backdrop-blur-md hover:border-[#9bcc44]/50 transition-colors group">
              <div className="w-16 h-16 rounded-2xl bg-[#121a14] border border-[#2a3a2c] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-white text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-[#aebaa8] text-sm mb-6 leading-relaxed">
                {feature.description}
              </p>
              <ul className="space-y-2 border-t border-[#2a3a2c]/40 pt-4">
                {feature.specs.map((spec, idx) => (
                  <li key={idx} className="flex items-center text-xs text-[#aebaa8]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#9bcc44] mr-2"></div>
                    {spec}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Banner de Sensores */}
        <div className="mt-12 bg-[#121a14] border border-[#2a3a2c] rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <h4 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
              <Cpu className="text-[#9bcc44]" size={20} />
              Sensores de grado agronómico
            </h4>
            <p className="text-[#aebaa8] text-sm">
              Nuestros nodos soportan comunicación I2C y analógica para integrar sensores de alta precisión: medición de temperatura y humedad de suelo, estrés hídrico capacitivo y variables atmosféricas.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center md:justify-end">
            <div className="flex items-center gap-2 bg-[#0e1512] border border-[#2a3a2c] px-4 py-2 rounded-xl">
              <Thermometer size={16} className="text-[#9bcc44]" />
              <span className="text-white text-xs font-bold">Aire & Suelo</span>
            </div>
            <div className="flex items-center gap-2 bg-[#0e1512] border border-[#2a3a2c] px-4 py-2 rounded-xl">
              <CloudRain size={16} className="text-[#9bcc44]" />
              <span className="text-white text-xs font-bold">Riego Inteligente</span>
            </div>
            <div className="flex items-center gap-2 bg-[#0e1512] border border-[#2a3a2c] px-4 py-2 rounded-xl">
              <Sun size={16} className="text-[#9bcc44]" />
              <span className="text-white text-xs font-bold">Alerta Heladas</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}