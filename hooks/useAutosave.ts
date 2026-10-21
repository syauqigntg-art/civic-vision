"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { rpcS } from "@/lib/api/student";
import { getCode } from "@/lib/utils/code";

export type SaveState =
  | "idle"
  | "saving"
  | "saved"
  | "offline"
  | "failed"
  | "storage-error"
  | "locked";

type PendingAnswers = Record<string, string>;

const isOnline = () =>
  typeof navigator === "undefined" || navigator.onLine !== false;

// Autosave queue:
// - persist pending answers before sending them,
// - allow only one network flush at a time,
// - keep newer edits if they arrive while an older save is in flight,
// - retry pending answers when connectivity returns.
export function useAutosave(onLocked: () => void) {
  const dirty = useRef<PendingAnswers>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushPromise = useRef<Promise<SaveState> | null>(null);
  const lock = useRef(onLocked);
  lock.current = onLocked;

  const statusRef = useRef<SaveState>("idle");
  const [st, setSt] = useState<SaveState>("idle");

  const setStatus = useCallback((next: SaveState) => {
    statusRef.current = next;
    setSt(next);
  }, []);

  const storageKey = () => {
    const code = getCode();
    return code ? `cv_dirty_${code}` : "";
  };

  // Returns false if browser storage is unavailable. The queued values remain
  // in memory, but the UI must warn that refresh recovery cannot be guaranteed.
  const persist = useCallback((): boolean => {
    const key = storageKey();
    if (!key) return false;

    try {
      if (Object.keys(dirty.current).length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(dirty.current));
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearPending = useCallback(
    (markLocked = false) => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      dirty.current = {};
      persist();
      if (markLocked) setStatus("locked");
    },
    [persist, setStatus],
  );

  const load = useCallback((): PendingAnswers => {
    const key = storageKey();
    if (!key) return {};

    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        dirty.current = {};
        localStorage.removeItem(key);
        setStatus("failed");
        return {};
      }

      const safeEntries = Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      );
      dirty.current = Object.fromEntries(safeEntries);

      if (Object.keys(dirty.current).length > 0) {
        setStatus(isOnline() ? "saving" : "offline");
      }

      return { ...dirty.current };
    } catch {
      dirty.current = {};
      setStatus("storage-error");
      return {};
    }
  }, [setStatus]);

  const flush = useCallback((): Promise<SaveState> => {
    // All callers (debounce, interval, manual Save, and Submit) share the
    // same in-flight promise so concurrent flushes cannot reorder writes.
    if (flushPromise.current) return flushPromise.current;

    const run = async (): Promise<SaveState> => {
      if (Object.keys(dirty.current).length === 0) {
        const current = statusRef.current;
        const next: SaveState =
          current === "locked"
            ? "locked"
            : current === "failed" ||
                current === "offline" ||
                current === "storage-error"
              ? current
              : current === "idle"
                ? "idle"
                : "saved";
        setStatus(next);
        return next;
      }

      const code = getCode();
      if (!code) {
        setStatus("failed");
        return "failed";
      }

      if (!isOnline()) {
        const persisted = persist();
        const next = persisted ? "offline" : "storage-error";
        setStatus(next);
        return next;
      }

      setStatus("saving");

      while (Object.keys(dirty.current).length > 0) {
        if (!isOnline()) {
          const persisted = persist();
          const next = persisted ? "offline" : "storage-error";
          setStatus(next);
          return next;
        }

        const qid = Object.keys(dirty.current)[0];
        const value = dirty.current[qid];

        const result = await rpcS("save_answer", {
          code,
          qid,
          val: value,
        });

        if (result.error) {
          const persisted = persist();
          const next: SaveState = !persisted
            ? "storage-error"
            : !isOnline()
              ? "offline"
              : "failed";
          setStatus(next);
          return next;
        }

        if (result.data !== true) {
          // false usually means the submission was locked or the answer was
          // rejected. Confirm the server-side status before discarding drafts.
          const groupResult = await rpcS("get_group", { code });
          if (
            !groupResult.error &&
            groupResult.data?.submission?.status === "submitted"
          ) {
            clearPending(true);
            lock.current();
            return "locked";
          }

          const persisted = persist();
          const next = persisted ? "failed" : "storage-error";
          setStatus(next);
          return next;
        }

        // If the user edited this question while the request was in flight,
        // keep the newer value queued and send it in the next loop iteration.
        if (dirty.current[qid] === value) {
          delete dirty.current[qid];
        }

        persist();
      }

      setStatus("saved");
      return "saved";
    };

    let tracked: Promise<SaveState>;
    tracked = run().finally(() => {
      if (flushPromise.current === tracked) {
        flushPromise.current = null;
      }
    });
    flushPromise.current = tracked;
    return tracked;
  }, [clearPending, persist, setStatus]);

  const change = useCallback(
    (qid: string, value: string) => {
      dirty.current[qid] = value;
      const persisted = persist();

      if (!persisted) {
        setStatus("storage-error");
      } else if (!isOnline()) {
        setStatus("offline");
      } else {
        setStatus("saving");
      }

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void flush();
      }, 600);
    },
    [flush, persist, setStatus],
  );

  const hasPending = useCallback(
    () => Object.keys(dirty.current).length > 0,
    [],
  );

  useEffect(() => {
    const retry = () => {
      if (Object.keys(dirty.current).length > 0) void flush();
    };
    const onOffline = () => {
      if (Object.keys(dirty.current).length > 0) {
        setStatus(persist() ? "offline" : "storage-error");
      }
    };

    const interval = setInterval(retry, 5000);
    window.addEventListener("online", retry);
    window.addEventListener("offline", onOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", retry);
      window.removeEventListener("offline", onOffline);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush, persist, setStatus]);

  return { st, change, flush, load, clearPending, hasPending };
}
