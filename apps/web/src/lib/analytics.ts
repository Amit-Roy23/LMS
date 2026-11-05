/**
 * Marketing analytics: Google Analytics 4, Google Ads and Meta Pixel, enabled by setting
 * NEXT_PUBLIC_GA_ID, NEXT_PUBLIC_GOOGLE_ADS_ID and NEXT_PUBLIC_META_PIXEL_ID.
 * `track` sends the same conversion to every connected tool (no-op when none are set).
 */
export const ANALYTICS = {
  gaId: process.env.NEXT_PUBLIC_GA_ID || '',
  adsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '',
  pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
};

const META_EVENTS: Record<string, string> = {
  sign_up: 'CompleteRegistration',
  generate_lead: 'Lead',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
  view_item: 'ViewContent',
};

export function track(event: string, params: Record<string, any> = {}) {
  if (typeof window === 'undefined') return;
  const w = window as any;
  try {
    w.gtag?.('event', event, params);
    const meta = META_EVENTS[event];
    if (meta) w.fbq?.('track', meta, params.value ? { value: params.value, currency: params.currency || 'INR' } : undefined);
  } catch {
    /* analytics must never break the page */
  }
}
