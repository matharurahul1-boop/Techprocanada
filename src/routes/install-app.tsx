import { createFileRoute } from "@tanstack/react-router";
import { Download, Menu, Plus, Share, Smartphone } from "lucide-react";
import { useState } from "react";

import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/install-app")({
  head: () => ({
    meta: [
      { title: "Install App — TechPro Inventory Console" },
      {
        name: "description",
        content: "Add TechPro Inventory Console to your phone's home screen for a native-like experience.",
      },
      { property: "og:title", content: "Install App — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Step-by-step instructions to install TechPro Inventory Console on iOS and Android.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InstallAppPage,
});

const iosSteps = [
  {
    title: "Open in Safari",
    detail: "Open this app in the Safari browser. Other browsers (Chrome, Firefox) won't show the install option on iOS.",
  },
  {
    title: "Tap the Share button",
    detail: "Tap the Share icon at the bottom of the Safari screen.",
  },
  {
    title: "Add to Home Screen",
    detail: "Scroll down in the share sheet and tap \"Add to Home Screen\".",
  },
  {
    title: "Confirm",
    detail: "Tap Add in the top-right corner. The TechPro icon will appear on your home screen.",
  },
];

const androidSteps = [
  {
    title: "Open in Chrome",
    detail: "Open this app in Google Chrome (recommended) or any modern Android browser.",
  },
  {
    title: "Open the menu",
    detail: "Tap the ⋮ three-dot menu in the top-right corner.",
  },
  {
    title: "Install app",
    detail: "Tap \"Install app\" or \"Add to Home screen\".",
  },
  {
    title: "Confirm",
    detail: "Tap Install. The TechPro icon will be added to your home screen and app drawer.",
  },
];

function InstallAppPage() {
  const [platform, setPlatform] = useState<"ios" | "android">("ios");
  const steps = platform === "ios" ? iosSteps : androidSteps;

  return (
    <Shell eyebrow="Get the app" title="Install App">
      <div className="animate-rise space-y-5 px-5 py-6 lg:px-8 lg:py-8">
        <section className="glass-surface flex items-start gap-3 rounded-2xl border p-5 shadow-xl shadow-accent-brand/5 lg:p-6">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-brand/15 text-accent-brand">
            <Download size={20} />
          </div>
          <div>
            <p className="font-display text-lg font-bold">Install TechPro Inventory Console</p>
            <p className="mt-1 text-xs text-muted-fg">
              Add the app to your home screen for a native-like experience — full screen, no browser
              address bar, and works offline for pages you've already visited.
            </p>
          </div>
        </section>

        <section className="glass-surface flex gap-1.5 rounded-full border p-1.5">
          <button
            type="button"
            onClick={() => setPlatform("ios")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
              platform === "ios"
                ? "bg-accent-brand text-accent-brand-ink shadow"
                : "text-muted-fg hover:text-ink"
            }`}
          >
            iOS
          </button>
          <button
            type="button"
            onClick={() => setPlatform("android")}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
              platform === "android"
                ? "bg-accent-brand text-accent-brand-ink shadow"
                : "text-muted-fg hover:text-ink"
            }`}
          >
            Android
          </button>
        </section>

        <section className="glass-surface rounded-2xl border p-5 shadow-xl shadow-accent-brand/5 lg:p-6">
          <p className="font-display text-base font-bold">
            {platform === "ios" ? "Install on iPhone / iPad" : "Install on Android"}
          </p>
          <div className="mt-5 space-y-5">
            {steps.map((step, index) => (
              <div key={step.title} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-chip font-mono text-xs font-bold text-accent-brand">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-[13px] text-muted-fg">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-surface rounded-2xl border p-5 shadow-xl shadow-accent-brand/5 lg:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-chip text-muted-fg">
              {platform === "ios" ? <Share size={16} /> : <Menu size={16} />}
            </div>
            <p className="text-[13px] text-muted-fg">
              <span className="font-semibold text-ink">Tip:</span> Once installed, TechPro opens in its
              own window without browser tabs or address bar — just like a native app. You can also use
              it offline for pages you've already opened.
            </p>
          </div>
        </section>

        <section className="glass-surface flex items-center gap-3 rounded-2xl border border-dashed p-4 text-[12px] text-muted-fg">
          {platform === "ios" ? <Plus size={16} className="shrink-0" /> : <Smartphone size={16} className="shrink-0" />}
          <span>
            Don't see the install option? Make sure you're using{" "}
            {platform === "ios" ? "Safari (not Chrome or Firefox)" : "Chrome"} and that you opened this
            page directly, not inside another app's in-app browser.
          </span>
        </section>
      </div>
    </Shell>
  );
}
