export interface PageSafetySignals {
  hostname: string;
  title: string;
  metaDescription: string;
  headings: string[];
  visibleText: string;
  hasPasswordField: boolean;
  formCount: number;
  externalLinkCount: number;
  downloadLinkCount: number;
  suspiciousDownloadExtensions: string[];
  loginTerms: string[];
  paymentTerms: string[];
}
