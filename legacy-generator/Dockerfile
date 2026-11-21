FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY generator.mjs runtime.mjs ./
CMD ["node","generator.mjs"]
