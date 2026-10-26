FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY src/server ./src/server
COPY src/shared ./src/shared
USER node
EXPOSE 3100
CMD ["node", "--import", "tsx", "src/server/main.ts"]
