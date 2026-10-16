
# Schedulix

An interactive CPU scheduling simulator and background job execution platform.

## Project Status

Day 1: Initial development environment and application skeleton.

## Planned Modules

### OS Lab
- First Come, First Served (FCFS)
- Shortest Job First (SJF)
- Shortest Remaining Time First (SRTF)
- Priority Scheduling
- Round Robin
- Scheduling metrics and Gantt chart visualization

### Job Engine
- PostgreSQL-backed job queue
- Separate Python worker processes
- Predefined background tasks
- Job priorities, retries, and scheduling
- Execution history and monitoring

## Technology Stack

- React, TypeScript, Vite
- Python, FastAPI
- PostgreSQL, SQLAlchemy, Alembic
- pytest, React Testing Library
- Git and GitHub
- Docker Compose

## Run Locally

### Backend

Open a terminal in the `backend` directory.

Activate the virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

Start the API:

```powershell
python -m uvicorn app.main:app --reload
```

API: http://127.0.0.1:8000

Health check: http://127.0.0.1:8000/health

API documentation: http://127.0.0.1:8000/docs

### Frontend

Open a separate terminal in the `frontend` directory.

Install dependencies:

```powershell
npm install
```

Start the frontend:

```powershell
npm run dev
```

Frontend: http://localhost:5173

## Database

PostgreSQL integration will be configured in a later development stage.

## Security

The Job Engine will accept only registered task handlers with validated arguments. It will not execute arbitrary user-submitted Python code.

## Development

Features will be marked as implemented only after they have been tested and verified.
