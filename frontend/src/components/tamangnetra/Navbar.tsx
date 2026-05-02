"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Mountain, Menu, X, HelpCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { restartTour } from "./OnboardingTour";
import { NotificationPanel } from "./NotificationCenter";

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track active section for indicator dot
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(`#${entry.target.id}`);
          }
        });
      },
      { threshold: 0.3, rootMargin: "-80px 0px -50% 0px" },
    );

    navItems.forEach((item) => {
      const el = document.querySelector(item.href);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`sticky top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "bg-background/80 dark:bg-background/90 backdrop-blur-2xl border-b border-border/50 shadow-lg shadow-emerald-500/5 dark:shadow-emerald-500/5 dark:border-emerald-500/10"
          : "bg-background/30 dark:bg-background/50 backdrop-blur-md"
      }`}
      style={{
        backdropFilter: scrolled
          ? "blur(24px) saturate(180%)"
          : "blur(12px) saturate(100%)",
        WebkitBackdropFilter: scrolled
          ? "blur(24px) saturate(180%)"
          : "blur(12px) saturate(100%)",
      }}
    >
      {/* Gradient line at bottom — always visible (1px subtle), stronger when scrolled */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-emerald-500/40 dark:via-emerald-400/30 to-transparent transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-30"}`}
      />
      {/* Subtle border glow in dark mode */}
      {scrolled && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-emerald-500 via-teal-500 to-amber-500 opacity-60 dark:opacity-40 dark:shadow-[0_0_8px_rgba(16,185,129,0.15)]" />
      )}

      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <motion.div
            className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20"
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <Eye className="size-4 text-white" />
          </motion.div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold bg-linear-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Tamang
            </span>
            <span className="text-base font-bold bg-linear-to-r from-teal-500 to-amber-500 bg-clip-text text-transparent">
              Netra
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground">
              तामाङनेत्र
            </span>
          </div>
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <div key={item.href} className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavClick(item.href)}
                className={`text-sm transition-colors hover-underline ${
                  activeSection === item.href
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
                {/* Green dot indicator next to "Translate" nav link */}
                {item.label === "Translate" && (
                  <span className="relative ml-1.5 flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                )}
              </Button>
              {/* Active indicator dot */}
              <AnimatePresence>
                {activeSection === item.href && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-emerald-500"
                  />
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-foreground"
            asChild
          >
            <a
              href="https://github.com/Ssaammmmiitt/TamangNetra"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <svg
                className="size-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </Button>

          {/* Mobile menu button — animated hamburger to X morph */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden size-9 relative"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <div className="relative size-4 flex flex-col items-center justify-center">
              <motion.span
                className="absolute block h-[1.5px] w-4 bg-current"
                animate={
                  mobileOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -4 }
                }
                transition={{ duration: 0.2 }}
              />
              <motion.span
                className="absolute block h-[1.5px] w-4 bg-current"
                animate={
                  mobileOpen
                    ? { opacity: 0, scaleX: 0 }
                    : { opacity: 1, scaleX: 1 }
                }
                transition={{ duration: 0.15 }}
              />
              <motion.span
                className="absolute block h-[1.5px] w-4 bg-current"
                animate={
                  mobileOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 4 }
                }
                transition={{ duration: 0.2 }}
              />
            </div>
          </Button>
        </div>
      </nav>

      {/* Mobile menu — smooth slide-in from right with backdrop blur */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 top-14 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed top-14 right-0 bottom-0 w-64 bg-background/95 dark:bg-background/95 backdrop-blur-2xl border-l border-border/50 dark:border-emerald-500/10 z-50 shadow-2xl dark:shadow-emerald-500/5"
            >
              <div className="flex flex-col gap-1 px-4 py-4">
                {navItems.map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNavClick(item.href)}
                      className={`w-full justify-start text-sm transition-colors ${
                        activeSection === item.href
                          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.label}
                      {/* Green dot for Translate in mobile menu too */}
                      {item.label === "Translate" && (
                        <span className="ml-auto relative flex size-2">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                        </span>
                      )}
                      {activeSection === item.href &&
                        item.label !== "Translate" && (
                          <span className="ml-auto size-2 rounded-full bg-emerald-500" />
                        )}
                    </Button>
                  </motion.div>
                ))}
                {/* Divider in mobile menu */}
                <div className="my-2 h-px bg-linear-to-r from-transparent via-emerald-500/30 to-transparent" />
                <div className="px-2 py-1 text-[10px] text-muted-foreground">
                  Press{" "}
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px]">
                    Ctrl+K
                  </kbd>{" "}
                  for shortcuts
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
