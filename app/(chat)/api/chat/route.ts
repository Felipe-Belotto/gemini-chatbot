// app/api/chat/route.ts

import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import {
  searchFernandoBelottoSite,
  preloadCaches,
} from "@/ai/fernando-belotto";
import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";
import { generateUUID } from "@/lib/utils";

// Pré-carrega os caches quando o servidor inicia
preloadCaches().catch((error) => {
  console.error("❌ Erro ao pré-carregar caches:", error);
});

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages).filter(
    (message) => message.content.length > 0
  );

  const result = await streamText({
    model: geminiProModel,
    system: `\n
    - Você é um assistente de IA especializado no site Fernando Belotto (fernandobelotto.com).
    - IMPORTANTE: Você NÃO tem acesso direto à internet. Você DEVE utilizar APENAS as ferramentas fornecidas (searchSite) para obter informações.
    - Ao receber uma pergunta, SEMPRE use primeiro a ferramenta searchSite para buscar informações relevantes.
    - SEMPRE responda em português do Brasil, mesmo que o usuário escreva em outro idioma.
    - Sempre cite suas fontes com o link completo para o artigo ou página específica.
    - Para perguntas sobre tecnologias específicas como React, Next.js, JavaScript, etc., busque explicitamente por esses termos usando a ferramenta searchSite.
    - Se a primeira busca não retornar resultados satisfatórios, tente reformular a consulta usando sinônimos ou termos relacionados.
    
    - SEJA EXTREMAMENTE CONCISO E DIRETO EM SUAS RESPOSTAS. 
    - EVITE REPETIÇÕES E REDUNDÂNCIAS.
    - NÃO REPITA AS MESMAS INFORMAÇÕES DUAS VEZES.
    - PREFIRA PARÁGRAFOS CURTOS E OBJETIVOS.
    - PREFIRA LISTAS E MARCADORES QUANDO APROPRIADO PARA AUMENTAR A LEGIBILIDADE.
    - RESPONDA APENAS O QUE FOI PERGUNTADO, SEM ADICIONAR INFORMAÇÕES DESNECESSÁRIAS.
    
    - Quando fornecer conteúdo do site, cite no formato: "Fonte: [título do artigo]([URL])".
    - Seja específico ao explicar onde a informação foi encontrada no site (ex: "Encontrei esta informação no Blog", ou "De acordo com o artigo na seção Tools").
    - Se o usuário perguntar sobre um tópico que não está no site Fernando Belotto, explique que você é especializado apenas no conteúdo deste site.
    - Mantenha as respostas concisas, mas completas, focando no conteúdo do site Fernando Belotto.
    - A data de hoje é ${new Date().toLocaleDateString()}.
    - Para exemplos de código encontrados no site, formate-os adequadamente com destaque de sintaxe.
    - Sempre sugira outros artigos relacionados do site que possam interessar ao usuário.
    - Se não encontrar informações sobre a consulta no site, seja honesto e sugira outros tópicos que estão disponíveis no site.
  `,
    messages: coreMessages,
    tools: {
      searchSite: {
        description: "Search for information in the Fernando Belotto website",
        parameters: z.object({
          section: z
            .string()
            .describe(
              "The section of the site to search (blog, tools, news, or leave empty for general search)"
            ),
          query: z.string().describe("The specific information being sought"),
        }),
        execute: async ({ section, query }) => {
          try {
            const searchResults = await searchFernandoBelottoSite({
              section: section || "home",
              query,
            });
            return searchResults;
          } catch (error) {
            console.error("Error in searchSite tool:", error);
            return {
              section,
              query,
              results: [],
              timestamp: new Date().toISOString(),
              message: "Ocorreu um erro ao buscar informações.",
            };
          }
        },
      },
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          const allMessages = [...coreMessages, ...responseMessages];
          await saveChat({
            id,
            messages: allMessages,
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return new Response(result.toAIStream(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
