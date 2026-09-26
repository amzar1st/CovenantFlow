# Studionet verification

Use [GenLayer Studio](https://studio.genlayer.com/contracts) with its built-in accounts on chain 61999. Select **Normal (Full Consensus)** for validator assessment. Deploy `contracts/CovenantFlowStudionet.py` with its no-argument constructor and wait for `FINALIZED` before reading `get_counts()`.

1. With account A, create an agreement naming distinct account B and a future acceptance deadline. B accepts it.
2. Either party proposes complete replacement terms and a future approval deadline. Assess the proposal through Full Consensus. Inspect the classification.
3. The proposer approves. Check that finalized agreement terms and version are unchanged. The other party approves; check version increments, replacement terms activate, and pending change clears.
4. Read the same agreement and change in the [public viewer](https://covenantflow.amzar1st96.chatgpt.site) without connecting a wallet.
5. Optional further coverage: unauthorized acceptance, competing proposal, rejection, and permissionless expiry.

## Completed on 26 September 2026

The deploy, create, accept, propose, assess, two approvals, and finalized reads all completed. See transaction links and account addresses in `README.md`. The first approval retained version 1 and original terms; the second produced version 2 and `ACTIVATED` history. The optional negative and expiry cases were not exercised live. The viewer's direct Studionet read returned counts `[1, 1]` and the finalized records; its site deployment is tracked separately.
