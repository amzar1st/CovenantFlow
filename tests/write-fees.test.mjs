import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateWriteFees } from "../lib/write-fees.ts";

const call = { address: "0x5C2d13D536D279381E7ACE5B7093199336bA7DB8", functionName: "create_agreement", args: [] };
const simulationError = (message) => ({ cause: { data: { receipt: { genvm_result: { stderr: `AssertionError: ${message}\n` } } } } });

test("uses call-specific simulation when available", async () => {
  const client = {
    estimateTransactionFeesForWrite: async () => ({ feeValue: 3n }),
    estimateTransactionFees: async () => { throw Error("unexpected fallback"); },
  };
  const result = await estimateWriteFees(client, call);
  assert.equal(result.fallback, false);
  assert.equal(result.estimate.feeValue, 3n);
});

test("uses policy estimate for Studio's exact deadline simulation failure", async () => {
  const client = {
    estimateTransactionFeesForWrite: async () => { throw simulationError("Invalid acceptance deadline"); },
    estimateTransactionFees: async () => ({ feeValue: 5n }),
  };
  const result = await estimateWriteFees(client, call);
  assert.equal(result.fallback, true);
  assert.equal(result.estimate.feeValue, 5n);
});

test("does not bypass other simulation failures", async () => {
  const failure = simulationError("Only provider may accept");
  const client = {
    estimateTransactionFeesForWrite: async () => { throw failure; },
    estimateTransactionFees: async () => { throw Error("unexpected fallback"); },
  };
  await assert.rejects(estimateWriteFees(client, call), error => error === failure);
  await assert.rejects(estimateWriteFees(client, { ...call, functionName: "approve_change" }), error => error === failure);
});
