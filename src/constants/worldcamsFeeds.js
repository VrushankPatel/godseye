/**
 * worldcamsFeeds.js — Dynamic WorldCams Feed Loader
 *
 * Replaced the static 376KB export with a runtime scraper.
 * Feeds are discovered dynamically by feedDiscovery.js.
 * This module now exports an empty array — CameraLayer uses
 * feedDiscovery.discoverWorldCamsFeeds() instead.
 */

// Legacy export kept for backwards compatibility.
// CameraLayer no longer imports WORLDCAMS_FEEDS directly;
// dynamic discovery handles WorldCams at runtime.
export const WORLDCAMS_FEEDS = [];
