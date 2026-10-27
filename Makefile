# TeXbird — build the installable .xpi at the repo root.
#
#   make            # build texbird.xpi
#   make clean      # remove it
#   make lint       # run web-ext lint if available
#   make vendor     # fetch and verify the bundled MathJax file

XPI      := texbird.xpi
EXCLUDES := -x '.git/*' -x '*.xpi' -x 'Makefile' -x '.gitignore' -x 'web-ext-artifacts/*'
MATHJAX_VERSION := 3.2.2
MATHJAX_SHA256  := a4354ff94fd868aea0cc6eaaa79a57fda0588646fc46ee3700a349ee0a11cbe6

.PHONY: build clean lint vendor
.DEFAULT_GOAL := build

build:
	@rm -f $(XPI)
	@zip -r -X $(XPI) . $(EXCLUDES) >/dev/null
	@unzip -l $(XPI) | grep -q ' manifest.json$$' \
		&& echo "Built $(XPI) (manifest.json at root: OK)" \
		|| { echo "ERROR: manifest.json is not at the archive root"; rm -f $(XPI); exit 1; }

clean:
	@rm -f $(XPI)
	@echo "Removed $(XPI)"

lint:
	@command -v web-ext >/dev/null 2>&1 \
		&& web-ext lint \
		|| echo "web-ext not installed — run: npm install -g web-ext"

vendor:
	@set -eu; \
	tmp=$$(mktemp -d); \
	trap 'rm -rf "$$tmp"' EXIT HUP INT TERM; \
	npm pack mathjax@$(MATHJAX_VERSION) --pack-destination "$$tmp" --silent >/dev/null; \
	tar -xzf "$$tmp/mathjax-$(MATHJAX_VERSION).tgz" -C "$$tmp" package/es5/tex-svg-full.js; \
	bundle="$$tmp/package/es5/tex-svg-full.js"; \
	if command -v sha256sum >/dev/null 2>&1; then \
		actual=$$(sha256sum "$$bundle" | awk '{print $$1}'); \
	elif command -v shasum >/dev/null 2>&1; then \
		actual=$$(shasum -a 256 "$$bundle" | awk '{print $$1}'); \
	else \
		echo "ERROR: sha256sum or shasum is required" >&2; exit 1; \
	fi; \
	if [ "$$actual" != "$(MATHJAX_SHA256)" ]; then \
		echo "ERROR: MathJax checksum mismatch (expected $(MATHJAX_SHA256), got $$actual)" >&2; exit 1; \
	fi; \
	cp "$$bundle" mathjax/tex-svg.js; \
	echo "Verified and updated mathjax/tex-svg.js (SHA-256: $$actual)"
