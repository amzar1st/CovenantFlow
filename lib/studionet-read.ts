import { abi, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

// Studio's v0.2.16 contract ABI calls the method field `method`.
// The newer genlayer-js contract helper sends an empty-string key for v0.3.
const client = createClient({ chain: studionet });

function plain(value: unknown): unknown {
  if (typeof value === "bigint") {
    const number = Number(value);
    if (!Number.isSafeInteger(number)) throw Error("Contract integer exceeds safe range.");
    return number;
  }
  if (value instanceof Map) return Object.fromEntries([...value].map(([key, item]) => [key, plain(item)]));
  if (Array.isArray(value)) return value.map(plain);
  return value;
}

export async function readStudionetContract(address: `0x${string}`, method: string, args: number[] = []) {
  const calldata = abi.calldata.encode({ method, ...(args.length ? { args } : {}) });
  const data = abi.transactions.serialize([calldata, false]);
  const response = await client.request({
    method: "gen_call",
    params: [{
      type: "read", to: address,
      from: "0x0000000000000000000000000000000000000000",
      data, transaction_hash_variant: "latest-final",
    }],
  });
  const hex = typeof response === "string" ? response : (response as { data: string }).data;
  if (typeof hex !== "string" || !/^(0x)?[0-9a-fA-F]*$/.test(hex)) throw Error("Unexpected Studionet response.");
  const raw = hex.replace(/^0x/, "");
  const bytes = Uint8Array.from(raw.match(/.{2}/g) ?? [], pair => parseInt(pair, 16));
  return plain(abi.calldata.decode(bytes));
}
