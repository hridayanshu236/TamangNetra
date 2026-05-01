'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Globe, Users, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';

interface RegionData {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  bgColor: string;
  borderColor: string;
  primaryLanguage: string;
  speakerCount: string;
  funFact: string;
  script: string;
  scriptLabel: string;
}

const regions: RegionData[] = [
  {
    id: 'kathmandu',
    name: 'Kathmandu Valley',
    x: 200,
    y: 145,
    color: 'emerald',
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-400',
    primaryLanguage: 'English & Nepali Hub',
    speakerCount: '~3.5M speakers',
    funFact: 'Home to 7 UNESCO World Heritage Sites — the densest concentration in the world!',
    script: 'नेपाली',
    scriptLabel: 'Devanagari',
  },
  {
    id: 'eastern',
    name: 'Eastern Hills',
    x: 310,
    y: 110,
    color: 'teal',
    bgColor: 'bg-teal-500',
    borderColor: 'border-teal-400',
    primaryLanguage: 'Tamang Speaking Region',
    speakerCount: '~1.5M speakers',
    funFact: 'Tamang is one of the oldest Sino-Tibetan languages in Nepal with rich oral traditions!',
    script: 'तामाङ',
    scriptLabel: 'Tamang Script',
  },
  {
    id: 'terai',
    name: 'Southern Terai',
    x: 210,
    y: 250,
    color: 'amber',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-400',
    primaryLanguage: 'Nepali Heartland',
    speakerCount: '~11M speakers',
    funFact: 'The Terai plains produce the famous Nepali "Chaas" (buttermilk) culture alongside literature!',
    script: 'नेपाली',
    scriptLabel: 'Devanagari',
  },
];

const connectionLines = [
  { from: 'kathmandu', to: 'eastern' },
  { from: 'kathmandu', to: 'terai' },
  { from: 'eastern', to: 'terai' },
];

function getRegionCoords(id: string): { x: number; y: number } {
  const r = regions.find((r) => r.id === id);
  return r ? { x: r.x, y: r.y } : { x: 0, y: 0 };
}

export function LanguageMapSection() {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  return (
    <section id="language-map-section" className="py-16 sm:py-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.02] dark:opacity-[0.04]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-14"
        >
          <Badge
            variant="outline"
            className="mb-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
          >
            <MapPin className="size-3 mr-1" />
            Interactive Map
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 bg-clip-text text-transparent">
            Language Landscape of Nepal
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
            Explore the rich linguistic diversity across Nepal&apos;s regions — from the Tamang-speaking
            eastern hills to the Nepali heartland of the Terai plains.
          </p>
        </motion.div>

        {/* Map + Legend Layout */}
        <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
          {/* Map Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.7 }}
            className="flex-1 w-full"
          >
            <Card className="relative overflow-hidden border-border/50 bg-card/50 dark:bg-card/30 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <svg
                  viewBox="0 0 450 320"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Interactive map of Nepal showing language distribution"
                >
                  <defs>
                    {/* Nepal shape gradient fill */}
                    <linearGradient id="nepal-fill" x1="0" y1="0" x2="450" y2="320" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                      <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
                    </linearGradient>
                    <linearGradient id="nepal-stroke" x1="0" y1="0" x2="450" y2="320" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
                    </linearGradient>
                    {/* Region dot glows */}
                    <radialGradient id="glow-emerald" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="glow-teal" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="glow-amber" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </radialGradient>
                    {/* Connection line gradient */}
                    <linearGradient id="conn-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                      <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.5" />
                    </linearGradient>
                  </defs>

                  {/* Nepal outline - distinctive pentagon shape */}
                  <motion.path
                    d="M80 60 L180 20 L300 40 L380 100 L400 180 L380 260 L320 290 L200 300 L120 270 L70 200 L60 130 Z"
                    fill="url(#nepal-fill)"
                    stroke="url(#nepal-stroke)"
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                  />

                  {/* Inner detail lines for terrain texture */}
                  <motion.path
                    d="M100 100 Q200 80 350 120"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="0.5"
                    strokeOpacity="0.15"
                    strokeDasharray="4 4"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, delay: 0.5 }}
                  />
                  <motion.path
                    d="M90 160 Q200 140 370 180"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="0.5"
                    strokeOpacity="0.12"
                    strokeDasharray="4 4"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, delay: 0.7 }}
                  />
                  <motion.path
                    d="M100 220 Q200 200 360 240"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="0.5"
                    strokeOpacity="0.1"
                    strokeDasharray="4 4"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, delay: 0.9 }}
                  />

                  {/* Connection lines between regions */}
                  {connectionLines.map((conn, i) => {
                    const from = getRegionCoords(conn.from);
                    const to = getRegionCoords(conn.to);
                    const midX = (from.x + to.x) / 2;
                    const midY = (from.y + to.y) / 2 - 15;
                    return (
                      <motion.path
                        key={`conn-${conn.from}-${conn.to}`}
                        d={`M${from.x} ${from.y} Q${midX} ${midY} ${to.x} ${to.y}`}
                        fill="none"
                        stroke="url(#conn-gradient)"
                        strokeWidth="1.5"
                        strokeDasharray="6 4"
                        initial={{ pathLength: 0, opacity: 0 }}
                        whileInView={{ pathLength: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, delay: 1 + i * 0.3 }}
                      />
                    );
                  })}

                  {/* Translation flow arrows along connections */}
                  {connectionLines.map((conn, i) => {
                    const from = getRegionCoords(conn.from);
                    const to = getRegionCoords(conn.to);
                    const midX = (from.x + to.x) / 2;
                    const midY = (from.y + to.y) / 2 - 15;
                    return (
                      <motion.circle
                        key={`flow-${conn.from}-${conn.to}`}
                        r="3"
                        fill="#14b8a6"
                        fillOpacity="0.6"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 2 + i * 0.3 }}
                      >
                        <animateMotion
                          dur={`${3 + i * 0.5}s`}
                          repeatCount="indefinite"
                          path={`M${from.x} ${from.y} Q${midX} ${midY} ${to.x} ${to.y}`}
                        />
                      </motion.circle>
                    );
                  })}

                  {/* Region dots with pulse animations */}
                  {regions.map((region, i) => (
                    <g
                      key={region.id}
                      onMouseEnter={() => setHoveredRegion(region.id)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      className="cursor-pointer"
                    >
                      {/* Glow effect */}
                      <motion.circle
                        cx={region.x}
                        cy={region.y}
                        r="30"
                        fill={
                          region.color === 'emerald'
                            ? 'url(#glow-emerald)'
                            : region.color === 'teal'
                            ? 'url(#glow-teal)'
                            : 'url(#glow-amber)'
                        }
                        initial={{ scale: 0, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 1.2 + i * 0.2 }}
                      />

                      {/* Outer pulsing ring */}
                      <motion.circle
                        cx={region.x}
                        cy={region.y}
                        r="12"
                        fill="none"
                        stroke={
                          region.color === 'emerald'
                            ? '#10b981'
                            : region.color === 'teal'
                            ? '#14b8a6'
                            : '#f59e0b'
                        }
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                        initial={{ scale: 0, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 1.3 + i * 0.2 }}
                      >
                        <animate
                          attributeName="r"
                          values="12;18;12"
                          dur="2s"
                          begin={`${i * 0.3}s`}
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="stroke-opacity"
                          values="0.4;0.1;0.4"
                          dur="2s"
                          begin={`${i * 0.3}s`}
                          repeatCount="indefinite"
                        />
                      </motion.circle>

                      {/* Inner dot */}
                      <motion.circle
                        cx={region.x}
                        cy={region.y}
                        r="6"
                        fill={
                          region.color === 'emerald'
                            ? '#10b981'
                            : region.color === 'teal'
                            ? '#14b8a6'
                            : '#f59e0b'
                        }
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 15,
                          delay: 1.4 + i * 0.2,
                        }}
                      />

                      {/* Region name label */}
                      <motion.text
                        x={region.x}
                        y={region.y - 22}
                        textAnchor="middle"
                        className="text-[9px] font-semibold fill-foreground/80"
                        initial={{ opacity: 0, y: region.y - 18 }}
                        whileInView={{ opacity: 1, y: region.y - 22 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.6 + i * 0.2 }}
                      >
                        {region.name}
                      </motion.text>

                      {/* Script example below dot */}
                      <motion.text
                        x={region.x}
                        y={region.y + 20}
                        textAnchor="middle"
                        className="text-[8px] fill-muted-foreground/60"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.8 + i * 0.2 }}
                      >
                        {region.script}
                      </motion.text>

                      {/* Tooltip on hover */}
                      {hoveredRegion === region.id && (
                        <g>
                          {/* Tooltip background */}
                          <rect
                            x={region.x - 95}
                            y={region.y - 75}
                            width="190"
                            height="55"
                            rx="8"
                            fill="hsl(var(--card))"
                            stroke={
                              region.color === 'emerald'
                                ? '#10b981'
                                : region.color === 'teal'
                                ? '#14b8a6'
                                : '#f59e0b'
                            }
                            strokeWidth="1"
                            strokeOpacity="0.4"
                            className="drop-shadow-lg"
                          />
                          {/* Tooltip content */}
                          <text
                            x={region.x - 85}
                            y={region.y - 58}
                            className="text-[8px] font-bold fill-foreground"
                          >
                            {region.primaryLanguage}
                          </text>
                          <text
                            x={region.x - 85}
                            y={region.y - 44}
                            className="text-[7px] fill-muted-foreground"
                          >
                            {region.speakerCount}
                          </text>
                          <text
                            x={region.x - 85}
                            y={region.y - 30}
                            className="text-[6.5px] fill-muted-foreground/70"
                          >
                            {region.funFact.length > 50
                              ? `${region.funFact.substring(0, 47)}...`
                              : region.funFact}
                          </text>
                        </g>
                      )}
                    </g>
                  ))}

                  {/* Compass indicator */}
                  <motion.g
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 2 }}
                  >
                    <text x="40" y="50" className="text-[10px] font-bold fill-muted-foreground/40">
                      N
                    </text>
                    <line
                      x1="42"
                      y1="52"
                      x2="42"
                      y2="65"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeOpacity="0.2"
                    />
                    <polygon
                      points="42,52 39,58 45,58"
                      fill="currentColor"
                      fillOpacity="0.2"
                    />
                  </motion.g>

                  {/* "NEPAL" label */}
                  <motion.text
                    x="225"
                    y="195"
                    textAnchor="middle"
                    className="text-[14px] font-bold fill-foreground/5 dark:fill-foreground/5 select-none"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 }}
                  >
                    NEPAL
                  </motion.text>
                </svg>
              </CardContent>
            </Card>
          </motion.div>

          {/* Legend / Region Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full lg:w-80 space-y-4"
          >
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Globe className="size-5 text-emerald-500" />
              Language Regions
            </h3>
            <p className="text-xs text-muted-foreground">
              Hover over the dots on the map to see details, or explore the region cards below.
            </p>

            {regions.map((region, i) => (
              <motion.div
                key={region.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.15 }}
                onMouseEnter={() => setHoveredRegion(region.id)}
                onMouseLeave={() => setHoveredRegion(null)}
              >
                <Card
                  className={`transition-all duration-300 border-border/50 bg-card/60 dark:bg-card/40 backdrop-blur-sm hover:shadow-md ${
                    hoveredRegion === region.id
                      ? region.color === 'emerald'
                        ? 'ring-1 ring-emerald-500/30 shadow-emerald-500/10'
                        : region.color === 'teal'
                        ? 'ring-1 ring-teal-500/30 shadow-teal-500/10'
                        : 'ring-1 ring-amber-500/30 shadow-amber-500/10'
                      : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`shrink-0 size-3 rounded-full mt-1.5 ${
                          region.color === 'emerald'
                            ? 'bg-emerald-500'
                            : region.color === 'teal'
                            ? 'bg-teal-500'
                            : 'bg-amber-500'
                        }`}
                      >
                        <div
                          className={`size-3 rounded-full animate-ping ${
                            region.color === 'emerald'
                              ? 'bg-emerald-400'
                              : region.color === 'teal'
                              ? 'bg-teal-400'
                              : 'bg-amber-400'
                          }`}
                          style={{ animationDelay: `${i * 0.5}s` }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-foreground">{region.name}</h4>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 ${
                              region.color === 'emerald'
                                ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                : region.color === 'teal'
                                ? 'border-teal-500/30 text-teal-600 dark:text-teal-400'
                                : 'border-amber-500/30 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {region.scriptLabel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {region.primaryLanguage}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Users className="size-3" />
                            {region.speakerCount}
                          </div>
                        </div>
                        <div className="mt-2 flex items-start gap-1.5">
                          <Sparkles
                            className={`size-3 shrink-0 mt-0.5 ${
                              region.color === 'emerald'
                                ? 'text-emerald-500'
                                : region.color === 'teal'
                                ? 'text-teal-500'
                                : 'text-amber-500'
                            }`}
                          />
                          <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                            {region.funFact}
                          </p>
                        </div>
                        {/* Script display */}
                        <div className="mt-2 px-2 py-1 rounded bg-muted/50 border border-border/30">
                          <span
                            className={`text-lg font-medium ${
                              region.color === 'emerald'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : region.color === 'teal'
                                ? 'text-teal-600 dark:text-teal-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {region.script}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
