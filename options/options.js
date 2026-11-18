// SPDX-License-Identifier: GPL-3.0-or-later
// TeXbird — Copyright (C) 2026 Franck (flomine)
"use strict";

const $ = (id) => document.getElementById(id);
let statusTimer = null;

function message(key, ...substitutions) {
  return messenger.i18n.getMessage(key, substitutions.map(String));
}

function localize() {
  document.documentElement.lang = messenger.i18n.getUILanguage() || "en";
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = message(el.dataset.i18n);
  }
}

function flash(id, text) {
  $(id).textContent = text;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { $(id).textContent = ""; }, 2500);
}

// --- Réglages par défaut ----------------------------------------------------

function showDefaults(defaults) {
  document.querySelector(`input[name="mode"][value="${defaults.mode}"]`).checked = true;
  $("color").value = defaults.color.toLowerCase();
  $("size").value = defaults.size;
  $("scale").value = String(defaults.scale);
}

function readDefaults() {
  return sanitizeDefaults({
    mode: document.querySelector('input[name="mode"]:checked')?.value,
    color: $("color").value,
    size: $("size").value,
    scale: $("scale").value,
  });
}

async function saveDefaults() {
  if (!$("size").checkValidity()) return;
  try {
    await messenger.storage.local.set({ defaults: readDefaults() });
    flash("defaults-status", message("optionsSaved"));
  } catch (e) {
    flash("defaults-status", message("optionsSaveFailed", e));
  }
}

async function resetDefaults() {
  showDefaults(TEXBIRD_DEFAULTS);
  try {
    await messenger.storage.local.remove("defaults");
    flash("defaults-status", message("optionsSaved"));
  } catch (e) {
    flash("defaults-status", message("optionsSaveFailed", e));
  }
}

// --- Raccourci clavier --------------------------------------------------------

async function showShortcut() {
  let shortcut = "";
  try {
    const commands = await messenger.commands.getAll();
    shortcut = commands.find((c) => c.name === "_execute_compose_action")?.shortcut || "";
  } catch (e) {
    // commands indisponible : on affiche le texte sans raccourci.
  }
  $("shortcut-help").textContent = shortcut
    ? message("shortcutHelp", shortcut)
    : message("shortcutUnset");
}

// --- Démarrage ----------------------------------------------------------------

(async () => {
  localize();
  showShortcut();
  const settings = await loadTexbirdSettings();
  showDefaults(settings.defaults);

  $("defaults-form").addEventListener("change", saveDefaults);
  $("defaults-form").addEventListener("submit", (e) => e.preventDefault());
  $("reset-defaults").addEventListener("click", resetDefaults);
})();
