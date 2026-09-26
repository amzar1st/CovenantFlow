# Studio Dev verification

Use **Normal (Full Consensus)** on chain 61997. Do not use Leader Only as proof of validator agreement. Record source hash and transaction IDs directly from Studio or Explorer; never infer them.

1. Deploy `contracts/CovenantFlow.py` with its no-argument constructor. Wait for a successful final receipt. Read `get_counts()` from finalized state; expected `(0, 0)`.
2. With Studio account A, create an agreement naming a distinct Studio account B, valid full terms, and a future acceptance deadline. Record ID and finalized result.
3. Confirm a third account cannot accept. With B, accept. Read `get_agreement(id)`; status should be ACTIVE, version 1, and terms unchanged.
4. With either party, propose full replacement terms that alter deliverables or deadline. Confirm a second pending change cannot be proposed.
5. Call `assess_change` in Full Consensus. Inspect actual validator decision and `get_change(id)` classification. A malformed or disputed model output must not activate terms.
6. With A, approve the assessed change. Read that original terms/version remain. With B, approve. Read version 2, exact replacement terms, ACTIVATED status, and cleared pending ID.
7. For another proposal, test rejection by a party and verify original active terms stay. For expiry, set a short future deadline, wait until it passes, call permissionless `expire_change`, and verify no activation.
8. Open the public site without a wallet and read the same finalized IDs. For write UI, connect only by explicit click; check fee estimate, wallet prompt, finalization, and the resulting read.

The front end does not display seeded records. If Studio, the wallet, or the RPC blocks any step, report the last verified stage instead of claiming full completion.

## Run completed on 25 September 2026

Steps 1, 2, 4, 5, 6, and the public read portion of step 8 completed against the corrected deployment in `README.md`. Two distinct Studio sandbox accounts signed: client `0x4457e26C20Ac7BEB20E5531a87Be0051E9992a9C` and provider `0x84Ab367d2b2Dfa7F72466f16B4bf0cD9d8397BE4`. After the first approval, finalized state still showed version 1 and original terms. After the second, finalized state showed version 2, the proposed terms, and an `ACTIVATED` change. Steps 3's unauthorized-account check, 4's competing-proposal check, 7, and the wallet extension write portion of step 8 remain unverified live. The deterministic tests cover those state rules locally.
