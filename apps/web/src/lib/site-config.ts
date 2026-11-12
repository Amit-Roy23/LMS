'use client';

import { useEffect, useState } from 'react';
import { getApiBase } from './api';

export interface SeoOverride {
  title: string | null;
  description: string | null;
  image: string | null;
  noindex: boolean;
}

export interface SiteConfig {
  settings: Record<string, string>;
  seo: Record<string, SeoOverride>;
}

const EMPTY: SiteConfig = { settings: {}, seo: {} };
let pending: Promise<SiteConfig> | null = null;

/** Loads the public website settings once per page load and shares them between components. */
export function loadSiteConfig(): Promise<SiteConfig> {
  if (!pending) {
    pending = fetch(`${getApiBase()}/site-config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => (b?.success ? (b.data as SiteConfig) : EMPTY))
      .catch(() => EMPTY);
  }
  return pending;
}

export function useSiteConfig(): SiteConfig {
  const [cfg, setCfg] = useState<SiteConfig>(EMPTY);
  useEffect(() => {
    let alive = true;
    loadSiteConfig().then((c) => alive && setCfg(c));
    return () => {
      alive = false;
    };
  }, []);
  return cfg;
}

/** Contact details: console settings first, then the build-time environment values. */
export function contactFrom(settings: Record<string, string>) {
  return {
    email: settings['contact.email'] || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
    phone: settings['contact.phone'] || process.env.NEXT_PUBLIC_SUPPORT_PHONE || '',
    whatsapp: settings['contact.whatsapp'] || '',
    address: settings['contact.address'] || process.env.NEXT_PUBLIC_ACADEMY_ADDRESS || '',
    hours: settings['contact.hours'] || 'Monday to Saturday, 10am – 7pm IST',
  };
}

/** wa.me link for a phone number such as "+91 96813 86103". */
export function whatsappLink(phone: string, text?: string) {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
