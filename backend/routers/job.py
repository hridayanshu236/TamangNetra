from fastapi import APIRouter
router = APIRouter()

@router.post("/jobs")
async def create_job():
    # TODO: Wire engines
    return {"jobId": "mock-123", "status": "processing"}

@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    # TODO: Return real data
    return {"jobId": job_id, "status": "completed", "result": {}}