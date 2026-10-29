"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { search, type SearchItem } from "@/data/searchIndex";
import { track } from "@/lib/analytics";

const suggestions = ["Recruitment", "Career counselling", "Mentoring", "Workforce planning", "CV", "Partnership"];

/** Site search: a button in the header that opens a search box. Opens with "/" or Ctrl/Cmd+K, closes with Esc. */
export default function SiteSearch({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [articles, setArticles] = useState<SearchItem[]>([]);
  const results = useMemo(() => search(q, 12, articles), [q, articles]);

  // Load articles (from the CMS) the first time search opens, so newly published articles are searchable.
  useEffect(() => {
    if (!open || articles.length) return;
    fetch("/search-index").then((r) => (r.ok ? r.json() : [])).then(setArticles).catch(() => {});
  }, [open, articles.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => { setActive(0); }, [q]);

  const close = () => { setOpen(false); setQ(""); };
  const go = (href: string) => { track("search", { search_term: q.trim(), result: href }); close(); router.push(href); };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) go(results[active].href);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Search the website"
        className={compact
          ? "flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-paper"
          : "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:bg-paper"}>
        <Search size={compact ? 20 : 16} aria-hidden />
        {!compact && <span className="sr-only xl:not-sr-only">Search</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 px-4 pt-20 backdrop-blur-sm" onMouseDown={close}>
          <div role="dialog" aria-modal="true" aria-label="Search the website" onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/10">
            <div className="flex items-center gap-3 border-b border-ink/10 px-4">
              <Search size={18} className="shrink-0 text-spark" aria-hidden />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onInputKey}
                placeholder="Search services, careers, articles…" aria-label="Search" role="combobox"
                aria-expanded={results.length > 0} aria-controls="search-results" aria-activedescendant={results[active] ? `sr-${active}` : undefined}
                className="h-14 w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-mute" />
              <button type="button" onClick={close} aria-label="Close search" className="rounded-lg p-1.5 text-ink-mute hover:bg-paper"><X size={18} /></button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {!q.trim() && (
                <div className="p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-mute">Try</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button key={s} type="button" onClick={() => setQ(s)} className="rounded-full bg-paper px-3 py-1 text-sm text-ink-soft hover:bg-spark-light hover:text-spark-dark">{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {q.trim() && results.length === 0 && (
                <p className="p-4 text-sm text-ink-mute">No results for &ldquo;{q}&rdquo;. Try another word, or <button type="button" onClick={() => go("/contact")} className="font-semibold text-spark-dark underline">contact us</button>.</p>
              )}

              {results.length > 0 && (
                <ul id="search-results" role="listbox">
                  {results.map((r, i) => (
                    <li key={r.href + r.title} id={`sr-${i}`} role="option" aria-selected={i === active}>
                      <button type="button" onClick={() => go(r.href)} onMouseEnter={() => setActive(i)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === active ? "bg-paper" : ""}`}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{r.title}</span>
                          <span className="block truncate text-xs text-ink-mute">{r.text}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-volt-light px-2 py-0.5 text-[10px] font-semibold text-volt">{r.group}</span>
                        <ArrowRight size={14} className={`shrink-0 ${i === active ? "text-spark" : "text-ink-mute"}`} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="hidden border-t border-ink/10 px-4 py-2 text-[11px] text-ink-mute sm:block">
              <kbd className="rounded bg-paper px-1.5 font-sans">↑</kbd> <kbd className="rounded bg-paper px-1.5 font-sans">↓</kbd> to move · <kbd className="rounded bg-paper px-1.5 font-sans">Enter</kbd> to open · <kbd className="rounded bg-paper px-1.5 font-sans">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}
    </>
  );
}
