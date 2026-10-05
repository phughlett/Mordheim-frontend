import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiBaseUrl } from "../auth/auth";

interface CorrectionConfig {
  enabled: boolean;
  repositoryUrl: string;
  projectUrl: string;
}
interface CorrectionDraft {
  id: string;
  title: string;
  explanation: string;
  referenceUrl: string;
}
interface CorrectionResult {
  id?: string;
  status?: string;
  issueUrl?: string;
  projectUrl?: string;
  error?: string;
}

const draftKey = "mordheim.correction-draft";

function CorrectionDialog({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<CorrectionConfig | null>(null);
  const [title, setTitle] = useState("");
  const [explanation, setExplanation] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [consent, setConsent] = useState(false);
  const [draft, setDraft] = useState<CorrectionDraft | null>(null);
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${apiBaseUrl}/corrections/config`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load correction submission settings.");
        setConfig(await response.json());
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load correction submission settings.");
      });
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) {
        const value: unknown = JSON.parse(saved);
        if (typeof value !== "object" || value === null || !("id" in value) || typeof value.id !== "string"
          || !("title" in value) || typeof value.title !== "string"
          || !("explanation" in value) || typeof value.explanation !== "string"
          || !("referenceUrl" in value) || typeof value.referenceUrl !== "string") {
          throw new Error("The saved correction draft is invalid. Contact the maintainer before submitting again.");
        }
        const restored = { id: value.id, title: value.title, explanation: value.explanation, referenceUrl: value.referenceUrl };
        setDraft(restored);
        setTitle(restored.title);
        setExplanation(restored.explanation);
        setReferenceUrl(restored.referenceUrl);
      }
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Could not restore the saved correction. Enable session storage before submitting.");
    }
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement;
    dialog.current?.focus();
    return () => { if (previousFocus instanceof HTMLElement) previousFocus.focus(); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !consent || storageError) return;
    if (title.trim().length < 5 || explanation.trim().length < 20) {
      setError("Provide a summary of at least 5 characters and explain what is incorrect in at least 20 characters.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const submission = draft ?? { id: crypto.randomUUID(), title: title.trim(), explanation: explanation.trim(), referenceUrl: referenceUrl.trim() };
      sessionStorage.setItem(draftKey, JSON.stringify(submission));
      setDraft(submission);
      const response = await fetch(`${apiBaseUrl}/corrections`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submission, consent, website }),
        signal: AbortSignal.timeout(45000),
      });
      const data: CorrectionResult = await response.json();
      setResult(data);
      if (!response.ok) setError(data.error || `Submission failed (${response.status}). Retry the same correction.`);
      if (response.status === 400) {
        sessionStorage.removeItem(draftKey);
        setDraft(null);
      }
      if (data.status === "submitted") sessionStorage.removeItem(draftKey);
    } catch (error) {
      setError(error instanceof Error ? `${error.message} Your draft is retained; retry it rather than creating a new correction.` : "Submission could not be confirmed. Retry the retained draft.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="new-roster-dialog correction-dialog" role="dialog" aria-modal="true" aria-labelledby="correction-title" tabIndex={-1} ref={dialog}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy) onClose();
          if (event.key !== "Tab") return;
          const elements = dialog.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), iframe, [tabindex="0"]');
          if (!elements?.length) return;
          const first = elements[0];
          const last = elements[elements.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}>
        <h2 id="correction-title">Report a correction</h2>
        {result?.status === "submitted" ? <div role="status">
          <p>Your correction was submitted and added to the GitHub Project.</p>
          <p><a href={result.issueUrl} target="_blank" rel="noopener noreferrer">View your GitHub issue</a> · <a href={result.projectUrl} target="_blank" rel="noopener noreferrer">View Project</a></p>
          <button type="button" className="primary-button" onClick={onClose}>Done</button>
        </div> : <form onSubmit={(event) => void submit(event)}>
          <p>No account is required. Explain the incorrect rule, stat, price, or behavior and what you believe it should be.</p>
          <p className="correction-notice">The text and reference link you submit will be published on GitHub. Do not include passwords, email addresses, private roster links, or other personal information. No account details or roster data are attached automatically.</p>
          {config && !config.enabled && <p className="api-error" role="alert">Correction submissions are not configured yet. Please try again later.</p>}
          {draft && <p className="correction-notice">A previous submission is retained. Retry these same details to avoid duplicate GitHub issues.</p>}
          <label className="detail-field"><span>SHORT SUMMARY</span><input required minLength={5} maxLength={120} value={title} readOnly={Boolean(draft)} disabled={busy} onChange={(event) => setTitle(event.target.value)} /></label>
          <label className="detail-field"><span>WHAT IS INCORRECT?</span><textarea required minLength={20} maxLength={10000} rows={6} value={explanation} readOnly={Boolean(draft)} disabled={busy} onChange={(event) => setExplanation(event.target.value)} /></label>
          <label className="detail-field"><span>RULE REFERENCE URL (OPTIONAL)</span><input type="url" maxLength={2000} placeholder="https://..." value={referenceUrl} readOnly={Boolean(draft)} disabled={busy} onChange={(event) => setReferenceUrl(event.target.value)} /></label>
          <label className="correction-trap" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
          <label className="purchase-toggle"><input type="checkbox" required checked={consent} disabled={busy} onChange={(event) => setConsent(event.target.checked)} />I understand this correction will be published on GitHub.</label>
          {result?.issueUrl && <p><a href={result.issueUrl} target="_blank" rel="noopener noreferrer">View the created issue</a></p>}
          {result?.status === "project_pending" && <p className="api-error" role="alert">{result.error}</p>}
          {result?.status === "uncertain" && draft && <p>Submission ID: <code>{draft.id}</code>. Keep this ID for the maintainer.</p>}
          {error && <p className="api-error" role="alert">{error}</p>}
          {storageError && <p className="api-error" role="alert">{storageError}</p>}
          <div className="new-roster-dialog-actions">
            <button type="button" className="outline-button" disabled={busy} onClick={onClose}>Close</button>
            <button type="submit" className="primary-button" disabled={busy || !config?.enabled || !consent || Boolean(storageError) || result?.status === "uncertain"}>
              {busy ? "Submitting..." : result?.status === "project_pending" ? "Retry Project linking" : draft ? "Retry submission" : "Submit correction"}
            </button>
          </div>
        </form>}
      </section>
    </div>
  );
}

export function CorrectionLauncher() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="outline-button correction-launcher" onClick={() => setOpen(true)}>Report a correction</button>
    {open && <CorrectionDialog onClose={() => setOpen(false)} />}
  </>;
}
