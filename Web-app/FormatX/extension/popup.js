const enableBtn = document.getElementById("enableBtn");
const formatSelect = document.getElementById("formatSelect");

enableBtn.addEventListener("click", () => {
    const selectedFormat = formatSelect.value;
    chrome.storage.local.set({ selectedFormat });
    alert(`FormatX formatting enabled: ${selectedFormat}`);
});
