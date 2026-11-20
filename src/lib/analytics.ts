export const OFFICIAL_SITE_ORIGIN = 'https://generation-digital-safe.ai.studio';
export const GTM_CONTAINER_ID = 'GTM-WFGLGBLL';
export const GA4_MEASUREMENT_ID = 'G-SR7213MVXP';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    __sdgLastTrackedPage?: { key: string; ts: number };
    __sdgLastTrackedEvent?: { key: string; ts: number };
  }
}

function resolvePageLocation(cleanPath: string): string {
  if (typeof window === 'undefined') return `${OFFICIAL_SITE_ORIGIN}${cleanPath}`;
  const search = window.location.search || '';
  return `${OFFICIAL_SITE_ORIGIN}${cleanPath}${search}`;
}

/**
 * Fires a single deduplicated SPA page_view hit to GA4 (G-SR7213MVXP)
 * and records a non-colliding `sdg_page_view` entry in dataLayer for GTM (GTM-WFGLGBLL).
 */
export function trackPageView(path: string, title?: string): void {
  if (typeof window === 'undefined') return;
  const cleanPath = (path || '/').replace(/\/+$/, '') || '/';
  const key = `${cleanPath}${window.location.search || ''}`;
  const now = Date.now();
  const prev = window.__sdgLastTrackedPage;

  if (prev && prev.key === key && now - prev.ts < 800) {
    return;
  }
  window.__sdgLastTrackedPage = { key, ts: now };

  const pageLocation = resolvePageLocation(cleanPath);
  const pageTitle = title || document.title;

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: key,
      page_location: pageLocation,
      page_title: pageTitle,
      send_to: GA4_MEASUREMENT_ID
    });
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'sdg_page_view',
    page_path: key,
    page_location: pageLocation,
    page_title: pageTitle
  });
}

/**
 * Fires a deduplicated interaction/conversion event to GA4 & GTM.
 */
export function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || !eventName) return;
  const key = `${eventName}:${JSON.stringify(params)}`;
  const now = Date.now();
  const prev = window.__sdgLastTrackedEvent;

  if (prev && prev.key === key && now - prev.ts < 600) {
    return;
  }
  window.__sdgLastTrackedEvent = { key, ts: now };

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, {
      ...params,
      send_to: GA4_MEASUREMENT_ID
    });
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: `sdg_${eventName}`,
    ...params
  });
}
