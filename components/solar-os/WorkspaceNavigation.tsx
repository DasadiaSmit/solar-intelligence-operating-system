"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkspaceId } from "@/lib/mission-intelligence";
import { WORKSPACES } from "./workspaces";

export function WorkspaceNavigation({ workspaceId, onChooseWorkspace, onHelp }: {
  workspaceId: WorkspaceId;
  onChooseWorkspace: (id: WorkspaceId) => void;
  onHelp: () => void;
}) {
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const railRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeWorkspace = WORKSPACES.find((workspace) => workspace.id === workspaceId)!;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    let mounted = true;
    const update = () => { setCompact(query.matches); setOpen(false); };
    queueMicrotask(() => { if (mounted) update(); });
    query.addEventListener("change", update);
    return () => { mounted = false; query.removeEventListener("change", update); };
  }, []);

  useEffect(() => {
    if (!compact || !open) return;
    const rail = railRef.current;
    const panel = panelRef.current;
    if (!rail || !panel) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const siblings = Array.from(rail.parentElement?.children ?? [])
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== rail);
    const inertState = siblings.map((element) => ({ element, inert: element.inert }));
    siblings.forEach((element) => { element.inert = true; });
    panel.querySelector<HTMLElement>("[aria-current='page']")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      if (event.key !== "Tab") return;
      const controls = Array.from(panel.querySelectorAll<HTMLElement>("button:not([disabled])"));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    panel.addEventListener("keydown", handleKey);
    return () => {
      inertState.forEach(({ element, inert }) => { element.inert = inert; });
      panel.removeEventListener("keydown", handleKey);
      if (previous?.isConnected) previous.focus();
    };
  }, [compact, open]);

  return (
    <aside ref={railRef} className="workspace-rail" data-menu-open={compact && open}>
      <button ref={triggerRef} className="workspace-menu-trigger" aria-expanded={open} aria-controls="workspace-navigation-panel" onClick={() => setOpen((value) => !value)}>
        <span><small>Workspaces</small><strong>{activeWorkspace.name}</strong></span><span aria-hidden="true">⌄</span>
      </button>
      {compact && open && <button className="workspace-menu-scrim" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} />}
      <div ref={panelRef} id="workspace-navigation-panel" className="workspace-navigation-panel" role={compact && open ? "dialog" : undefined} aria-modal={compact && open ? true : undefined} aria-label={compact && open ? "Choose a workspace" : undefined}>
        <div className="workspace-navigation-heading"><div><span>Explore your system</span><strong>Workspaces</strong></div><button className="workspace-menu-close" aria-label="Close workspace menu" onClick={() => setOpen(false)}>×</button></div>
        <nav className="rail-items" aria-label="Solar operating system workspaces">
          {WORKSPACES.map((workspace) => (
            <button key={workspace.id} className={workspace.id === workspaceId ? "active" : ""} onClick={() => { onChooseWorkspace(workspace.id); setOpen(false); }} aria-current={workspace.id === workspaceId ? "page" : undefined} aria-label={`${workspace.name}, ${workspace.status.toLowerCase()}`} data-testid={`workspace-nav-${workspace.id}`}>
              <i aria-hidden="true" className={`status-${workspace.status.toLowerCase()}`} /><span>{workspace.name}</span>{workspace.id === workspaceId && <b aria-hidden="true">↗</b>}
            </button>
          ))}
        </nav>
        <button className="rail-help" onClick={() => { setOpen(false); onHelp(); }} aria-label="Open keyboard shortcuts"><span aria-hidden="true">⌘</span> Keyboard shortcuts</button>
      </div>
    </aside>
  );
}
