import type { createClient } from "genlayer-js";

type Client = ReturnType<typeof createClient>;
type WriteCall = Parameters<Client["estimateTransactionFeesForWrite"]>[0];

export function isStudioDeadlineSimulationError(error: unknown, functionName: string): boolean {
  const expected = functionName === "create_agreement" ? "Invalid acceptance deadline"
    : functionName === "propose_change" ? "Invalid change deadline" : null;
  if (!expected || !error || typeof error !== "object") return false;
  const stderr = (error as {
    cause?: { data?: { receipt?: { genvm_result?: { stderr?: unknown } } } };
  }).cause?.data?.receipt?.genvm_result?.stderr;
  return typeof stderr === "string" && stderr.includes(`AssertionError: ${expected}`);
}

export async function estimateWriteFees(client: Client, call: WriteCall) {
  try {
    return { estimate: await client.estimateTransactionFeesForWrite(call), fallback: false };
  } catch (error) {
    if (!isStudioDeadlineSimulationError(error, call.functionName)) throw error;
    return { estimate: await client.estimateTransactionFees(), fallback: true };
  }
}
