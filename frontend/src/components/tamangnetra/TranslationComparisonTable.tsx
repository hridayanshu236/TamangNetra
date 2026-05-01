'use client';

import { motion } from 'framer-motion';
import { Check, X, Minus, Trophy, Zap, Shield, Lock, ScanLine, Layers } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';

type SupportLevel = 'yes' | 'partial' | 'no';

interface ComparisonRow {
  feature: string;
  icon: React.ReactNode;
  tamangNetra: SupportLevel;
  googleTranslate: SupportLevel;
  manualTranslation: SupportLevel;
  tamangNetraNote?: string;
}

const comparisonData: ComparisonRow[] = [
  {
    feature: 'Speed',
    icon: <Zap className="size-4" />,
    tamangNetra: 'yes',
    googleTranslate: 'yes',
    manualTranslation: 'no',
    tamangNetraNote: '~2s per segment',
  },
  {
    feature: 'Accuracy',
    icon: <Trophy className="size-4" />,
    tamangNetra: 'partial',
    googleTranslate: 'partial',
    manualTranslation: 'yes',
    tamangNetraNote: 'TMT specialized',
  },
  {
    feature: 'PII Protection',
    icon: <Shield className="size-4" />,
    tamangNetra: 'yes',
    googleTranslate: 'no',
    manualTranslation: 'partial',
  },
  {
    feature: 'Encryption',
    icon: <Lock className="size-4" />,
    tamangNetra: 'yes',
    googleTranslate: 'no',
    manualTranslation: 'no',
    tamangNetraNote: 'AES-256',
  },
  {
    feature: 'OCR Support',
    icon: <ScanLine className="size-4" />,
    tamangNetra: 'yes',
    googleTranslate: 'partial',
    manualTranslation: 'no',
  },
  {
    feature: 'Batch Support',
    icon: <Layers className="size-4" />,
    tamangNetra: 'yes',
    googleTranslate: 'partial',
    manualTranslation: 'partial',
  },
];

const columns = [
  { key: 'tamangNetra', label: 'TamangNetra', color: 'emerald' },
  { key: 'googleTranslate', label: 'Google Translate', color: 'slate' },
  { key: 'manualTranslation', label: 'Manual Translation', color: 'slate' },
] as const;

function StatusCell({ level }: { level: SupportLevel }) {
  if (level === 'yes') {
    return (
      <div className="flex items-center justify-center gap-1.5">
        <div className="flex size-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
          <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hidden sm:inline">Supported</span>
      </div>
    );
  }
  if (level === 'partial') {
    return (
      <div className="flex items-center justify-center gap-1.5">
        <div className="flex size-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
          <Minus className="size-3 text-amber-600 dark:text-amber-400" />
        </div>
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400 hidden sm:inline">Partial</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-1.5">
      <div className="flex size-5 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/50">
        <X className="size-3 text-rose-600 dark:text-rose-400" />
      </div>
      <span className="text-xs font-medium text-rose-600 dark:text-rose-400 hidden sm:inline">No</span>
    </div>
  );
}

export function TranslationComparisonTable() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="size-5 text-emerald-500" />
        <h3 className="text-lg font-bold text-foreground">Feature Comparison</h3>
        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 ml-auto">
          vs Alternatives
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        How TamangNetra compares to other translation approaches for Nepali &amp; Tamang languages.
      </p>

      {/* Comparison Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border/50">
              <th className="px-4 py-3 text-left font-semibold text-foreground min-w-[140px]">Feature</th>
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 text-center font-semibold ${
                  col.key === 'tamangNetra'
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'text-muted-foreground'
                }`}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs">{col.label}</span>
                    {col.key === 'tamangNetra' && (
                      <span className="text-[9px] font-normal text-emerald-500/70">★ Our Tool</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row, i) => (
              <motion.tr
                key={row.feature}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                className={`border-b border-border/30 transition-colors hover:bg-muted/30 ${
                  i % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500">{row.icon}</span>
                    <span className="font-medium text-foreground">{row.feature}</span>
                  </div>
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${
                      col.key === 'tamangNetra' ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <StatusCell level={row[col.key]} />
                      {col.key === 'tamangNetra' && row.tamangNetraNote && (
                        <span className="text-[9px] text-emerald-600/60 dark:text-emerald-400/50">{row.tamangNetraNote}</span>
                      )}
                    </div>
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/30 dark:border-emerald-800/30"
      >
        <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
          <Check className="size-3.5" />
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">TamangNetra</span> uniquely combines PII protection,
          AES-256 encryption, OCR, and batch processing — features not available together in any alternative.
        </p>
      </motion.div>
    </motion.div>
  );
}
