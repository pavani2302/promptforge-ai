import json
from openai import OpenAI
from ..config import settings

client = OpenAI(
    api_key=settings.AZURE_OPENAI_API_KEY,
    base_url=f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/v1/",
)

SYSTEM_PROMPT = """
You are PromptForge AI, an advanced prompt engineering and evaluation system.
Preserve the user's intent. Improve clarity, specificity, context, constraints,
and output format. Return ONLY valid JSON.

Schema:
{
  "optimized_prompt": "string",
  "score": 0,
  "clarity": 0,
  "specificity": 0,
  "context": 0,
  "constraints": 0,
  "output_format": 0,
  "suggestions": ["string"],
  "tags": ["string"]
}

Scores are integers 0-100 and represent the quality of the ORIGINAL prompt.
Give 3-5 practical suggestions and 3-6 useful tags.
"""

def optimize_prompt(prompt, use_case, tone, model_target):
    user_input = f"""
Original prompt:
{prompt}

Use case: {use_case}
Tone: {tone}
Target model/platform: {model_target}

Create an improved production-ready prompt while preserving the user's goal.
"""
    response = client.responses.create(
        model=settings.AZURE_OPENAI_DEPLOYMENT,
        instructions=SYSTEM_PROMPT,
        input=user_input,
    )
    try:
        return json.loads(response.output_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Azure OpenAI returned invalid JSON") from exc

def generate_templates(category):
    prompt = f"""Create 5 reusable high-quality AI prompt templates for category: {category}.
Return ONLY JSON: {{"templates":[{{"name":"string","description":"string","content":"string"}}]}}"""
    response = client.responses.create(
        model=settings.AZURE_OPENAI_DEPLOYMENT,
        instructions="You are an expert prompt template designer. Return only valid JSON.",
        input=prompt,
    )
    return json.loads(response.output_text)
