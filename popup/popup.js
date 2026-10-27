// SPDX-License-Identifier: GPL-3.0-or-later
// TeXbird — Copyright (C) 2026 Franck (flomine)
"use strict";

const $ = (id) => document.getElementById(id);
let mjReady = false;
let previewTimer = null;
let editingEquation = false;
let macroCheckTimer = null;
let customMacros = "";

function message(key, ...substitutions) {
  return messenger.i18n.getMessage(key, substitutions.map(String));
}

function localize() {
  document.documentElement.lang = messenger.i18n.getUILanguage() || "en";
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = message(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll("[data-i18n-aria-label]")) {
    el.setAttribute("aria-label", message(el.dataset.i18nAriaLabel));
  }
  $("version").textContent = message(
    "versionLabel",
    messenger.runtime.getManifest().version
  );
  for (const swatch of document.querySelectorAll(".color-swatch")) {
    swatch.setAttribute("aria-label", message("colorSwatch", swatch.dataset.color));
  }
}

function opts() {
  return {
    latex: $("src").value,
    display: document.querySelector('input[name="mode"]:checked').value === "display",
    color: $("color").value.trim(),
    sizePx: parseInt($("size").value, 10) || 16,
    scale: parseInt($("scale").value, 10) || 3,
  };
}

function setStatus(msg, kind) {
  const el = $("status");
  el.textContent = msg || "";
  el.className = "status" + (kind === "info" ? " info" : "");
}

function updateColorSwatches() {
  const selectedColor = $("color").value.trim().toLowerCase();
  for (const swatch of document.querySelectorAll(".color-swatch")) {
    swatch.setAttribute(
      "aria-pressed",
      String(swatch.dataset.color.toLowerCase() === selectedColor)
    );
  }
}

async function ensureMathJax() {
  if (mjReady) return;
  await MathJax.startup.promise;
  mjReady = true;
}

async function loadCustomMacros() {
  try {
    const stored = await messenger.storage.local.get("customMacros");
    customMacros = typeof stored.customMacros === "string" ? stored.customMacros : "";
    $("macro-definitions").value = customMacros;
  } catch (e) {
    setMacroStatus(message("macroSaveFailed", e), true);
  }
}

function setMacroStatus(msg, isError = false) {
  const el = $("macro-status");
  el.textContent = msg || "";
  el.classList.toggle("error", isError);
}

async function saveCustomMacros() {
  const definitions = $("macro-definitions").value;
  try {
    await ensureMathJax();
  } catch (e) {
    setMacroStatus(message("macroSaveFailed", e), true);
    return;
  }
  if (!reportMacroErrors(definitions)) return;
  const updatedMacros = definitions.trim();
  try {
    await messenger.storage.local.set({ customMacros: updatedMacros });
    customMacros = updatedMacros;
    await updatePreview();
    setMacroStatus(message("macrosSaved"));
  } catch (e) {
    setMacroStatus(message("macroSaveFailed", e), true);
  }
}

// --- Validation des macros -----------------------------------------------

// MathJax 3 garde les \newcommand, \def, etc. d'un rendu à l'autre et
// texReset() ne les efface pas : on vide ces tables avant chaque rendu.
function clearDefinedMacros() {
  const { handlers } = MathJax.startup.document.inputJax[0].parseOptions;
  for (const name of ["new-Command", "new-Delimiter", "new-Environment"]) {
    handlers.retrieve(name)?.map.clear();
  }
}

// Rend `source` seul et renvoie "" s'il ne contient que des définitions
// (aucune sortie visible), sinon un message d'erreur.
function definitionError(source) {
  clearDefinedMacros();
  MathJax.texReset();
  let mml;
  try {
    mml = MathJax.tex2mml(source);
  } catch (e) {
    return e.message || String(e);
  }
  const math = new DOMParser().parseFromString(mml, "application/xml").documentElement;
  const merror = math.getElementsByTagName("merror")[0];
  if (merror) return merror.getAttribute("data-mjx-error") || merror.textContent;
  const hasOutput =
    math.textContent.trim() !== "" ||
    [...math.getElementsByTagName("*")].some((el) => el.localName !== "mrow");
  return hasOutput ? message("macroUnexpectedOutput") : "";
}

function braceDepth(line) {
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\\") i++;
    else if (ch === "%") break;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;
  }
  return depth;
}

// Renvoie null si tout est valide, sinon { line, error } avec la ligne où
// commence la définition fautive. Une définition peut s'étendre sur plusieurs
// lignes et utiliser les précédentes : on valide des préfixes cumulés, coupés
// là où toutes les accolades sont refermées.
function validateMacros(text) {
  const lines = text.split(/\r?\n/);
  let depth = 0;
  let validLines = 0;
  for (let i = 0; i < lines.length; i++) {
    depth += braceDepth(lines[i]);
    if (depth > 0) continue;
    const error = definitionError(lines.slice(0, i + 1).join("\n"));
    if (error) return { line: validLines + 1, error };
    validLines = i + 1;
    depth = 0;
  }
  if (validLines === lines.length) return null;
  const error = definitionError(text);
  return error ? { line: validLines + 1, error } : null;
}

// Affiche l'éventuelle erreur et renvoie true si les définitions sont valides.
function reportMacroErrors(text) {
  const invalid = validateMacros(text);
  $("macro-definitions").setAttribute("aria-invalid", String(Boolean(invalid)));
  if (invalid) setMacroStatus(message("macroInvalid", invalid.line, invalid.error), true);
  return !invalid;
}

function scheduleMacroCheck() {
  clearTimeout(macroCheckTimer);
  macroCheckTimer = setTimeout(() => {
    if (mjReady && reportMacroErrors($("macro-definitions").value)) setMacroStatus("");
  }, 300);
}

function applySvgColor(svg, color) {
  const elements = [svg, ...svg.querySelectorAll("*")];
  for (const element of elements) {
    for (const attribute of ["fill", "stroke", "style"]) {
      const value = element.getAttribute(attribute);
      if (value?.includes("currentColor")) {
        element.setAttribute(attribute, value.replace(/currentColor/g, color));
      }
    }
  }
}

// --- Aperçu ---------------------------------------------------------------

async function updatePreview() {
  const { latex, display, color, sizePx } = opts();
  const prev = $("preview");
  prev.textContent = "";
  setStatus("");
  $("insert").disabled = true;
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    setStatus(message("invalidColor"));
    return;
  }
  if (!latex.trim()) return;

  try {
    await ensureMathJax();
  } catch (e) {
    setStatus(message("mathjaxStartError", e));
    return;
  }

  let container;
  try {
    clearDefinedMacros();
    if (customMacros) MathJax.tex2mml(customMacros);
    MathJax.texReset();
    container = MathJax.tex2svg(latex, { display });
  } catch (e) {
    setStatus(message("renderError", e));
    return;
  }
  container.style.fontSize = sizePx + "px";
  container.style.color = color;
  prev.appendChild(container);

  const svg = container.querySelector("svg");
  if (!svg) {
    setStatus(message("noPreview"));
    return;
  }
  applySvgColor(svg, color);
  // MathJax rend les erreurs de syntaxe en rouge dans le SVG ; on laisse
  // l'utilisateur les voir, mais on prévient et on autorise quand même l'insertion.
  if (svg.querySelector('[data-mml-node="merror"]')) {
    setStatus(message("syntaxWarning"), "info");
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
    img.onerror = () => reject(new Error(message("svgImageUnreadable")));
    img.src = src;
  });
}

async function svgToPng(svg, color, scale, cssW, cssH) {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", cssW + "px");
  clone.setAttribute("height", cssH + "px");
  // SVG images may not inherit currentColor from their former HTML container.
  clone.style.color = color;
  applySvgColor(clone, color);

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

async function loadSelectedEquation() {
  const tab = await getComposeTab();
  if (!tab) return;

  try {
    const response = await messenger.tabs.sendMessage(tab.id, {
      type: "texbird-get-selected-equation",
    });
    if (response?.ok && typeof response.latex === "string") {
      editingEquation = true;
      $("src").value = response.latex;
      $("insert-hint").textContent = message("replaceHint");
      $("insert").textContent = message("replaceButton");
    }
  } catch (e) {
    // The compose script may be unavailable in an already-open window.
  }
}

async function insertIntoCompose(data) {
  const tab = await getComposeTab();
  if (!tab) return false;

  // 1) Voie principale : le compose script insère au curseur.
  try {
    const resp = await messenger.tabs.sendMessage(tab.id, {
      type: "texbird-insert",
      data,
      replaceSelected: editingEquation,
    });
    if (resp && resp.ok) return true;
  } catch (e) {
    // Pas de compose script (fenêtre ouverte avant l'installation) -> repli.
  }
  if (editingEquation) return false;

  // 2) Repli : on ajoute l'image en fin de corps via l'API compose.
  try {
    const details = await messenger.compose.getComposeDetails(tab.id);
    if (details.isPlainText) {
      setStatus(message("plainTextMessage"));
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
  setStatus(message("generatingImage"), "info");

  let png;
  try {
    png = await svgToPng(svg, color, scale, cssW, cssH);
  } catch (e) {
    setStatus(message("generationFailure", e));
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
    setStatus(message("insertFailure"));
    $("insert").disabled = false;
  }
}

// --- Écouteurs ------------------------------------------------------------

$("src").addEventListener("input", schedulePreview);
$("macro-definitions").addEventListener("input", scheduleMacroCheck);
$("save-macros").addEventListener("click", saveCustomMacros);
$("color").addEventListener("input", () => {
  updateColorSwatches();
  updatePreview();
});
for (const swatch of document.querySelectorAll(".color-swatch")) {
  swatch.addEventListener("click", () => {
    $("color").value = swatch.dataset.color;
    updateColorSwatches();
    updatePreview();
  });
}
for (const el of document.querySelectorAll(
  'input[name="mode"], #size, #scale'
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
  localize();
  updateColorSwatches();
  await loadCustomMacros();
  await loadSelectedEquation();
  $("src").focus();
  setStatus(message("mathjaxLoading"), "info");
  try {
    await ensureMathJax();
    setStatus("");
    // Macros enregistrées par une version antérieure sans validation.
    if (customMacros && !reportMacroErrors(customMacros)) customMacros = "";
  } catch (e) {
    setStatus(message("mathjaxStartError", e));
  }
  updatePreview();
})();
