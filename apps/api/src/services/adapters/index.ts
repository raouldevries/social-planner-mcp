/**
 * Analytics Adapters Index
 *
 * Registers all platform-specific analytics adapters.
 */

import { registerAdapter } from '../analytics-sync.service';
import { LinkedInAnalyticsAdapter } from './linkedin-analytics.adapter';
import { InstagramAnalyticsAdapter } from './instagram-analytics.adapter';

// ============================================
// ADAPTER INSTANCES
// ============================================

const linkedInAdapter = new LinkedInAnalyticsAdapter();
const instagramAdapter = new InstagramAnalyticsAdapter();

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize and register all analytics adapters
 * Call this once during application startup
 */
export function initializeAnalyticsAdapters(): void {
  registerAdapter('LINKEDIN', linkedInAdapter);
  registerAdapter('INSTAGRAM', instagramAdapter);
}

// ============================================
// EXPORTS
// ============================================

export { LinkedInAnalyticsAdapter, InstagramAnalyticsAdapter };
