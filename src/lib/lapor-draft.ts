export type LaporDraftData = {
  tanggalCek: string;
  selectedSbu: string;
  idPa: string;
  tanggalAktivasi: string;
  tanggalPermohonan: string;
  selectedMitra: string;
  customMitraInput: string;
  selectedPetugas: string;
  customPetugasInput: string;
  petugasQc: string;
  petugasMonitoringPusat: string;
  kp: string;
  checklist: Record<string, "OK" | "NOK">;
  catatan: string;
  manualSeverity: string;
  manualJenis: string;
  savedAt: number;
};

const DRAFT_KEY = "iconguard_lapor_draft_v1";

export function getLaporDraft(): LaporDraftData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLaporDraft(data: Partial<LaporDraftData>) {
  if (typeof window === "undefined") return;
  try {
    const current = getLaporDraft() || ({} as Partial<LaporDraftData>);
    const updated = { ...current, ...data, savedAt: Date.now() };
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("iconguard-draft-updated"));
  } catch {}
}

export function clearLaporDraft() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
    window.dispatchEvent(new CustomEvent("iconguard-draft-updated"));
  } catch {}
}

export function isLaporDraftActive(): boolean {
  const draft = getLaporDraft();
  if (!draft) return false;
  const hasIdPa = Boolean(draft.idPa?.trim());
  const hasSbu = Boolean(draft.selectedSbu?.trim());
  const hasMitra = Boolean(draft.selectedMitra?.trim() || draft.customMitraInput?.trim());
  const hasNok = draft.checklist && Object.values(draft.checklist).some((v) => v === "NOK");
  const hasCatatan = Boolean(draft.catatan?.trim());
  return hasIdPa || hasSbu || hasMitra || hasNok || hasCatatan;
}
