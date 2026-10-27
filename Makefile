# TeXbird — build the installable .xpi at the repo root.
#
#   make            # build texbird.xpi
#   make clean      # remove it
#   make lint       # run web-ext lint if available

XPI      := texbird.xpi
EXCLUDES := -x '.git/*' -x '*.xpi' -x 'Makefile' -x '.gitignore' -x 'web-ext-artifacts/*'

.PHONY: build clean lint
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
