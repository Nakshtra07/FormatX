# FormatX Landing Page

> AI-Powered Document Formatting Web App

A modern, responsive landing page for the FormatX web application that turns messy AI-generated content into publication-ready documents.

---

## 🌐 Pages

| Page | File | Description |
|------|------|-------------|
| Homepage | `index.html` | Main landing with features, pricing, and CTAs |
| Templates | `template.html` | Browsable template gallery with filtering |
| Login | `login.html` | User authentication |
| Sign Up | `sign-up.html` | Account registration |

---

## 🎨 Design System

**Colors:**
- Primary: `#140f1a` (dark)
- Accent: `#c99aff` (purple)
- Soft: `#dfc2ff` (light purple)
- Background: `#faf5ff`

**Typography:** Inter (Google Fonts)

**Icons:** Ionicons 7.1

---

## 📁 Project Structure

```
know_code_prealpha/
├── marketing/               # (Renamed from FORMATX_FRONTEND_FINAL)
│   ├── index.html           # Main Entry Point
│   ├── template.html        # Template Gallery
│   └── ...
├── frontend/                # React Web Application
│   ├── src/                 # App Source Code
│   └── ...
├── backend/                 # Python API Server
│   ├── services/            # Core Logic
│   └── ...
├── examples/                # Document Templates & Samples
│   ├── Business Proposal/
│   ├── IEEE Research Paper/
│   └── Minutes of Meeting/
├── assets/                  # Shared Assets
│   └── logo.png
└── README.md
```

---

## ✨ Features

- **Responsive Design** — Mobile-first with breakpoints at 768px and 480px
- **Mobile Hamburger Menu** — Full-screen overlay navigation
- **Demo Mockups** — Browser window mockup showing before/after formatting
- **Feature Carousel** — Infinite scrolling feature cards
- **Template Filtering** — Category pills with fade animations
- **SEO Optimized** — Meta tags, Open Graph, keywords
- **Accessibility** — Focus states, ARIA labels, keyboard navigation

---

## 🚀 Getting Started

1. Clone or download the project
2. Open `index.html` in a browser
3. No build process required — pure HTML/CSS/JS

For local development with live reload:
```bash
npx live-server
```

---

## 🔗 Navigation

All pages share consistent navigation:
- **Features** → `index.html#features`
- **Pricing** → `index.html#pricing`
- **Templates** → `template.html`
- **Login** → `login.html`
- **Get Started** → `sign-up.html`

---

## 📱 Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| > 768px | Full desktop layout |
| ≤ 768px | Mobile menu, stacked grids |
| ≤ 480px | Compact spacing, full-width buttons |

---

## 🛠 Customization

### Update Colors
Edit CSS variables in `style.css` (lines 13-77):
```css
:root {
  --color-cta: #c99aff;
  --color-primary-dark: #140f1a;
  /* ... */
}
```

### Add New Templates
1. Add a card in `template.html` with `data-category` attribute
2. Filtering works automatically via `js/templates.js`

---

## 📄 License

MIT License — Free for personal and commercial use.

---

<p align="center">Made with ❤️ for the document formatting community</p>
