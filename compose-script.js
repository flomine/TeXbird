// SPDX-License-Identifier: GPL-3.0-or-later
// TeXbird — Copyright (C) 2026 Franck (flomine)
//
// S'exécute dans le document de la fenêtre de composition.
// Écoute les messages du popup et insère l'image de l'équation au curseur.

(() => {
  if (window.__texbirdReady) return;
  window.__texbirdReady = true;

  function buildImg(data) {
    const img = document.createElement("img");
    img.src = data.src;
    img.alt = data.alt || "";
    // On conserve la source LaTeX : accessibilité + ré-édition future possible.
    img.setAttribute("data-latex", data.latex || "");
    img.setAttribute("data-texbird", "1");
    if (data.width) img.setAttribute("width", data.width);
    if (data.height) img.setAttribute("height", data.height);
    img.style.verticalAlign = data.vAlign || "middle";
    return img;
  }

  function insertAtCaret(node) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(node);
      // Replace le curseur juste après l'image insérée.
      range.setStartAfter(node);
      range.setEndAfter(node);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      document.body.appendChild(node);
    }
  }

  messenger.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "texbird-insert") {
      return false;
    }
    try {
      insertAtCaret(buildImg(message.data));
      return Promise.resolve({ ok: true });
    } catch (e) {
      return Promise.resolve({ ok: false, error: String(e) });
    }
  });
})();
