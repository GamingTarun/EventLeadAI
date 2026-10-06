"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Lead = {
  id: number;
  name: string;
  company: string;
  email: string;
  event: string;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type LeadForm = Omit<Lead, "id" | "created_at" | "updated_at">;

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const statuses = ["To follow up", "Contacted", "Qualified", "Not interested"];

const emptyForm: LeadForm = {
  name: "",
  company: "",
  email: "",
  event: "",
  notes: "",
  status: "To follow up"
};

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadForm>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [error, setError] = useState("");

  async function loadLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status !== "All") params.set("status", status);
      const res = await fetch(`${API}/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load leads");
      setLeads(await res.json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load leads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadLeads, 250);
    return () => clearTimeout(timer);
  }, [query, status]);

  const stats = useMemo(() => ({
    total: leads.length,
    follow: leads.filter((l) => l.status === "To follow up").length,
    contacted: leads.filter((l) => l.status === "Contacted").length,
    qualified: leads.filter((l) => l.status === "Qualified").length
  }), [leads]);

  function openCreate() {
    setSelected(null);
    setForm(emptyForm);
    setAiResult("");
    setModalOpen(true);
  }

  function openEdit(lead: Lead) {
    setSelected(lead);
    setForm({ name: lead.name, company: lead.company, email: lead.email, event: lead.event, notes: lead.notes, status: lead.status });
    setAiResult("");
    setModalOpen(true);
  }

  async function saveLead(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const editing = Boolean(selected);
      const res = await fetch(editing ? `${API}/api/leads/${selected!.id}` : `${API}/api/leads`, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not save lead");
      setModalOpen(false);
      await loadLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save lead");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLead(id: number) {
    if (!confirm("Delete this lead?")) return;
    try {
      const res = await fetch(`${API}/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete lead");
      if (selected?.id === id) setSelected(null);
      await loadLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete lead");
    }
  }

  async function aiAction(id: number, action: "summary" | "follow-up") {
    setAiLoading(action);
    setAiResult("");
    try {
      const res = await fetch(`${API}/api/leads/${id}/ai/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "AI action failed");
      setAiResult(data.result);
    } catch (e) {
      setAiResult(e instanceof Error ? e.message : "AI action failed");
    } finally {
      setAiLoading("");
    }
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">E</span><div><strong>EventLead</strong><span>AI</span></div></div>
        <button className="primary-btn" onClick={openCreate}>+ Add lead</button>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">EVENT INTELLIGENCE</p>
          <h1>Turn conversations into follow-ups.</h1>
          <p className="hero-copy">Capture the people you meet, keep every interaction organized, and let AI turn notes into your next action.</p>
        </div>
        <div className="hero-badge"><span>●</span> Workspace ready</div>
      </section>

      <section className="stats-grid">
        <Stat label="Total leads" value={stats.total} icon="◉" />
        <Stat label="To follow up" value={stats.follow} icon="↗" />
        <Stat label="Contacted" value={stats.contacted} icon="✓" />
        <Stat label="Qualified" value={stats.qualified} icon="★" />
      </section>

      {error && <div className="alert">{error}</div>}

      <section className="panel">
        <div className="toolbar">
          <div><h2>Leads</h2><p>Search and manage your event contacts.</p></div>
          <div className="filters">
            <label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leads..." /></label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>{["All", ...statuses].map((s) => <option key={s}>{s}</option>)}</select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Contact</th><th>Company</th><th>Event</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="empty">Loading leads...</td></tr> : leads.length === 0 ? <tr><td colSpan={6} className="empty"><div className="empty-icon">＋</div><strong>No leads yet</strong><span>Add your first event contact to get started.</span><button className="secondary-btn" onClick={openCreate}>Add a lead</button></td></tr> : leads.map((lead) => (
                <tr key={lead.id} onClick={() => setSelected(lead)} className="clickable">
                  <td><div className="person"><div className="avatar">{lead.name.slice(0, 1).toUpperCase()}</div><div><strong>{lead.name}</strong><small>{lead.email}</small></div></div></td>
                  <td>{lead.company}</td><td>{lead.event}</td><td><StatusBadge status={lead.status} /></td><td>{new Date(lead.updated_at).toLocaleDateString()}</td>
                  <td><button className="dots" onClick={(e) => { e.stopPropagation(); openEdit(lead); }}>•••</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && !modalOpen && <aside className="drawer">
        <div className="drawer-head"><div><p className="eyebrow">LEAD DETAILS</p><h2>{selected.name}</h2><p>{selected.company} · {selected.event}</p></div><button className="icon-btn" onClick={() => setSelected(null)}>×</button></div>
        <div className="drawer-section"><StatusBadge status={selected.status} /><a href={`mailto:${selected.email}`}>{selected.email}</a></div>
        <div className="drawer-section"><h3>Interaction notes</h3><p className="notes">{selected.notes || "No notes added."}</p></div>
        <div className="ai-box"><div><span className="ai-spark">✦</span><strong>AI actions</strong></div><p>Turn the interaction into something useful.</p><div className="ai-actions"><button onClick={() => aiAction(selected.id, "summary")} disabled={Boolean(aiLoading)}>{aiLoading === "summary" ? "Summarizing..." : "Summarize notes"}</button><button onClick={() => aiAction(selected.id, "follow-up")} disabled={Boolean(aiLoading)}>{aiLoading === "follow-up" ? "Drafting..." : "Draft follow-up"}</button></div>{aiResult && <div className="ai-result">{aiResult}</div>}</div>
        <div className="drawer-footer"><button className="secondary-btn" onClick={() => openEdit(selected)}>Edit lead</button><button className="danger-btn" onClick={() => deleteLead(selected.id)}>Delete</button></div>
      </aside>}

      {modalOpen && <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}><form className="modal" onSubmit={saveLead}>
        <div className="modal-head"><div><p className="eyebrow">{selected ? "EDIT LEAD" : "NEW LEAD"}</p><h2>{selected ? "Update contact" : "Add event lead"}</h2></div><button type="button" className="icon-btn" onClick={() => setModalOpen(false)}>×</button></div>
        <div className="form-grid"><Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required /><Field label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} required /><Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required /><Field label="Event" value={form.event} onChange={(v) => setForm({ ...form, event: v })} required /><label><span>Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label><label className="full"><span>Interaction notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="What did you discuss? What matters to this person?" rows={5} /></label></div>
        <div className="modal-footer"><button type="button" className="secondary-btn" onClick={() => setModalOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? "Saving..." : selected ? "Save changes" : "Create lead"}</button></div>
      </form></div>}
    </main>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) { return <div className="stat"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>; }
function StatusBadge({ status }: { status: string }) { return <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>; }
function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string }) { return <label><span>{label}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
