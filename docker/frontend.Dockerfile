# StayOps AI frontend image (Next.js, dev mode for now).
FROM node:20-slim

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend /app

EXPOSE 3000
CMD ["npm", "run", "dev"]
