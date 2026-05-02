"""TamangNetra Backend Entry Point"""
import uvicorn
from app.main import app
from app.core.config import get_settings


if __name__ == "__main__":
    settings = get_settings()
    
    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
