export interface DocumentationSearchParams {
  section: string;
  query: string;
}

export interface FormattedResult {
  title: string;
  content: string;
  url: string;
  relevance: "high" | "medium" | "low";
  date?: string;
}

export interface SearchResult {
  section: string;
  query: string;
  results: FormattedResult[];
  timestamp: string;
  message?: string;
}

export type { RSSFeed, RSSItem } from "./types/index";
