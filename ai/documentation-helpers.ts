// ai/documentation-helpers.ts

import axios from "axios";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";

// Parameter type interfaces
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

// Formatted results interface
export interface FormattedResult {
  title: string;
  content: string;
  url: string;
  relevance: string;
  date?: string;
}

// Search results interface
export interface SearchResult {
  section: string;
  query: string;
  results: FormattedResult[];
  timestamp: string;
  message?: string;
  error?: string;
}

// Scraping results interface
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

// RSS interfaces
export interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  category?: string[];
  author?: string;
  guid?: string;
  [key: string]: any;
}

export interface RSSFeed {
  items: RSSItem[];
  feedUrl: string;
  title?: string;
  description?: string;
  language?: string;
  lastBuildDate?: string;
}

// Fernando Belotto site sections
const siteURLs: Record<string, string> = {
  blog: "https://fernandobelotto.com/blog",
  tools: "https://fernandobelotto.com/tools",
  news: "https://fernandobelotto.com/news",
  home: "https://fernandobelotto.com",
};

// RSS feed URLs
const rssFeedURLs: Record<string, string> = {
  blog: "https://fernandobelotto.com/api/rss/blog/pt-BR",
  news: "https://fernandobelotto.com/api/rss/news/pt-BR",
};

/**
 * Function to log tool usage for tracking when the model uses external data
 */
function logToolUsage(toolName: string, params: Record<string, any>) {
  console.log(`\n🔍 FERRAMENTA USADA: ${toolName}`);
  console.log(`📝 Parâmetros: ${JSON.stringify(params, null, 2)}`);
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log("--------------------------------------------------");
}

/**
 * Function to fetch and parse RSS feed
 */
export async function fetchRSSFeed(feedUrl: string): Promise<RSSFeed> {
  logToolUsage("fetchRSSFeed", { feedUrl });
  console.time(`fetchRSSFeed(${feedUrl})`);

  try {
    const response = await axios.get(feedUrl);
    const xmlData = response.data;

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    const result = parser.parse(xmlData);

    // Extract channel info
    const channel = result.rss?.channel || {};
    const rawItems = channel.item || [];

    // Normalize items to a standard format
    const items: RSSItem[] = Array.isArray(rawItems)
      ? rawItems.map((item) => ({
          title: item.title || "",
          link: item.link || "",
          description: item.description || "",
          pubDate: item.pubDate || "",
          category: Array.isArray(item.category)
            ? item.category
            : item.category
            ? [item.category]
            : [],
          author: item.author || item["dc:creator"] || "",
          guid: item.guid?.["#text"] || item.guid || "",
        }))
      : [];

    console.log(
      `✅ Feed RSS carregado: ${feedUrl}, ${items.length} itens encontrados`
    );
    console.timeEnd(`fetchRSSFeed(${feedUrl})`);

    return {
      items,
      feedUrl,
      title: channel.title || "",
      description: channel.description || "",
      language: channel.language || "",
      lastBuildDate: channel.lastBuildDate || "",
    };
  } catch (error) {
    console.error(`❌ Erro ao carregar feed RSS: ${feedUrl}`, error);
    console.timeEnd(`fetchRSSFeed(${feedUrl})`);
    throw error;
  }
}

/**
 * Function to search content on Fernando Belotto's site with RSS support
 */
export async function searchFernandoBelottoSite({
  section,
  query,
}: DocumentationSearchParams): Promise<SearchResult> {
  // Log when this function is used by the AI
  logToolUsage("searchFernandoBelottoSite", { section, query });
  console.time(`searchFernandoBelottoSite(${section}, "${query}")`);

  try {
    // Normalize section and determine if we can use RSS
    const normalizedSection = section.toLowerCase();
    const canUseRSS =
      normalizedSection === "blog" || normalizedSection === "news";

    let formattedResults: FormattedResult[] = [];

    // Use RSS feed if available for this section
    if (canUseRSS && rssFeedURLs[normalizedSection]) {
      console.log(`📡 Usando feed RSS para seção ${normalizedSection}`);
      const rssFeed = await fetchRSSFeed(rssFeedURLs[normalizedSection]);

      if (rssFeed.items.length > 0) {
        console.log(`📚 Encontrados ${rssFeed.items.length} itens no feed RSS`);

        // Filter items by query
        const relevantItems = rssFeed.items.filter(
          (item) =>
            item.title.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase()) ||
            (item.category &&
              item.category.some((cat) =>
                cat.toLowerCase().includes(query.toLowerCase())
              ))
        );

        console.log(
          `🔍 ${relevantItems.length} itens relevantes para "${query}"`
        );

        // Format relevant items
        formattedResults = relevantItems.map((item) => {
          // Clean description from HTML tags for better readability
          const tempDiv = cheerio.load(`<div>${item.description}</div>`)("div");
          const cleanDescription = tempDiv.text().trim();

          return {
            title: item.title,
            content: cleanDescription || item.description,
            url: item.link,
            relevance: "high",
            date: item.pubDate,
          };
        });

        // If no direct matches found, but we have items, check for partial matches
        if (formattedResults.length === 0 && rssFeed.items.length > 0) {
          console.log(`🔄 Buscando correspondências parciais para "${query}"`);

          // Split query into keywords and search for each
          const keywords = query
            .toLowerCase()
            .split(/\s+/)
            .filter((word) => word.length > 3);

          if (keywords.length > 0) {
            const partialMatches = rssFeed.items.filter((item) =>
              keywords.some(
                (keyword) =>
                  item.title.toLowerCase().includes(keyword) ||
                  item.description.toLowerCase().includes(keyword)
              )
            );

            console.log(
              `🔍 ${partialMatches.length} correspondências parciais encontradas`
            );

            formattedResults = partialMatches.map((item) => {
              const tempDiv = cheerio.load(`<div>${item.description}</div>`)(
                "div"
              );
              const cleanDescription = tempDiv.text().trim();

              return {
                title: item.title,
                content: cleanDescription || item.description,
                url: item.link,
                relevance: "medium", // Lower relevance for partial matches
                date: item.pubDate,
              };
            });
          }
        }
      }
    }

    // If RSS didn't yield results or section doesn't support RSS, fall back to web scraping
    if (formattedResults.length === 0) {
      console.log(`🌐 Usando scraping da web para seção: ${section}`);

      // Get base URL for the specified section
      const sectionKey = Object.keys(siteURLs).find((key) =>
        section.toLowerCase().includes(key)
      );
      const baseUrl = sectionKey ? siteURLs[sectionKey] : siteURLs.home;

      console.log(`🌐 Buscando em: ${baseUrl}`);

      // Scrape the section page
      const scrapedContent = await scrapeWebPage({ url: baseUrl });

      if (!scrapedContent?.content && !scrapedContent?.articles?.length) {
        console.log(`❌ Nenhum conteúdo encontrado em: ${baseUrl}`);
        console.timeEnd(`searchFernandoBelottoSite(${section}, "${query}")`);
        return {
          section,
          query,
          results: [],
          timestamp: new Date().toISOString(),
          message: "Não foi possível encontrar conteúdo nesta seção do site.",
        };
      }

      console.log(`✅ Conteúdo encontrado. Buscando por: "${query}"`);

      // If we have articles list
      if (scrapedContent.articles && scrapedContent.articles.length > 0) {
        console.log(`📚 Encontrados ${scrapedContent.articles.length} artigos`);

        // Filter articles by query
        const relevantArticles = scrapedContent.articles.filter(
          (article) =>
            article.title.toLowerCase().includes(query.toLowerCase()) ||
            article.excerpt.toLowerCase().includes(query.toLowerCase())
        );

        console.log(
          `🔍 ${relevantArticles.length} artigos relevantes para "${query}"`
        );

        // Format relevant articles
        formattedResults = relevantArticles.map((article) => ({
          title: article.title,
          content: article.excerpt,
          url: article.url,
          relevance: "high",
          date: article.date,
        }));

        // If no relevant articles found through filtering, check if we need to visit individual pages
        if (
          formattedResults.length === 0 &&
          scrapedContent.articles.length > 0
        ) {
          console.log(
            `🔄 Nenhum artigo relevante encontrado no índice. Verificando páginas individuais...`
          );

          // Check a reasonable number of articles (limit to 5 to avoid too many requests)
          const articlesToCheck = scrapedContent.articles.slice(0, 5);

          for (const article of articlesToCheck) {
            console.log(`📄 Verificando artigo: ${article.title}`);
            const articleContent = await scrapeWebPage({ url: article.url });

            if (
              articleContent?.content &&
              articleContent.content.toLowerCase().includes(query.toLowerCase())
            ) {
              console.log(
                `✅ Conteúdo relevante encontrado em: ${article.title}`
              );

              // Extract a snippet around the query
              const contentLower = articleContent.content.toLowerCase();
              const queryLower = query.toLowerCase();
              const queryIndex = contentLower.indexOf(queryLower);

              let snippet = "";
              if (queryIndex !== -1) {
                // Extract up to 200 characters around the query
                const startIndex = Math.max(0, queryIndex - 100);
                const endIndex = Math.min(
                  contentLower.length,
                  queryIndex + queryLower.length + 100
                );
                snippet = articleContent.content.substring(
                  startIndex,
                  endIndex
                );

                // Add ellipsis if needed
                if (startIndex > 0) snippet = "..." + snippet;
                if (endIndex < contentLower.length) snippet = snippet + "...";
              } else {
                // Fallback: just use beginning of the content
                snippet = articleContent.content.substring(0, 200) + "...";
              }

              formattedResults.push({
                title: article.title,
                content: snippet,
                url: article.url,
                relevance: "high",
                date: articleContent.date || article.date,
              });
            }
          }
        }
      } else if (scrapedContent.content) {
        // Search in page content
        if (
          scrapedContent.content.toLowerCase().includes(query.toLowerCase())
        ) {
          console.log(`✅ Conteúdo relevante encontrado na página principal`);

          formattedResults.push({
            title: scrapedContent.title || baseUrl,
            content: scrapedContent.content.substring(0, 300) + "...",
            url: baseUrl,
            relevance: "medium",
          });
        }

        // Check links if no direct content match
        if (
          formattedResults.length === 0 &&
          scrapedContent.links &&
          scrapedContent.links.length > 0
        ) {
          console.log(`🔍 Verificando links na página...`);

          const relevantLinks = scrapedContent.links.filter(
            (link) =>
              link.text.toLowerCase().includes(query.toLowerCase()) &&
              link.url.startsWith("https://fernandobelotto.com")
          );

          for (const link of relevantLinks.slice(0, 3)) {
            console.log(
              `🔗 Link relevante encontrado: ${link.text} (${link.url})`
            );

            formattedResults.push({
              title: link.text,
              content: `Link relevante encontrado na página ${section}: ${link.text}`,
              url: link.url,
              relevance: "medium",
            });
          }
        }
      }
    }

    console.log(`📊 Resultados encontrados: ${formattedResults.length}`);
    console.timeEnd(`searchFernandoBelottoSite(${section}, "${query}")`);

    return {
      section,
      query,
      results: formattedResults,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Erro ao buscar no site:", error);
    console.timeEnd(`searchFernandoBelottoSite(${section}, "${query}")`);
    return {
      section,
      query,
      results: [],
      timestamp: new Date().toISOString(),
      message: "Erro ao buscar informações no site.",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Function to scrape a web page from Fernando Belotto's site
 */
export async function scrapeWebPage({
  url,
  selector,
}: ScrapingParams): Promise<ScrapedContent> {
  // Log when this function is used
  logToolUsage("scrapeWebPage", { url, selector });
  console.time(`scrapeWebPage(${url})`);

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    console.log(`✅ Página carregada: ${url}`);

    let content = "";
    let articles: Array<{
      title: string;
      url: string;
      excerpt: string;
      date?: string;
    }> = [];

    // If a specific selector is provided, use it
    if (selector) {
      content = $(selector).text();
    } else {
      // Check if this is an article listing page (blog, tools, news)
      const articleElements = $("article, .post, .blog-post, .card, .article");

      if (articleElements.length > 0) {
        console.log(
          `📚 Encontrados ${articleElements.length} elementos de artigo`
        );

        articleElements.each((_, element) => {
          // Find title
          const titleElement = $(element).find(
            "h1, h2, h3, .title, .post-title"
          );
          const title = titleElement.text().trim();

          // Find link
          let articleUrl = "";
          const linkElement = titleElement.find("a") || $(element).find("a");
          if (linkElement.length > 0) {
            const href = linkElement.attr("href");
            if (href) {
              // Handle relative URLs
              articleUrl = href.startsWith("http")
                ? href
                : new URL(href, url).href;
            }
          }

          // Find excerpt/summary
          const excerptElement = $(element).find(
            "p, .excerpt, .summary, .content"
          );
          const excerpt = excerptElement.text().trim();

          // Find date if available
          const dateElement = $(element).find(
            ".date, time, .published, .post-date"
          );
          let date = dateElement.text().trim();

          // Only add if we have title and URL
          if (title && articleUrl) {
            articles.push({
              title,
              url: articleUrl,
              excerpt: excerpt || "Sem descrição disponível",
              date: date || undefined,
            });
          }
        });
      } else {
        // This appears to be a single article/page
        // Extract main content
        const mainContent = $(
          "main, article, .content, .post-content, .entry-content"
        );

        if (mainContent.length > 0) {
          content = mainContent.text().trim();
        } else {
          // Fallback: get body content but remove header and footer
          content = $("body")
            .clone()
            .find("header, footer, nav, aside, .sidebar, .menu, .navigation")
            .remove()
            .end()
            .text()
            .trim();
        }

        // Try to find publication date
        const dateElement = $(".date, time, .published, .post-date");
        const date = dateElement.text().trim();

        console.log(`📝 Conteúdo extraído: ${content.length} caracteres`);

        if (date) {
          console.log(`📅 Data encontrada: ${date}`);
        }
      }
    }

    // Extract all links from the page
    const links: Array<{ text: string; url: string }> = [];
    $("a").each((_, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim();

      if (
        href &&
        text &&
        !href.startsWith("#") &&
        !href.includes("javascript:")
      ) {
        try {
          // Convert relative links to absolute
          const absoluteHref = href.startsWith("http")
            ? href
            : new URL(href, url).href;
          links.push({ text, url: absoluteHref });
        } catch (error) {
          // Ignore invalid URLs
          console.warn(`⚠️ URL inválida: ${href}`);
        }
      }
    });

    console.timeEnd(`scrapeWebPage(${url})`);

    return {
      url,
      title: $("title").text().trim(),
      content: content.length > 0 ? content : undefined,
      links: links.slice(0, 20), // Limit to avoid overload
      articles: articles.length > 0 ? articles : undefined,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Erro ao fazer scraping da página ${url}:`, error);
    console.timeEnd(`scrapeWebPage(${url})`);
    return {
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Function to get related content from Fernando Belotto's site
 */
export async function getRelatedContent({
  section,
  query,
  contentType,
}: ContentExtractionParams): Promise<{
  query: string;
  section: string;
  relatedContent: Array<{ title: string; url: string; excerpt?: string }>;
  message?: string;
  error?: string;
}> {
  // Log when this function is used
  logToolUsage("getRelatedContent", { section, query, contentType });

  try {
    // First search for the main query
    const searchResults = await searchFernandoBelottoSite({
      section,
      query,
    });

    if (!searchResults.results?.length) {
      return {
        query,
        section,
        relatedContent: [],
        message: "Nenhum conteúdo relacionado encontrado.",
      };
    }

    // Check if we can use RSS for this section
    const normalizedSection = section.toLowerCase();
    const canUseRSS =
      (normalizedSection === "blog" || normalizedSection === "news") &&
      rssFeedURLs[normalizedSection];

    let relatedContent: Array<{
      title: string;
      url: string;
      excerpt?: string;
    }> = [];

    if (canUseRSS) {
      console.log(
        `📡 Usando RSS para encontrar conteúdo relacionado em ${normalizedSection}`
      );

      const rssFeed = await fetchRSSFeed(rssFeedURLs[normalizedSection]);

      if (rssFeed.items.length > 0) {
        // Get URLs from original search to exclude them
        const originalUrls = new Set(searchResults.results.map((r) => r.url));

        // Get categories from original results to find related content
        const categories = new Set<string>();
        const originalItems = rssFeed.items.filter((item) =>
          searchResults.results.some((result) => result.url === item.link)
        );

        originalItems.forEach((item) => {
          if (item.category) {
            item.category.forEach((cat) => categories.add(cat.toLowerCase()));
          }
        });

        console.log(
          `🏷️ Categorias encontradas: ${Array.from(categories).join(", ")}`
        );

        // Find related items by category
        const relatedItems = rssFeed.items
          .filter(
            (item) =>
              !originalUrls.has(item.link) && // Not in original results
              item.category &&
              item.category.some((cat) => categories.has(cat.toLowerCase()))
          )
          .slice(0, 5);

        console.log(`📚 Encontrados ${relatedItems.length} itens relacionados`);

        // If no related items by category, get most recent items
        if (relatedItems.length === 0) {
          console.log(
            `🔄 Nenhum item relacionado por categoria, usando itens recentes`
          );

          const recentItems = rssFeed.items
            .filter((item) => !originalUrls.has(item.link))
            .slice(0, 5);

          relatedContent = recentItems.map((item) => {
            // Clean description from HTML tags
            const tempDiv = cheerio.load(`<div>${item.description}</div>`)(
              "div"
            );
            const cleanDescription = tempDiv.text().trim();

            return {
              title: item.title,
              url: item.link,
              excerpt: cleanDescription || "Sem descrição disponível",
            };
          });
        } else {
          relatedContent = relatedItems.map((item) => {
            // Clean description from HTML tags
            const tempDiv = cheerio.load(`<div>${item.description}</div>`)(
              "div"
            );
            const cleanDescription = tempDiv.text().trim();

            return {
              title: item.title,
              url: item.link,
              excerpt: cleanDescription || "Sem descrição disponível",
            };
          });
        }
      }
    }

    // Fallback to web scraping if RSS didn't yield results
    if (relatedContent.length === 0) {
      console.log(`🌐 Usando scraping para encontrar conteúdo relacionado`);

      // Now look for related content in the same section
      const sectionKey = Object.keys(siteURLs).find((key) =>
        section.toLowerCase().includes(key)
      );
      const sectionUrl = sectionKey ? siteURLs[sectionKey] : siteURLs.home;

      // Scrape the section page to find more content
      const sectionContent = await scrapeWebPage({ url: sectionUrl });

      if (!sectionContent?.articles?.length) {
        // Just return the original search results as related content
        return {
          query,
          section,
          relatedContent: searchResults.results.map((result) => ({
            title: result.title,
            url: result.url,
            excerpt: result.content,
          })),
        };
      }

      // Filter out the exact matches from the original search to focus on "related" content
      const originalUrls = new Set(searchResults.results.map((r) => r.url));
      const relatedArticles = sectionContent.articles
        .filter((article) => !originalUrls.has(article.url))
        .slice(0, 5); // Limit to 5 related articles

      relatedContent = relatedArticles;
    }

    return {
      query,
      section,
      relatedContent,
    };
  } catch (error) {
    console.error("❌ Erro ao buscar conteúdo relacionado:", error);
    return {
      query,
      section,
      relatedContent: [],
      message: "Erro ao buscar conteúdo relacionado.",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
