# Third-party components

## MathJax

- **Role**: local rendering of LaTeX to SVG (then rasterized to PNG by TeXbird).
- **Version**: 3.2.2, `tex-svg-full` component.
- **License**: Apache-2.0 (see `mathjax/LICENSE`).
- **Bundled file**: `mathjax/tex-svg.js`.

### Reproducing the bundled file

`mathjax/tex-svg.js` is the official, unmodified minified bundle, fetched from npm:

```bash
npm pack mathjax@3.2.2
tar xzf mathjax-3.2.2.tgz
cp package/es5/tex-svg-full.js mathjax/tex-svg.js
cp package/LICENSE             mathjax/LICENSE
```

The **-full** component is used so that all TeX extensions (ams, physics, mhchem,
cancel, color, boldsymbol, braket…) are available offline, with no network
loading — required under a Manifest V3 MailExtension's CSP.
