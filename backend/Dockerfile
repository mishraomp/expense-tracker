# Build
FROM node:24.18.0-slim AS build

# Copy, build static files; see .dockerignore for exclusions
WORKDIR /app
COPY . ./
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
RUN npm run deploy

# Dependencies
FROM node:24.18.0-slim AS dependencies

# Copy, build static files; see .dockerignore for exclusions
WORKDIR /app
COPY . ./
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
RUN npm ci --ignore-scripts --no-update-notifier --omit=dev
RUN mkdir -p /app/uploads && chown 65532:65532 /app/uploads

# Deploy using minimal Distroless image
FROM gcr.io/distroless/nodejs26-debian13:nonroot
ENV NODE_ENV=production

# Copy app and dependencies
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/dist ./dist
COPY --from=dependencies --chown=nonroot:nonroot /app/uploads ./uploads

# Boilerplate, not used in OpenShift/Kubernetes
EXPOSE 3000

# Nonroot user, limit heap size to 150 MB
USER nonroot
CMD ["--max-old-space-size=150", "/app/dist/src/main"]