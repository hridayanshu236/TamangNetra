export type Lang = 'EN' | 'NP' | 'TM';
export type ContentType = 'text' | 'pdf' | 'image' | 'csv' | 'youtube';

export interface JobRequest {
  contentType: ContentType;
  encryptedPayload: string;
  iv: string;
  salt: string;
  filename?: string;
  options?: {
    validate?: boolean;
    targetLangs?: Lang[];
  };
}

export interface RiskZone {
  start: number;
  end: number;
  severity: 'high' | 'medium' | 'low';
  score: number;
}

export interface JobResult {
  originalText: string;
  translations: Record<Lang, string>;
  backTranslated?: string;
  driftScore?: number;
  riskZones: RiskZone[];
  glossary: Record<string, string[]>;
  piiMapping: Record<string, string>;
  fileUrl?: string;
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: JobResult;
  error?: string;
}