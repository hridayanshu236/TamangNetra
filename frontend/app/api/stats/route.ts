import { NextResponse } from 'next/server';

// Base statistics values
const baseStats = {
  totalTranslations: 12847,
  totalSegments: 89432,
  activeUsers: 342,
  languagesSupported: 3,
  fileFormatsSupported: 5,
  avgTranslationTime: 1.2,
  uptime: '99.9%',
};

// Randomize a number by ±5%
function randomize(value: number): number {
  const variation = value * 0.05;
  const delta = (Math.random() * 2 - 1) * variation;
  return Math.round(value + delta);
}

export async function GET() {
  const stats = {
    totalTranslations: randomize(baseStats.totalTranslations),
    totalSegments: randomize(baseStats.totalSegments),
    activeUsers: randomize(baseStats.activeUsers),
    languagesSupported: baseStats.languagesSupported,
    fileFormatsSupported: baseStats.fileFormatsSupported,
    avgTranslationTime:
      Math.round(
        (baseStats.avgTranslationTime +
          (Math.random() * 2 - 1) * baseStats.avgTranslationTime * 0.05) *
          100
      ) / 100,
    uptime: baseStats.uptime,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
