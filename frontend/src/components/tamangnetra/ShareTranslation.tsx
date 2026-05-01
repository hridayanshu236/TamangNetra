'use client';

import { useCallback, useState } from 'react';
import {
  Share2,
  Link2,
  FileJson,
  Twitter,
  Mail,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { Button } from '@/src/components/ui/button';
import { useTranslationStore } from './TranslationStore';
import { useToast } from '@/src/hooks/use-toast';

interface ShareTranslationProps {
  originalText?: string;
  translatedText?: string;
  srcLang?: string;
  tgtLang?: string;
  segments?: Array<{ original: string; translated: string }>;
}

export function ShareTranslation({
  originalText: propOriginal,
  translatedText: propTranslated,
  srcLang: propSrcLang,
  tgtLang: propTgtLang,
  segments: propSegments,
}: ShareTranslationProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const { toast } = useToast();

  const store = useTranslationStore();
  const originalText = propOriginal || store.originalText;
  const translatedText = propTranslated || store.translatedText;
  const srcLang = propSrcLang || store.srcLang;
  const tgtLang = propTgtLang || store.tgtLang;
  const segments = propSegments || store.segments;

  const handleCopyLink = useCallback(async () => {
    try {
      // Encode translation data as base64 in URL hash
      const shareData = {
        s: srcLang,
        t: tgtLang,
        o: originalText.slice(0, 500), // Limit size for URL
        r: translatedText.slice(0, 500),
      };
      const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
      const shareUrl = `${window.location.origin}${window.location.pathname}#share=${encoded}`;

      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({
        title: 'Link Copied',
        description: 'Shareable link with translation data copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Failed to Copy Link',
        description: 'Could not copy the link. Try copying as JSON instead.',
        variant: 'destructive',
      });
    }
  }, [srcLang, tgtLang, originalText, translatedText, toast]);

  const handleCopyJson = useCallback(async () => {
    try {
      const jsonData = {
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
        originalText,
        translatedText,
        segments: segments.map((seg, i) => ({
          index: i + 1,
          original: seg.original,
          translated: seg.translated,
        })),
        timestamp: new Date().toISOString(),
        tool: 'TamangNetra',
      };

      await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
      toast({
        title: 'JSON Copied',
        description: 'Translation data copied as structured JSON.',
      });
    } catch {
      toast({
        title: 'Failed to Copy',
        description: 'Could not copy JSON to clipboard.',
        variant: 'destructive',
      });
    }
  }, [srcLang, tgtLang, originalText, translatedText, segments, toast]);

  const handleShareTwitter = useCallback(() => {
    const text = `Translated from ${srcLang} to ${tgtLang} using TamangNetra! "${originalText.slice(0, 80)}${originalText.length > 80 ? '...' : ''}" → "${translatedText.slice(0, 80)}${translatedText.length > 80 ? '...' : ''}"`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=TamangNetra,Translation,Nepal`;
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
  }, [srcLang, tgtLang, originalText, translatedText]);

  const handleShareEmail = useCallback(() => {
    const subject = `Translation: ${srcLang} → ${tgtLang} | TamangNetra`;
    const body = `Translation from ${srcLang} to ${tgtLang}:\n\n--- Original (${srcLang}) ---\n${originalText}\n\n--- Translation (${tgtLang}) ---\n${translatedText}\n\nTranslated with TamangNetra - See Across Languages. Translate with Precision.`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  }, [srcLang, tgtLang, originalText, translatedText]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 hover:border-emerald-300 hover:text-emerald-600 dark:hover:border-emerald-700 dark:hover:text-emerald-400 transition-colors"
        >
          <Share2 className="size-3" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          {copiedLink ? (
            <Check className="size-4 mr-2 text-emerald-500" />
          ) : (
            <Link2 className="size-4 mr-2" />
          )}
          {copiedLink ? 'Link Copied!' : 'Copy Link'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyJson} className="cursor-pointer">
          {copiedJson ? (
            <Check className="size-4 mr-2 text-emerald-500" />
          ) : (
            <FileJson className="size-4 mr-2" />
          )}
          {copiedJson ? 'JSON Copied!' : 'Copy as JSON'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleShareTwitter} className="cursor-pointer">
          <Twitter className="size-4 mr-2" />
          Share to Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareEmail} className="cursor-pointer">
          <Mail className="size-4 mr-2" />
          Share to Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
