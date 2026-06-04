import React from 'react';
import { CheckCircle2, Cpu, Wifi, Sun } from 'lucide-react';

export default function Industries() {
  return (
    <section id="industrias" className="bg-[#121a14] border-y border-[#2a3a2c]/40 py-24">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-14 items-center">
        {/* Texto */}
        <div>
          <span className="text-[#9bcc44] text-[10px] font-black uppercase tracking-[0.25em]">El ecosistema AgroTech de Mendoza</span>
          <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tight text-white mt-3">
            Tecnología pensada para<br />nuestro <span className="text-[#9bcc44]">terroir</span>
          </h2>
          <p className="text-[#aebaa8] mt-5 leading-relaxed">
            Mendoza es referente en agricultura 4.0: gestión hídrica, vitivinicultura de precisión,
            monitoreo de plagas con IA y robótica de riego. Acompañamos esa transformación con una
            plataforma propia, sin depender de proveedores externos, escalable de unas pocas hectáreas
            a redes de decenas de sensores.
          </p>

          <ul className="mt-7 space-y-3">
            {[
              'Gestión hídrica y ahorro de agua medido en tiempo real',
              'Defensa anti-helada y anti-granizo con aviso anticipado',
              'Decisión de vendimia basada en datos, no en intuición',
              'Datos abiertos para integrar con tus sistemas y los de INTA/ISCAMEN',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[#cdd8c8]">
                <CheckCircle2 size={18} className="text-[#9bcc44] shrink-0 mt-0.5" /> {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Specs de hardware */}
        <div className="bg-[#18211b] border border-[#2a3a2c]/60 rounded-3xl p-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#9bcc44] mb-6">Nodo de campo · especificaciones</h3>
          <div className="grid grid-cols-2 gap-5">
            {[
              { icon: Cpu, t: 'ESP32', d: 'WiFi/BLE + procesamiento en el borde' },
              { icon: Wifi, t: 'LoRaWAN', d: 'Hasta ~5-10 km de alcance rural' },
              { icon: Sun, t: 'Solar', d: 'Panel 6V + batería 18650, autónomo' },
              { icon: CheckCircle2, t: 'IP65', d: 'Gabinete resistente a intemperie' },
            ].map((x, i) => {
              const Icon = x.icon;
              return (
                <div key={i} className="bg-[#121a14] border border-[#2a3a2c]/50 rounded-2xl p-5">
                  <Icon className="text-[#9bcc44] mb-3" size={22} />
                  <p className="text-base font-black text-white">{x.t}</p>
                  <p className="text-[11px] text-[#8a9787] mt-1 leading-snug">{x.d}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[#5d6f5a] mt-6 leading-relaxed">
            Sensores soportados: DS18B20 (temp. suelo), DHT22/SHT31 (aire), capacitivo de humedad,
            BMP280 (presión), refractómetro/muestreo para Brix y pH.
          </p>
        </div>
      </div>
    </section>
  );
}
