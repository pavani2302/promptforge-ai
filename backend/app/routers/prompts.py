from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..auth import get_current_user
from ..database import get_db
from ..models import Prompt, PromptVersion, User
from ..schemas import OptimizeRequest
from ..services.azure_openai import optimize_prompt

router = APIRouter(prefix="/api/prompts", tags=["Prompts"])

@router.post("/optimize")
def optimize(request: OptimizeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        result = optimize_prompt(request.prompt, request.use_case, request.tone, request.model_target)
    except Exception as exc:
        raise HTTPException(502, f"AI optimization failed: {exc}")
    record = Prompt(
        user_id=current_user.id, title=request.title, original_prompt=request.prompt,
        optimized_prompt=result["optimized_prompt"], use_case=request.use_case,
        tone=request.tone, model_target=request.model_target, score=result["score"],
        clarity=result["clarity"], specificity=result["specificity"], context=result["context"],
        constraints=result["constraints"], output_format=result["output_format"], tags=result.get("tags", [])
    )
    db.add(record); db.commit(); db.refresh(record)
    db.add(PromptVersion(prompt_id=record.id, version=1, content=record.optimized_prompt, score=record.score))
    db.commit()
    return {"id": record.id, **result, "original_prompt": record.original_prompt}

@router.get("/history")
def history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Prompt).filter(Prompt.user_id == current_user.id).order_by(Prompt.created_at.desc()).limit(100).all()
    return [{"id": r.id, "title": r.title, "original_prompt": r.original_prompt, "optimized_prompt": r.optimized_prompt,
             "use_case": r.use_case, "tone": r.tone, "model_target": r.model_target, "score": r.score,
             "tags": r.tags or [], "created_at": r.created_at.isoformat()} for r in rows]

@router.get("/{prompt_id}/versions")
def versions(prompt_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id, Prompt.user_id == current_user.id).first()
    if not prompt: raise HTTPException(404, "Prompt not found")
    rows = db.query(PromptVersion).filter(PromptVersion.prompt_id == prompt_id).order_by(PromptVersion.version.desc()).all()
    return [{"version": r.version, "content": r.content, "score": r.score, "created_at": r.created_at.isoformat()} for r in rows]
