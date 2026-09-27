import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME = os.getenv("APP_NAME", "PromptForge AI")
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    SECRET_KEY = os.getenv("SECRET_KEY", "")
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
    AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

settings = Settings()
