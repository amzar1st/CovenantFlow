"use client";
import { useEffect, useState } from "react";
import { createClient, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";
import { GitBranch, ShieldCheck, Wallet, ArrowUpRight } from "lucide-react";
import { CONTRACT_ADDRESS } from "./project-config";

type Provider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
declare global { interface Window { ethereum?: Provider } }
type Data = Record<string, unknown>;
const chainExplorer = "https://explorer-studio-dev.genlayer.com";
const isAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);
const show = (v: unknown) => v == null ? "—" : String(v);
const defaultDate = () => {
  const date = new Date(Date.now() + 7 * 86400000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const timestamp = (s: string) => Math.floor(new Date(s).getTime() / 1000);
const reader = createClient({ chain: studioDevnet });
function object(value: unknown): Data {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Unexpected contract response. Check the deployment address.");
  return value as Data;
}

export default function Home() {
  const [address, setAddress] = useState(CONTRACT_ADDRESS);
  const [wallet, setWallet] = useState("");
  const [notice, setNotice] = useState("Public reads work without a wallet. Connect only to sign a write.");
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState("");
  const [agreementId, setAgreementId] = useState("");
  const [changeId, setChangeId] = useState("");
  const [agreement, setAgreement] = useState<Data | null>(null);
  const [change, setChange] = useState<Data | null>(null);
  const [counts, setCounts] = useState("");
  const [provider, setProvider] = useState("");
  const [title, setTitle] = useState("");
  const [terms, setTerms] = useState("");
  const [newTerms, setNewTerms] = useState("");
  const [reason, setReason] = useState("");
  const [acceptBy, setAcceptBy] = useState(defaultDate);
  const [expiresAt, setExpiresAt] = useState(defaultDate);
  useEffect(() => {
    if (CONTRACT_ADDRESS) return;
    const timer = window.setTimeout(() => setAddress(localStorage.getItem("covenantflow-address") || ""), 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function action(label: string, fn: () => Promise<void>) {
    setBusy(true); setNotice(label + "…");
    try { await fn(); } catch (err) { setNotice(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }
  async function read(name: string, args: (string | number)[] = []) {
    if (!isAddress(address)) throw Error("Enter a deployed CovenantFlow contract address.");
    return reader.readContract({ address: address as `0x${string}`, functionName: name, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
  }
  async function loadAgreement(id = agreementId) {
    if (!Number.isSafeInteger(Number(id)) || Number(id) < 1) throw Error("Enter a valid agreement ID.");
    const result = object(await read("get_agreement", [Number(id)]));
    setAgreementId(id); setAgreement(result);
    const pending = Number(result.pending_change || 0);
    if (pending) { setChangeId(String(pending)); setChange(object(await read("get_change", [pending]))); }
    else setChange(null);
    setNotice("Agreement #" + id + " loaded from finalized state.");
  }
  async function loadChange() {
    if (!Number.isSafeInteger(Number(changeId)) || Number(changeId) < 1) throw Error("Enter a valid change ID.");
    const record = object(await read("get_change", [Number(changeId)]));
    await loadAgreement(show(record.agreement_id));
    setChange(record);
    setNotice("Change #" + changeId + " loaded from finalized state.");
  }
  async function write(label: string, name: string, args: (string | number)[]) {
    await action(label, async () => {
      if (!isAddress(address)) throw Error("Enter the verified contract address.");
      if (!wallet || !window.ethereum) throw Error("Connect your wallet for write actions.");
      const client = createClient({ chain: studioDevnet, account: wallet as `0x${string}`, provider: window.ethereum });
      await client.connect("studioDevnet");
      const call = { address: address as `0x${string}`, functionName: name, args };
      setNotice("Estimating GenLayer fees…");
      const estimate = await client.estimateTransactionFeesForWrite(call);
      setNotice("Review this transaction in your wallet.");
      const hash = await client.writeContract({ ...call, fees: { distribution: estimate.distribution, feeValue: estimate.feeValue } });
      setTx(hash); setNotice("Submitted. Waiting for finalization…");
      const receipt = await client.waitForFinalization({ hash });
      if (!isSuccessful(receipt)) throw Error(`Transaction failed: ${receipt.statusName} / ${receipt.txExecutionResultName}`);
      setNotice(label + " finalized. Read the record to see its new state.");
      if (agreementId) await loadAgreement();
      if (changeId) setChange(object(await read("get_change", [Number(changeId)])));
    });
  }
  const buttons = (label: string, method: string, id: number) =>
    <button className="secondary" disabled={busy} onClick={() => write(label, method, [id])}>{label}</button>;
  return <main>
    <header><div className="brand"><span className="mark"><GitBranch size={20}/></span>CovenantFlow</div><div className="header-right"><span>STUDIO DEV · 61997</span><button className="wallet" disabled={busy} onClick={() => action("Connecting wallet", async () => {
      if (!window.ethereum) throw Error("No EIP-1193 browser wallet detected.");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      if (!accounts?.[0]) throw Error("No wallet account selected.");
      setWallet(accounts[0]); setNotice("Wallet connected: " + accounts[0]);
    })}><Wallet size={16}/>{wallet ? wallet.slice(0, 6) + "…" + wallet.slice(-4) : "Connect wallet"}</button></div></header>
    <div className="workspace">
      <aside><p className="eyebrow">AGREEMENT WORKSPACE</p><h1>Changes deserve<br/><em>clear consent.</em></h1><p className="intro">Record service terms, ask GenLayer validators to classify proposed changes, and activate a new version only when both parties approve.</p>
        <div className="steps"><div><b>01</b> Agree on starting terms</div><div><b>02</b> Propose a new version</div><div><b>03</b> Review and approve together</div></div>
        <div className="rail-note"><ShieldCheck size={22}/><span>AI classification is advisory. Neither party can change the terms alone.</span></div>
      </aside>
      <section className="content"><div className="heading"><div><p className="eyebrow">LIVE CONTRACT CONSOLE</p><h2>Manage an agreement</h2></div><span className="pill">{isAddress(address) ? "Address set" : "Deployment pending"}</span></div>
        <div className="notice" role="status">{notice}{tx && <a href={chainExplorer + "/tx/" + tx} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={14}/></a>}</div>
        <section className="panel"><h3><ShieldCheck size={20}/>Contract connection</h3><p>Reads come from finalized GenLayer state.</p><div className="inline"><input aria-label="Contract address" value={address} disabled={!!CONTRACT_ADDRESS} onChange={e => { setAddress(e.target.value.trim()); localStorage.setItem("covenantflow-address", e.target.value.trim()); setAgreement(null); setChange(null); }} placeholder="0x… deployed contract address"/>{isAddress(address) && <a href={chainExplorer + "/address/" + address} target="_blank" rel="noreferrer">Explorer ↗</a>}</div><div className="inline"><button className="secondary" disabled={busy || !isAddress(address)} onClick={() => action("Reading totals", async () => { const r = await read("get_counts") as unknown[]; if (!Array.isArray(r)) throw Error("Unexpected counts response"); setCounts(show(r[0]) + " agreements · " + show(r[1]) + " changes"); setNotice("Totals loaded from finalized state."); })}>Read totals</button><span>{counts}</span></div></section>
        <div className="section-label"><span>01 / CREATE</span><span>CLIENT ACTION</span></div>
        <section className="panel"><h3>Start an agreement</h3><p>The provider must accept before changes are allowed.</p><div className="two"><label>Provider wallet<input value={provider} onChange={e => setProvider(e.target.value)} placeholder="0x…"/></label><label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="Website design services"/></label></div><label>Full starting terms<textarea rows={4} value={terms} onChange={e => setTerms(e.target.value)} placeholder="Deliverables, deadlines and acceptance criteria…"/></label><div className="foot"><label>Acceptance deadline<input type="datetime-local" value={acceptBy} onChange={e => setAcceptBy(e.target.value)}/></label><button disabled={busy || !isAddress(address)} onClick={() => write("Create agreement", "create_agreement", [provider, title, terms, timestamp(acceptBy)])}>Create agreement</button></div></section>
        <div className="section-label"><span>02 / INSPECT</span><span>PUBLIC READ</span></div>
        <section className="panel"><h3>Find an agreement</h3><p>Anyone can inspect the active terms and pending proposal.</p><div className="inline lookup"><input type="number" min="1" aria-label="Agreement ID" placeholder="Agreement ID" value={agreementId} onChange={e => setAgreementId(e.target.value)}/><button className="secondary" disabled={busy || !isAddress(address)} onClick={() => action("Loading agreement", () => loadAgreement())}>Load</button></div>{agreement && <div className="record"><div className="record-title"><strong>{show(agreement.title)}</strong><span className="pill">{show(agreement.status)}</span></div><p>Version {show(agreement.version)} · Client {show(agreement.client)} · Provider {show(agreement.provider)}</p><div className="terms">{show(agreement.terms)}</div>{agreement.status === "AWAITING_ACCEPTANCE" && <div className="actions">{buttons("Accept terms", "accept_agreement", Number(agreementId))}{buttons("Expire agreement", "expire_agreement", Number(agreementId))}</div>}</div>}</section>
        <div className="section-label"><span>03 / REVISE</span><span>DUAL APPROVAL</span></div>
        <section className="panel"><h3>Propose a change</h3><p>Supply the complete replacement text for the agreement above.</p><label>Proposed full terms<textarea rows={4} value={newTerms} onChange={e => setNewTerms(e.target.value)} placeholder="Full replacement terms…"/></label><div className="two"><label>Reason<input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why this change is needed"/></label><label>Approval deadline<input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}/></label></div><button disabled={busy || agreement?.status !== "ACTIVE" || Number(agreement.pending_change) !== 0} onClick={() => write("Propose change", "propose_change", [Number(agreementId), newTerms, reason, timestamp(expiresAt)])}>Propose change</button><div className="inline lookup change-lookup"><input type="number" min="1" aria-label="Change ID" placeholder="Change ID" value={changeId} onChange={e => setChangeId(e.target.value)}/><button className="secondary" disabled={busy || !isAddress(address)} onClick={() => action("Loading change", loadChange)}>Load change</button></div>{change && <div className="record"><div className="record-title"><strong>Change #{changeId}</strong><span className="pill">{show(change.status)}</span></div><p>Validator classification: <b>{show(change.classification)}</b> · Deadline: {new Date(Number(change.expires_at) * 1000).toLocaleString()}</p><div className="terms">{show(change.proposed_terms)}</div><p>Client: {change.client_approved ? "Approved" : "Awaiting"} · Provider: {change.provider_approved ? "Approved" : "Awaiting"}</p>{(change.status === "PROPOSED" || change.status === "ASSESSED") && <div className="actions">{change.status === "PROPOSED" && buttons("Ask validators", "assess_change", Number(changeId))}{change.status === "ASSESSED" && buttons("Approve", "approve_change", Number(changeId))}{buttons("Reject", "reject_change", Number(changeId))}{buttons("Expire", "expire_change", Number(changeId))}</div>}</div>}</section>
        <footer>Records consent and an advisory scope classification. CovenantFlow does not transfer funds or replace a legal agreement.</footer>
      </section>
    </div>
  </main>;
}
