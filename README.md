# WorkConnect — Recruitment Ecosystem

WorkConnect is a production-ready, full-stack Job Portal and Recruitment Management Platform engineered using the MERN stack (MongoDB, Express, React, Node.js). 

It integrates strict Role-Based Access Control (RBAC) across four user segments: Candidate, Employer, Recruiter, and Admin, powering the complete hiring lifecycle from job posting and text-based resume searching to ATS stage pipelines, interview calendar panels, simulated email dispatchers, and verification portfolios.

---

## 🛠️ Technology Stack & Libraries

### Frontend
- **Framework:** React.js & React Router (v6)
- **Styling:** Tailwind CSS & Lucide Icons
- **State Management:** Redux Toolkit & React-Redux
- **Form Handling:** React Hook Form (v7)
- **Charts/Analytics:** Recharts
- **API Client:** Abstracted fetch service with automatic JWT refresh rotation

### Backend
- **Framework:** Node.js & Express.js
- **Database:** MongoDB & Mongoose
- **Security:** Helmet, CORS, and bcryptjs
- **Authentication:** JWT, Refresh Tokens, and RBAC middlewares
- **File Uploads:** Decoupled Storage Provider (FS Disk & Cloudinary)

---

## 📂 Feature-Based Architecture (Mandatory Spec)

Both the server and client utilize a modular, **feature-based folder structure** where each segment (e.g. jobs, auth, applications) owns its models, routes, services, schemas, and UI components.

```
workconnect/
├── client/                     # React + Vite + Tailwind Client
│   ├── src/
│   │   ├── app/                # Redux store & router configurations
│   │   ├── components/         # Reusable premium UI & Sidebar layouts
│   │   ├── features/           # Feature slices and modules (auth, jobs, etc.)
│   │   ├── services/           # Axios/Fetch API clients
│   │   └── main.jsx            # React root mount
│
├── server/                     # Node + Express REST Server
│   ├── src/
│   │   ├── app.js              # Server entry and DB configurations
│   │   ├── middleware/         # Central error handler, protect, authorize
│   │   ├── services/           # Decoupled UploadService & StorageProvider
│   │   └── modules/            # Isolated features (auth, jobs, offers, etc.)
│   │       ├── jobs/
│   │       │   ├── job.model.js
│   │       │   ├── job.controller.js
│   │       │   ├── job.service.js
│   │       │   ├── job.routes.js
│   │       │   ├── job.validation.js
│   │       │   └── job.constants.js
```

---

## 📦 Dynamic Storage Abstraction Layer

WorkConnect enforces strict decoupling for file storage (Resumes, Company Logos, Onboarding Documents). Controllers and routes NEVER interact with the filesystem or cloud directly:

```
Controller ──> UploadService ──> StorageProviderFactory ──> [ LocalDisk / Cloudinary ]
```

To switch from Local Disk (`server/uploads/`) to Cloudinary in production, you **ONLY** change the `.env` variables. No code changes are required!

---

## 🚀 Installation & Running Guide

### 1. Environment Configurations
Create a `server/.env` file in the server root with:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/workconnect
JWT_SECRET=workconnect_jwt_secret_key_987654321
JWT_REFRESH_SECRET=workconnect_jwt_refresh_secret_key_123456789
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d

# File Storage switch (local or cloudinary)
UPLOAD_PROVIDER=local

# Cloudinary keys (Fill only when UPLOAD_PROVIDER=cloudinary)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 2. Start the Backend Server
```bash
cd server
npm install
npm run dev # or npm start
```

### 3. Start the Frontend Client
```bash
cd client
npm install
npm run dev
```

---

## 🔍 Core Flow & Verification Run
1. **Employer Registration:** Signup an Employer, complete Company profile settings under `/employer/company` (Company logo uploads statically serve locally via `/uploads/company_logos/`).
2. **Admin Verification:** Signup/Login an Admin account, visit `/admin` to verify the company profile.
3. **Job Creation:** Verified Employer posts a Job posting.
4. **Candidate Sourcing:** Candidate registers, uploads resume profile URL, searches published openings on public `/` boards, and applies.
5. **Interview Panel & Offers:** Employer coordinates candidate through ATS screening stages, schedules panels (calendars trigger simulated console emails), creates offer letters, and Candidate accepts.
