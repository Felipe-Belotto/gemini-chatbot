// Interfaces para parâmetros
export interface DocumentationSearchParams {
  section: string;
  query: string;
}

export interface ScrapingParams {
  url: string;
  selector?: string;
}

export interface ContentExtractionParams {
  section: string;
  query: string;
  contentType: "article" | "tool" | "news";
}

// Interfaces para resultados
export interface FormattedResult {
  title: string;
  content: string;
  url: string;
  relevance: string;
  date?: string;
}

export interface SearchResult {
  section: string;
  query: string;
  results: FormattedResult[];
  timestamp: string;
  message?: string;
  error?: string;
}

export interface ScrapedContent {
  url: string;
  title?: string;
  content?: string;
  date?: string;
  links?: Array<{ text: string; url: string }>;
  articles?: Array<{
    title: string;
    url: string;
    excerpt: string;
    date?: string;
  }>;
  timestamp?: string;
  error?: string;
}

// Interfaces para RSS
export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category?: string[];
  author?: string;
  guid?: string;
}

export interface RSSFeed {
  items: RSSItem[];
  feedUrl: string;
  title: string;
  link: string;
  description: string;
  language?: string;
  lastBuildDate?: string;
}
