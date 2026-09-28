from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Prompt, PromptVersion, User
from ..schemas import OptimizeRequest
from ..services.azure_openai import optimize_prompt


router = APIRouter(
    prefix="/api/prompts",
    tags=["Prompts"],
)


# ============================================================
# OPTIMIZE PROMPT
# ============================================================

@router.post("/optimize")
def optimize(
    request: OptimizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = optimize_prompt(
            request.prompt,
            request.use_case,
            request.tone,
            request.model_target,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI optimization failed: {exc}",
        )

    record = Prompt(
        user_id=current_user.id,
        title=request.title,
        original_prompt=request.prompt,
        optimized_prompt=result["optimized_prompt"],
        use_case=request.use_case,
        tone=request.tone,
        model_target=request.model_target,
        score=result["score"],
        clarity=result["clarity"],
        specificity=result["specificity"],
        context=result["context"],
        constraints=result["constraints"],
        output_format=result["output_format"],
        tags=result.get("tags", []),
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    # Create first prompt version
    version = PromptVersion(
        prompt_id=record.id,
        version=1,
        content=record.optimized_prompt,
        score=record.score,
    )

    db.add(version)
    db.commit()

    return {
        "id": record.id,

        "optimized_prompt":
            record.optimized_prompt,

        "score":
            record.score,

        "clarity":
            record.clarity,

        "specificity":
            record.specificity,

        "context":
            record.context,

        "constraints":
            record.constraints,

        "output_format":
            record.output_format,

        "suggestions":
            result.get("suggestions", []),

        "tags":
            result.get("tags", []),

        "original_prompt":
            record.original_prompt,
    }


# ============================================================
# PROMPT HISTORY
# ============================================================

@router.get("/history")
def history(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Prompt)
        .filter(
            Prompt.user_id == current_user.id
        )
        .order_by(
            Prompt.created_at.desc()
        )
        .limit(100)
        .all()
    )

    return [
        {
            "id": row.id,

            "title":
                row.title,

            "original_prompt":
                row.original_prompt,

            "optimized_prompt":
                row.optimized_prompt,

            "use_case":
                row.use_case,

            "tone":
                row.tone,

            "model_target":
                row.model_target,

            "score":
                row.score,

            "clarity":
                row.clarity,

            "specificity":
                row.specificity,

            "context":
                row.context,

            "constraints":
                row.constraints,

            "output_format":
                row.output_format,

            "tags":
                row.tags or [],

            "suggestions":
                [],

            "created_at":
                (
                    row.created_at.isoformat()
                    if row.created_at
                    else None
                ),
        }
        for row in rows
    ]


# ============================================================
# DELETE PROMPT
# ============================================================

@router.delete("/{prompt_id}")
def delete_prompt(
    prompt_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    """
    Delete a prompt belonging to the
    currently authenticated user.
    """

    # Find the prompt belonging to this user
    prompt = (
        db.query(Prompt)
        .filter(
            Prompt.id == prompt_id,
            Prompt.user_id == current_user.id,
        )
        .first()
    )

    if not prompt:
        raise HTTPException(
            status_code=404,
            detail="Prompt not found",
        )

    # Delete associated versions first.
    # PromptVersion has a foreign key to Prompt.
    db.query(PromptVersion).filter(
        PromptVersion.prompt_id == prompt.id
    ).delete(
        synchronize_session=False
    )

    # Delete the prompt itself.
    db.delete(prompt)

    db.commit()

    return {
        "message":
            "Prompt deleted successfully",

        "id":
            prompt_id,
    }