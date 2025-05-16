# Fernando Belotto AI Assistant

Este módulo contém as funções e tipos necessários para o assistente de IA do site Fernando Belotto.

## Estrutura de Arquivos

```
ai/fernando-belotto/
├── functions/
│   ├── contentCache.ts # Sistema de cache para RSS feeds
│   ├── fetchRSSFeed.ts # Função para buscar feeds RSS
│   ├── searchSite.ts # Função para buscar no site
│   └── utils.ts # Funções utilitárias
├── types.ts # Tipos e interfaces
├── constants.ts # Constantes e configurações
└── helpers.ts # Reexportações e helpers
```

## Funções Principais

- `fetchRSSFeed`: Busca e parseia feeds RSS.
- `searchSite`: Busca conteúdo no site usando o cache do RSS.
- `contentCache`: Gerencia o cache de conteúdo do RSS.

## Tipos

- `DocumentationSearchParams`: Parâmetros para busca
- `FormattedResult`: Resultado formatado da busca
- `SearchResult`: Resultado completo da busca
- `RSSItem`: Item do feed RSS
- `RSSFeed`: Feed RSS completo

## Uso

```typescript
import { searchFernandoBelottoSite } from "@/ai/fernando-belotto";

// Buscar conteúdo
const results = await searchFernandoBelottoSite({
  section: "blog",
  query: "react",
});
```

## Migração

Este módulo substitui o arquivo `documentation-helpers.ts` original, mantendo completa compatibilidade com o código existente através do arquivo `helpers.ts`.

## Benefícios da Refatoração

1. **Manutenibilidade**: Cada função está em seu próprio arquivo, facilitando manutenção
2. **Testabilidade**: Funções isoladas são mais fáceis de testar
3. **Modularidade**: Permite importar apenas o necessário
4. **Organização**: Estrutura clara com separação de responsabilidades

## Tratamento de Dados Sensíveis

O assistente Fernando Belotto implementa várias camadas de proteção para evitar o vazamento de dados sensíveis:

1. **Sanitização de Respostas de Ferramentas**: Todas as respostas das ferramentas são sanitizadas antes de serem processadas pelo modelo de linguagem.

2. **Middleware de Segurança**: Um middleware especial intercepta as respostas e remove conteúdo que parece ser dados brutos como JSON.

3. **Filtragem em Tempo Real**: O streaming de respostas é processado em tempo real para remover potenciais dados técnicos.

4. **Instruções de Sistema**: O modelo recebe instruções claras para NUNCA exibir dados brutos, JSON ou conteúdo técnico.

### Tipos de Dados Protegidos

- Objetos e arrays JSON
- Mensagens de logs
- Parâmetros técnicos (query, section, timestamp)
- Resultados brutos das ferramentas de busca
- Metadados técnicos

### Como Reportar Problemas

Se você notar que o assistente está expondo dados técnicos ou brutos nas respostas, por favor reporte imediatamente para que possamos melhorar nossos filtros de segurança.
