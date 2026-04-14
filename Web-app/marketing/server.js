/**
 * FormatX Marketing Site - Static Server
 * Serves the marketing landing page on Render.
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// Explicitly serve Google Search Console verification file
app.get('/google062399d4d665acda.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'google062399d4d665acda.html'));
});

// Serve all static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname), {
    extensions: ['html'],  // Allow extensionless URLs → serve .html
    maxAge: '1d',          // Cache static assets for 1 day
}));

// SPA-style fallback: serve index.html for any unmatched route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ FormatX Marketing Site running on port ${PORT}`);
});
