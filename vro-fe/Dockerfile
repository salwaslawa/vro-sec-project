# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files dan install dependencies
COPY package*.json ./
RUN npm install

# Copy semua source code
COPY . .

# Terima argument dari docker-compose (untuk URL Backend)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build aplikasi Next.js
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy hasil build dari stage sebelumnya
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Expose port 3000
EXPOSE 3000

# Jalankan aplikasi
CMD ["npm", "start"]
