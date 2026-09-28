import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { Pagination } from "@/components/Pagination";

import { removeUser, setUserActive, useStore } from "@/lib/store";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users — TechPro Inventory Console" },
      {
        name: "description",
        content:
          "Manage the crew accounts used when assigning TechPro tools and consumables to a team member.",
      },
      { property: "og:title", content: "Users — TechPro Inventory Console" },
      {
        property: "og:description",
        content: "Manage crew accounts used for TechPro tool assignments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { users, assignments } = useStore();
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleUsers = users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Shell eyebrow="Users" title="Crew & recipients">
      <div className="animate-rise px-5 py-6 lg:px-8 lg:py-8">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-display text-base font-semibold">Users</h2>
            <span className="font-mono text-[12px] text-muted-fg">{users.length} users</span>
          </div>
          <p className="mb-3 px-1 text-[12px] text-muted-fg">
            Users appear here once they sign up on the login page. There's no manual add — activate,
            deactivate, or remove a user below.
          </p>

          <div className="glass-surface divide-y divide-line overflow-hidden rounded-2xl border shadow-xl shadow-accent-brand/5">
            {users.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-fg">
                No users yet. They'll show up here once someone signs up.
              </p>
            )}
            {visibleUsers.map((user) => {
              const count = assignments.filter((a) => a.userId === user.id).length;
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      {!user.isActive && (
                        <span className="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
                          Deactivated
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[12px] text-muted-fg">
                      {count} assignments
                      {user.hasLogin && user.email ? ` · ${user.email}` : !user.hasLogin ? " · no login yet" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setUserActive(user.id, !user.isActive)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                      user.isActive
                        ? "bg-warn-soft text-warn hover:brightness-95"
                        : "bg-emerald-500/15 text-emerald-600 hover:brightness-95"
                    }`}
                  >
                    {user.isActive ? "Deactivate" : "Activate"}
                  </button>
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

          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            totalCount={users.length}
            pageSize={PAGE_SIZE}
            itemLabel="users"
          />
        </section>
      </div>
    </Shell>
  );
}
