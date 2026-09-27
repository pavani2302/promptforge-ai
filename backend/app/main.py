from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import Base, engine
from .routers import auth, prompts, health

Base.metadata.create_all(bind=engine)
app = FastAPI(title=settings.APP_NAME, version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=[settings.FRONTEND_URL], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(prompts.router)
app.include_router(health.router)

@app.get("/")
def root():
    return {"application": "PromptForge AI", "status": "running", "version": "2.0.0"}
