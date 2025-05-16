import { Message } from "ai";

/**
 * Previne vazamento de dados verificando e limpando padrões de JSON nas respostas
 */
export function preventDataLeakage(message: string): string {
  // Padrões para detectar estruturas JSON ou outros dados técnicos
  const patterns = [
    // JSON completo: { "chave": "valor" }
    /\{\s*"[^"]+"\s*:\s*("[^"]*"|[0-9]+|true|false|\[.*\]|\{.*\})\s*(,\s*"[^"]+"\s*:\s*("[^"]*"|[0-9]+|true|false|\[.*\]|\{.*\}))*\s*\}/g,

    // Array JSON: ["valor1", "valor2"]
    /\[\s*("[^"]*"|[0-9]+|true|false|\{.*\})(,\s*("[^"]*"|[0-9]+|true|false|\{.*\}))*\s*\]/g,

    // Remover apenas padrões de JSON, não mensagens específicas
  ];

  // Aplicar cada padrão para remover dados técnicos
  let cleanedMessage = message;
  patterns.forEach((pattern) => {
    cleanedMessage = cleanedMessage.replace(pattern, "[Dados processados]");
  });

  return cleanedMessage;
}

/**
 * Detecta e remove duplicações de parágrafos na mesma resposta
 */
export function removeDuplicateContent(message: string): string {
  // Se a mensagem for muito pequena, não há necessidade de verificar duplicações
  if (message.length < 100) return message;

  // Dividir em parágrafos
  const paragraphs = message.split(/\n\n+/);

  // Array para guardar parágrafos únicos
  const uniqueParagraphs: string[] = [];
  const seenContent = new Set<string>();

  // Verificar cada parágrafo
  for (const paragraph of paragraphs) {
    // Normalizar o texto para comparação
    const normalized = paragraph.trim().toLowerCase();

    // Ignorar parágrafos muito curtos
    if (normalized.length < 15) {
      uniqueParagraphs.push(paragraph);
      continue;
    }

    // Calcular uma "assinatura" simplificada do conteúdo
    // (usando primeiras palavras para detectar parágrafos que começam iguais)
    const firstWords = normalized.split(" ").slice(0, 5).join(" ");

    // Verificar se já vimos um parágrafo similar
    if (!seenContent.has(firstWords)) {
      uniqueParagraphs.push(paragraph);
      seenContent.add(firstWords);
    }
  }

  return uniqueParagraphs.join("\n\n");
}

/**
 * Limita o tamanho máximo de uma resposta
 */
export function limitResponseLength(message: string, maxChars = 2000): string {
  if (message.length <= maxChars) return message;

  // Encontrar um ponto final próximo ao limite para cortar de forma mais natural
  const cutPoint = message.lastIndexOf(".", maxChars);
  if (cutPoint > maxChars * 0.75) {
    return message.substring(0, cutPoint + 1);
  }

  // Se não achar um ponto final adequado, corta no limite exato
  return message.substring(0, maxChars) + "...";
}

/**
 * Aprimorar a concisão da resposta
 */
export function enhanceConciseness(message: string): string {
  // Remover frases introdutórias comuns
  const introPatterns = [
    /^(Olá!|Oi!|Bem-vindo!|Bem-vindo ao assistente|Claro!|Com certeza!|Sem problema!|Entendi!|Entendi sua pergunta|Vou responder sua pergunta|Vamos lá|Aqui está|Aqui vai|Para responder sua pergunta|Deixe-me responder|Aqui está a resposta|Aqui está o que encontrei|Encontrei algumas informações|Encontrei o seguinte|De acordo com o site Fernando Belotto)[,\s]*/i,
    /^(Eu|Eu vou|Vou|Posso)[,\s]+(?:te|lhe|o|a)[,\s]+(?:ajudar|auxiliar|informar|dizer|explicar|mostrar|apresentar)[,\s]+(?:sobre|com|a respeito de)[,\s]+/i,
    /^Bem-vindo ao assistente do site Fernando Belotto[.,!]?\s*/i,
    /^Estou aqui para ajudá-lo[.,!]?\s*/i,
    /^Sou especializado no conteúdo do site Fernando Belotto[.,!]?\s*/i,
  ];

  let conciseMessage = message;

  // Aplicar cada padrão para remover introduções desnecessárias
  introPatterns.forEach((pattern) => {
    conciseMessage = conciseMessage.replace(pattern, "");
  });

  // Remover frases de conclusão comuns
  const outroPatterns = [
    /\s*(Espero ter ajudado!|Espero ter respondido sua pergunta|Se precisar de mais alguma coisa|Se tiver mais dúvidas|Posso ajudar com mais alguma coisa|Estou à disposição|Fico à disposição|Estou aqui para ajudar|Qualquer dúvida|Qualquer outra dúvida|Caso precise de mais informações)[^.]*\.?$/i,
    /\s*Não hesite em perguntar se tiver mais alguma dúvida[.,!]?\s*$/i,
    /\s*Estou à disposição para mais esclarecimentos[.,!]?\s*$/i,
  ];

  outroPatterns.forEach((pattern) => {
    conciseMessage = conciseMessage.replace(pattern, "");
  });

  // Remover repetições de frases muito similares
  const sentences = conciseMessage.split(/(?<=[.!?])\s+/);
  const uniqueSentences: string[] = [];
  const seenSentenceStarts = new Set<string>();

  for (const sentence of sentences) {
    // Ignorar frases muito curtas
    if (sentence.trim().length < 10) {
      uniqueSentences.push(sentence);
      continue;
    }

    // Extrair as primeiras palavras para comparação
    const words = sentence.trim().toLowerCase().split(/\s+/);
    const sentenceStart = words.slice(0, 4).join(" ");

    // Se não encontrarmos um início similar, adicionar à lista
    if (!seenSentenceStarts.has(sentenceStart)) {
      uniqueSentences.push(sentence);
      seenSentenceStarts.add(sentenceStart);
    }
  }

  return uniqueSentences.join(" ").trim();
}

/**
 * Middleware para aplicar nas mensagens antes de enviar ao usuário
 */
export function applySecurityMiddleware(messages: Message[]): Message[] {
  return messages.map((msg) => {
    if (msg.role === "assistant") {
      // Aplicar todas as transformações em sequência
      let processedContent = preventDataLeakage(msg.content);
      processedContent = removeDuplicateContent(processedContent);
      processedContent = enhanceConciseness(processedContent);
      processedContent = limitResponseLength(processedContent, 2500);

      return {
        ...msg,
        content: processedContent,
      };
    }
    return msg;
  });
}

/**
 * Classe auxiliar para manter estado entre chunks e interceptar padrões que podem se dividir entre chunks
 */
export class JsonPatternDetector {
  private buffer = "";
  private patterns = [
    // Detectar apenas objetos JSON estruturados com propriedades
    /\{\s*"[a-zA-Z0-9_]+"\s*:\s*("[^"]*"|[0-9]+|true|false|\{.*\}|\[.*\])\s*(,\s*"[a-zA-Z0-9_]+"\s*:\s*("[^"]*"|[0-9]+|true|false|\{.*\}|\[.*\]))*\s*\}/g,

    // Detectar apenas arrays que contenham objetos JSON
    /\[\s*\{\s*"[a-zA-Z0-9_]+"\s*:.*?\}\s*(,\s*\{.*?\})*\s*\]/g,
  ];

  public processChunk(chunk: string): string {
    // Adicionar o novo chunk ao buffer
    this.buffer += chunk;

    // Verificar padrões
    let processed = this.buffer;
    this.patterns.forEach((pattern) => {
      processed = processed.replace(pattern, "[Conteúdo processado]");
    });

    // Se o buffer ficar muito grande, liberar parte dele
    if (this.buffer.length > 10000) {
      const keep = 1000; // Manter apenas os últimos N caracteres
      this.buffer = this.buffer.substring(this.buffer.length - keep);
    }

    return processed;
  }
}

/**
 * Cria uma transform stream para filtrar dados em tempo real
 */
export function createSecurityTransform() {
  const detector = new JsonPatternDetector();

  return new TransformStream({
    transform(chunk, controller) {
      let stringChunk = new TextDecoder().decode(chunk);

      // Aplicar apenas a detecção de padrões JSON, não modificar o conteúdo legítimo
      stringChunk = detector.processChunk(stringChunk);

      // Não aplicar enhanceConciseness no streaming para evitar remoção de conteúdo importante
      controller.enqueue(new TextEncoder().encode(stringChunk));
    },
  });
}
