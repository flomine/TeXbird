// SPDX-License-Identifier: GPL-3.0-or-later
// TeXbird — Copyright (C) 2026 Franck (flomine)
//
// S'exécute dans le document de la fenêtre de composition.
// Écoute les messages du popup et insère l'image de l'équation au curseur.

(() => {
  if (window.__texbirdReady) return;
  window.__texbirdReady = true;
  let selectedEquation = null;

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    selectedEquation = target?.closest('img[data-texbird="1"][data-latex]') || null;
  }, true);

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
    if (!message) {
      return false;
    }

    if (message.type === "texbird-get-selected-equation") {
      const latex = selectedEquation?.isConnected
        ? selectedEquation.getAttribute("data-latex")
        : null;
      return Promise.resolve({ ok: true, latex });
    }

    if (message.type !== "texbird-insert") return false;

    try {
      const image = buildImg(message.data);
      if (message.replaceSelected) {
        if (!selectedEquation?.isConnected) {
          return Promise.resolve({ ok: false, error: "Selected equation is no longer available" });
        }
        selectedEquation.replaceWith(image);
        selectedEquation = image;
        const range = document.createRange();
        range.setStartAfter(image);
        range.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      } else {
        insertAtCaret(image);
      }
      return Promise.resolve({ ok: true });
    } catch (e) {
      return Promise.resolve({ ok: false, error: String(e) });
    }
  });
})();
