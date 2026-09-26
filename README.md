# CovenantFlow

CovenantFlow records two-party service agreements and change orders on GenLayer Studio Dev. A client creates the original terms; the named provider accepts. Either party can propose complete replacement terms. GenLayer validators independently classify the difference as MATERIAL, MINOR, or UNCLEAR. The classification is advisory: **the current terms change only after both named parties approve the exact proposed version**.

No funds or bonds are held. This is an audit and consent workflow, not legal advice or automated contract enforcement.

## Workflow

1. Connect an EIP-1193 browser wallet to Studio Dev (chain ID 61997) for writes; public reads need no wallet.
2. Client calls `create_agreement(provider, title, terms, accept_by)`.
3. Provider calls `accept_agreement(id)` before the deadline.
4. Either party calls `propose_change(id, proposed_terms, reason, expires_at)`.
5. Call `assess_change(change_id)` in Full Consensus. The leader and each validator independently classify the fixed original and proposed text. The category must match exactly; disagreement cannot silently change terms.
6. Both parties separately call `approve_change(change_id)` before expiry. Only the second approval activates the new terms and increments the version.
7. Either party may `reject_change`, or anyone may `expire_change` after its deadline; original terms remain active.

All agreement and change records are publicly readable using `get_agreement`, `get_change`, and `get_counts`. One pending change per agreement avoids competing replacements. The provider acceptance deadline has a permissionless expiry route.

## Project structure

- `contracts/CovenantFlow.py`: GenLayer Intelligent Contract for Studio Dev's v0.3 Python SDK.
- `app/page.tsx`: browser application with explicit wallet connection, fee estimation, writes, and `LATEST_FINAL` reads.
- `tests/`: state-machine tests executing the real contract source against a small deterministic GenLayer stand-in. These **do not** establish GenVM execution or validator consensus.
- `STUDIO_TEST_PLAN.md`: live deployment and two-account verification checklist.
- `public/favicon.svg`: CovenantFlow mark.

## Local checks

```bash
python3 -m pip install pytest
python3 -m pytest tests -q
pnpm install --frozen-lockfile
pnpm lint
pnpm build
```

The frontend pins `genlayer-js@2.0.0-rc.1` and the `studioDevnet` chain definition. Fee estimates are obtained for the specific write before it is submitted. This is a development path; a measured fee profile should replace per-click simulation before production use.

## Verified Studio Dev deployment

The deployed contract is [0x5C2d13D536D279381E7ACE5B7093199336bA7DB8](https://explorer-studio-dev.genlayer.com/address/0x5C2d13D536D279381E7ACE5B7093199336bA7DB8) on chain 61997. Studio ran in **Normal (Full Consensus)** mode. The following transaction IDs reached `FINALIZED`; finalized reads confirmed their effects:

| Step | Transaction |
| --- | --- |
| Deploy | [0x8cc0…1cbf7](https://explorer-studio-dev.genlayer.com/tx/0x8cc023a6f0e9b8ad1a5fd63e410659ccabb694c445588dce85bf9e7dd601cbf7) |
| Create agreement #1 | [0xf75c…c4e28](https://explorer-studio-dev.genlayer.com/tx/0xf75cf4e5c5766a9fab220791e4a7d65568683c4d37a9cc203f5fb5a86a6c4e28) |
| Provider accepts | [0x0637…78746](https://explorer-studio-dev.genlayer.com/tx/0x0637a12c0f98a547878d4046a1d69453571738f033223eba082ca07e66b78746) |
| Client proposes change #1 | [0xc3f9…61cf1](https://explorer-studio-dev.genlayer.com/tx/0xc3f993ebcbdc1856f58d8607f6abef4f2c465e024e7a869f0cbe005a90261cf1) |
| Validators assess | [0xacca…baee6](https://explorer-studio-dev.genlayer.com/tx/0xaccaa5a394e732b6abe3a97ef2dc036469bd37d8028cdb52096d7634c6ebaee6) |
| Client approves | [0x9027…af08b](https://explorer-studio-dev.genlayer.com/tx/0x9027ded0b9d9c30e314f333d2e773d79edf836eb86a830c6fa14879eceaaf08b) |
| Provider approves | [0x2681…ed87](https://explorer-studio-dev.genlayer.com/tx/0x26815e577e1074f0555b9f9e9c8f822407cae7f8c4f0e2fe78043dd00600ed87) |

Finalized public reads showed `MATERIAL` classification, version 1 and original terms after the client's approval alone, then version 2 with the exact replacement text and `ACTIVATED` history after the provider's approval. The independent Python tests cover rejection and expiry paths; those paths were not exercised live. The browser wallet write path was not tested with an injected extension; Studio sandbox accounts were used for writes. The site's public read path was tested against this address.

The first deployment (`0x021C4f48418A252DfFd1738F523Cf245a1573fcF`) is superseded. Its assessment call failed because that draft used `gl.vm.run_nondet_unsafe`, which Studio Dev's v0.3 VM did not expose. The corrected source uses `gl.vm.run_nondet`, and its assessment succeeded on the address above.
