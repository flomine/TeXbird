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

async function loadTexbirdSettings() {
  const stored = await messenger.storage.local.get("defaults");
  return { defaults: sanitizeDefaults(stored.defaults) };
}
