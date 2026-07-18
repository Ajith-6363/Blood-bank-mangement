import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

class Settings:
    PROJECT_NAME: str = "Blood Bank Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # If on Vercel or inside AWS Lambda/serverless, default SQLite to writeable /tmp directory to avoid read-only filesystem crash
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:////tmp/blood_bank.db" if (os.getenv("VERCEL") or "var/task" in os.path.abspath(__file__)) else "sqlite:///./blood_bank.db"
    )
    
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "9a8d7c6b5e4f3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c"
    )
    REFRESH_SECRET_KEY: str = os.getenv(
        "REFRESH_SECRET_KEY", "1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # SMTP Configuration
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "noreply@bloodbank.com")

settings = Settings()
