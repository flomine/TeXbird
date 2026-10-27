# Third-party components

## MathJax

- **Role**: local rendering of LaTeX to SVG (then rasterized to PNG by TeXbird).
- **Version**: 3.2.2, `tex-svg-full` component.
- **License**: Apache-2.0 (see `mathjax/LICENSE`).
- **Bundled file**: `mathjax/tex-svg.js`.
- **SHA-256**: `a4354ff94fd868aea0cc6eaaa79a57fda0588646fc46ee3700a349ee0a11cbe6`
	(official `mathjax@3.2.2` file `package/es5/tex-svg-full.js`).

### Reproducing the bundled file

Run `make vendor` to fetch the pinned npm package, verify the SHA-256, and copy
the bundle. The target refuses to replace the bundled file if the checksum
differs. It requires `npm` and either `sha256sum` or `shasum`.

To reproduce the steps manually:

```bash
npm pack mathjax@3.2.2
tar xzf mathjax-3.2.2.tgz
cp package/es5/tex-svg-full.js mathjax/tex-svg.js
cp package/LICENSE             mathjax/LICENSE
```

The **-full** component is used so that all TeX extensions (ams, physics, mhchem,
cancel, color, boldsymbol, braket…) are available offline, with no network
loading — required under a Manifest V3 MailExtension's CSP.
