ARG WAHA_IMAGE=devlikeapro/waha@sha256:2fc1787ddbd343ed2e7d59482846d1b22aa5ca134e29aa8d42d0e88c54e24779
FROM ${WAHA_IMAGE}

COPY certs/supabase-ca.crt /app/modern-supabase-ca.crt
COPY deployment/enforce-waha-postgres-tls.mjs /app/modern-enforce-postgres-tls.mjs
RUN node /app/modern-enforce-postgres-tls.mjs

ENV NODE_EXTRA_CA_CERTS=/app/modern-supabase-ca.crt
ENV PGSSLMODE=verify-full
