// Reexportar as funções principais para manter compatibilidade com código existente
import { fetchRSSFeed, searchFernandoBelottoSite } from "./functions";

import type {
  DocumentationSearchParams,
  FormattedResult,
  SearchResult,
  RSSFeed,
  RSSItem,
} from "./types";

export { fetchRSSFeed, searchFernandoBelottoSite };

export type {
  DocumentationSearchParams,
  FormattedResult,
  SearchResult,
  RSSFeed,
  RSSItem,
};
