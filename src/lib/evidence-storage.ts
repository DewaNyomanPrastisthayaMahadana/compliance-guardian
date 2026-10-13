const DATABASE_NAME = "iconguard-evidence";
const STORE_NAME = "photos";

function openEvidenceDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Penyimpanan foto tidak tersedia."));
  });
}

export async function saveViolationEvidence(id: string, photos: string[]): Promise<void> {
  const database = await openEvidenceDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(photos, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Foto bukti gagal disimpan."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Foto bukti gagal disimpan."));
  });
  database.close();
}

export async function loadViolationEvidence(id: string): Promise<string[]> {
  const database = await openEvidenceDatabase();
  const photos = await new Promise<string[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error ?? new Error("Foto bukti gagal dibaca."));
  });
  database.close();
  return photos;
}

export async function deleteViolationEvidence(id: string): Promise<void> {
  const database = await openEvidenceDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Foto bukti gagal dihapus."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Foto bukti gagal dihapus."));
  });
  database.close();
}
