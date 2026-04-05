// Scoreblinn - Popup Script

(function () {
  "use strict";

  let settings = null;
  let saveStatusTimer = null;

  // ─── DOM refs ─────────────────────────────────────────────────────────────────
  const masterToggle   = document.getElementById("masterToggle");
  const blurScoreText  = document.getElementById("blurScoreText");
  const blurThumbnails = document.getElementById("blurThumbnails");
  const showRevealBtn  = document.getElementById("showRevealButton");
  const mainContent    = document.getElementById("mainContent");
  const saveStatus     = document.getElementById("saveStatus");

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  function showSaved() {
    saveStatus.textContent = "Saved";
    saveStatus.classList.add("visible");
    clearTimeout(saveStatusTimer);
    saveStatusTimer = setTimeout(() => {
      saveStatus.classList.remove("visible");
    }, 1500);
  }

  function setMainDimmed(disabled) {
    mainContent.classList.toggle("dimmed", disabled);
  }

  // ─── Render settings into UI ──────────────────────────────────────────────────

  function renderSettings() {
    if (!settings) return;

    masterToggle.checked = !!settings.enabled;
    blurScoreText.checked = !!settings.blurScoreText;
    blurThumbnails.checked = !!settings.blurThumbnails;
    showRevealBtn.checked = !!settings.showRevealButton;

    setMainDimmed(!settings.enabled);

    // Sports
    for (const sport of ["basketball", "soccer"]) {
      const sportToggle = document.getElementById(`sport-${sport}`);
      const sportData = settings.sports[sport];
      if (!sportToggle || !sportData) continue;

      sportToggle.checked = !!sportData.enabled;

      const section = document.getElementById(`section-${sport}`);
      if (section) {
        section.classList.toggle("sport-disabled", !sportData.enabled);
      }

      // Leagues
      for (const [league, enabled] of Object.entries(sportData.leagues)) {
        const leagueToggle = document.getElementById(`league-${sport}-${league}`);
        if (leagueToggle) {
          leagueToggle.checked = !!enabled;
        }
      }
    }
  }

  // ─── Read UI into settings ────────────────────────────────────────────────────

  function collectSettings() {
    settings.enabled = masterToggle.checked;
    settings.blurScoreText = blurScoreText.checked;
    settings.blurThumbnails = blurThumbnails.checked;
    settings.showRevealButton = showRevealBtn.checked;

    for (const sport of ["basketball", "soccer"]) {
      const sportToggle = document.getElementById(`sport-${sport}`);
      if (!sportToggle) continue;
      settings.sports[sport].enabled = sportToggle.checked;

      for (const league of Object.keys(settings.sports[sport].leagues)) {
        const leagueToggle = document.getElementById(`league-${sport}-${league}`);
        if (leagueToggle) {
          settings.sports[sport].leagues[league] = leagueToggle.checked;
        }
      }
    }
  }

  // ─── Save ─────────────────────────────────────────────────────────────────────

  function save() {
    collectSettings();
    // Write directly to storage.local; content scripts respond via storage.onChanged
    browser.storage.local.set({ [STORAGE_KEY]: settings }).then(() => {
      showSaved();
      // Also notify via message for tabs that may not have storage.onChanged wired up
      browser.runtime.sendMessage({ type: "SAVE_SETTINGS", settings }).catch(() => {});
    }).catch(() => {
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings }, () => {
          showSaved();
        });
      }
    });
  }

  // ─── Event Listeners ──────────────────────────────────────────────────────────

  masterToggle.addEventListener("change", () => {
    setMainDimmed(!masterToggle.checked);
    save();
  });

  blurScoreText.addEventListener("change", save);
  blurThumbnails.addEventListener("change", save);
  showRevealBtn.addEventListener("change", save);

  // Sport-level toggles
  document.querySelectorAll("[data-sport][id^='sport-']").forEach((toggle) => {
    toggle.addEventListener("change", () => {
      const sport = toggle.dataset.sport;
      const section = document.getElementById(`section-${sport}`);
      if (section) section.classList.toggle("sport-disabled", !toggle.checked);
      save();
    });
  });

  // League toggles
  document.querySelectorAll("[data-league]").forEach((toggle) => {
    toggle.addEventListener("change", save);
  });

  // Expand/collapse sport sections
  document.querySelectorAll(".sport-expand-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sport = btn.dataset.sport;
      const leaguesList = document.getElementById(`leagues-${sport}`);
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      if (leaguesList) {
        leaguesList.classList.toggle("collapsed", expanded);
      }
    });
  });

  // ─── Load ─────────────────────────────────────────────────────────────────────

  const STORAGE_KEY = "scoreblinnSettings";

  function load() {
    // Read directly from storage.local — faster than a background round-trip
    browser.storage.local.get(STORAGE_KEY).then((result) => {
      settings = result[STORAGE_KEY];
      if (!settings) {
        // Fall back to background for defaults
        browser.runtime.sendMessage({ type: "GET_DEFAULT_SETTINGS" }).then((r) => {
          settings = r.settings;
          renderSettings();
        });
      } else {
        renderSettings();
      }
    }).catch(() => {
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
          if (response) {
            settings = response.settings;
            renderSettings();
          }
        });
      }
    });
  }

  load();
})();
