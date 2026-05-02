/**
 * API Client for Python FastAPI Backend
 * Communicates with http://localhost:8000
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface TranslationRequest {
  text: string;
  source_language: string;
  target_language: string;
  preserve_formatting?: boolean;
  include_confidence?: boolean;
}

export interface TranslationResponse {
  translated_text: string;
  source_language: string;
  target_language: string;
  confidence_score?: number;
  timestamp: string;
}

export interface PIIDetectionRequest {
  text: string;
  remove_pii?: boolean;
}

export interface PIIEntity {
  entity_type: string;
  value: string;
  start_pos: number;
  end_pos: number;
  confidence: number;
}

export interface PIIDetectionResponse {
  original_text: string;
  redacted_text?: string;
  entities_found: PIIEntity[];
}

export interface OCRRequest {
  image_url?: string;
  source_language: string;
  target_language?: string;
  perform_translation?: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface OCRResult {
  text: string;
  bounding_box: BoundingBox;
  confidence: number;
}

export interface OCRResponse {
  results: OCRResult[];
  translations?: string[];
}

export interface HealthResponse {
  status: string;
  version: string;
  database: string;
  cache: string;
  timestamp: string;
}

/**
 * Handle API errors with helpful messages
 */
function handleError(error: unknown): never {
  if (error instanceof Response) {
    throw new Error(
      `API Error ${error.status}: ${error.statusText}\n` +
      `Is the backend running at ${API_BASE_URL}?`
    );
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error('Unknown error occurred');
}

/**
 * API Client for backend communication
 */
export const apiClient = {
  /**
   * Translate text
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/translate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        handleError(response);
      }

      return await response.json();
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Batch translate multiple texts
   */
  async batchTranslate(
    texts: string[],
    sourceLang: string,
    targetLang: string
  ): Promise<{ translations: string[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/translate/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts,
          source_language: sourceLang,
          target_language: targetLang,
        }),
      });

      if (!response.ok) {
        handleError(response);
      }

      return await response.json();
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Detect PII in text
   */
  async detectPII(request: PIIDetectionRequest): Promise<PIIDetectionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/pii/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        handleError(response);
      }

      return await response.json();
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Redact PII from text
   */
  async redactPII(
    text: string,
    replacement: string = '[REDACTED]'
  ): Promise<{ original: string; redacted: string; pii_count: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/pii/redact?text=${encodeURIComponent(text)}&replacement=${encodeURIComponent(replacement)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        handleError(response);
      }

      return await response.json();
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Calculate PII risk score
   */
  async calculateRiskScore(text: string): Promise<{
    text: string;
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high';
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/pii/risk-score?text=${encodeURIComponent(text)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        handleError(response);
      }

      return await response.json();
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Process image for OCR
   */
  async processOCR(request: OCRRequest): Promise<OCRResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/ocr/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        handleError(response);
      }

      return await response.json();
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Detect text regions in image
   */
  async detectTextRegions(imageUrl: string): Promise<{ regions: BoundingBox[] }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/ocr/detect-regions?image_url=${encodeURIComponent(imageUrl)}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        handleError(response);
      }

      return await response.json();
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);

      if (!response.ok) {
        handleError(response);
      }

      return await response.json();
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Get API info
   */
  async getInfo(): Promise<{ name: string; version: string; documentation: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/`);

      if (!response.ok) {
        handleError(response);
      }

      return await response.json();
    } catch (error) {
      handleError(error);
    }
  },
};

export default apiClient;
