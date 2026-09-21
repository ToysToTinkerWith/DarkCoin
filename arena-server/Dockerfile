FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.cjs ./server.cjs
USER node
EXPOSE 8080
CMD ["node", "server.cjs"]
