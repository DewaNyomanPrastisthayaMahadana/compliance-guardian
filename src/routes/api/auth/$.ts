import { createFileRoute } from "@tanstack/react-router";
import { createAuth } from "@/lib/auth.server";

function handleAuth({ request }: { request: Request }) {
  return createAuth(request).handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handleAuth,
      POST: handleAuth,
    },
  },
});
