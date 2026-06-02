# WorkConnect Deployment Guide

This guide outlines the procedure for deploying the WorkConnect Platform to a production Linux environment (e.g., AWS EC2, DigitalOcean, Vercel, or Heroku).

## 1. Prerequisites

- **Node.js**: v18.x or v20.x
- **MongoDB**: MongoDB Atlas or self-hosted replica set
- **Redis**: For Socket.IO scaling and session caching (required for multi-node deployments)
- **LiveKit**: For WebRTC screen sharing and voice (self-hosted or LiveKit Cloud)

## 2. Environment Configuration

1. Clone the repository to your production server.
2. Copy the `.env.example` file to `.env` in the root directory and `client/.env`.
   ```bash
   cp .env.example .env
   cp .env.example client/.env
   ```
3. Securely populate all production keys in `.env` (MongoDB URI, JWT Secret, LiveKit keys).

## 3. Building the Frontend

The React/Vite frontend must be compiled into static assets before deployment.

```bash
cd client
npm install
npm run build
```
The output will be generated in `client/dist`. 

> **Important**: Ensure `VITE_API_URL` is correctly set in `client/.env` before running the build step. The frontend relies on this variable entirely instead of localhost.

## 4. Starting the Backend

Install backend dependencies and run the production server.

```bash
cd server
npm install
NODE_ENV=production npm start
```

### Process Management
For production, it is highly recommended to use a process manager like **PM2** to ensure the Node.js API automatically restarts on failure.

```bash
npm install -g pm2
pm2 start server/src/server.js --name "workconnect-api"
pm2 save
pm2 startup
```

## 5. Reverse Proxy Configuration (Nginx)

If hosting the static frontend assets and the Node API on the same Linux machine, configure Nginx to route traffic appropriately:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Serve compiled React frontend
    location / {
        root /path/to/workconnect/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy Socket.IO for WebRTC signalling
    location /socket.io {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

## 6. LiveKit WebRTC Configuration

LiveKit manages the low-latency SFU pipeline. Ensure that `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` exactly match your LiveKit server configuration. Without these, the frontend Screen Share and Whiteboard tokens will be invalid.

## Security Considerations

- The codebase has been stripped of `console.log` to prevent memory leaks and terminal flooding.
- All mock data has been purged. The UI will strictly mirror the MongoDB state.
- Ensure `JWT_SECRET` is heavily randomized to prevent token spoofing.
