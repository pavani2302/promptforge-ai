from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class OptimizeRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=12000)
    use_case: str = "General"
    tone: str = "Professional"
    model_target: str = "General"
    title: str = "Untitled Prompt"

class OptimizeResponse(BaseModel):
    id: int
    original_prompt: str
    optimized_prompt: str
    score: int
    clarity: int
    specificity: int
    context: int
    constraints: int
    output_format: int
    suggestions: List[str]
    tags: List[str]

class SaveTemplateRequest(BaseModel):
    name: str
    description: str = ""
    category: str = "General"
    content: str
