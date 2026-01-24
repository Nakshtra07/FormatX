/* ============================================
   AMARIKA TEMPLATES PAGE - JAVASCRIPT
   Simple category filtering system
   No external libraries required
   Pure vanilla JavaScript
   ============================================ */

/* ==========================================
   WAIT FOR PAGE TO LOAD
   Ensures all HTML elements are available
   ========================================== */
document.addEventListener("DOMContentLoaded", function () {
  console.log("Templates page loaded - Initializing...");

  /* ==========================================
       GET DOM ELEMENTS
       Cache references to avoid repeated queries
       ========================================== */
  const filterPills = document.querySelectorAll(".filter-pill");
  const templateCards = document.querySelectorAll(".template-card");
  const templatesGrid = document.getElementById("templates-grid");

  // Track current active filter
  let currentFilter = "all";

  console.log(`Found ${templateCards.length} templates`);
  console.log(`Found ${filterPills.length} filter categories`);

  /* ==========================================
       FILTER TEMPLATES BY CATEGORY
       Main filtering logic
       
       HOW IT WORKS:
       1. Get the selected category
       2. Loop through all template cards
       3. Check if card's data-category includes the selected category
       4. Show or hide card based on match
       
       PARAMETERS:
       - category (string): The category to filter by ('all', 'resume', etc.)
       ========================================== */
  function filterTemplates(category) {
    console.log(`Filtering templates by: ${category}`);

    let visibleCount = 0;

    // Loop through all template cards
    templateCards.forEach((card) => {
      // Get the card's categories (can have multiple, space-separated)
      // Example: "resume student" means it appears in both categories
      const cardCategories = card.getAttribute("data-category");

      // Check if we should show this card
      let shouldShow = false;

      if (category === "all") {
        // Show all templates when 'all' is selected
        shouldShow = true;
      } else if (cardCategories && cardCategories.includes(category)) {
        // Show card if it matches the selected category
        shouldShow = true;
      }

      // Apply the show/hide logic with animation
      if (shouldShow) {
        showCard(card);
        visibleCount++;
      } else {
        hideCard(card);
      }
    });

    console.log(`Showing ${visibleCount} templates`);

    // Optional: Show empty state if no templates match
    // Uncomment if you add an empty state element to HTML
    /*
        if (visibleCount === 0) {
            showEmptyState();
        } else {
            hideEmptyState();
        }
        */
  }

  /* ==========================================
       SHOW CARD WITH ANIMATION
       Fade in effect for smooth transition
       
       ANIMATION SEQUENCE:
       1. Remove hidden class (display: none)
       2. Remove fade-out class if present
       3. Add fade-in class for smooth appearance
       ========================================== */
  function showCard(card) {
    // Remove hidden state
    card.classList.remove("hidden");
    card.classList.remove("fade-out");

    // Small delay for smooth animation
    setTimeout(() => {
      card.classList.add("fade-in");
    }, 10);
  }

  /* ==========================================
       HIDE CARD WITH ANIMATION
       Fade out effect for smooth transition
       
       ANIMATION SEQUENCE:
       1. Add fade-out class (opacity: 0)
       2. Wait for animation to complete
       3. Add hidden class (display: none)
       ========================================== */
  function hideCard(card) {
    // Remove fade-in class
    card.classList.remove("fade-in");

    // Add fade-out animation
    card.classList.add("fade-out");

    // Hide after animation completes (150ms matches CSS transition)
    setTimeout(() => {
      card.classList.add("hidden");
    }, 150);
  }

  /* ==========================================
       UPDATE ACTIVE FILTER PILL
       Visual feedback for selected category
       
       PROCESS:
       1. Remove 'active' class from all pills
       2. Add 'active' class to clicked pill
       3. This triggers CSS styling for active state
       ========================================== */
  function updateActiveFilter(selectedPill) {
    // Remove active class from all pills
    filterPills.forEach((pill) => {
      pill.classList.remove("active");
    });

    // Add active class to the clicked pill
    selectedPill.classList.add("active");
  }

  /* ==========================================
       ATTACH EVENT LISTENERS TO FILTER PILLS
       Handle click events on category buttons
       
       FOR EACH FILTER PILL:
       1. Listen for click event
       2. Get category from data-category attribute
       3. Update visual state (active pill)
       4. Filter templates
       5. Update URL (for shareable links)
       ========================================== */
  filterPills.forEach((pill) => {
    pill.addEventListener("click", function () {
      // Get the category from data attribute
      const category = this.getAttribute("data-category");

      console.log(`Filter clicked: ${category}`);

      // Update current filter
      currentFilter = category;

      // Update visual state - highlight active pill
      updateActiveFilter(this);

      // Filter the templates
      filterTemplates(category);

      // Update URL hash for shareable links
      // Example: templates.html#resume
      if (category !== "all") {
        window.history.pushState(null, "", `#${category}`);
      } else {
        window.history.pushState(null, "", window.location.pathname);
      }
    });
  });

  /* ==========================================
       APPLY TEMPLATE BUTTON HANDLERS
       Handle clicks on "Apply Template" buttons
       
       IN REAL IMPLEMENTATION:
       - This would communicate with Chrome extension
       - Trigger template application in Google Docs/Word
       - Track analytics/usage
       
       CURRENT BEHAVIOR:
       - Shows visual feedback
       - Logs template name to console
       ========================================== */
  const applyButtons = document.querySelectorAll(".btn-apply");

  applyButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Get the parent card to extract template info
      const card = this.closest(".template-card");
      const templateName = card.querySelector(".template-name").textContent;

      console.log(`User clicked: Apply "${templateName}"`);

      // Show visual feedback
      showApplyFeedback(this, templateName);

      /* ==========================================
               INTEGRATION POINT:
               In production, you would add code here to:
               1. Send message to Chrome extension
               2. Trigger template application
               3. Track analytics event
               
               Example:
               chrome.runtime.sendMessage({
                   action: 'applyTemplate',
                   templateName: templateName
               });
               ========================================== */
    });
  });

  /* ==========================================
       SHOW APPLY FEEDBACK
       Temporary visual feedback when template is selected
       
       FEEDBACK SEQUENCE:
       1. Change button text to "✓ Applied!"
       2. Change button styling
       3. Wait 2 seconds
       4. Reset to original state
       
       PARAMETERS:
       - button (element): The clicked button
       - templateName (string): Name of template (for logging)
       ========================================== */
  function showApplyFeedback(button, templateName) {
    // Store original button text
    const originalText = button.textContent;

    // Update button appearance
    button.textContent = "✓ Applied!";
    button.classList.add("applied");

    // Disable button temporarily to prevent double-clicks
    button.disabled = true;

    // Reset after 2 seconds
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("applied");
      button.disabled = false;
    }, 2000);

    console.log(`Applied template: ${templateName}`);
  }

  /* ==========================================
       LOAD FILTER FROM URL HASH
       Allow deep linking to specific categories
       
       EXAMPLES:
       - templates.html#resume → Shows resume templates
       - templates.html#academic → Shows academic templates
       
       This runs on page load to check if URL has a hash
       ========================================== */
  function loadFilterFromHash() {
    // Get hash from URL (e.g., #resume)
    // Remove the '#' character
    const hash = window.location.hash.substring(1);

    if (hash) {
      console.log(`Loading filter from URL hash: ${hash}`);

      // Find the matching filter pill
      const matchingPill = Array.from(filterPills).find(
        (pill) => pill.getAttribute("data-category") === hash,
      );

      if (matchingPill) {
        // Simulate click on that pill
        matchingPill.click();
      } else {
        console.log(`No filter found for hash: ${hash}`);
      }
    }
  }

  /* ==========================================
       KEYBOARD SHORTCUTS
       Enhance UX with keyboard navigation
       
       SHORTCUTS:
       - 1: All templates
       - 2: Resumes
       - 3: Academic
       - 4: Corporate
       - 5: Technical
       - 6: Student
       
       CUSTOMIZATION:
       Add more numbers to keyMap for additional categories
       ========================================== */
  document.addEventListener("keydown", function (e) {
    // Map number keys to categories
    const keyMap = {
      1: "all",
      2: "resume",
      3: "academic",
      4: "corporate",
      5: "technical",
      6: "student",
    };

    // Check if a mapped key was pressed
    if (keyMap[e.key]) {
      const category = keyMap[e.key];

      // Find and click the matching pill
      const matchingPill = Array.from(filterPills).find(
        (pill) => pill.getAttribute("data-category") === category,
      );

      if (matchingPill) {
        matchingPill.click();
        console.log(`Keyboard shortcut: ${e.key} → ${category}`);
      }
    }
  });

  /* ==========================================
       SMOOTH SCROLL FOR ANCHOR LINKS
       Enable smooth scrolling for in-page navigation
       ========================================== */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");

      // Skip if it's just "#"
      if (targetId === "#") return;

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

  /* ==========================================
       INITIALIZE PAGE
       Run initialization tasks
       ========================================== */

  // Load filter from URL hash if present
  loadFilterFromHash();

  // Log successful initialization
  console.log("✓ Templates page initialized successfully");
  console.log(`Current filter: ${currentFilter}`);

  /* ==========================================
       OPTIONAL FEATURES
       Uncomment sections below to enable
       ========================================== */

  /* ------------------------------------------
       SEARCH FUNCTIONALITY
       Add a search box to filter by name/description
       
       TO ENABLE:
       1. Add this HTML before the templates grid:
          <input type="text" id="template-search" placeholder="Search templates...">
       2. Uncomment the code below
       ------------------------------------------ */
  // const searchInput = document.getElementById("template-search");

  // if (searchInput) {
  //   searchInput.addEventListener("input", function () {
  //     const searchTerm = this.value.toLowerCase();
  //     console.log(`Searching for: ${searchTerm}`);

  //     templateCards.forEach((card) => {
  //       const templateName = card
  //         .querySelector(".template-name")
  //         .textContent.toLowerCase();
  //       const description = card
  //         .querySelector(".template-description")
  //         .textContent.toLowerCase();

  //       // Show if name or description matches search
  //       if (
  //         templateName.includes(searchTerm) ||
  //         description.includes(searchTerm)
  //       ) {
  //         showCard(card);
  //       } else {
  //         hideCard(card);
  //       }
  //     });
  //   });
  // }

  /* ------------------------------------------
       TEMPLATE COUNT DISPLAY
       Show number of templates in each category
       
       TO ENABLE:
       Uncomment the code below
       ------------------------------------------ */
  /*
    function updateCategoryCounts() {
        filterPills.forEach(pill => {
            const category = pill.getAttribute('data-category');
            const originalText = pill.textContent.trim();
            
            if (category === 'all') {
                const count = templateCards.length;
                pill.textContent = `${originalText} (${count})`;
            } else {
                const count = Array.from(templateCards).filter(card => 
                    card.getAttribute('data-category').includes(category)
                ).length;
                
                pill.textContent = `${originalText} (${count})`;
            }
        });
    }
    
    // Call on page load
    updateCategoryCounts();
    */

  /* ------------------------------------------
       AUTO-SCROLL TO TOP ON FILTER CHANGE
       Scroll to top of templates grid when filtering
       
       TO ENABLE:
       Add this inside the filterTemplates function
       ------------------------------------------ */
  /*
    templatesGrid.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
    */

  /* ------------------------------------------
       TRACK ANALYTICS
       Send events to analytics service
       
       TO ENABLE:
       1. Set up analytics (Google Analytics, etc.)
       2. Uncomment and modify the code below
       ------------------------------------------ */
  /*
    function trackEvent(category, action, label) {
        // Example for Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                'event_category': category,
                'event_label': label
            });
        }
        console.log(`Analytics: ${category} - ${action} - ${label}`);
    }
    
    // Track filter changes
    filterPills.forEach(pill => {
        pill.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            trackEvent('Templates', 'Filter', category);
        });
    });
    
    // Track template applications
    applyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.template-card');
            const templateName = card.querySelector('.template-name').textContent;
            trackEvent('Templates', 'Apply', templateName);
        });
    });
    */
}); // End DOMContentLoaded

/* ==========================================
   ADDITIONAL HELPER FUNCTIONS
   Utility functions for common tasks
   ========================================== */

/* ------------------------------------------
   GET TEMPLATE DATA
   Extract template information as object
   Useful for integration with backend
   ------------------------------------------ */
/*
function getTemplateData(card) {
    return {
        name: card.querySelector('.template-name').textContent,
        description: card.querySelector('.template-description').textContent,
        categories: card.getAttribute('data-category').split(' '),
        categoryTag: card.querySelector('.category-tag').textContent,
        badges: Array.from(card.querySelectorAll('.badge')).map(b => b.textContent)
    };
}
*/

/* ------------------------------------------
   SAVE USER PREFERENCES
   Remember user's last selected filter
   Uses localStorage
   ------------------------------------------ */
/*
function saveFilter(category) {
    localStorage.setItem('amarika_last_filter', category);
}

function loadSavedFilter() {
    const saved = localStorage.getItem('amarika_last_filter');
    if (saved) {
        const pill = document.querySelector(`[data-category="${saved}"]`);
        if (pill) pill.click();
    }
}
*/

/* ==========================================
   END OF JAVASCRIPT
   
   CUSTOMIZATION GUIDE:
   
   TO ADD A NEW TEMPLATE:
   1. Add HTML in templates-grid
   2. Set data-category attribute
   3. No JS changes needed - filtering works automatically
   
   TO ADD A NEW CATEGORY:
   1. Add filter pill in HTML
   2. Set data-category attribute
   3. Update keyboard shortcuts if desired (keyMap object)
   
   TO CHANGE ANIMATION SPEED:
   1. Adjust setTimeout duration in hideCard() function
   2. Update CSS transition duration to match
   
   TO INTEGRATE WITH BACKEND:
   1. Uncomment getTemplateData() function
   2. Add fetch() call in showApplyFeedback()
   3. Send template data to your API
   
   ========================================== */
