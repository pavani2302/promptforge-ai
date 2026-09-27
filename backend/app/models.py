from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    prompts = relationship("Prompt", back_populates="user", cascade="all, delete-orphan")

class Prompt(Base):
    __tablename__ = "prompts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), default="Untitled Prompt")
    original_prompt = Column(Text, nullable=False)
    optimized_prompt = Column(Text, nullable=False)
    use_case = Column(String(100), default="General")
    tone = Column(String(100), default="Professional")
    model_target = Column(String(100), default="General")
    score = Column(Integer, default=0)
    clarity = Column(Integer, default=0)
    specificity = Column(Integer, default=0)
    context = Column(Integer, default=0)
    constraints = Column(Integer, default=0)
    output_format = Column(Integer, default=0)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="prompts")

class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False)
    version = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
