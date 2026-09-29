import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export interface BannerSlide {
  url: string;
  label: string;
  sub: string;
}

interface ModuleBannerProps {
  slides: BannerSlide[];
  badge: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  ctaLabel2?: string;
  ctaHref2?: string;
}

const ModuleBanner = ({
  slides, badge, ctaLabel, ctaHref, onCtaClick, ctaLabel2, ctaHref2,
}: ModuleBannerProps) => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback((idx: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => { setCurrent(idx); setAnimating(false); }, 400);
  }, [animating]);

  const prev = () => goTo((current - 1 + slides.length) % slides.length);
  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo, slides.length]);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  return (
    <div className="relative w-full h-64 sm:h-80 lg:h-96 overflow-hidden bg-[hsl(218,70%,14%)]">
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
        >
          <img
            src={slide.url}
            alt={slide.label}
            className="w-full h-full object-cover object-center"
            style={{ filter: animating && i === current ? 'brightness(0.85)' : 'brightness(1)', transition: 'filter 0.4s' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(218,70%,14%)] via-[hsl(218,70%,14%)]/65 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(218,70%,14%)]/70 via-transparent to-transparent" />
        </div>
      ))}

      {/* Texte centré */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div
          key={current}
          className="text-center transition-all duration-500"
          style={{ opacity: animating ? 0 : 1, transform: animating ? 'translateY(8px)' : 'translateY(0)' }}
        >
          <div className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">{badge}</div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-tight mb-2">
            {slides[current].label}
          </h1>
          <p className="text-white/70 text-sm sm:text-base max-w-md mx-auto mb-5">
            {slides[current].sub}
          </p>
          {(ctaLabel || ctaLabel2) && (
            <div className="flex gap-2 flex-wrap justify-center">
              {ctaLabel && (
                onCtaClick ? (
                  <Button onClick={onCtaClick} variant="outline"
                    className="gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm">
                    {ctaLabel}
                  </Button>
                ) : ctaHref ? (
                  <Button asChild variant="outline"
                    className="gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm">
                    <Link to={ctaHref}>{ctaLabel}</Link>
                  </Button>
                ) : null
              )}
              {ctaLabel2 && ctaHref2 && (
                <Button asChild className="gap-2 bg-primary hover:bg-primary/90 text-white border-0 shadow-lg">
                  <Link to={ctaHref2}>{ctaLabel2}</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Flèches */}
      <button onClick={prev} aria-label="Précédent"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white transition">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={next} aria-label="Suivant"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 border border-white/20 backdrop-blur-sm flex items-center justify-center text-white transition">
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 right-6 z-20 flex items-center gap-2">
        {slides.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-white/40 hover:bg-white/70'}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ModuleBanner;
