import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pengguna")({
  beforeLoad: () => {
    throw redirect({ to: "/data-akun" });
  },
});
