import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-6 z-[140] w-10 h-10 rounded-full border border-border bg-background/95 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-muted transition-all duration-200 hover:scale-110 active:scale-95"
      aria-label="Retour en haut"
      style={{ animation: 'fadeIn 0.2s ease' }}
    >
      <ArrowUp className="w-4 h-4 text-foreground" />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </button>
  );
};

export default BackToTop;
