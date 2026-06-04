import React from 'react';
import { Leaf } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0e1512] border-t border-[#2a3a2c]/40 py-10">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#9bcc44]/10 rounded-lg text-[#9bcc44] border border-[#9bcc44]/20">
            <Leaf size={16} />
          </div>
          <span className="text-sm font-black uppercase italic tracking-tighter text-white">
            AgroTech Mendoza <span className="text-[#9bcc44] not-italic">· by puma-code.com</span>
          </span>
        </div>
        <p className="text-[11px] text-[#5d6f5a] uppercase tracking-widest font-bold text-center">
          © {new Date().getFullYear()} Puma-Code.com · Agricultura de precisión · Mendoza, Argentina
        </p>
        <a href="https://www.puma-code.com" target="_blank" rel="noopener noreferrer"
          className="text-[11px] text-[#9bcc44] hover:text-white uppercase tracking-widest font-black">
          www.puma-code.com →
        </a>
      </div>
    </footer>
  );
}
