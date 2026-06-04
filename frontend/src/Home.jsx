import React from 'react';
import NavBar from './components/landing/NavBar';
import Hero from './components/landing/Hero';
import Services from './components/landing/Services';
import Industries from './components/landing/Industries';
import VideoSection from './components/landing/VideoSection';
import LiveDemo from './components/landing/LiveDemo';
import Contact from './components/landing/Contact';
import Footer from './components/landing/Footer';
import ChatIA from './components/landing/ChatIA';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0e1512] text-[#e8ede6] font-sans overflow-x-hidden selection:bg-[#9bcc44] selection:text-[#0e1512]">
      <NavBar />
      <Hero />
      <Services />
      <Industries />
      <VideoSection />
      <LiveDemo />
      <Contact />
      <Footer />
      <ChatIA />
    </div>
  );
}
