// Scoreblinn - Background Service Worker
// Manages settings and provides defaults on install

const DEFAULT_SETTINGS = {
  enabled: true,
  sports: {
    basketball: {
      enabled: true,
      leagues: {
        nba: true,
        ncaa: true,
        euroleague: true,
        fiba: true,
        nbl: true
      }
    },
    soccer: {
      enabled: true,
      leagues: {
        premier_league: true,
        la_liga: true,
        serie_a: true,
        bundesliga: true,
        ligue_1: true,
        mls: true,
        champions_league: true,
        europa_league: true,
        world_cup: true,
        eredivisie: true,
        liga_mx: true
      }
    }
  },
  blurThumbnails: true,
  blurScoreText: true,
  showRevealButton: true
};

// Use storage.local — no iCloud entitlements needed, lower latency on iOS
const STORAGE_KEY = "scoreblinnSettings";

// Initialize default settings on install
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(STORAGE_KEY).then((result) => {
    if (!result[STORAGE_KEY]) {
      browser.storage.local.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
    }
  });
});

// Listen for messages from content scripts or popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SETTINGS") {
    browser.storage.local.get(STORAGE_KEY).then((result) => {
      sendResponse({ settings: result[STORAGE_KEY] || DEFAULT_SETTINGS });
    });
    return true; // keep channel open for async response
  }

  if (message.type === "SAVE_SETTINGS") {
    browser.storage.local.set({ [STORAGE_KEY]: message.settings }).then(() => {
      sendResponse({ success: true });
      // Notify all tabs to reapply settings
      browser.tabs.query({}).then((tabs) => {
        tabs.forEach((tab) => {
          browser.tabs.sendMessage(tab.id, {
            type: "SETTINGS_UPDATED",
            settings: message.settings
          }).catch(() => {}); // ignore errors for tabs without content script
        });
      });
    });
    return true;
  }

  if (message.type === "GET_DEFAULT_SETTINGS") {
    sendResponse({ settings: DEFAULT_SETTINGS });
    return false;
  }
});
