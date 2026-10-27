# TeXbird — build the installable .xpi at the repo root.
#
#   make            # build texbird.xpi
#   make clean      # remove it
#   make lint       # run pinned web-ext in a restricted Node container
#   make lint-image # rebuild the pinned web-ext container
#   make vendor     # fetch and verify the bundled MathJax file

XPI      := texbird.xpi
EXCLUDES := -x '.git/*' -x '*.xpi' -x 'Makefile' -x '.gitignore' -x 'web-ext-artifacts/*'
MATHJAX_VERSION := 3.2.2
MATHJAX_SHA256  := a4354ff94fd868aea0cc6eaaa79a57fda0588646fc46ee3700a349ee0a11cbe6
NODE_IMAGE ?= node:22-alpine
LINT_IMAGE ?= texbird-web-ext-lint:10.8.0
LINT_USER ?= $(shell id -u):$(shell id -g)

.PHONY: build clean lint lint-image vendor
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

lint: lint-image
	@docker run --rm --network=none --read-only \
		--cap-drop=ALL --security-opt=no-new-privileges \
		--pids-limit=128 --memory=2g --cpus=2 \
		--tmpfs /tmp:rw,noexec,nosuid,size=64m \
		--user "$(LINT_USER)" -e HOME=/tmp \
		--mount type=bind,src="$(CURDIR)",dst=/workspace,readonly \
		-w /workspace $(LINT_IMAGE) lint

lint-image:
	@command -v docker >/dev/null 2>&1 \
		|| { echo "ERROR: Docker is required to run make lint" >&2; exit 1; }
	@docker build --file tools/lint/Dockerfile --tag $(LINT_IMAGE) tools/lint

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
