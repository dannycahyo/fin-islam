export type DocumentCategory =
  | 'principles'
  | 'products'
  | 'compliance'
  | 'comparison'
  | 'calculation'
  | 'general';

export type DocumentStatus = 'processing' | 'indexed' | 'failed';

export type FileType = 'pdf' | 'docx' | 'txt' | 'md';
