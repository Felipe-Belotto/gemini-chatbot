import {
  DocumentationSearchParams,
  FormattedResult,
  SearchResult,
} from "../types";
import { rssFeedURLs } from "../constants";
import { logToolUsage } from "./utils";
import { searchInCache, preloadCaches } from "./contentCache";

// Pré-carrega os caches quando o módulo é carregado
preloadCaches().catch((error) => {
  console.error("❌ Erro ao pré-carregar caches:", error);
});

export async function searchFernandoBelottoSite({
  section,
  query,
}: DocumentationSearchParams): Promise<SearchResult> {
  logToolUsage("searchFernandoBelottoSite", { section, query });
  console.time(`searchFernandoBelottoSite(${section}, "${query}")`);

  try {
    const normalizedSection = section.toLowerCase();
    const canUseRSS =
      normalizedSection === "blog" || normalizedSection === "news";
    let formattedResults: FormattedResult[] = [];

    if (canUseRSS && rssFeedURLs[normalizedSection]) {
      console.log(`📡 Usando cache para seção ${normalizedSection}`);

      // Busca no cache
      formattedResults = await searchInCache(normalizedSection, query);

      console.log(
        `🔍 ${formattedResults.length} resultados encontrados no cache`
      );
    }

    console.timeEnd(`searchFernandoBelottoSite(${section}, "${query}")`);

    return {
      section,
      query,
      results: formattedResults,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Erro na busca:", error);
    console.timeEnd(`searchFernandoBelottoSite(${section}, "${query}")`);
    return {
      section,
      query,
      results: [],
      timestamp: new Date().toISOString(),
      message: "Ocorreu um erro ao buscar informações.",
    };
  }
}
