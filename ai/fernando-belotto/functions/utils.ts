/**
 * Registra o uso de ferramentas para rastreamento
 */
export function logToolUsage(
  toolName: string,
  params: Record<string, any>
): void {
  console.log(`\n🔍 FERRAMENTA USADA: ${toolName}`);
  console.log(`📝 Parâmetros: ${JSON.stringify(params, null, 2)}`);
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log("--------------------------------------------------");
}
