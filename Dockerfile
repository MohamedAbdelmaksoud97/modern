FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=1
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup --system --gid 1001 modern && adduser --system --uid 1001 --ingroup modern modern
COPY --from=builder --chown=modern:modern /app/.next/standalone ./
COPY --from=builder --chown=modern:modern /app/.next/static ./.next/static
COPY --from=builder --chown=modern:modern /app/public ./public
COPY --from=builder --chown=modern:modern /app/certs ./certs
RUN mkdir -p .next/cache && chown modern:modern .next/cache
USER modern
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
