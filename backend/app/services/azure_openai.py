import json
import re

from openai import OpenAI

from ..config import settings

client = OpenAI(
    api_key=settings.AZURE_OPENAI_API_KEY,
    base_url=f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/v1/",
)

SYSTEM_PROMPT = """
You are PromptForge AI, an advanced prompt engineering and evaluation system.

Preserve the user's intent.

Evaluate the ORIGINAL prompt and assign five independent scores:

- clarity
- specificity
- context
- constraints
- output_format

Also calculate an overall score.

IMPORTANT:
Return ONLY valid JSON.
Do not use markdown.
Do not use ```json.
Do not add explanations outside the JSON.

The JSON MUST use exactly these lowercase field names:

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

Rules:

- score: integer from 0 to 100
- clarity: integer from 0 to 100
- specificity: integer from 0 to 100
- context: integer from 0 to 100
- constraints: integer from 0 to 100
- output_format: integer from 0 to 100
- All six scores must ALWAYS be present.
- Never return null for a score.
- Give 3-5 practical suggestions.
- Give 3-6 useful tags.
- Scores represent the quality of the ORIGINAL prompt, not the optimized prompt.
"""


def _clean_json(text: str) -> dict:
    """
    Convert Azure OpenAI output into a Python dictionary.
    Handles occasional markdown fences or surrounding text.
    """

    text = text.strip()

    # Remove markdown code fences if the model adds them.
    text = re.sub(r"^```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try extracting the first JSON object.
        match = re.search(r"\{.*\}", text, re.DOTALL)

        if not match:
            raise RuntimeError("Azure OpenAI returned invalid JSON")

        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise RuntimeError("Azure OpenAI returned invalid JSON") from exc


def _score(value, default=0):
    """
    Safely convert an AI score into an integer between 0 and 100.
    """

    try:
        value = int(float(value))
    except (TypeError, ValueError):
        return default

    return max(0, min(100, value))


def optimize_prompt(prompt, use_case, tone, model_target):

    user_input = f"""
Original prompt:

{prompt}

Use case: {use_case}

Tone: {tone}

Target model/platform: {model_target}

Create an improved production-ready prompt while preserving the user's goal.

Evaluate the ORIGINAL prompt before optimization.

Return the required JSON structure exactly.
"""

    response = client.responses.create(
        model=settings.AZURE_OPENAI_DEPLOYMENT,
        instructions=SYSTEM_PROMPT,
        input=user_input,
    )

    data = _clean_json(response.output_text)

    # Normalize all expected score fields.
    clarity = _score(data.get("clarity"))
    specificity = _score(data.get("specificity"))
    context = _score(data.get("context"))
    constraints = _score(data.get("constraints"))
    output_format = _score(data.get("output_format"))

    # If the model doesn't provide a valid overall score,
    # calculate it from the five dimensions.
    score = _score(data.get("score"))

    if score == 0 and any(
        value > 0
        for value in [
            clarity,
            specificity,
            context,
            constraints,
            output_format,
        ]
    ):
        score = round(
            (
                clarity
                + specificity
                + context
                + constraints
                + output_format
            )
            / 5
        )

    suggestions = data.get("suggestions", [])
    if not isinstance(suggestions, list):
        suggestions = [str(suggestions)]

    tags = data.get("tags", [])
    if not isinstance(tags, list):
        tags = [str(tags)]

    return {
        "optimized_prompt": str(
            data.get("optimized_prompt", "")
        ),
        "score": score,
        "clarity": clarity,
        "specificity": specificity,
        "context": context,
        "constraints": constraints,
        "output_format": output_format,
        "suggestions": [str(x) for x in suggestions],
        "tags": [str(x) for x in tags],
    }


def generate_templates(category):

    prompt = f"""
Create 5 reusable high-quality AI prompt templates
for category: {category}.

Return ONLY valid JSON:

{{
  "templates": [
    {{
      "name": "string",
      "description": "string",
      "content": "string"
    }}
  ]
}}
"""

    response = client.responses.create(
        model=settings.AZURE_OPENAI_DEPLOYMENT,
        instructions=(
            "You are an expert prompt template designer. "
            "Return only valid JSON."
        ),
        input=prompt,
    )

    return _clean_json(response.output_text)