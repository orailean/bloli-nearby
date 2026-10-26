FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv osmium-tool curl ca-certificates util-linux && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY importer/requirements.txt /app/importer/requirements.txt
RUN python3 -m venv /opt/importer && /opt/importer/bin/pip install --no-cache-dir -r /app/importer/requirements.txt
ENV PATH="/opt/importer/bin:${PATH}"
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY src/server ./src/server
COPY src/shared ./src/shared
COPY importer ./importer
ENTRYPOINT ["/app/importer/run.sh"]
