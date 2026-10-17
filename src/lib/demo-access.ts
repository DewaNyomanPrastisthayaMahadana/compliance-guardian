export type AppRole = "super-admin" | "petugas-sbu" | "mitra" | "petugas-mitra";

export const roleOptions = [
  { value: "super-admin", label: "Super Admin" },
  { value: "petugas-sbu", label: "Petugas SBU" },
  { value: "mitra", label: "Mitra" },
  { value: "petugas-mitra", label: "Petugas Mitra" },
] as const satisfies readonly { value: AppRole; label: string }[];

export const roleDetails: Record<
  AppRole,
  { label: string; organization: string; initials: string; landingPath: "/" | "/portal" }
> = {
  "super-admin": {
    label: "Super Admin",
    organization: "PLN Icon Plus · Material & Jasa",
    initials: "SA",
    landingPath: "/",
  },
  "petugas-sbu": {
    label: "Petugas SBU",
    organization: "PLN Icon Plus · Wilayah SBU",
    initials: "QC",
    landingPath: "/",
  },
  mitra: {
    label: "Mitra",
    organization: "Perusahaan Mitra",
    initials: "MT",
    landingPath: "/",
  },
  "petugas-mitra": {
    label: "Petugas Mitra",
    organization: "Petugas Lapangan Mitra",
    initials: "PM",
    landingPath: "/",
  },
};

const accessiblePaths: Record<AppRole, string[]> = {
  "super-admin": [
    "/",
    "/lapor",
    "/pelanggaran",
    "/mitra",
    "/portal",
    "/pengguna",
    "/buat-akun",
    "/data-akun",
    "/faq",
  ],
  "petugas-sbu": ["/", "/pelanggaran", "/mitra", "/portal", "/faq"],
  mitra: ["/", "/pelanggaran", "/mitra", "/portal", "/faq"],
  "petugas-mitra": ["/", "/pelanggaran", "/mitra", "/portal", "/faq"],
};

export function canAccessPath(role: AppRole, path: string) {
  return accessiblePaths[role]?.includes(path) ?? false;
}
