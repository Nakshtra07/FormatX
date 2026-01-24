const CONFIG = {
  // Chrome Web Store URL (UPDATE THIS)
  chromeWebStoreUrl:
    "https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID",

  // Analytics tracking (if using Google Analytics)
  enableAnalytics: true,

  // Smooth scroll behavior
  enableSmoothScroll: true,
};

/* ==========================================
   WAIT FOR PAGE TO LOAD
   ========================================== */
document.addEventListener("DOMContentLoaded", function () {
  console.log("Get Extension page loaded");

  /* ==========================================
       GET DOM ELEMENTS
       Cache all interactive elements
       ========================================== */
  const primaryCta = document.getElementById("primary-cta");
  const secondaryCta = document.getElementById("secondary-cta");
  const allCtaButtons = document.querySelectorAll(".btn-install-chrome");

  /* ==========================================
       DETECT BROWSER
       Check if user is on Chrome
       Show appropriate messaging
       ========================================== */
  function detectBrowser() {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.indexOf("chrome") > -1 && userAgent.indexOf("edg") === -1) {
      return "chrome";
    } else if (userAgent.indexOf("firefox") > -1) {
      return "firefox";
    } else if (userAgent.indexOf("safari") > -1) {
      return "safari";
    } else if (userAgent.indexOf("edg") > -1) {
      return "edge";
    }

    return "other";
  }

  /* ==========================================
       UPDATE CTA FOR NON-CHROME BROWSERS
       Show different message if not on Chrome
       ========================================== */
  function updateCtaForBrowser() {
    const browser = detectBrowser();

    if (browser !== "chrome") {
      console.log(`User is on ${browser}, not Chrome`);

      // Update button text
      allCtaButtons.forEach((button) => {
        const textSpan = button.querySelector("span:last-child");
        if (textSpan) {
          textSpan.textContent = "Get Amarika (Chrome Required)";
        }
      });

      // Optionally show a message
      // showBrowserMessage(browser);
    }
  }

  /* ==========================================
       SHOW BROWSER MESSAGE
       Alert user if they're not on Chrome
       
       OPTIONAL: Uncomment to enable
       ========================================== */
  /*
    function showBrowserMessage(browser) {
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #fff3cd;
            color: #856404;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-size: 0.875rem;
        `;
        message.innerHTML = `
            <strong>Note:</strong> Amarika is a Chrome extension. 
            Please open this page in Google Chrome to install.
        `;
        
        document.body.appendChild(message);
        
        // Auto-remove after 5 seconds
        setTimeout(() => message.remove(), 5000);
    }
    */

  /* ==========================================
       HANDLE CTA CLICKS
       Track and redirect to Chrome Web Store
       
       PARAMETERS:
       - event: Click event object
       - source: 'primary' or 'secondary' for tracking
       ========================================== */
  function handleCtaClick(event, source) {
    event.preventDefault();

    console.log(`CTA clicked: ${source}`);

    // Track click if analytics enabled
    if (CONFIG.enableAnalytics) {
      trackCtaClick(source);
    }

    // Redirect to Chrome Web Store
    // In production, replace with actual store URL
    window.open(CONFIG.chromeWebStoreUrl, "_blank");

    // Alternative: If you want to open in same tab
    // window.location.href = CONFIG.chromeWebStoreUrl;
  }

  /* ==========================================
       TRACK CTA CLICK
       Send event to analytics service
       
       PARAMETERS:
       - source: Which CTA was clicked
       ========================================== */
  function trackCtaClick(source) {
    // Example for Google Analytics
    if (typeof gtag !== "undefined") {
      gtag("event", "click", {
        event_category: "CTA",
        event_label: source,
        value: source === "primary" ? 1 : 2,
      });
    }

    // Alternative analytics services
    // Mixpanel:
    // mixpanel.track('CTA Click', { source: source });

    // Custom tracking:
    console.log(`Analytics tracked: CTA click from ${source}`);
  }

  /* ==========================================
       ATTACH EVENT LISTENERS
       Set up all interactions
       ========================================== */
  function setupEventListeners() {
    // Primary CTA click
    if (primaryCta) {
      primaryCta.addEventListener("click", function (e) {
        handleCtaClick(e, "primary");
      });
    }

    // Secondary CTA click
    if (secondaryCta) {
      secondaryCta.addEventListener("click", function (e) {
        handleCtaClick(e, "secondary");
      });
    }

    // Track scroll depth (optional)
    if (CONFIG.enableAnalytics) {
      setupScrollTracking();
    }
  }

  /* ==========================================
       SCROLL TRACKING
       Track how far users scroll
       Helps measure engagement
       ========================================== */
  function setupScrollTracking() {
    let scrollDepths = [25, 50, 75, 100];
    let trackedDepths = [];

    window.addEventListener("scroll", function () {
      const scrollPercent =
        (window.scrollY /
          (document.documentElement.scrollHeight - window.innerHeight)) *
        100;

      scrollDepths.forEach((depth) => {
        if (scrollPercent >= depth && !trackedDepths.includes(depth)) {
          trackedDepths.push(depth);

          if (typeof gtag !== "undefined") {
            gtag("event", "scroll", {
              event_category: "Engagement",
              event_label: `${depth}%`,
              value: depth,
            });
          }

          console.log(`Scroll depth tracked: ${depth}%`);
        }
      });
    });
  }

  /* ==========================================
       SMOOTH SCROLL TO SECTIONS
       If internal links exist
       ========================================== */
  function setupSmoothScroll() {
    if (!CONFIG.enableSmoothScroll) return;

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        const targetId = this.getAttribute("href");

        // Skip if it's just "#" or "#install"
        if (targetId === "#" || targetId === "#install") return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    });
  }

  /* ==========================================
       ADD VISUAL FEEDBACK ON CTA HOVER
       Optional: Add ripple or glow effect
       ========================================== */
  function addCtaEffects() {
    allCtaButtons.forEach((button) => {
      // Add hover sound effect (optional)
      // button.addEventListener('mouseenter', () => playHoverSound());

      // Add click animation
      button.addEventListener("click", function () {
        this.style.transform = "scale(0.98)";
        setTimeout(() => {
          this.style.transform = "";
        }, 100);
      });
    });
  }

  /* ==========================================
       TRACK PAGE VIEW
       Log page visit to analytics
       ========================================== */
  function trackPageView() {
    if (!CONFIG.enableAnalytics) return;

    if (typeof gtag !== "undefined") {
      gtag("event", "page_view", {
        page_title: "Get Extension",
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }

    console.log("Page view tracked");
  }

  /* ==========================================
       TRACK TIME ON PAGE
       Measure how long users stay
       ========================================== */
  function trackTimeOnPage() {
    const startTime = Date.now();

    window.addEventListener("beforeunload", function () {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);

      if (typeof gtag !== "undefined") {
        gtag("event", "timing_complete", {
          name: "time_on_page",
          value: timeSpent,
          event_category: "Engagement",
        });
      }

      console.log(`Time on page: ${timeSpent} seconds`);
    });
  }

  /* ==========================================
       INITIALIZE PAGE
       Run all setup functions
       ========================================== */
  function initialize() {
    console.log("Initializing Get Extension page...");

    // Detect browser and update UI
    updateCtaForBrowser();

    // Set up event listeners
    setupEventListeners();

    // Set up smooth scrolling
    setupSmoothScroll();

    // Add CTA visual effects
    addCtaEffects();

    // Track page view
    trackPageView();

    // Track time on page
    trackTimeOnPage();

    console.log("✓ Page initialized successfully");
  }

  // Run initialization
  initialize();
}); // End DOMContentLoaded

/* ==========================================
   OPTIONAL FEATURES
   Uncomment sections below to enable
   ========================================== */

/* ------------------------------------------
   EXIT INTENT POPUP
   Show message when user is about to leave
   ------------------------------------------ */
/*
let exitIntentShown = false;

document.addEventListener('mouseout', function(e) {
    if (!exitIntentShown && e.clientY < 50) {
        exitIntentShown = true;
        showExitIntent();
    }
});

function showExitIntent() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 2rem;
        border-radius: 1rem;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 10001;
        max-width: 400px;
        text-align: center;
    `;
    
    modal.innerHTML = `
        <h3 style="margin-bottom: 1rem; color: #2a2440;">Wait! Don't miss out</h3>
        <p style="margin-bottom: 1.5rem; color: #7a7695;">
            Install Amarika now and format your first document in seconds.
        </p>
        <button onclick="this.parentElement.remove(); 
                        document.querySelector('#primary-cta').click();" 
                style="background: #7b6cff; color: white; border: none; 
                       padding: 0.75rem 1.5rem; border-radius: 0.5rem; 
                       cursor: pointer; font-weight: 600;">
            Add to Chrome
        </button>
        <button onclick="this.parentElement.remove();" 
                style="background: transparent; color: #7a7695; border: none; 
                       padding: 0.75rem 1.5rem; cursor: pointer; 
                       margin-left: 0.5rem;">
            No thanks
        </button>
    `;
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
    `;
    overlay.onclick = () => {
        modal.remove();
        overlay.remove();
    };
    
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
}
*/

/* ------------------------------------------
   A/B TESTING HELPER
   Test different CTA copy
   ------------------------------------------ */
/*
function abTestCta() {
    // Randomly assign user to variant
    const variant = Math.random() < 0.5 ? 'A' : 'B';
    
    const primaryCta = document.getElementById('primary-cta');
    const textSpan = primaryCta.querySelector('span:last-child');
    
    if (variant === 'A') {
        textSpan.textContent = 'Add to Chrome';
    } else {
        textSpan.textContent = 'Get Amarika Free';
    }
    
    // Track which variant user sees
    localStorage.setItem('amarika_cta_variant', variant);
    
    console.log(`A/B Test: Showing variant ${variant}`);
}

// Run on load
// abTestCta();
*/

/* ------------------------------------------
   SOCIAL PROOF COUNTER
   Show number of installs (if available)
   ------------------------------------------ */
/*
function showInstallCount() {
    // Fetch install count from your backend
    // fetch('/api/install-count')
    //     .then(r => r.json())
    //     .then(data => {
    //         const count = data.count || 1000;
    //         const formatted = count.toLocaleString();
            
    //         const badge = document.createElement('div');
    //         badge.style.cssText = `
    //             text-align: center;
    //             margin: 1rem 0;
    //             color: #7a7695;
    //             font-size: 0.875rem;
    //         `;
    //         badge.innerHTML = `
    //             <strong style="color: #7b6cff;">${formatted}+</strong> users formatting documents with Amarika
    //         `;
            
    //         const ctaSection = document.querySelector('.primary-cta-section .cta-container');
    //         ctaSection.appendChild(badge);
    //     });
}
*/

/* ==========================================
   END OF JAVASCRIPT
   
   INTEGRATION CHECKLIST:
   
   ✓ 1. Update CONFIG.chromeWebStoreUrl with real URL
   ✓ 2. Set up Google Analytics (gtag.js)
   ✓ 3. Test CTA clicks in different browsers
   ✓ 4. Enable scroll tracking if desired
   ✓ 5. Add exit intent popup if conversion is low
   ✓ 6. Set up A/B testing for CTA copy
   ✓ 7. Add social proof if install count available
   
   ========================================== */
