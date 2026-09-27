# PromptForge AI V2

Advanced prompt engineering SaaS using React, FastAPI, PostgreSQL/Supabase, Azure OpenAI, Docker, Render and Netlify.

## Features
- JWT authentication
- Azure OpenAI prompt optimization
- 5-dimensional prompt scoring
- Prompt history
- Prompt version records
- Model/use-case/tone targeting
- Tags and suggestions
- Dockerized backend
- Netlify-ready frontend
- Supabase PostgreSQL-ready

## Local backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

## Local frontend
cd frontend
npm install
cp .env.example .env
npm run dev

## Production
Frontend: Netlify
Backend: Render Docker Web Service
Database: Supabase PostgreSQL
AI: Azure OpenAI

Important: AZURE_OPENAI_DEPLOYMENT must be the Azure deployment name.
