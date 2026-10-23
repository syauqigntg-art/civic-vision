export type IdentityDraft = {
  name: string;
  number: string | number;
  class_name: string;
  leader: string;
  members: string[];
};

export type IdentitySavePayload = {
  p_name: string;
  p_number: number;
  p_class: string;
  p_leader: string;
  p_members: string[];
};

export type IdentitySaveOutcome =
  | { kind: "saved" }
  | { kind: "busy" }
  | { kind: "invalid"; message: string }
  | { kind: "failed"; message: string };

type PersistResult = { error?: { message?: string } | null };

const GENERIC_FAILURE =
  "Koneksi gagal saat menyimpan identitas. Data belum dikonfirmasi; periksa koneksi lalu coba lagi.";

function validate(draft: IdentityDraft): string | null {
  if (
    !draft.name.trim() ||
    !draft.class_name.trim() ||
    !draft.leader.trim() ||
    draft.number === ""
  ) {
    return "Nama kelompok, nomor, kelas, dan nama ketua wajib diisi.";
  }

  const number = Number(draft.number);
  if (!Number.isInteger(number) || number < 1 || number > 99) {
    return "Nomor kelompok harus berupa angka bulat antara 1 dan 99.";
  }

  if (!Array.isArray(draft.members) || draft.members.length > 10) {
    return "Daftar anggota tidak valid. Periksa kembali isian kelompok.";
  }

  return null;
}

/**
 * One-flight identity-save controller. The gate is set synchronously before
 * awaiting persistence so two events in the same render cannot start duplicate
 * network writes. It does not mutate the user's form values.
 */
export function createIdentitySaveController(
  persist: (payload: IdentitySavePayload) => Promise<PersistResult>,
) {
  let pending = false;

  return {
    get isPending() {
      return pending;
    },

    async save(
      draft: IdentityDraft,
      onPendingChange?: (pending: boolean) => void,
    ): Promise<IdentitySaveOutcome> {
      if (pending) return { kind: "busy" };

      const validationError = validate(draft);
      if (validationError) {
        return { kind: "invalid", message: validationError };
      }

      const payload: IdentitySavePayload = {
        p_name: draft.name.trim(),
        p_number: Number(draft.number),
        p_class: draft.class_name.trim(),
        p_leader: draft.leader.trim(),
        p_members: draft.members.map((member) => member.trim()),
      };

      pending = true;
      onPendingChange?.(true);
      try {
        const result = await persist(payload);
        if (result?.error) {
          return {
            kind: "failed",
            message: result.error.message || "Identitas gagal disimpan. Periksa isian lalu coba lagi.",
          };
        }
        return { kind: "saved" };
      } catch {
        return { kind: "failed", message: GENERIC_FAILURE };
      } finally {
        pending = false;
        onPendingChange?.(false);
      }
    },
  };
}
