// SPDX-License-Identifier: GPL-3.0-or-later
// TeXbird — Copyright (C) 2026 Franck (flomine)
//
// Réglages partagés entre le popup et la page d'options (storage.local).
"use strict";

const TEXBIRD_DEFAULTS = Object.freeze({
  mode: "display",
  color: "#000000",
  size: 16,
  scale: 3,
});

const TEXBIRD_SCALES = [2, 3, 4];
const TEXBIRD_SIZE_MIN = 8;
const TEXBIRD_SIZE_MAX = 72;
const TEXBIRD_MAX_RECENT = 10;

// Modèles fournis d'office : le libellé affiché est la source elle-même.
const TEXBIRD_BUILTIN_TEMPLATES = Object.freeze([
  "\\frac{}{}",
  "\\sqrt{}",
  "\\sum_{i=1}^{n}",
  "\\int_{a}^{b} f(x)\\,dx",
  "\\lim_{x \\to \\infty}",
  "\\binom{n}{k}",
  "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
  "\\begin{cases} x & \\text{if } x \\ge 0 \\\\ -x & \\text{otherwise} \\end{cases}",
  "\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}",
  "\\frac{\\partial f}{\\partial x}",
]);

function sanitizeDefaults(value) {
  const v = value && typeof value === "object" ? value : {};
  const size = Number.parseInt(v.size, 10);
  const scale = Number.parseInt(v.scale, 10);
  return {
    mode: v.mode === "inline" ? "inline" : "display",
    color: /^#[0-9a-f]{6}$/i.test(v.color) ? v.color.toUpperCase() : TEXBIRD_DEFAULTS.color,
    size: size >= TEXBIRD_SIZE_MIN && size <= TEXBIRD_SIZE_MAX ? size : TEXBIRD_DEFAULTS.size,
    scale: TEXBIRD_SCALES.includes(scale) ? scale : TEXBIRD_DEFAULTS.scale,
  };
}

function sanitizeRecent(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((e) => e && typeof e.latex === "string" && e.latex.trim())
    .map((e) => ({ latex: e.latex, display: e.display !== false }))
    .slice(0, TEXBIRD_MAX_RECENT);
}

function sanitizeTemplates(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((t) => typeof t === "string" && t.trim());
}

async function loadTexbirdSettings() {
  const stored = await messenger.storage.local.get([
    "defaults",
    "recentEquations",
    "templates",
  ]);
  return {
    defaults: sanitizeDefaults(stored.defaults),
    recent: sanitizeRecent(stored.recentEquations),
    templates: sanitizeTemplates(stored.templates),
  };
}

// Libellé d'une option de liste : une seule ligne, tronquée.
function texbirdLabel(latex, max = 60) {
  const line = latex.replace(/\s+/g, " ").trim();
  return line.length > max ? line.slice(0, max - 1) + "…" : line;
}
