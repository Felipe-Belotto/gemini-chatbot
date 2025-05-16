import { RSSFeed, RSSItem, FormattedResult } from "../types";
import { rssFeedURLs } from "../constants";
import { fetchRSSFeed } from "./fetchRSSFeed";
import * as cheerio from "cheerio";

// Interface para o cache de conteúdo
interface ContentCache {
  items: Map<string, RSSItem>;
  lastUpdate: Date;
  isUpdating: boolean;
}

// Cache global para cada seção
const sectionCaches: Record<string, ContentCache> = {};

// Tempo de expiração do cache (30 minutos)
const CACHE_EXPIRATION = 30 * 60 * 1000;

/**
 * Inicializa o cache para uma seção específica
 */
function initializeCache(section: string): ContentCache {
  if (!sectionCaches[section]) {
    sectionCaches[section] = {
      items: new Map(),
      lastUpdate: new Date(0),
      isUpdating: false,
    };
  }
  return sectionCaches[section];
}

/**
 * Verifica se o cache precisa ser atualizado
 */
function needsUpdate(cache: ContentCache): boolean {
  const now = new Date();
  return now.getTime() - cache.lastUpdate.getTime() > CACHE_EXPIRATION;
}

/**
 * Atualiza o cache para uma seção específica
 */
async function updateCache(section: string): Promise<void> {
  const cache = initializeCache(section);

  // Evita múltiplas atualizações simultâneas
  if (cache.isUpdating) {
    return;
  }

  try {
    cache.isUpdating = true;
    console.log(`🔄 Atualizando cache para seção: ${section}`);

    const feedUrl = rssFeedURLs[section];
    if (!feedUrl) {
      console.log(`❌ URL do feed RSS não encontrada para seção: ${section}`);
      return;
    }

    const feed = await fetchRSSFeed(feedUrl);

    // Limpa o cache atual
    cache.items.clear();

    // Adiciona os novos itens ao cache
    feed.items.forEach((item) => {
      if (item.guid) {
        cache.items.set(item.guid, item);
      }
    });

    cache.lastUpdate = new Date();
    console.log(
      `✅ Cache atualizado para seção: ${section}, ${cache.items.size} itens`
    );
  } catch (error) {
    console.error(`❌ Erro ao atualizar cache para seção ${section}:`, error);
  } finally {
    cache.isUpdating = false;
  }
}

/**
 * Busca conteúdo no cache
 */
export async function searchInCache(
  section: string,
  query: string
): Promise<FormattedResult[]> {
  const cache = initializeCache(section);

  // Atualiza o cache se necessário
  if (needsUpdate(cache)) {
    await updateCache(section);
  }

  // Se o cache estiver vazio, tenta atualizar
  if (cache.items.size === 0) {
    await updateCache(section);
  }

  // Converte a query para minúsculas para busca case-insensitive
  const queryLower = query.toLowerCase();

  // Divide a query em palavras-chave
  const keywords = queryLower.split(/\s+/).filter((word) => word.length > 3);

  // Busca itens relevantes
  const results: FormattedResult[] = [];

  for (const item of cache.items.values()) {
    // Verifica correspondência exata
    const titleMatch = item.title.toLowerCase().includes(queryLower);
    const descMatch = item.description.toLowerCase().includes(queryLower);
    const categoryMatch =
      item.category &&
      item.category.some((cat) => cat.toLowerCase().includes(queryLower));

    // Se houver correspondência exata
    if (titleMatch || descMatch || categoryMatch) {
      const tempDiv = cheerio.load(`<div>${item.description}</div>`)("div");
      const cleanDescription = tempDiv.text().trim();

      results.push({
        title: item.title,
        content: cleanDescription || item.description,
        url: item.link,
        relevance: "high",
        date: item.pubDate,
      });
      continue;
    }

    // Verifica correspondência parcial com palavras-chave
    if (keywords.length > 0) {
      const hasKeywordMatch = keywords.some(
        (keyword) =>
          item.title.toLowerCase().includes(keyword) ||
          item.description.toLowerCase().includes(keyword) ||
          (item.category &&
            item.category.some((cat) => cat.toLowerCase().includes(keyword)))
      );

      if (hasKeywordMatch) {
        const tempDiv = cheerio.load(`<div>${item.description}</div>`)("div");
        const cleanDescription = tempDiv.text().trim();

        results.push({
          title: item.title,
          content: cleanDescription || item.description,
          url: item.link,
          relevance: "medium",
          date: item.pubDate,
        });
      }
    }
  }

  // Ordena resultados por relevância
  return results.sort((a, b) => {
    if (a.relevance === "high" && b.relevance !== "high") return -1;
    if (a.relevance !== "high" && b.relevance === "high") return 1;
    return 0;
  });
}

/**
 * Pré-carrega o cache para todas as seções disponíveis
 */
export async function preloadCaches(): Promise<void> {
  const sections = Object.keys(rssFeedURLs);
  console.log(`🔄 Pré-carregando caches para ${sections.length} seções`);

  await Promise.all(sections.map((section) => updateCache(section)));

  console.log("✅ Caches pré-carregados com sucesso");
}

/**
 * Obtém estatísticas do cache
 */
export function getCacheStats(): Record<
  string,
  { items: number; lastUpdate: string }
> {
  const stats: Record<string, { items: number; lastUpdate: string }> = {};

  for (const [section, cache] of Object.entries(sectionCaches)) {
    stats[section] = {
      items: cache.items.size,
      lastUpdate: cache.lastUpdate.toISOString(),
    };
  }

  return stats;
}
