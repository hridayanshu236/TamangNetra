'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft,
  Shield,
  Lock,
  Share2,
  Type,
  Key,
  BookOpen,
  Eye,
  Database,
  FlaskConical,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Switch } from '@/src/components/ui/switch';
import { Label } from '@/src/components/ui/label';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/components/ui/tooltip';
import { Separator } from '@/src/components/ui/separator';
import { useTranslationStore } from './TranslationStore';

const LANGUAGES = [
  { value: 'English', label: 'English', native: 'English', flag: '🇬🇧' },
  { value: 'Nepali', label: 'Nepali', native: 'नेपाली', flag: '🇳🇵' },
  { value: 'Tamang', label: 'Tamang', native: 'तामाङ', flag: '🏔️' },
];

export function TranslationSettings() {
  const {
    srcLang,
    tgtLang,
    piiEnabled,
    encryptionEnabled,
    knowledgeGraphEnabled,
    fontAdjustEnabled,
    glossaryEnabled,
    translationMemoryEnabled,
    livePreviewEnabled,
    demoMode,
    encryptionKey,
    apiToken,
    setSrcLang,
    setTgtLang,
    swapLanguages,
    togglePII,
    toggleEncryption,
    toggleKnowledgeGraph,
    toggleFontAdjust,
    toggleGlossary,
    toggleTranslationMemory,
    toggleLivePreview,
    toggleDemoMode,
    setEncryptionKey,
    setApiToken,
  } = useTranslationStore();

  const [swapRotated, setSwapRotated] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [toggleNotif, setToggleNotif] = useState<{ label: string; active: boolean } | null>(null);

  const handleSwap = useCallback(() => {
    setSwapRotated((prev) => !prev);
    swapLanguages();
  }, [swapLanguages]);

  // Show toggle notification for 2 seconds
  const showToggleNotification = useCallback((label: string, active: boolean) => {
    setToggleNotif({ label, active });
    setTimeout(() => setToggleNotif(null), 2000);
  }, []);

  const handleTestConnection = useCallback(async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentences: ['Hello'],
          src_lang: 'English',
          tgt_lang: 'Nepali',
          api_token: apiToken || undefined,
        }),
      });
      if (response.ok) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
      setTimeout(() => setConnectionStatus('idle'), 3000);
    }
  }, [apiToken]);

  return (
    <div className="relative rounded-lg">
      {/* Animated gradient border wrapper */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 opacity-20 blur-[1px]" />
    <Card className="h-fit relative overflow-hidden card-hover">
      {/* Left border accent (emerald) */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 via-teal-500 to-amber-500 rounded-l-lg" />
      <CardHeader className="p-4 pb-4 sm:p-6 sm:pb-4 pl-5 sm:pl-7">
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeft className="size-4 text-emerald-600" />
          Translation Settings
        </CardTitle>
        {/* Language pair banner */}
        <div className="mt-2 rounded-lg bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 dark:from-emerald-500/20 dark:via-teal-500/20 dark:to-amber-500/20 border border-emerald-200/50 dark:border-emerald-700/30 p-2.5">
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">{LANGUAGES.find(l => l.value === srcLang)?.flag} {srcLang}</span>
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="text-emerald-500"
            >
              →
            </motion.div>
            <span className="font-semibold text-teal-700 dark:text-teal-400">{LANGUAGES.find(l => l.value === tgtLang)?.flag} {tgtLang}</span>
          </div>
        </div>
        {/* Toggle notification */}
        <AnimatePresence>
          {toggleNotif && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mt-2 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${toggleNotif.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'}`}
            >
              <span className={`size-2 rounded-full ${toggleNotif.active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {toggleNotif.label} {toggleNotif.active ? 'activated' : 'deactivated'}
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>
      <CardContent className="space-y-5 p-4 pl-5 sm:p-6 sm:pl-7 sm:space-y-5">
        {/* Source Language */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/90 uppercase tracking-wider">
            Source Language
          </Label>
          <Select value={srcLang} onValueChange={setSrcLang}>
            <SelectTrigger className="w-full dark:border-border/60 dark:bg-background/80">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    {lang.label}
                    <span className="text-muted-foreground text-xs">
                      ({lang.native})
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSwap}
                  aria-label="Swap languages"
                  className="size-9 rounded-full border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950 transition-transform duration-500"
                >
                  <motion.div
                    animate={{ rotate: swapRotated ? 180 : 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  >
                    <ArrowRightLeft className="size-3.5 text-emerald-600" />
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Swap languages</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Target Language */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/90 uppercase tracking-wider">
            Target Language
          </Label>
          <Select value={tgtLang} onValueChange={setTgtLang}>
            <SelectTrigger className="w-full dark:border-border/60 dark:bg-background/80">
              <SelectValue placeholder="Select target" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem
                  key={lang.value}
                  value={lang.value}
                  disabled={lang.value === srcLang}
                >
                  <span className="flex items-center gap-2">
                    {lang.label}
                    <span className="text-muted-foreground text-xs">
                      ({lang.native})
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs font-medium text-muted-foreground dark:text-muted-foreground/90 uppercase tracking-wider">
            Advanced
          </span>
        </div>

        {/* Feature Toggles */}
        <div id="feature-toggles" className="space-y-4">
          <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/90 uppercase tracking-wider">
            Features
          </Label>

          {/* PII Scrubbing */}
          <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50 dark:hover:bg-muted/30">
            <div className="flex items-center gap-2 min-w-0">
              <Shield
                className={`size-4 shrink-0 ${
                  piiEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground dark:text-muted-foreground/70'
                }`}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor="pii-toggle"
                      className="text-sm cursor-pointer dark:text-foreground/90"
                    >
                      PII Scrubbing
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    Automatically detect and redact personally identifiable
                    information (names, IDs, phone numbers) before translation.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="pii-toggle"
              checked={piiEnabled}
              onCheckedChange={(checked) => { togglePII(); showToggleNotification('PII Shield', checked as boolean); }}
              className="data-[state=checked]:bg-emerald-500 transition-colors duration-300"
            />
          </div>

          {/* AES-256 Encryption */}
          <div className="space-y-2 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50 dark:hover:bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Lock
                  className={`size-4 shrink-0 ${
                    encryptionEnabled
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground dark:text-muted-foreground/70'
                  }`}
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label
                        htmlFor="encryption-toggle"
                        className="text-sm cursor-pointer dark:text-foreground/90"
                      >
                        AES-256 Encryption
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[200px]">
                      Encrypt translated output with AES-256. Provide a key to
                      encrypt/decrypt the results.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="encryption-toggle"
                checked={encryptionEnabled}
                onCheckedChange={(checked) => { toggleEncryption(); showToggleNotification('AES-256', checked as boolean); }}
                className="data-[state=checked]:bg-amber-500 transition-colors duration-300"
              />
            </div>
            {encryptionEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="flex items-center gap-2 pl-6">
                  <Key className="size-3.5 text-amber-500" />
                  <Input
                    type="password"
                    placeholder="Encryption key"
                    value={encryptionKey}
                    onChange={(e) => setEncryptionKey(e.target.value)}
                    aria-label="TMT API Token"
                    className="h-8 text-xs"
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Knowledge Graph */}
          <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50 dark:hover:bg-muted/30">
            <div className="flex items-center gap-2 min-w-0">
              <Share2
                className={`size-4 shrink-0 ${
                  knowledgeGraphEnabled
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-muted-foreground dark:text-muted-foreground/70'
                }`}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor="kg-toggle"
                      className="text-sm cursor-pointer dark:text-foreground/90"
                    >
                      Knowledge Graph
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    Track terminology across the document for consistent
                    translations. Same term always gets the same translation.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="kg-toggle"
              checked={knowledgeGraphEnabled}
              onCheckedChange={(checked) => { toggleKnowledgeGraph(); showToggleNotification('Knowledge Graph', checked as boolean); }}
              className="data-[state=checked]:bg-teal-500 transition-colors duration-300"
            />
          </div>

          {/* Font Adjustment */}
          <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50 dark:hover:bg-muted/30">
            <div className="flex items-center gap-2 min-w-0">
              <Type
                className={`size-4 shrink-0 ${
                  fontAdjustEnabled
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-muted-foreground dark:text-muted-foreground/70'
                }`}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor="font-toggle"
                      className="text-sm cursor-pointer dark:text-foreground/90"
                    >
                      Font Adjustment
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    Adjust font sizes and bounding boxes for target language
                    scripts that may be larger or smaller than the source.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="font-toggle"
              checked={fontAdjustEnabled}
              onCheckedChange={(checked) => { toggleFontAdjust(); showToggleNotification('Font Adjust', checked as boolean); }}
              className="data-[state=checked]:bg-orange-500 transition-colors duration-300"
            />
          </div>

          {/* Glossary */}
          <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50 dark:hover:bg-muted/30">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen
                className={`size-4 shrink-0 ${
                  glossaryEnabled
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground dark:text-muted-foreground/70'
                }`}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor="glossary-toggle"
                      className="text-sm cursor-pointer dark:text-foreground/90"
                    >
                      Glossary
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    Apply custom terminology during translation for consistent
                    term rendering. Manage entries in the Glossary tab.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="glossary-toggle"
              checked={glossaryEnabled}
              onCheckedChange={(checked) => { toggleGlossary(); showToggleNotification('Glossary', checked as boolean); }}
              className="data-[state=checked]:bg-emerald-500 transition-colors duration-300"
            />
          </div>

          {/* Translation Memory */}
          <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50 dark:hover:bg-muted/30">
            <div className="flex items-center gap-2 min-w-0">
              <Database
                className={`size-4 shrink-0 ${
                  translationMemoryEnabled
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-muted-foreground dark:text-muted-foreground/70'
                }`}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor="tm-toggle"
                      className="text-sm cursor-pointer dark:text-foreground/90"
                    >
                      Translation Memory
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    Cache and reuse previous translations with fuzzy matching
                    (≥80% similarity). Saves time on repeated content.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="tm-toggle"
              checked={translationMemoryEnabled}
              onCheckedChange={(checked) => { toggleTranslationMemory(); showToggleNotification('Translation Memory', checked as boolean); }}
              className="data-[state=checked]:bg-teal-500 transition-colors duration-300"
            />
          </div>

          {/* Live Preview */}
          <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50 dark:hover:bg-muted/30">
            <div className="flex items-center gap-2 min-w-0">
              <Eye
                className={`size-4 shrink-0 ${
                  livePreviewEnabled
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-muted-foreground dark:text-muted-foreground/70'
                }`}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor="live-preview-toggle"
                      className="text-sm cursor-pointer dark:text-foreground/90"
                    >
                      Live Preview
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    Show a real-time translation preview as you type.
                    Translates the current sentence with a brief delay.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="live-preview-toggle"
              checked={livePreviewEnabled}
              onCheckedChange={(checked) => { toggleLivePreview(); showToggleNotification('Live Preview', checked as boolean); }}
            />
          </div>

          {/* Demo Mode */}
          <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-muted/50 dark:hover:bg-muted/30">
            <div className="flex items-center gap-2 min-w-0">
              <FlaskConical
                className={`size-4 shrink-0 ${
                  demoMode
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground dark:text-muted-foreground/70'
                }`}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label
                      htmlFor="demo-mode-toggle"
                      className="text-sm cursor-pointer flex items-center gap-2 dark:text-foreground/90"
                    >
                      Demo Mode
                      {demoMode && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-400">
                          Active
                        </span>
                      )}
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px]">
                    Use simulated translations when the TMT API is unavailable.
                    Great for demos and testing. Auto-activates on API 401 errors.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="demo-mode-toggle"
              checked={demoMode}
              onCheckedChange={(checked) => { toggleDemoMode(); showToggleNotification('Demo Mode', checked as boolean); }}
              className="data-[state=checked]:bg-amber-500 transition-colors duration-300"
            />
          </div>
        </div>

        {/* API Token */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Key className="size-3.5 text-muted-foreground" />
            <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground/90 uppercase tracking-wider">
              TMT API Token
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="password"
              placeholder="team_xxxxxxxx"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              aria-label="TMT API Token"
              className="h-8 text-xs font-mono flex-1 dark:border-border/60 dark:bg-background/80"
            />
            <Button
              variant="outline"
              size="sm"
              className={`h-8 text-xs shrink-0 ${connectionStatus === 'idle' && !apiToken ? 'animate-pulse border-emerald-300 dark:border-emerald-700' : ''}`}
              onClick={handleTestConnection}
              disabled={isTestingConnection}
            >
              {isTestingConnection ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block"
                >
                  ⟳
                </motion.span>
              ) : connectionStatus === 'success' ? (
                <span className="text-emerald-600">✓</span>
              ) : connectionStatus === 'error' ? (
                <span className="text-red-500">✗</span>
              ) : (
                'Test'
              )}
            </Button>
          </div>
          {!apiToken && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Required for translation. Get yours from TMT.
            </p>
          )}
          {apiToken && connectionStatus === 'idle' && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Token configured ✓
            </p>
          )}
          {connectionStatus === 'success' && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Connection successful ✓
            </p>
          )}
          {connectionStatus === 'error' && (
            <p className="text-[10px] text-red-500 dark:text-red-400">
              Connection failed. Check your token.
            </p>
          )}
        </div>

        <Separator />

        {/* Current language pair display */}
        <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 p-3 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-700/30">
          <p className="text-xs text-muted-foreground text-center">
            Translating:{' '}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {LANGUAGES.find(l => l.value === srcLang)?.flag} {srcLang}
            </span>{' '}
            →{' '}
            <span className="font-semibold text-teal-700 dark:text-teal-400">
              {LANGUAGES.find(l => l.value === tgtLang)?.flag} {tgtLang}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
