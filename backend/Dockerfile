FROM python:3.12-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies (including email-validator for Pydantic email fields validation)
RUN pip install --no-cache-dir -r requirements.txt email-validator

# Copy application source
COPY . .

# Expose FastAPI default port
EXPOSE 8000

# Start command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
