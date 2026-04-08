/* ============================================
   FORMATX - MAIN JAVASCRIPT
   Shared utilities across all pages
   ============================================ */

/* ==========================================
   DEVELOPMENT CONFIGURATION
   Set APP_URL based on environment
   ========================================== */
const APP_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5173'  // Local dev: React app on separate port
    : '/app/';                  // Production: React app at /app/ path

// Rewrite /app/ links for local development
document.addEventListener('DOMContentLoaded', function () {
    if (window.location.hostname === 'localhost') {
        document.querySelectorAll('a[href="/app/"], a[href="/app"]').forEach(link => {
            link.href = APP_URL;
        });
    }


    /* ==========================================
       MOBILE MENU TOGGLE
       ========================================== */
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function () {
            navLinks.classList.toggle('active');

            // Update icon
            const icon = menuToggle.querySelector('ion-icon');
            if (navLinks.classList.contains('active')) {
                icon.setAttribute('name', 'close-outline');
            } else {
                icon.setAttribute('name', 'menu-outline');
            }
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = menuToggle.querySelector('ion-icon');
                icon.setAttribute('name', 'menu-outline');
            });
        });

        // Close menu on escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                const icon = menuToggle.querySelector('ion-icon');
                icon.setAttribute('name', 'menu-outline');
            }
        });
    }

    /* ==========================================
       SMOOTH SCROLL FOR ANCHOR LINKS
       ========================================== */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');

            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    /* ==========================================
       NAVBAR SCROLL EFFECT (OPTIONAL)
       Add background on scroll
       ========================================== */
    const navbar = document.querySelector('.navbar');

    if (navbar) {
        let lastScroll = 0;

        window.addEventListener('scroll', function () {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 50) {
                navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                navbar.style.backdropFilter = 'blur(10px)';
            } else {
                navbar.style.backgroundColor = '';
                navbar.style.backdropFilter = '';
            }

            lastScroll = currentScroll;
        });
    }

    /* ==========================================
       FAQ ACCORDION
       Toggle expand/collapse on click
       ========================================== */
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        if (question) {
            question.addEventListener('click', () => {
                // Close other open items (single-open behavior)
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                    }
                });

                // Toggle current item
                item.classList.toggle('active');
                const isExpanded = item.classList.contains('active');
                question.setAttribute('aria-expanded', isExpanded);
            });
        }
    });

    console.log('✓ FormatX main.js initialized');
});
