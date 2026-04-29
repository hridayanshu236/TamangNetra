FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libgl1 \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first (for caching)
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Now copy the rest of the code
COPY . .

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Download Devanagari font for PDF rendering
RUN mkdir -p fonts && curl -L "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf" -o fonts/NotoSansDevanagari-Regular.ttf

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]