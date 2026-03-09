FROM python:3.12-slim

WORKDIR /backend

# Install dependencies only (cached layer)
COPY pyproject.toml .
RUN pip install --no-cache-dir \
    "fastapi>=0.115" \
    "uvicorn[standard]" \
    "sqlmodel>=0.0.22" \
    psycopg2-binary \
    alembic \
    "python-jose[cryptography]" \
    "langchain>=0.3" \
    "langchain-openai>=0.3" \
    pydantic-settings \
    httpx

# Copy source code
COPY . .

ENV PYTHONPATH=/backend

CMD ["sh", "-c", "alembic upgrade head || alembic stamp head; uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
