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

export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid?: string;
  category?: string[];
}

export interface RSSFeed {
  title: string;
  link: string;
  description: string;
  items: RSSItem[];
}
