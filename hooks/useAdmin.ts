"use client";

import { useCallback, useEffect, useState } from "react";
import { sb } from "@/lib/supabase/client";
import type { Q } from "@/types";

type Part = "P" | "gs" | "vs" | "qs" | "gv" | "gm" | "subs" | "ans";
const ALL: Part[] = ["P", "gs", "vs", "qs", "gv", "gm", "subs", "ans"];
const ACTIVE_PROJECT_KEY = "civic-vision:active-project";
const PROJECT_EVENT = "civic-vision:active-project-changed";

function readProjectId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACTIVE_PROJECT_KEY) || "";
}

function publishProjectId(id: string) {
  window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  window.dispatchEvent(new CustomEvent(PROJECT_EVENT, { detail: id }));
}

const emptyData = { P: {}, gs: [], vs: [], qs: [], gv: [], gm: [], subs: [], ans: [] };

export interface AdminData {
  P: any;
  projects: any[];
  gs: any[];
  vs: any[];
  qs: Q[];
  gv: any[];
  gm: any[];
  subs: any[];
  ans: any[];
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  loading: boolean;
  error: boolean;
  load: () => Promise<void>;
}

export function useAdmin(parts: Part[] = ALL): AdminData {
  const [data, setData] = useState<any>(emptyData);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const key = parts.join(",");

  useEffect(() => {
    const sync = () => setActiveProjectIdState(readProjectId());
    sync();
    window.addEventListener(PROJECT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROJECT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setActiveProjectId = useCallback((id: string) => {
    publishProjectId(id);
    setActiveProjectIdState(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const projectResult = await sb.from("projects").select("*").order("created_at", { ascending: false });
    if (projectResult.error) {
      setError(true);
      setLoading(false);
      return;
    }
    const allProjects = projectResult.data || [];
    setProjects(allProjects);
    const selectedId = readProjectId();
    const selected = allProjects.find((p: any) => p.id === selectedId) || null;
    if (selected && selected.is_active === false) {
      setData(emptyData);
      setError(false);
      setLoading(false);
      return;
    }

    if (!selected) {
      // No implicit "first project": wait for the teacher to choose one.
      setData(emptyData);
      setError(false);
      setLoading(false);
      return;
    }

    const requested = key.split(",") as Part[];
    const needs = new Set(requested);
    const jobs: Promise<any>[] = [];
    const names: Part[] = [];
    const add = (name: Part, query: any) => {
      if (needs.has(name)) { names.push(name); jobs.push(query); }
    };
    add("gs", sb.from("groups").select("*").eq("project_id", selected.id).order("group_number"));
    add("vs", sb.from("videos").select("*").eq("project_id", selected.id).order("number"));
    add("qs", sb.from("questions").select("*,question_options(*)").eq("project_id", selected.id).order("display_order"));
    add("subs", sb.from("submissions").select("*").eq("project_id", selected.id));
    const results = await Promise.all(jobs);
    let failed = results.some((r) => r.error);
    const scoped: any = { ...emptyData, P: selected };
    names.forEach((name, index) => { scoped[name] = results[index].data || []; });

    const groupIds = scoped.gs.map((g: any) => g.id);
    const videoIds = scoped.vs.map((v: any) => v.id);
    const submissionIds = scoped.subs.map((s: any) => s.id);

    if (needs.has("gv")) {
      const q = groupIds.length
        ? await sb.from("group_videos").select("*").in("group_id", groupIds)
        : { data: [], error: null };
      scoped.gv = q.data || []; failed ||= !!q.error;
    }
    if (needs.has("gm")) {
      const q = groupIds.length
        ? await sb.from("group_members").select("*").in("group_id", groupIds).order("member_order")
        : { data: [], error: null };
      scoped.gm = q.data || []; failed ||= !!q.error;
    }
    if (needs.has("ans")) {
      const q = submissionIds.length
        ? await sb.from("answers").select("submission_id,question_id,answer_text").in("submission_id", submissionIds)
        : { data: [], error: null };
      scoped.ans = q.data || []; failed ||= !!q.error;
    }
    // Guard against stale/malformed cross-project assignments even if legacy DB rows exist.
    scoped.gv = (scoped.gv || []).filter((x: any) => groupIds.includes(x.group_id) && videoIds.includes(x.video_id));
    setData(scoped);
    setError(failed);
    setLoading(false);
  }, [key]);

  useEffect(() => { void load(); }, [load, activeProjectId]);

  return { ...data, projects, activeProjectId, setActiveProjectId, loading, error, load };
}
