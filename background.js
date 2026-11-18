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

// --- Menu contextuel du corps du message -----------------------------------

const MENU_ID = "texbird-open-popup";

async function createMenus() {
  try {
    await messenger.menus.removeAll();
    messenger.menus.create({
      id: MENU_ID,
      title: messenger.i18n.getMessage("contextMenuTitle"),
      contexts: ["compose_body"],
    });
  } catch (e) {
    console.error("TeXbird : échec de la création du menu contextuel", e);
  }
}

// Le compose script mémorise l'équation sous le clic droit : le popup s'ouvre
// alors en mode remplacement, comme après un clic gauche sur l'équation.
messenger.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  // openPopup doit être appelé directement dans le gestionnaire (action utilisateur).
  messenger.composeAction.openPopup(tab ? { windowId: tab.windowId } : undefined)
    .catch((e) => console.error("TeXbird : impossible d'ouvrir le popup", e));
});

messenger.runtime.onInstalled.addListener(createMenus);
messenger.runtime.onStartup.addListener(createMenus);
