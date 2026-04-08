function escapeHTML(text) {
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function applyFormatting(structure, template) {
    let html = "";
    structure.forEach(item => {
        if (item.type === "heading") {
            html += `<h1 style="
                font-family:${template.heading1.font};
                font-size:${template.heading1.size}px;">${escapeHTML(item.text)}</h1>`;
        } else if (item.type === "code") {
            html += `<pre style="
                background:${template.codeBlock.background};
                font-family:${template.codeBlock.font};">${escapeHTML(item.text)}</pre>`;
        } else {
            html += `<p style="
                font-family:${template.body.font};
                font-size:${template.body.size}px;">${escapeHTML(item.text)}</p>`;
        }
    });
    return html;
}

module.exports = { applyFormatting };
