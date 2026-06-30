// Shared types — mirrors the server types needed on the frontend.
// originalText is NEVER present in these types (architectural guarantee).

export type PIICategory =
  | "PERSON_NAME"
  | "EMAIL"
  | "PHONE"
  | "ADDRESS"
  | "SSN_OR_GOVT_ID"
  | "DATE_OF_BIRTH"
  | "FINANCIAL_ACCOUNT"
  | "ORG"
  | "IP_ADDRESS"
  | "MEDICAL_INFO"
  | "OTHER";

export const PII_CATEGORY_LABELS: Record<PIICategory, string> = {
  PERSON_NAME: "Person Name",
  EMAIL: "Email Address",
  PHONE: "Phone Number",
  ADDRESS: "Physical Address",
  SSN_OR_GOVT_ID: "Government ID",
  DATE_OF_BIRTH: "Date of Birth",
  FINANCIAL_ACCOUNT: "Financial Account",
  ORG: "Organization",
  IP_ADDRESS: "IP Address",
  MEDICAL_INFO: "Medical Information",
  OTHER: "Other",
};

export const PII_CATEGORY_ICONS: Record<PIICategory, string> = {
  PERSON_NAME: "User",
  EMAIL: "Mail",
  PHONE: "Phone",
  ADDRESS: "MapPin",
  SSN_OR_GOVT_ID: "ShieldAlert",
  DATE_OF_BIRTH: "Calendar",
  FINANCIAL_ACCOUNT: "CreditCard",
  ORG: "Building2",
  IP_ADDRESS: "Globe",
  MEDICAL_INFO: "Heart",
  OTHER: "HelpCircle",
};

export interface PIISpan {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  type: PIICategory;
  confidence: number | null;
  decision: "redacted" | "kept";
  isBorderline: boolean;
  reasoning: {
    summary: string;
    signals: string[];
    ruleBased: boolean;
    detectorNote: string;
    threshold: number;
    possibleRisk: string;
  };
  occurrenceGroup: string;
  status: "pending" | "accepted" | "rejected" | "modified";
  history: ActionLogEntry[];
}

export interface ConsistencyFlag {
  occurrenceGroup: string;
  issue: string;
  spanIds: string[];
}

export interface ActionLogEntry {
  timestamp: string;
  action: "accepted" | "rejected" | "modified" | "undone" | "applied_to_all";
  spanId: string;
}

export interface DocumentMeta {
  totalSpans: number;
  redactedCount: number;
  keptCount: number;
  borderlineCount: number;
  riskScore: number;
}

export interface TextSegment {
  text: string;
  spanId: string | null;
}

export interface ConfidenceBucket {
  range: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ConfidenceDistribution {
  buckets: ConfidenceBucket[];
  mean: number;
  median: number;
  stdDev: number;
  nullCount: number;
}

export interface PIIDocumentResponse {
  documentId: string;
  title: string;
  redactedText: string;
  spans: PIISpan[];
  segments: TextSegment[];
  confidenceAnalysis: ConfidenceDistribution;
  consistencyFlags: ConsistencyFlag[];
  meta: DocumentMeta;
  analyzedAt: string;
}

export interface AskWhyResponse {
  answer: string;
  generatedAt: string;
  source: "mock" | "live";
  tokensUsed?: {
    input: number;
    output: number;
  };
  groundingUsed: string[];
}

export interface SampleDocumentInfo {
  id: string;
  title: string;
  description: string;
  spanCount: number;
}

