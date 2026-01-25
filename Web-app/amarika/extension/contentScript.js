console.log("Amarika content script active");

if (!document.getElementById("amarika-btn")) {
  const btn = document.createElement("button");
  btn.id = "amarika-btn";
  btn.innerText = "Format with Amarika";

  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.zIndex = "9999";
  btn.style.padding = "10px 14px";
  btn.style.background = "#1a73e8";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "6px";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "14px";

  document.body.appendChild(btn);

  btn.onmousedown = async (e) => {
    e.preventDefault();

    let text = "";

    try {
      text = await navigator.clipboard.readText();
    } catch {
      alert("Please copy text first (Ctrl+C)");
      return;
    }

    if (!text.trim()) {
      alert("Please copy text first (Ctrl+C)");
      return;
    }

    let formattedHTML = "";

    try {
      const res = await fetch("http://localhost:5000/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, format: "ieee" })
      });

      formattedHTML = await res.text();
    } catch {
      const lines = text.split("\n");
      const heading = lines.shift();
      formattedHTML = `<h2>${heading}</h2><p>${lines.join("<br>")}</p>`;
    }

    document.execCommand("insertHTML", false, formattedHTML);
  };
}
