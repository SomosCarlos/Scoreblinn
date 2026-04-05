// Scoreblinn - Content Script
// Detects and blurs sports scores in web pages and YouTube thumbnails

(function () {
  "use strict";

  // ─── Constants ───────────────────────────────────────────────────────────────

  const BLUR_CLASS = "scoreblinn-blur";
  const BLUR_WRAP_CLASS = "scoreblinn-wrap";
  const THUMB_BLUR_CLASS = "scoreblinn-thumb-blur";
  const PROCESSED_ATTR = "data-scoreblinn-processed";

  // League keyword maps for context-aware detection
  const LEAGUE_KEYWORDS = {
    basketball: {
      nba: ["nba", "lakers", "celtics", "warriors", "bulls", "nets", "knicks", "heat", "bucks", "nuggets", "suns", "clippers", "76ers", "sixers", "raptors", "mavericks", "mavs", "thunder", "blazers", "spurs", "rockets", "jazz", "timberwolves", "wolves", "pelicans", "grizzlies", "kings", "pistons", "cavaliers", "cavs", "wizards", "magic", "hornets", "hawks", "pacers", "pistons"],
      ncaa: ["ncaa", "march madness", "college basketball", "ncaab", "acc", "big ten", "pac-12", "sec basketball", "final four", "sweet sixteen", "elite eight"],
      euroleague: ["euroleague", "euro league", "olympiacos", "real madrid basketball", "fenerbahce", "cska moscow", "barcelona basketball", "anadolu efes"],
      fiba: ["fiba", "basketball world cup", "eurobasket", "fiba world cup", "olympics basketball", "olympic basketball"],
      nbl: ["nbl", "national basketball league", "sydney kings", "melbourne united", "perth wildcats", "brisbane bullets", "adelaide 36ers"]
    },
    soccer: {
      premier_league: ["premier league", "epl", "arsenal", "chelsea", "liverpool", "manchester united", "man united", "man utd", "manchester city", "man city", "tottenham", "spurs", "newcastle", "aston villa", "west ham", "brighton", "brentford", "everton", "fulham", "wolverhampton", "wolves", "crystal palace", "bournemouth", "nottingham forest", "burnley", "sheffield united", "luton"],
      la_liga: ["la liga", "laliga", "real madrid", "barcelona", "atletico madrid", "atletico", "sevilla", "valencia", "villarreal", "real sociedad", "athletic bilbao", "real betis", "osasuna", "girona", "cadiz", "rayo vallecano", "celta vigo", "mallorca", "getafe", "almeria"],
      serie_a: ["serie a", "serie-a", "juventus", "inter milan", "internazionale", "ac milan", "napoli", "as roma", "lazio", "atalanta", "fiorentina", "torino", "bologna", "udinese", "monza", "hellas verona", "lecce", "sassuolo", "cagliari", "genoa", "frosinone"],
      bundesliga: ["bundesliga", "bundesliga", "bayern munich", "borussia dortmund", "bvb", "rb leipzig", "bayer leverkusen", "eintracht frankfurt", "borussia monchengladbach", "wolfsburg", "hoffenheim", "freiburg", "mainz", "union berlin", "augsburg", "bochum", "koln", "heidenheim", "darmstadt"],
      ligue_1: ["ligue 1", "ligue1", "psg", "paris saint-germain", "paris saint germain", "marseille", "lyon", "monaco", "lille", "nice", "rennes", "lens", "montpellier", "nantes", "strasbourg", "reims", "toulouse", "lorient", "clermont", "metz", "le havre"],
      mls: ["mls", "major league soccer", "inter miami", "la galaxy", "lafc", "seattle sounders", "portland timbers", "new york red bulls", "nycfc", "new york city fc", "atlanta united", "sporting kc", "sporting kansas city", "columbus crew", "new england revolution", "philadelphia union", "dc united", "toronto fc", "cf montreal", "chicago fire", "minnesota united", "real salt lake", "san jose earthquakes", "fc dallas", "houston dynamo", "austin fc", "nashville sc", "charlotte fc", "st louis city"],
      champions_league: ["champions league", "ucl", "uefa champions league", "cl final", "cl group", "champions league group"],
      europa_league: ["europa league", "uel", "uefa europa league", "europa conference league", "uecl"],
      world_cup: ["world cup", "fifa world cup", "worldcup", "wc 2026", "wc 2022", "wc2022", "wc2026", "copa del mundo", "coupe du monde"],
      eredivisie: ["eredivisie", "ajax", "psv", "feyenoord", "az alkmaar", "utrecht", "vitesse", "twente"],
      liga_mx: ["liga mx", "liga mx", "liga bbva", "chivas", "guadalajara", "club america", "tigres", "monterrey", "cruz azul", "pumas", "toluca", "leon", "santos laguna", "atlas", "necaxa", "queretaro", "puebla", "mazatlan"]
    }
  };

  // Score patterns for each sport
  const SCORE_PATTERNS = {
    basketball: [
      // "Lakers 110 - Warriors 98" or "Lakers 110, Warriors 98"
      /\b(?:final[\s:]*)?(\d{2,3})\s*[-–—]\s*(\d{2,3})\b(?:\s*(?:final|ot|2ot|3ot|overtime))?/gi,
      // "Final: 110-98" or "Final Score: 110-98"
      /\bfinal\s*(?:score)?[\s:]*(\d{2,3})\s*[-–—]\s*(\d{2,3})\b/gi,
      // "Score: 110-98" context
      /\bscore\s*[\s:]+(\d{2,3})\s*[-–—]\s*(\d{2,3})\b/gi,
      // Win/loss with score: "won 115-108" "lost 98-112" "beat ... 110-95"
      /\b(?:won|beat|defeated|lost|fell)\s+(?:\S+\s+)?(\d{2,3})\s*[-–—]\s*(\d{2,3})\b/gi,
      // Inline score format "Lakers (110) Warriors (98)" - less common but valid
      /\b(\d{2,3})\s*[-–—]\s*(\d{2,3})\s*(?:final|ot|overtime)\b/gi
    ],
    soccer: [
      // "Arsenal 2-1 Chelsea" or "Arsenal 2 - 1 Chelsea"
      /\b(\d)\s*[-–—:]\s*(\d)\b(?!\s*(?:am|pm|:\d{2}))/gi,
      // "FT: 2-1" or "HT: 1-0" or "Full Time: 2-1"
      /\b(?:ft|ht|ftr|full[\s-]?time|half[\s-]?time|final)[\s:]+(\d)\s*[-–—:]\s*(\d)\b/gi,
      // "won 3-0" "beat ... 2-1" "lost 0-2"
      /\b(?:won|beat|defeated|lost|fell)\s+(?:\S+\s+)?(\d)\s*[-–—]\s*(\d)\b/gi,
      // Score in parentheses "(2-1)" common in articles
      /\((\d)\s*[-–—]\s*(\d)\)/g,
      // "goals: 3-1" or "result: 2-0"
      /\b(?:goals?|result|score)[\s:]+(\d)\s*[-–—:]\s*(\d)\b/gi
    ]
  };

  // Keywords that indicate a video/article is about highlights or final results
  const HIGHLIGHT_KEYWORDS = [
    "highlights", "highlight", "recap", "extended highlights",
    "full match", "goals", "best goals", "all goals",
    "match recap", "game recap", "post-match", "post match",
    "final score", "final result", "result", "full highlights",
    "winning goal", "equalizer", "screamer", "buzzer beater",
    "clutch", "walkoff", "overtime winner"
  ];

  // YouTube channel keywords associated with sports highlights
  const HIGHLIGHT_CHANNELS = [
    "nba", "espn", "sky sports", "btsport", "bt sport",
    "premier league", "laliga", "bundesliga", "serie a",
    "ligue 1", "champions league", "uefa",
    "bleacher report", "house of highlights", "nba highlights",
    "la liga", "goal", "football daily", "tifo football",
    "streamline sports", "433", "copa90", "sporf",
    "mls", "major league soccer"
  ];

  // ─── State ───────────────────────────────────────────────────────────────────

  let settings = null;
  let observer = null;

  // ─── Settings Helpers ────────────────────────────────────────────────────────

  function isLeagueEnabled(sport, league) {
    if (!settings || !settings.enabled) return false;
    const sportSettings = settings.sports[sport];
    if (!sportSettings || !sportSettings.enabled) return false;
    return sportSettings.leagues[league] !== false;
  }

  function isSportEnabled(sport) {
    if (!settings || !settings.enabled) return false;
    const sportSettings = settings.sports[sport];
    return sportSettings && sportSettings.enabled;
  }

  function getEnabledLeagueKeywords(sport) {
    if (!settings || !isSportEnabled(sport)) return [];
    const leagueMap = LEAGUE_KEYWORDS[sport];
    const sportSettings = settings.sports[sport];
    const keywords = [];
    for (const [league, words] of Object.entries(leagueMap)) {
      if (sportSettings.leagues[league] !== false) {
        keywords.push(...words);
      }
    }
    return keywords;
  }

  // ─── Score Detection ─────────────────────────────────────────────────────────

  // Check if a text node's context contains keywords for enabled leagues
  function getMatchingSport(contextText) {
    const lower = contextText.toLowerCase();
    for (const sport of ["basketball", "soccer"]) {
      if (!isSportEnabled(sport)) continue;
      const keywords = getEnabledLeagueKeywords(sport);
      if (keywords.some((kw) => lower.includes(kw))) {
        return sport;
      }
    }
    return null;
  }

  // Get ~500 chars of surrounding context for a text node
  function getContext(node) {
    const parent = node.parentElement;
    if (!parent) return "";
    // Grab the closest article/section/div ancestor text
    let el = parent;
    let depth = 0;
    while (el && depth < 5) {
      const text = el.innerText || el.textContent || "";
      if (text.length > 50) return text.slice(0, 800).toLowerCase();
      el = el.parentElement;
      depth++;
    }
    return (parent.innerText || parent.textContent || "").slice(0, 800).toLowerCase();
  }

  // Replace score matches in a text node with blurred spans
  function processTextNode(textNode) {
    if (textNode[PROCESSED_ATTR]) return;
    if (!settings || !settings.enabled || !settings.blurScoreText) return;

    const text = textNode.textContent;
    if (!text || text.trim().length < 3) return;

    // Skip if inside a script, style, or already-blurred element
    const parent = textNode.parentElement;
    if (!parent) return;
    if (parent.classList && parent.classList.contains(BLUR_CLASS)) return;
    const tagName = parent.tagName;
    if (tagName === "SCRIPT" || tagName === "STYLE" || tagName === "NOSCRIPT") return;

    const context = getContext(textNode);
    const sport = getMatchingSport(context);
    if (!sport) return;

    const patterns = SCORE_PATTERNS[sport];
    let html = escapeHtml(text);
    let hasMatch = false;

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const newHtml = html.replace(pattern, (match) => {
        hasMatch = true;
        return `<span class="${BLUR_CLASS}" data-sport="${sport}" title="Click to reveal score">${escapeHtml(match)}</span>`;
      });
      html = newHtml;
    }

    if (hasMatch) {
      const wrapper = document.createElement("span");
      wrapper.className = BLUR_WRAP_CLASS;
      wrapper.innerHTML = html;
      parent.replaceChild(wrapper, textNode);
    }

    textNode[PROCESSED_ATTR] = true;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Walk all text nodes in an element
  function walkTextNodes(root) {
    if (!root) return;
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_SKIP;
          if (p.classList && p.classList.contains(BLUR_CLASS)) return NodeFilter.FILTER_SKIP;
          if (p.classList && p.classList.contains(BLUR_WRAP_CLASS)) return NodeFilter.FILTER_SKIP;
          const tag = p.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return NodeFilter.FILTER_SKIP;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      nodes.push(node);
    }
    nodes.forEach(processTextNode);
  }

  // ─── YouTube Thumbnail Blurring ───────────────────────────────────────────────

  function isThumbnailRelatedToSports(titleText) {
    if (!settings || !settings.blurThumbnails) return false;
    const lower = (titleText || "").toLowerCase();

    // Check if title contains highlight keywords
    const hasHighlightKeyword = HIGHLIGHT_KEYWORDS.some((kw) => lower.includes(kw));
    if (!hasHighlightKeyword) return false;

    // Check if any enabled sport's league keywords match
    for (const sport of ["basketball", "soccer"]) {
      if (!isSportEnabled(sport)) continue;
      const keywords = getEnabledLeagueKeywords(sport);
      if (keywords.some((kw) => lower.includes(kw))) return true;
    }

    // Also check highlight channels
    return HIGHLIGHT_CHANNELS.some((ch) => lower.includes(ch));
  }

  function blurYouTubeThumbnail(container) {
    if (container.getAttribute(PROCESSED_ATTR)) return;
    container.setAttribute(PROCESSED_ATTR, "1");

    // Get the title text from various YouTube element types
    const titleSelectors = [
      "#video-title",
      "#title",
      "yt-formatted-string#video-title",
      ".title.ytd-compact-video-renderer",
      "span.yt-core-attributed-string"
    ];

    let titleText = "";
    for (const sel of titleSelectors) {
      const el = container.querySelector(sel);
      if (el) {
        titleText = el.textContent || el.getAttribute("title") || "";
        break;
      }
    }

    // Also check channel name
    const channelEl = container.querySelector(
      "#channel-name, .ytd-channel-name, yt-formatted-string.ytd-channel-name"
    );
    const channelText = channelEl ? channelEl.textContent : "";

    const combinedText = `${titleText} ${channelText}`;
    if (!isThumbnailRelatedToSports(combinedText)) return;

    // Find the thumbnail image/link
    const thumb = container.querySelector(
      "#thumbnail, ytd-thumbnail, a.ytd-thumbnail, .ytd-compact-video-renderer #thumbnail"
    );
    if (!thumb) return;
    if (thumb.querySelector(`.${THUMB_BLUR_CLASS}`)) return;

    // Apply blur overlay
    const overlay = document.createElement("div");
    overlay.className = THUMB_BLUR_CLASS;
    overlay.innerHTML = `
      <span class="scoreblinn-thumb-icon">⚽🏀</span>
      <span class="scoreblinn-thumb-label">Score Hidden</span>
      <span class="scoreblinn-thumb-hint">Click to reveal</span>
    `;
    overlay.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      overlay.classList.add("scoreblinn-revealed");
    });

    thumb.style.position = "relative";
    thumb.appendChild(overlay);
  }

  function processYouTubeThumbnails(root) {
    if (!settings || !settings.blurThumbnails) return;
    const hostname = window.location.hostname;
    if (!hostname.includes("youtube.com")) return;

    const containerSelectors = [
      "ytd-video-renderer",
      "ytd-compact-video-renderer",
      "ytd-grid-video-renderer",
      "ytd-rich-item-renderer",
      "ytd-reel-item-renderer",
      "ytd-shorts-lockup-view-model"
    ];

    const selector = containerSelectors.join(", ");
    const containers = (root === document ? document : root).querySelectorAll
      ? (root.querySelectorAll ? root : document).querySelectorAll(selector)
      : [];

    containers.forEach(blurYouTubeThumbnail);
  }

  // ─── Search Result Blurring ───────────────────────────────────────────────────

  function processSearchResults(root) {
    if (!settings || !settings.enabled || !settings.blurScoreText) return;

    const hostname = window.location.hostname;

    // Google Search result containers
    if (hostname.includes("google.")) {
      const results = (root.querySelectorAll || document.querySelectorAll.bind(document))(
        ".g, .MjjYud, .tF2Cxc, .yuRUbf, [data-hveid], .BNeawe, .s3v9rd"
      );
      results.forEach((el) => {
        if (!el.getAttribute(PROCESSED_ATTR)) {
          walkTextNodes(el);
        }
      });
    }

    // Bing Search
    if (hostname.includes("bing.com")) {
      const results = document.querySelectorAll(".b_algo, .b_title, .b_caption");
      results.forEach((el) => walkTextNodes(el));
    }

    // DuckDuckGo
    if (hostname.includes("duckduckgo.com")) {
      const results = document.querySelectorAll(
        "[data-result], .result, .result__body, .result__title, .result__snippet"
      );
      results.forEach((el) => walkTextNodes(el));
    }
  }

  // ─── Full Page Processing ─────────────────────────────────────────────────────

  function processPage() {
    if (!settings || !settings.enabled) return;

    // YouTube thumbnail blurring
    processYouTubeThumbnails(document);

    // Score text blurring — scan body text nodes on sports/news/search sites
    const hostname = window.location.hostname;
    const isSearchEngine =
      hostname.includes("google.") ||
      hostname.includes("bing.com") ||
      hostname.includes("duckduckgo.com") ||
      hostname.includes("yahoo.com");

    const isSportsSite =
      hostname.includes("espn.com") ||
      hostname.includes("bbc.com/sport") ||
      hostname.includes("skysports.com") ||
      hostname.includes("nbcsports.com") ||
      hostname.includes("goal.com") ||
      hostname.includes("90min.com") ||
      hostname.includes("theathletic.com") ||
      hostname.includes("bleacherreport.com") ||
      hostname.includes("nba.com") ||
      hostname.includes("nfl.com") ||
      hostname.includes("mlssoccer.com") ||
      hostname.includes("premierleague.com") ||
      hostname.includes("laliga.com") ||
      hostname.includes("bundesliga.com") ||
      hostname.includes("seriea.it") ||
      hostname.includes("ligue1.com") ||
      hostname.includes("uefa.com") ||
      hostname.includes("transfermarkt") ||
      hostname.includes("sofascore.com") ||
      hostname.includes("flashscore.com") ||
      hostname.includes("livescore.com") ||
      hostname.includes("foxsports.com");

    if (isSearchEngine) {
      processSearchResults(document);
    } else if (isSportsSite || hostname.includes("youtube.com")) {
      walkTextNodes(document.body);
    }
  }

  // ─── Remove All Blurring ─────────────────────────────────────────────────────

  function removeAllBlurring() {
    // Remove text blurs
    document.querySelectorAll(`.${BLUR_WRAP_CLASS}`).forEach((wrap) => {
      const parent = wrap.parentNode;
      if (parent) {
        const textNode = document.createTextNode(wrap.textContent);
        parent.replaceChild(textNode, wrap);
      }
    });

    // Remove thumbnail overlays
    document.querySelectorAll(`.${THUMB_BLUR_CLASS}`).forEach((overlay) => {
      overlay.remove();
    });

    // Remove processed markers from thumbnails
    document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach((el) => {
      el.removeAttribute(PROCESSED_ATTR);
    });
  }

  // ─── MutationObserver ─────────────────────────────────────────────────────────

  function startObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Process new elements
            setTimeout(() => {
              processYouTubeThumbnails(node);
              walkTextNodes(node);
            }, 100);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ─── Click-to-Reveal ─────────────────────────────────────────────────────────

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (target && target.classList && target.classList.contains(BLUR_CLASS)) {
      e.stopPropagation();
      if (settings && settings.showRevealButton) {
        target.classList.toggle("scoreblinn-revealed");
      }
    }
  });

  // ─── Initialization ───────────────────────────────────────────────────────────

  function init(settingsData) {
    settings = settingsData;

    if (!settings || !settings.enabled) {
      // Extension disabled — clean up any previous blurring
      removeAllBlurring();
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      return;
    }

    processPage();
    startObserver();

    // For YouTube SPA navigation — re-process after route changes
    if (window.location.hostname.includes("youtube.com")) {
      let lastUrl = location.href;
      setInterval(() => {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          setTimeout(processPage, 500);
          setTimeout(processPage, 1500);
        }
      }, 1000);
    }
  }

  // ─── Listen for settings updates from background ──────────────────────────────

  browser.runtime.onMessage.addListener((message) => {
    if (message.type === "SETTINGS_UPDATED") {
      settings = message.settings;
      removeAllBlurring();
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (settings && settings.enabled) {
        setTimeout(processPage, 50);
        startObserver();
      }
    }
  });

  // ─── Bootstrap ───────────────────────────────────────────────────────────────

  browser.runtime.sendMessage({ type: "GET_SETTINGS" }).then((response) => {
    init(response.settings);
  }).catch(() => {
    // Fallback: try with chrome namespace
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (response) => {
        if (response) init(response.settings);
      });
    }
  });
})();
