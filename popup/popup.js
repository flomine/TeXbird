// SPDX-License-Identifier: GPL-3.0-or-later
// TeXbird — Copyright (C) 2026 Franck (flomine)
"use strict";

const $ = (id) => document.getElementById(id);
let mjReady = false;
let previewTimer = null;

function opts() {
  return {
    latex: $("src").value,
    display: document.querySelector('input[name="mode"]:checked').value === "display",
    color: $("color").value,
    sizePx: parseInt($("size").value, 10) || 16,
    scale: parseInt($("scale").value, 10) || 3,
  };
}

function setStatus(msg, kind) {
  const el = $("status");
  el.textContent = msg || "";
  el.className = "status" + (kind === "info" ? " info" : "");
}

async function ensureMathJax() {
  if (mjReady) return;
  await MathJax.startup.promise;
  mjReady = true;
}

// --- Aperçu ---------------------------------------------------------------

async function updatePreview() {
  const { latex, display, color, sizePx } = opts();
  const prev = $("preview");
  prev.textContent = "";
  setStatus("");
  $("insert").disabled = true;
  if (!latex.trim()) return;

  try {
    await ensureMathJax();
  } catch (e) {
    setStatus("MathJax n'a pas pu démarrer : " + e);
    return;
  }

  let container;
  try {
    MathJax.texReset();
    container = MathJax.tex2svg(latex, { display });
  } catch (e) {
    setStatus("Erreur de rendu : " + e);
    return;
  }
  container.style.fontSize = sizePx + "px";
  container.style.color = color;
  prev.appendChild(container);

  const svg = container.querySelector("svg");
  if (!svg) {
    setStatus("Rien à afficher.");
    return;
  }
  // MathJax rend les erreurs de syntaxe en rouge dans le SVG ; on laisse
  // l'utilisateur les voir, mais on prévient et on autorise quand même l'insertion.
  if (svg.querySelector('[data-mml-node="merror"]')) {
    setStatus("Syntaxe LaTeX douteuse — vérifie l'aperçu.", "info");
  }
  $("insert").disabled = false;
}

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 220);
}

// --- Rasterisation SVG -> PNG --------------------------------------------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image SVG illisible"));
    img.src = src;
  });
}

async function svgToPng(svg, color, scale, cssW, cssH) {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", cssW + "px");
  clone.setAttribute("height", cssH + "px");
  // currentColor -> couleur choisie, gravée dans le SVG autonome.
  clone.style.color = color;

  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(cssW * scale));
    canvas.height = Math.max(1, Math.round(cssH * scale));
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, cssW, cssH);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// --- Insertion dans la composition ---------------------------------------

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function getComposeTab() {
  const tabs = await messenger.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs[0];
}

async function insertIntoCompose(data) {
  const tab = await getComposeTab();
  if (!tab) return false;

  // 1) Voie principale : le compose script insère au curseur.
  try {
    const resp = await messenger.tabs.sendMessage(tab.id, {
      type: "texbird-insert",
      data,
    });
    if (resp && resp.ok) return true;
  } catch (e) {
    // Pas de compose script (fenêtre ouverte avant l'installation) -> repli.
  }

  // 2) Repli : on ajoute l'image en fin de corps via l'API compose.
  try {
    const details = await messenger.compose.getComposeDetails(tab.id);
    if (details.isPlainText) {
      setStatus("Message en texte brut : passe le message en HTML pour insérer une image.");
      return false;
    }
    const imgHtml =
      `<img src="${data.src}" alt="${escapeHtml(data.alt)}" ` +
      `data-latex="${escapeHtml(data.latex)}" data-texbird="1" ` +
      `width="${data.width}" height="${data.height}" style="vertical-align:middle">`;
    let body = details.body || "";
    if (/<\/body>/i.test(body)) {
      body = body.replace(/<\/body>/i, imgHtml + "</body>");
    } else {
      body += imgHtml;
    }
    await messenger.compose.setComposeDetails(tab.id, { body });
    return true;
  } catch (e) {
    console.error("TeXbird : insertion impossible", e);
    return false;
  }
}

async function doInsert() {
  if ($("insert").disabled) return;
  const { latex, color, scale } = opts();
  const svg = $("preview").querySelector("svg");
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const cssW = Math.max(1, Math.round(rect.width));
  const cssH = Math.max(1, Math.round(rect.height));

  $("insert").disabled = true;
  setStatus("Génération de l'image…", "info");

  let png;
  try {
    png = await svgToPng(svg, color, scale, cssW, cssH);
  } catch (e) {
    setStatus("Échec de la génération : " + e);
    $("insert").disabled = false;
    return;
  }

  const data = {
    src: png,
    width: cssW,
    height: cssH,
    alt: latex,
    latex,
    vAlign: "middle",
  };

  const ok = await insertIntoCompose(data);
  if (ok) {
    window.close();
  } else {
    setStatus("Impossible d'insérer dans le message.");
    $("insert").disabled = false;
  }
}

// --- Écouteurs ------------------------------------------------------------

$("src").addEventListener("input", schedulePreview);
for (const el of document.querySelectorAll(
  'input[name="mode"], #color, #size, #scale'
)) {
  el.addEventListener("change", updatePreview);
}
$("insert").addEventListener("click", doInsert);
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    doInsert();
  }
});

// Démarrage (le script est en fin de body : le DOM est prêt).
(async () => {
  $("src").focus();
  setStatus("Chargement de MathJax…", "info");
  try {
    await ensureMathJax();
    setStatus("");
  } catch (e) {
    setStatus("MathJax n'a pas pu démarrer : " + e);
  }
  updatePreview();
})();
