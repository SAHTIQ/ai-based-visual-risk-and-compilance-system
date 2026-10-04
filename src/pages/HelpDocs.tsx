import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  FileText,
  Search,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/common/Badge';
import { PROJECT_DOCS, PROJECT_TITLE, PROJECT_SUBTITLE, PROJECT_AUTHOR } from '../data/projectDocsData';
import { USER_MANUAL_MODULES } from '../data/userManualData';

export const HelpDocs: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab: 'project-docs' or 'user-manual'
  const currentTab = searchParams.get('tab') === 'user-manual' ? 'user-manual' : 'project-docs';
  const selectedDocId = searchParams.get('docId') || PROJECT_DOCS[0].id;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState(selectedDocId);

  // Sync section ID with URL
  useEffect(() => {
    const docId = searchParams.get('docId');
    if (docId) {
      setActiveSectionId(docId);
    }
  }, [searchParams]);

  const setTab = (tab: 'project-docs' | 'user-manual') => {
    setSearchParams({ tab, docId: activeSectionId });
  };

  const selectSection = (id: string) => {
    setActiveSectionId(id);
    setSearchParams({ tab: currentTab, docId: id });
  };

  // Filtered Project Docs
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return PROJECT_DOCS;
    const q = searchQuery.toLowerCase();
    return PROJECT_DOCS.filter(
      (d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q) || d.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Filtered User Manual Modules
  const filteredManual = useMemo(() => {
    if (!searchQuery.trim()) return USER_MANUAL_MODULES;
    const q = searchQuery.toLowerCase();
    return USER_MANUAL_MODULES.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.steps.some((s) => s.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const activeDoc = useMemo(() => {
    return PROJECT_DOCS.find((d) => d.id === activeSectionId) || PROJECT_DOCS[0];
  }, [activeSectionId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Help & Documentation"
        description="Comprehensive project technical documentation and interactive user manual for the platform."
      />

      {/* Top Selector Card: Project Docs vs Website User Manual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setTab('project-docs')}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            currentTab === 'project-docs'
              ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
              : 'border-border bg-surface hover:border-primary/40 hover:bg-surface/80'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                currentTab === 'project-docs' ? 'bg-primary text-white' : 'bg-primary/15 text-primary'
              }`}
            >
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Technical Specs</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                  30 Chapters
                </span>
              </div>
              <h3 className="text-base font-bold text-text-primary mt-1">Project Documentation</h3>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                Full academic report by {PROJECT_AUTHOR}: System architecture, ML pipeline (Linear & Logistic Regression), DB ERD, and code highlights.
              </p>
            </div>
          </div>
          {currentTab === 'project-docs' && (
            <div className="absolute top-3 right-3 text-primary">
              <CheckCircle2 className="w-5 h-5 fill-primary text-white" />
            </div>
          )}
        </button>

        <button
          onClick={() => setTab('user-manual')}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            currentTab === 'user-manual'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/20'
              : 'border-border bg-surface hover:border-emerald-500/40 hover:bg-surface/80'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                currentTab === 'user-manual'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  User Guide
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Step-by-Step
                </span>
              </div>
              <h3 className="text-base font-bold text-text-primary mt-1">Website Help Manual</h3>
              <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                Complete walkthrough on how to use every page: Dashboard KPIs, Productivity tracking, Forecasting, What-If Simulation, and AI Assistant.
              </p>
            </div>
          </div>
          {currentTab === 'user-manual' && (
            <div className="absolute top-3 right-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5 fill-emerald-600 text-white" />
            </div>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            currentTab === 'project-docs'
              ? 'Search technical chapters, models, database tables, or code...'
              : 'Search user manual guides, features, or workflows...'
          }
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-text-primary"
          >
            Clear
          </button>
        )}
      </div>

      {/* ================= VIEW 1: PROJECT TECHNICAL DOCUMENTATION ================= */}
      {currentTab === 'project-docs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Chapter Navigation Sidebar */}
          <div className="lg:col-span-4 bg-surface border border-border rounded-2xl p-4 shadow-sm space-y-2 sticky top-20 max-h-[78vh] overflow-y-auto">
            <div className="pb-3 border-b border-border">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Table of Contents</p>
              <p className="text-[11px] text-text-secondary mt-0.5">{PROJECT_TITLE}</p>
            </div>

            <div className="space-y-1 pt-1">
              {filteredDocs.map((doc) => {
                const isActive = doc.id === activeDoc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => selectSection(doc.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-primary text-white shadow-sm font-semibold'
                        : 'text-text-secondary hover:text-text-primary hover:bg-muted'
                    }`}
                  >
                    <span className="truncate">{doc.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-normal shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-muted text-text-secondary'
                      }`}
                    >
                      {doc.category}
                    </span>
                  </button>
                );
              })}

              {filteredDocs.length === 0 && (
                <p className="text-xs text-text-secondary text-center py-6">No matching chapters found.</p>
              )}
            </div>
          </div>

          {/* Active Chapter Reader */}
          <div className="lg:col-span-8 bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-border pb-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="primary" size="sm">
                  {activeDoc.category}
                </Badge>
                <span className="text-xs font-semibold text-text-secondary">Author: {PROJECT_AUTHOR}</span>
              </div>
              <h2 className="text-2xl font-bold text-text-primary mt-3">{activeDoc.title}</h2>
              <p className="text-xs text-text-secondary mt-1">{PROJECT_TITLE} — {PROJECT_SUBTITLE}</p>
            </div>

            <div className="prose dark:prose-invert max-w-none text-text-primary text-sm leading-relaxed font-sans">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold text-text-primary mt-6 mb-3 border-b border-border pb-2">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold text-text-primary mt-5 mb-2.5">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-text-primary mt-5 mb-2">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-sm font-semibold text-text-primary mt-3.5 mb-1.5">
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm text-text-secondary leading-relaxed mb-3">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 space-y-1.5 my-3 text-sm text-text-secondary">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-5 space-y-1.5 my-3 text-sm text-text-secondary">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed pl-1">
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-text-primary">
                      {children}
                    </strong>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4 rounded-xl border border-border shadow-sm">
                      <table className="w-full text-xs text-left border-collapse">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-muted text-text-primary font-semibold uppercase text-[11px] tracking-wider border-b border-border">
                      {children}
                    </thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-2.5 font-semibold text-text-primary">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2.5 border-b border-border/50 text-text-secondary">
                      {children}
                    </td>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="px-1.5 py-0.5 rounded-md bg-muted text-primary font-mono text-xs font-medium">
                        {children}
                      </code>
                    ) : (
                      <pre className="p-4 rounded-xl bg-muted/80 font-mono text-xs overflow-x-auto border border-border text-text-primary my-3">
                        <code>{children}</code>
                      </pre>
                    );
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/60 pl-4 py-1.5 italic text-text-secondary my-3 bg-muted/30 rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="my-6 border-border" />,
                }}
              >
                {activeDoc.content}
              </ReactMarkdown>
            </div>

            {/* Pagination Controls */}
            <div className="border-t border-border pt-6 flex items-center justify-between gap-4">
              {(() => {
                const idx = PROJECT_DOCS.findIndex((d) => d.id === activeDoc.id);
                const prev = idx > 0 ? PROJECT_DOCS[idx - 1] : null;
                const next = idx < PROJECT_DOCS.length - 1 ? PROJECT_DOCS[idx + 1] : null;

                return (
                  <>
                    {prev ? (
                      <button
                        onClick={() => selectSection(prev.id)}
                        className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-text-primary hover:bg-muted transition-colors"
                      >
                        ← {prev.title}
                      </button>
                    ) : <div />}

                    {next ? (
                      <button
                        onClick={() => selectSection(next.id)}
                        className="px-3.5 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-95 transition-opacity flex items-center gap-1.5"
                      >
                        <span>{next.title}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : <div />}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: WEBSITE USER & HELP MANUAL ================= */}
      {currentTab === 'user-manual' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-text-primary">Interactive Website User Guide</h2>
            <p className="text-xs text-text-secondary mt-1">
              Select any feature module below for detailed step-by-step instructions, best practices, and troubleshooting tips.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredManual.map((module) => (
              <div
                key={module.id}
                className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {module.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">{module.summary}</p>

                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-[11px] font-bold text-text-primary uppercase tracking-wider mb-2">How to use:</p>
                    <ul className="space-y-1.5 text-xs text-text-secondary list-disc pl-4 leading-relaxed">
                      {module.steps.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  {module.tips.length > 0 && (
                    <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-[11px] font-semibold text-primary flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5" /> Pro Tip
                      </p>
                      <p className="text-[11px] text-text-secondary">{module.tips[0]}</p>
                    </div>
                  )}

                  {module.faqs && module.faqs.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border">
                      <p className="text-[11px] font-semibold text-text-primary">FAQ: {module.faqs[0].q}</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">{module.faqs[0].a}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredManual.length === 0 && (
            <div className="text-center py-12 bg-surface rounded-2xl border border-border">
              <HelpCircle className="w-8 h-8 text-text-secondary mx-auto mb-2" />
              <p className="text-sm font-semibold text-text-primary">No manual sections match your search.</p>
              <p className="text-xs text-text-secondary mt-1">Try searching for keywords like "Productivity", "Simulation", or "Google".</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
