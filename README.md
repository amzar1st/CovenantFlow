# CovenantFlow

CovenantFlow records two-party service agreements and change orders on GenLayer Studionet (chain 61999). A client creates the terms, the named provider accepts, and either can propose full replacement terms. Validators classify the change as MATERIAL, MINOR, or UNCLEAR. Their classification is advisory: **both named parties must approve the proposed version before the active terms change**.

No funds or bonds are held. This is an audit and consent workflow, not legal advice or automated contract enforcement.

## Use it

- [Public record viewer](https://covenantflow.amzar1st96.chatgpt.site): inspect finalized agreements and changes without a wallet. Agreement 1 and change 1 are nonbinding sandbox examples.
- [GenLayer Studio](https://studio.genlayer.com/contracts): load `contracts/CovenantFlowStudionet.py`, use Studio's built-in accounts to sign writes, and select **Normal (Full Consensus)** for validator assessment. The verified deployment address is below. No external wallet connection is needed for this workflow.
- [Explorer](https://explorer-studio.genlayer.com/address/0x1979f47F975A5Cd8df60bB82C20Fd999A934466B): inspect the deployed contract and transactions.

The method sequence is `create_agreement`, `accept_agreement`, `propose_change`, `assess_change`, then `approve_change` from each party. `reject_change`, `expire_change`, and `expire_agreement` handle other outcomes. `get_counts`, `get_agreement`, and `get_change` expose public state. One pending change per agreement prevents competing replacements.

## Verified Studionet deployment

Contract: [`0x1979f47F975A5Cd8df60bB82C20Fd999A934466B`](https://explorer-studio.genlayer.com/address/0x1979f47F975A5Cd8df60bB82C20Fd999A934466B). Studio ran in **Normal (Full Consensus)** with two distinct built-in accounts, client `0x0a9dFfc076bE51AAdfBA36317cb02D55a13EA8e5` and provider `0x3D4f4ffECAcEabC522a797A4502FAd89FEc8dD49`. Each transaction reached `FINALIZED`:

| Step | Transaction |
| --- | --- |
| Deploy | [0x48a4…4fd](https://explorer-studio.genlayer.com/tx/0x48a43aed11de6eb299731ebcdefe437774896533688b0adb8984274573d144fd) |
| Create agreement 1 | [0x9699…134](https://explorer-studio.genlayer.com/tx/0x96991866c174ecee2d641fce5b4e32994a52aaf783bbca51b343e057ca495134) |
| Provider accepts | [0x4981…d9](https://explorer-studio.genlayer.com/tx/0x4981543fdefd4894d546b1a254e9bb4d42c8837a53e4dd26614ad4a411d8b0d9) |
| Provider proposes change 1 | [0xca46…cfb](https://explorer-studio.genlayer.com/tx/0xca46c24219415d4dbb6938223955d9f310abf0f666bc1d372de82b40ff99ccfb) |
| Validators assess | [0xea08…6da](https://explorer-studio.genlayer.com/tx/0xea08a3346f64a5ed182fa14060d16636ccf801099204a9f901fdf33d038826da) |
| Provider approves | [0x8384…472](https://explorer-studio.genlayer.com/tx/0x838401c11b9790ee87f41117aa21c68d203be6e91dfa8224089f4255bec3b472) |
| Client approves | [0x29f1…ff3](https://explorer-studio.genlayer.com/tx/0x29f1dff3652abb0c0646d67b3c455c0a3acf152d13e5e5abb69351d9f80a8ff3) |

Finalized reads showed `MATERIAL`, original terms and version 1 after the first approval, then the exact replacement terms, version 2, and `ACTIVATED` with both approval flags true after the second. The public viewer's compatible RPC reader returned counts `[1, 1]` and those same finalized records. The sample terms explicitly state `TEST ONLY, NON-BINDING`.

## Source and checks

- `contracts/CovenantFlowStudionet.py` is the deployed v0.2.16 contract. Studio's older runtime uses `gl.eq_principle.strict_eq` for consensus and JSON records in `TreeMap` storage.
- `contracts/CovenantFlow.py` preserves the original v0.3 Studio Dev implementation and its historical tests. It is not the Studionet deployment.
- `lib/studionet-read.ts` encodes the v0.2 `method` call field and reads `latest-final` state. The current `genlayer-js@2.0.0-rc.1` contract helper encodes v0.3's empty-string method field, so the viewer uses the SDK's lower-level calldata and RPC functions.
- The public site is a read-only viewer. Studio's built-in accounts were used for all live writes and consensus testing; browser wallet signing is not part of this Studionet run.

Run `python3 -m py_compile contracts/CovenantFlowStudionet.py`, `python3 -m pytest tests -q`, `pnpm install --frozen-lockfile`, `pnpm exec tsc --noEmit`, and `pnpm build` for local checks. The existing Python suite covers the historical v0.3 implementation; the v0.2 version was exercised on the live Studionet workflow above.
