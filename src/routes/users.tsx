import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Shell, fieldClass, labelClass } from "@/components/Shell";
import { AddButton, Sheet } from "@/components/Sheet";

import { addUser, removeUser, useStore } from "@/lib/store";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users — TechPro Inventory Console" },
      {
        name: "description",
        content:
          "Maintain the crew list used when assigning TechPro tools and consumables to a team member.",
      },
      { property: "og:title", content: "Users — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Maintain the crew list used for TechPro tool assignments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { users, assignments } = useStore();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    addUser(value);
    setName("");
    setOpen(false);
  };

  return (
    <Shell
      eyebrow="Users"
      title="Crew & recipients"
      action={<AddButton label="Add user" onClick={() => setOpen(true)} />}
    >
      <Sheet open={open} title="New user" onClose={() => setOpen(false)}>
        <form onSubmit={submit}>
          <label className={labelClass} htmlFor="user-name">
            User name
          </label>
          <input
            id="user-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya Nair"
            className={`${fieldClass} mb-5`}
          />
          <button
            type="submit"
            className="brand-gradient h-11 w-full rounded-xl text-sm font-semibold text-accent-brand-ink shadow-lg shadow-accent-brand/20 transition hover:brightness-110"
          >
            Add user
          </button>
        </form>
      </Sheet>

      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Users</h2>
            <span className="font-mono text-[12px] text-muted-fg">{users.length} users</span>
          </div>

          <div className="glass-surface divide-y divide-line overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            {users.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-fg">
                No users yet. Add your first one.
              </p>
            )}
            {users.map((user) => {
              const count = assignments.filter((a) => a.userId === user.id).length;
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="font-mono text-[12px] text-muted-fg">{count} assignments</p>
                  </div>
                  <button
                    onClick={() => removeUser(user.id)}
                    aria-label={`Remove ${user.name}`}
                    title="Remove"
                    className="grid size-8 shrink-0 place-items-center rounded-full text-muted-fg transition hover:bg-warn-soft hover:text-warn"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Shell>
  );
}
