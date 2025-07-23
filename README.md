# Scalable Job Importer System 🚀

![System Architecture](docs/architecture-diagram.png)

A professional-grade job import system with Redis queue processing, MongoDB storage, and Next.js dashboard.

## Features ✨

- **Multi-source Integration**: Fetch jobs from 10+ APIs with XML-to-JSON conversion
- **Queue Processing**: Redis-backed job queue with BullMQ
- **Worker System**: Configurable concurrency with failure handling
- **Import Analytics**: Track new/updated/failed jobs with timestamps
- **Admin Dashboard**: Next.js UI with real-time monitoring
- **Scheduled Imports**: Hourly cron jobs with manual trigger option

## Tech Stack 🛠️

**Backend**:
- Node.js (Express)
- BullMQ + Redis
- MongoDB + Mongoose
- xml2js

**Frontend**:
- Next.js 14
- React 18
- Tailwind CSS
- Chart.js

## Prerequisites 📋

- Docker + Docker Compose (recommended)
- Node.js 18+
- MongoDB 6+
- Redis 7+

## Installation 🛠️

### 1. Clone the Repository
```bash
git clone https://github.com/Aftab1311/Job_Import_System.git
cd job-importer-system
```

### 2. Setup the Backend
```bash
cd server
npm install
cp .env.example .env
# Edit the .env file with your credentials
```

### 3. Setup the Frontend
```bash
cd ../client
npm install
cp .env.example .env
# Edit the .env file with your frontend configuration
```
### 4. Setup MongoDB locally
```bash
set the shared mongo uri string in mongoDB compass
```

### 5. Run both Frontend and Backend
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd ../client
npm run dev
```
