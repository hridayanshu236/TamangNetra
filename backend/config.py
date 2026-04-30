from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    tmt_token: str
    tmt_api_url: str = "https://tmt.ilprl.ku.edu.np/lang-translate"
    rate_limit_rpm: int = 55
    frontend_url: str = "http://localhost:5173"
    class Config:
        env_file = ".env"

settings = Settings()