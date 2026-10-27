// SPDX-License-Identifier: GPL-3.0-or-later
// TeXbird — Copyright (C) 2026 Franck (flomine)
//
// Doit être chargé AVANT mathjax/tex-svg.js.
// fontCache "none" : les glyphes sont écrits en tracés (<path>) directement dans
// chaque SVG, sans <use>/xlink — indispensable pour rasteriser proprement en PNG.
window.MathJax = {
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    packages: {
      "[+]": ["ams", "color", "cancel", "physics", "boldsymbol", "mhchem", "braket"],
    },
  },
  svg: { fontCache: "none" },
  startup: { typeset: false },
};
