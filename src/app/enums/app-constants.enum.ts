/** Purpose key declared in NSLocationTemporaryUsageDescriptionDictionary (Info.plist). */
export const TEMPORARY_FULL_ACCURACY_PURPOSE_KEY = 'tracking';

/** Free Capawesome upload target for testing the HTTP upload pipeline. */
export const PLAYGROUND_UPLOAD_URL =
  'https://background-geolocation-playground.capawesome.io/v1/positions';
export const PLAYGROUND_WEBSITE_URL = 'https://background-geolocation-playground.capawesome.io';

/** In-memory cap for the live position feed shown on the Tracker tab. */
export const LIVE_FEED_LIMIT = 100;

/**
 * Fixes less accurate than this (meters) are shown but not added to the trip distance.
 * Phones commonly report 30-65 m outdoors/indoors, so a tighter limit drops every fix.
 */
export const MAX_DISTANCE_ACCURACY_METERS = 100;

/** An OS-reported speed at or above this (m/s, ~1.8 km/h) counts as real movement. */
export const MOVING_SPEED_MPS = 0.5;

/** Speed is derived from two fixes only when both are at least this accurate (meters). */
export const SPEED_DERIVATION_MAX_ACCURACY_METERS = 50;

/** Speed is derived only from fixes at most this far apart. */
export const SPEED_DERIVATION_MAX_GAP_MS = 60_000;

/** "Speed" drops to 0 when no fix arrived for this long (the OS stops reporting when still). */
export const CURRENT_SPEED_STALE_MS = 20_000;

/** Native timeout for a one-shot position request. */
export const CURRENT_POSITION_TIMEOUT_MS = 15_000;

/**
 * App-side safety net: the native plugin waits for the permission prompt without a
 * timeout, so a prompt iOS never shows would otherwise leave the request pending forever.
 */
export const CURRENT_POSITION_HARD_TIMEOUT_MS = CURRENT_POSITION_TIMEOUT_MS + 5_000;

/** Cap for positions drained from the native queue into Preferences. */
export const TRACK_HISTORY_LIMIT = 2000;

/** Page size used when draining the native queue (docs recommend 1000). */
export const QUEUE_DRAIN_PAGE_SIZE = 1000;

/** Number of queued positions previewed on the Queue tab. */
export const QUEUE_PREVIEW_LIMIT = 50;

/** Cap for the upload failure log. */
export const UPLOAD_FAILURE_LOG_LIMIT = 20;
