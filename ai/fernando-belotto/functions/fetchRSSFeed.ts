import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { RSSFeed, RSSItem } from "../types";
import { logToolUsage } from "./utils";

export async function fetchRSSFeed(feedUrl: string): Promise<RSSFeed> {
  logToolUsage("fetchRSSFeed", { feedUrl });
  console.time(`fetchRSSFeed(${feedUrl})`);

  try {
    const response = await axios.get(feedUrl);
    const xmlData = response.data;
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    const result = parser.parse(xmlData);
    const channel = result.rss?.channel || {};
    const rawItems = channel.item || [];

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
