import { useEffect, useState } from "react";

// Reads window.location.origin client-side only — avoids a server/client
// markup mismatch, since the server has no request origin to render with.
export function useOrigin(): string {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  return origin;
}
