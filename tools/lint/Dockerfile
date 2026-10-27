FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914

WORKDIR /opt/web-ext
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --fund=false

ENV PATH="/opt/web-ext/node_modules/.bin:${PATH}"
WORKDIR /workspace
USER node
ENTRYPOINT ["web-ext"]