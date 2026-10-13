export type AppRole = "super-admin" | "mitra" | "petugas-mitra";

export const roleOptions = [
  { value: "super-admin", label: "Super Admin" },
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
  mitra: {
    label: "Mitra",
    organization: "Perusahaan mitra",
    initials: "MT",
    landingPath: "/portal",
  },
  "petugas-mitra": {
    label: "Petugas Mitra",
    organization: "Petugas Mitra",
    initials: "PM",
    landingPath: "/portal",
  },
};

const accessiblePaths: Record<AppRole, string[]> = {
  "super-admin": ["/", "/lapor", "/pelanggaran", "/mitra", "/portal", "/pengguna"],
  mitra: ["/mitra", "/portal"],
  "petugas-mitra": ["/portal"],
};

export function canAccessPath(role: AppRole, path: string) {
  return accessiblePaths[role].includes(path);
}
