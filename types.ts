
export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  GUEST = 'GUEST'
}

export enum PlanType {
  FREE = 'FREE',
  PRO = 'PRO'
}

export interface HighlightedSegment {
  text: string;
  score: number; // 0-1 (normalized likelihood)
}

export interface QualityIssue {
  original: string;
  suggestion: string;
  reason: string;
  type: 'grammar' | 'spelling' | 'style' | 'bug' | 'efficiency' | 'citation' | 'plagiarism';
}

export interface GradeReport {
  primaryGrade: string; // e.g. "A-", "8/10"
  breakdown: { label: string; score: number }[];
  summary: string;
}

export interface AnalysisResult {
  id: string;
  timestamp: string;
  overallScore: number; // 0-100 (AI Score)
  confidenceRange: number;
  statisticalScore: number;
  structuralScore: number;
  geminiScore: number;
  explanation: string;
  highlights: HighlightedSegment[];
  aiWords: string[];
  isCode: boolean;
  qualityIssues: QualityIssue[];
  grade: GradeReport;
}

export interface UserSession {
  role: UserRole;
  plan: PlanType;
  email: string;
  id: string;
  displayName?: string;
  organization?: string;
  authSource: 'email' | 'google';
  avatarUrl?: string;
}
