// SPDX-License-Identifier: GPL-3.0-or-later
// TeXbird — Copyright (C) 2026 Franck (flomine)
//
// Enregistre un compose script dans chaque fenêtre de composition.
// Il reçoit les images générées par le popup et les insère au curseur.

const COMPOSE_SCRIPT = {
  id: "texbird-compose-insert",
  js: ["compose-script.js"],
  runAt: "document_end",
};

async function registerComposeScript() {
  try {
    const existing = await messenger.scripting.compose.getRegisteredScripts();
    if (existing.some((s) => s.id === COMPOSE_SCRIPT.id)) {
      return; // déjà enregistré (persiste entre redémarrages)
    }
  } catch (e) {
    // getRegisteredScripts peut échouer sur de très vieilles versions : on tente l'enregistrement quand même.
  }
  try {
    await messenger.scripting.compose.registerScripts([COMPOSE_SCRIPT]);
  } catch (e) {
    console.error("TeXbird : échec de l'enregistrement du compose script", e);
  }
}

registerComposeScript();
messenger.runtime.onInstalled.addListener(registerComposeScript);
messenger.runtime.onStartup.addListener(registerComposeScript);
