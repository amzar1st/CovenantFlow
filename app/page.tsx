"use client";
import { useState } from "react";
import { GitBranch, ShieldCheck, ArrowUpRight } from "lucide-react";
import { CONTRACT_ADDRESS } from "./project-config";
import { readStudionetContract } from "../lib/studionet-read";

type Data = Record<string, unknown>;
const explorer = "https://explorer-studio.genlayer.com";
const show = (value: unknown) => value == null ? "—" : String(value);
function record(value: unknown): Data {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Unexpected contract response.");
  return value as Data;
}

export default function Home() {
  const [notice, setNotice] = useState("Read finalized Studionet records without connecting a wallet.");
  const [busy, setBusy] = useState(false);
  const [agreementId, setAgreementId] = useState("");
  const [changeId, setChangeId] = useState("");
  const [agreement, setAgreement] = useState<Data | null>(null);
  const [change, setChange] = useState<Data | null>(null);
  const [counts, setCounts] = useState("");
  async function action(label: string, fn: () => Promise<void>) {
    setBusy(true); setNotice(label + "…");
    try { await fn(); } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  function validId(id: string) {
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) throw Error("Enter a valid record ID.");
    return Number(id);
  }
  async function loadAgreement(id = agreementId) {
    const result = record(await readStudionetContract(CONTRACT_ADDRESS, "get_agreement", [validId(id)]));
    setAgreementId(id); setAgreement(result);
    const pending = Number(result.pending_change || 0);
    if (pending) { setChangeId(String(pending)); setChange(record(await readStudionetContract(CONTRACT_ADDRESS, "get_change", [pending]))); }
    else setChange(null);
    setNotice("Agreement #" + id + " loaded from finalized state.");
  }
  async function loadChange() {
    const result = record(await readStudionetContract(CONTRACT_ADDRESS, "get_change", [validId(changeId)]));
    await loadAgreement(show(result.agreement_id));
    setChange(result);
    setNotice("Change #" + changeId + " loaded from finalized state.");
  }
  return <main>
    <header><div className="brand"><span className="mark"><GitBranch size={20}/></span>CovenantFlow</div><div className="header-right"><span>STUDIONET · 61999</span><a className="wallet" href="https://studio.genlayer.com/contracts" target="_blank" rel="noreferrer">Open Studio <ArrowUpRight size={15}/></a></div></header>
    <div className="workspace">
      <aside><p className="eyebrow">AGREEMENT WORKSPACE</p><h1>Changes deserve<br/><em>clear consent.</em></h1><p className="intro">Record service terms, ask GenLayer validators to classify proposed changes, and activate a new version only when both parties approve.</p>
        <div className="steps"><div><b>01</b> Agree on starting terms</div><div><b>02</b> Propose a new version</div><div><b>03</b> Review and approve together</div></div>
        <div className="rail-note"><ShieldCheck size={22}/><span>AI classification is advisory. Neither party can change the terms alone.</span></div>
      </aside>
      <section className="content"><div className="heading"><div><p className="eyebrow">LIVE CONTRACT CONSOLE</p><h2>Inspect agreements</h2></div><span className="pill">Finalized state</span></div>
        <div className="notice" role="status">{notice}</div>
        <section className="panel"><h3><ShieldCheck size={20}/>Studionet deployment</h3><p>Use Studio&apos;s built-in accounts to create and approve agreements. This page reads the resulting public records.</p><div className="inline"><input aria-label="Contract address" readOnly value={CONTRACT_ADDRESS}/><a href={explorer + "/address/" + CONTRACT_ADDRESS} target="_blank" rel="noreferrer">Explorer ↗</a></div><div className="inline"><button className="secondary" disabled={busy} onClick={() => action("Reading totals", async () => { const result = await readStudionetContract(CONTRACT_ADDRESS, "get_counts"); if (!Array.isArray(result)) throw Error("Unexpected counts response."); setCounts(show(result[0]) + " agreements · " + show(result[1]) + " changes"); setNotice("Totals loaded from finalized state."); })}>Read totals</button><span>{counts}</span></div></section>
        <div className="section-label"><span>01 / AGREEMENTS</span><span>PUBLIC READ</span></div>
        <section className="panel"><h3>Find an agreement</h3><p>Anyone can inspect the active terms and pending proposal. Try agreement ID 1 to see the completed sandbox run.</p><div className="inline lookup"><input type="number" min="1" aria-label="Agreement ID" placeholder="Agreement ID" value={agreementId} onChange={event => setAgreementId(event.target.value)}/><button className="secondary" disabled={busy} onClick={() => action("Loading agreement", () => loadAgreement())}>Load</button></div>{agreement && <div className="record"><div className="record-title"><strong>{show(agreement.title)}</strong><span className="pill">{show(agreement.status)}</span></div><p>Version {show(agreement.version)} · Client {show(agreement.client)} · Provider {show(agreement.provider)}</p><div className="terms">{show(agreement.terms)}</div><p>Pending change: {Number(agreement.pending_change) || "none"}</p></div>}</section>
        <div className="section-label"><span>02 / CHANGE HISTORY</span><span>DUAL APPROVAL</span></div>
        <section className="panel"><h3>Find a change</h3><p>Try change ID 1 to inspect its validator classification and both approvals.</p><div className="inline lookup change-lookup"><input type="number" min="1" aria-label="Change ID" placeholder="Change ID" value={changeId} onChange={event => setChangeId(event.target.value)}/><button className="secondary" disabled={busy} onClick={() => action("Loading change", loadChange)}>Load change</button></div>{change && <div className="record"><div className="record-title"><strong>Change #{changeId}</strong><span className="pill">{show(change.status)}</span></div><p>Validator classification: <b>{show(change.classification)}</b> · Deadline: {new Date(Number(change.expires_at) * 1000).toLocaleString()}</p><div className="terms">{show(change.proposed_terms)}</div><p>Client: {change.client_approved ? "Approved" : "Awaiting"} · Provider: {change.provider_approved ? "Approved" : "Awaiting"}</p></div>}</section>
        <footer>Records consent and an advisory scope classification. CovenantFlow does not transfer funds or replace a legal agreement. <a href="https://github.com/amzar1st/CovenantFlow/blob/main/contracts/CovenantFlowStudionet.py" target="_blank" rel="noreferrer">Studio contract source ↗</a></footer>
      </section>
    </div>
  </main>;
}
