# Stage 1: build the React site.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: a small image with only the built site and the server (no dependencies needed).
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# The node user owns the files, so they stay readable whatever permissions they had on the laptop.
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node server ./server
USER node
EXPOSE 8080
CMD ["node", "server/server.mjs"]
