'use client';

import { motion } from 'framer-motion';
import { FileText, GraduationCap, Shield, FileSpreadsheet, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';

const SAMPLE_TEXTS = [
  {
    title: 'General Text',
    icon: FileText,
    text: 'Nepal is a beautiful country nestled in the Himalayas. The capital city Kathmandu is known for its rich cultural heritage. The Tamang community is one of the largest indigenous groups in Nepal.',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'Educational Content',
    icon: GraduationCap,
    text: 'Education is the foundation of development. Every child deserves access to quality education regardless of their language or background. Multilingual education helps preserve cultural identity.',
    gradient: 'from-teal-500 to-cyan-500',
  },
  {
    title: 'PII Test Data',
    icon: Shield,
    text: 'My name is Ram Bahadur and my phone number is +977-01-4234567. I live in Thamel, Kathmandu. Please contact me at ram.bahadur@email.com for further details.',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    title: 'CSV-like Data',
    icon: FileSpreadsheet,
    text: 'Name, Age, City\nRam Bahadur, 35, Kathmandu\nSita Sharma, 28, Pokhara\nHari Tamang, 42, Chitwan\n=SUM(B2:B4), , Total',
    gradient: 'from-rose-500 to-pink-500',
  },
];

interface DemoModeProps {
  onSelectText: (text: string) => void;
}

export function DemoMode({ onSelectText }: DemoModeProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-amber-500" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Quick Demo — Try sample texts
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SAMPLE_TEXTS.map((sample, index) => {
          const Icon = sample.icon;
          return (
            <motion.div
              key={sample.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">
                {/* Gradient border effect */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${sample.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />
                <div className="absolute inset-[1px] bg-background rounded-lg" />

                <CardContent className="relative p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-md bg-gradient-to-br ${sample.gradient} p-1.5 text-white`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <p className="text-sm font-medium">{sample.title}</p>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {sample.text}
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectText(sample.text);
                    }}
                  >
                    Try This
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
