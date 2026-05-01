'use client';

import { motion } from 'framer-motion';
import {
  HelpCircle,
  Eye,
  Globe,
  FileText,
  Shield,
  Lock,
  Share2,
  BookOpen,
  Database,
  Video,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/src/components/ui/accordion';
import { Badge } from '@/src/components/ui/badge';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: React.ElementType;
  gradient: string;
}

const faqItems: FAQItem[] = [
  {
    id: 'what-is-tamangnetra',
    question: 'What is TamangNetra?',
    answer:
      'TamangNetra (तामाङनेत्र) is an open-source trilingual translation tool designed to bridge the language gap between English, Nepali, and Tamang. Built for the TMT Hackathon 2025, it provides file translation, OCR, YouTube subtitle translation, and more — all with PII protection and encryption built in.',
    icon: Eye,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'what-is-tmt-api',
    question: 'What is the TMT API?',
    answer:
      'The TMT (Trilingual Machine Translation) API is a specialized translation service that supports English, Nepali, and Tamang language pairs. TamangNetra connects to this API via a secure proxy with built-in rate limiting to ensure fair usage and reliable service for all users.',
    icon: Globe,
    gradient: 'from-teal-500 to-emerald-500',
  },
  {
    id: 'supported-languages',
    question: 'Which languages are supported?',
    answer:
      'TamangNetra supports three languages: English (🇬🇧), Nepali (🇳🇵), and Tamang (🏔️). You can translate between any pair of these languages — for example, English to Nepali, Nepali to Tamang, or Tamang to English — in both directions.',
    icon: MessageCircle,
    gradient: 'from-amber-500 to-emerald-500',
  },
  {
    id: 'supported-formats',
    question: 'What file formats are supported?',
    answer:
      'TamangNetra supports PDF, DOCX, CSV, TSV, SRT, and plain text files. Formula-aware CSV translation skips formulas, numbers, and dates. PDF translation preserves bounding boxes and font sizes. Reconstructed file downloads are available in all supported formats.',
    icon: FileText,
    gradient: 'from-emerald-500 to-amber-500',
  },
  {
    id: 'pii-scrubbing',
    question: 'How does PII scrubbing work?',
    answer:
      'TamangNetra uses a split-around approach for PII (Personally Identifiable Information). Before sending text to the translation API, it detects names, emails, phone numbers, and other sensitive data, then splits the text around PII segments. Only non-PII text is sent for translation, and PII is preserved exactly in the output.',
    icon: Shield,
    gradient: 'from-teal-500 to-amber-500',
  },
  {
    id: 'data-security',
    question: 'Is my data secure?',
    answer:
      'Yes. TamangNetra offers client-side AES-256 encryption for your translations. All encryption and decryption happen entirely in your browser — your data never leaves your device unencrypted unless you choose to send it to the TMT API for translation. PII scrubbing adds an additional layer of privacy protection.',
    icon: Lock,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'knowledge-graph',
    question: 'What is the Knowledge Graph feature?',
    answer:
      'The Knowledge Graph is a document-level terminology consistency tracker. It visualizes how key terms are translated across your entire document, helping you identify inconsistent translations. The interactive SVG graph shows relationships between source and target terms with force-directed layout.',
    icon: Share2,
    gradient: 'from-amber-500 to-teal-500',
  },
  {
    id: 'glossary-manager',
    question: 'How does the Glossary Manager work?',
    answer:
      'The Glossary Manager lets you define custom term translations that override the API output. Add entries like "Everest → सगरमाथा" to ensure specific terms are always translated your way. Glossary terms are applied before and after API translation for maximum accuracy. You can import/export glossaries as JSON files.',
    icon: BookOpen,
    gradient: 'from-teal-500 to-emerald-500',
  },
  {
    id: 'translation-memory',
    question: 'What is Translation Memory?',
    answer:
      'Translation Memory stores your previous translations and automatically suggests matches when similar text appears again. This saves time on repetitive content and ensures consistency across documents. Translation memory entries are persisted in your browser\'s local storage.',
    icon: Database,
    gradient: 'from-emerald-500 to-amber-500',
  },
  {
    id: 'youtube-subtitles',
    question: 'Can I translate YouTube subtitles?',
    answer:
      'Yes! Paste a YouTube URL and TamangNetra will extract the video\'s subtitles, then translate them into your chosen language. You can download the translated subtitles as SRT files. If automatic extraction fails, a demo mode is available to try the feature.',
    icon: Video,
    gradient: 'from-amber-500 to-emerald-500',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export function FAQSection() {
  return (
    <section
      id="faq-section"
      className="relative py-16 sm:py-20 overflow-hidden"
    >
      {/* Aurora background effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="aurora-bg absolute inset-0" />
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 20px,
              currentColor 20px,
              currentColor 21px
            )`,
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-14"
        >
          <Badge
            variant="outline"
            className="mb-4 px-4 py-1.5 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
          >
            <HelpCircle className="size-3.5 mr-1.5" />
            Frequently Asked Questions
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 bg-clip-text text-transparent">
              Got Questions?
            </span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            Everything you need to know about TamangNetra and the TMT translation platform.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="glass-card-hover rounded-2xl p-4 sm:p-6 lg:p-8"
        >
          <Accordion type="single" collapsible className="space-y-1">
            {faqItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.id} variants={itemVariants}>
                  <AccordionItem
                    value={item.id}
                    className="border-border/40 rounded-lg px-3 sm:px-4 data-[state=open]:bg-emerald-50/30 dark:data-[state=open]:bg-emerald-950/10 data-[state=open]:border-emerald-500/20 transition-colors duration-300"
                  >
                    <AccordionTrigger className="hover:no-underline py-4 sm:py-5">
                      <div className="flex items-center gap-3 text-left">
                        <div
                          className={`flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${item.gradient} shadow-sm`}
                        >
                          <Icon className="size-4 text-white" />
                        </div>
                        <span className="text-sm sm:text-base font-medium text-foreground">
                          {item.question}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-11 sm:pl-14 pr-2">
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {item.answer}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              );
            })}
          </Accordion>
        </motion.div>

        {/* Bottom decorative element */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex items-center justify-center gap-3 text-muted-foreground"
        >
          <Sparkles className="size-4 text-emerald-500" />
          <span className="text-xs sm:text-sm">
            Still have questions? Try the AI assistant — click the chat icon below!
          </span>
          <Sparkles className="size-4 text-amber-500" />
        </motion.div>
      </div>
    </section>
  );
}
