FROM node:24-bookworm-slim

WORKDIR /app/cloud-run-jobs

ENV NODE_ENV=production

COPY cloud-run-jobs/package.json ./package.json
RUN npm install --omit=dev

COPY cloud-run-jobs/runner.mjs ./runner.mjs
RUN mkdir -p runtime out audio/battleMusic audio/damageOverTime audio/death audio/hit audio/miss icons/stats icons/types effects

COPY dark*Fight.js ./runtime/

CMD ["node", "runner.mjs"]
