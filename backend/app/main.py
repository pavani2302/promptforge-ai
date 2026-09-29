from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# FIXED: Changed relative imports to absolute imports
from app.config import settings
from app.database import Base, engine
from app.routers import admin, auth, health, prompts


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(prompts.router)
app.include_router(health.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {
        "application": "PromptForge AI",
        "status": "running",
        "version": "2.1.0",
    }
