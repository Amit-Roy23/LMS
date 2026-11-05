'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ANALYTICS } from '../../lib/analytics';

/** Loads GA4 / Google Ads / Meta Pixel when configured and reports page views on navigation. */
export function AnalyticsScripts() {
  const pathname = usePathname();
  const { gaId, adsId, pixelId } = ANALYTICS;
  const gtagId = gaId || adsId;

  useEffect(() => {
    const w = window as any;
    if (gaId) w.gtag?.('event', 'page_view', { page_path: pathname });
    if (pixelId) w.fbq?.('track', 'PageView');
  }, [pathname, gaId, pixelId]);

  if (!gtagId && !pixelId) return null;
  return (
    <>
      {gtagId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());${
              gaId ? `gtag('config','${gaId}',{send_page_view:false});` : ''
            }${adsId ? `gtag('config','${adsId}');` : ''}`}
          </Script>
        </>
      )}
      {pixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');`}
        </Script>
      )}
    </>
  );
}
