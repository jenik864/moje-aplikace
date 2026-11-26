FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    FIFA67_DATA_DIR=/data

COPY server.mjs index.html style.css version.json manifest.webmanifest trailer.mp4 ./
COPY js/ ./js/
COPY icons/ ./icons/

CMD ["node", "server.mjs"]
