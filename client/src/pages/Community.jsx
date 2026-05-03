import React, { useEffect, useState } from "react";
import { ExternalLink, Users } from "lucide-react";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import { apiFetch } from "../api/api";

export default function Community() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  async function fetchGroups() {
    try {
      setLoading(true);
      const data = await apiFetch("/api/student/community-groups");
      setGroups(data.groups || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case "whatsapp":
        return "W";
      case "discord":
        return "D";
      case "telegram":
        return "T";
      default:
        return "G";
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl dark:text-slate-100">Community</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Join your active links shared by admins.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl dark:text-slate-100">Community</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Click a published link to join your group or live channel.</p>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      ) : null}

      {groups.length ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {groups.map((group) => (
            <Card key={group._id} variant="light">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 font-bold text-primary">
                  {getPlatformIcon(group.platform)}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{group.name}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{group.description || "Join your learning community."}</div>
                  {group.link ? (
                    <a
                      href={group.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open {group.platform}
                    </a>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card variant="light">
          <EmptyState icon={Users} title="No community links yet" description="Admins will publish WhatsApp and other links here." />
        </Card>
      )}
    </div>
  );
}
