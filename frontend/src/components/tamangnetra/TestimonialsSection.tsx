'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Mountain, ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Dr. Sunita Tamang',
    role: 'Linguistics Professor, TU',
    location: 'Kathmandu, Nepal',
    quote:
      'TamangNetra represents a breakthrough for indigenous language technology. For the first time, my students can translate academic papers into Tamang while preserving the nuance of our mother tongue. This is what digital preservation looks like.',
    color: 'emerald',
    initials: 'ST',
  },
  {
    id: 2,
    name: 'Rajesh Shrestha',
    role: 'NGO Field Coordinator',
    location: 'Pokhara, Nepal',
    quote:
      'Working with rural Tamang communities, language barriers are our biggest challenge. TamangNetra has transformed how we deliver healthcare information — real-time, accurate translation that the community actually trusts.',
    color: 'amber',
    initials: 'RS',
  },
  {
    id: 3,
    name: 'Anita Gurung',
    role: 'Digital Archive Director',
    location: 'Lalitpur, Nepal',
    quote:
      'The PII protection and encryption features give us confidence to process sensitive legal documents. TamangNetra is not just a translation tool — it is a complete, secure pipeline for multilingual document processing.',
    color: 'teal',
    initials: 'AG',
  },
];

const colorMap: Record<string, { border: string; bg: string; text: string; avatar: string; quote: string }> = {
  emerald: {
    border: 'border-emerald-500/20',
    bg: 'from-emerald-500/5 to-emerald-500/0',
    text: 'text-emerald-600 dark:text-emerald-400',
    avatar: 'from-emerald-500 to-teal-600',
    quote: 'text-emerald-500/20 dark:text-emerald-400/15',
  },
  amber: {
    border: 'border-amber-500/20',
    bg: 'from-amber-500/5 to-amber-500/0',
    text: 'text-amber-600 dark:text-amber-400',
    avatar: 'from-amber-500 to-orange-600',
    quote: 'text-amber-500/20 dark:text-amber-400/15',
  },
  teal: {
    border: 'border-teal-500/20',
    bg: 'from-teal-500/5 to-teal-500/0',
    text: 'text-teal-600 dark:text-teal-400',
    avatar: 'from-teal-500 to-cyan-600',
    quote: 'text-teal-500/20 dark:text-teal-400/15',
  },
};

export function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, next]);

  return (
    <section className="relative py-16 sm:py-24 overflow-hidden">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 size-96 bg-emerald-500/5 morphing-blob-slow blur-[100px]" />
        <div className="absolute -bottom-24 -right-24 size-80 bg-amber-500/5 morphing-blob blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 bg-teal-500/5 morphing-blob-fast blur-[60px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto space-y-4 mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Mountain className="size-5 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Testimonials
            </span>
            <Mountain className="size-5 text-emerald-500" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Voices from the{' '}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 bg-clip-text text-transparent">
              Community
            </span>
          </h2>
          <p className="text-base text-muted-foreground">
            Hear from researchers, field workers, and archivists who use TamangNetra to bridge language gaps and preserve cultural heritage.
          </p>
        </motion.div>

        {/* Testimonial cards - desktop: all 3, mobile: carousel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Desktop: show all cards */}
          {testimonials.map((testimonial, i) => {
            const colors = colorMap[testimonial.color];
            return (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className={`hidden md:block glass-card-hover rounded-2xl border ${colors.border} bg-gradient-to-b ${colors.bg} p-6 relative overflow-hidden group`}
                onMouseEnter={() => setIsAutoPlaying(false)}
                onMouseLeave={() => setIsAutoPlaying(true)}
              >
                {/* Large quote mark */}
                <Quote className={`absolute top-4 right-4 size-16 ${colors.quote} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`} />

                {/* Avatar + name */}
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className={`flex size-12 items-center justify-center rounded-full bg-gradient-to-br ${colors.avatar} text-white font-bold text-sm shadow-lg`}>
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                    <p className={`text-xs ${colors.text}`}>{testimonial.role}</p>
                    <p className="text-[10px] text-muted-foreground">{testimonial.location}</p>
                  </div>
                </div>

                {/* Quote text */}
                <p className="text-sm text-muted-foreground leading-relaxed relative z-10">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
              </motion.div>
            );
          })}

          {/* Mobile: animated carousel */}
          <div className="md:hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={testimonials[activeIndex].id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className={`glass-card-hover rounded-2xl border ${colorMap[testimonials[activeIndex].color].border} bg-gradient-to-b ${colorMap[testimonials[activeIndex].color].bg} p-6 relative overflow-hidden`}
                onTouchStart={() => setIsAutoPlaying(false)}
                onTouchEnd={() => setIsAutoPlaying(true)}
              >
                {/* Large quote mark */}
                <Quote className={`absolute top-4 right-4 size-16 ${colorMap[testimonials[activeIndex].color].quote}`} />

                {/* Avatar + name */}
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className={`flex size-12 items-center justify-center rounded-full bg-gradient-to-br ${colorMap[testimonials[activeIndex].color].avatar} text-white font-bold text-sm shadow-lg`}>
                    {testimonials[activeIndex].initials}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{testimonials[activeIndex].name}</p>
                    <p className={`text-xs ${colorMap[testimonials[activeIndex].color].text}`}>{testimonials[activeIndex].role}</p>
                    <p className="text-[10px] text-muted-foreground">{testimonials[activeIndex].location}</p>
                  </div>
                </div>

                {/* Quote text */}
                <p className="text-sm text-muted-foreground leading-relaxed relative z-10">
                  &ldquo;{testimonials[activeIndex].quote}&rdquo;
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Navigation arrows */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={prev}
                className="flex size-8 items-center justify-center rounded-full border border-border/50 bg-background/60 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-emerald-500/30 transition-all"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="size-4" />
              </button>
              {/* Dots */}
              <div className="flex items-center gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`size-2 rounded-full transition-all duration-300 ${
                      i === activeIndex ? 'bg-emerald-500 w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Go to testimonial ${i + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="flex size-8 items-center justify-center rounded-full border border-border/50 bg-background/60 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-emerald-500/30 transition-all"
                aria-label="Next testimonial"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
