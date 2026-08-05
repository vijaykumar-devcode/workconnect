FROM node:18-alpine

WORKDIR /app

# Copy package files from the server folder
COPY server/package.json ./
COPY server/package-lock.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy backend source
COPY server/ .

EXPOSE 5000

CMD ["npm", "start"]