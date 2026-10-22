"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sb } from "@/lib/supabase/client";
import { useProjectContext } from "@/components/admin/ProjectProvider";
import type { Q } from "@/types";

type Part = "P" | "gs" | "vs" | "qs" | "gv" | "gm" | "subs" | "ans";
const ALL: Part[] = ["P", "gs", "vs", "qs", "gv", "gm", "subs", "ans"];
const emptyData = () => ({ P: {}, gs: [], vs: [], qs: [], gv: [], gm: [], subs: [], ans: [] });

export interface AdminData {
  P: any;
  projects: any[];
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  gs: any[];
  vs: any[];
  qs: Q[];
  gv: any[];
  gm: any[];
  subs: any[];
  ans: any[];
  loading: boolean;
  error: boolean;
  load: () => Promise<void>;
}

export function useAdmin(parts: Part[] = ALL): AdminData {
  const { projects, projectId, loading: projectsLoading, selectProject } = useProjectContext();
  const [d, setD] = useState<any>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestVersion = useRef(0);
  const key = parts.join(",");

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    if (projectsLoading) return;

    if (!projectId) {
      setD(emptyData());
      setError(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ks = key.split(",") as Part[];
    let bad = false;

    // Resolve the selected project's own child IDs before querying dependent
    // tables. This prevents data from a different project leaking into a page.
    let groupIds: string[] = [];
    let submissionIds: string[] = [];

    if (ks.includes("gv") || ks.includes("gm")) {
      const { data, error: queryError } = await sb
        .from("groups")
        .select("id")
        .eq("project_id", projectId);
      if (queryError) bad = true;
      groupIds = (data || []).map((row: any) => row.id);
    }

    if (ks.includes("ans")) {
      const { data, error: queryError } = await sb
        .from("submissions")
        .select("id")
        .eq("project_id", projectId);
      if (queryError) bad = true;
      submissionIds = (data || []).map((row: any) => row.id);
    }

    const query = (part: Part): PromiseLike<any> => {
      switch (part) {
        case "P":
          return sb.from("projects").select("*").eq("id", projectId).maybeSingle();
        case "gs":
          return sb.from("groups").select("*").eq("project_id", projectId).order("group_number");
        case "vs":
          return sb.from("videos").select("*").eq("project_id", projectId).order("number");
        case "qs":
          return sb.from("questions").select("*,question_options(*)").eq("project_id", projectId).order("display_order");
        case "gv":
          return groupIds.length
            ? sb.from("group_videos").select("*").in("group_id", groupIds)
            : Promise.resolve({ data: [], error: null });
        case "gm":
          return groupIds.length
            ? sb.from("group_members").select("*").in("group_id", groupIds).order("member_order")
            : Promise.resolve({ data: [], error: null });
        case "subs":
          return sb.from("submissions").select("*").eq("project_id", projectId);
        case "ans":
          return submissionIds.length
            ? sb.from("answers").select("submission_id,question_id,answer_text").in("submission_id", submissionIds)
            : Promise.resolve({ data: [], error: null });
      }
    };

    const results = await Promise.all(ks.map((part) => query(part)));
    if (version !== requestVersion.current) return;
    const next: any = {};
    ks.forEach((part, index) => {
      const result: any = results[index];
      if (result.error) bad = true;
      if (part === "P") next.P = result.data || {};
      else next[part] = result.data || [];
    });

    setD((previous: any) => ({ ...previous, ...next }));
    setError(bad);
    setLoading(false);
  }, [key, projectId, projectsLoading]);

  useEffect(() => {
    void load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  return { ...d, projects, activeProjectId: projectId, setActiveProjectId: selectProject, loading: loading || projectsLoading, error, load };
}
