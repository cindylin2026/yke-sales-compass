import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/leads/$leadId")({
  component: () => null,
});
