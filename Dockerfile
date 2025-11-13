FROM node:22.12.0-bookworm-slim
WORKDIR /self-orchestrator
COPY package.json ./
COPY script.js ./
RUN mkdir facts rules
RUN npm install
EXPOSE 8001
ENTRYPOINT [ "node", "script.js" ]
