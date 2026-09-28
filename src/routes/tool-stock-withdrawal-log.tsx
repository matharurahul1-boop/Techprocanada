import { createFileRoute } from "@tanstack/react-router";

import { ToolAssignedLogPage } from "./tool-assigned-log";

export const Route = createFileRoute("/tool-stock-withdrawal-log")({
  head: () => ({
    meta: [
      { title: "Tool Stock Withdrawal Log — TechPro Inventory Console" },
      {
        name: "description",
        content: "Review and filter TechPro tool stock withdrawal and assignment records.",
      },
      { property: "og:title", content: "Tool Stock Withdrawal Log — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Review issued tools, quantities, balances, dates and recipients.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ToolAssignedLogPage eyebrow="Stock withdrawal" title="Tool Stock Withdrawal Log" />
  ),
});
