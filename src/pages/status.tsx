import { EventKind, RequestBuilder, EventBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useState } from "react";
import Markdown from "../components/markdown";
import { NostrProfile, ServiceBirth } from "../const";
import useLogin from "../hooks/login";
import { LoginState } from "../login";
import { AsyncButton } from "../components/button";
import { Icon } from "../components/icon";

interface Incident {
  id?: string;
  title: string;
  started: number;
  ended?: number;
  service?: string;
  location?: string;
  status: string;
  tags: string[];
  content: string;
}

export function StatusPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const login = useLogin();
  const canEdit = login?.publicKey === NostrProfile.id;

  const req = new RequestBuilder("status");
  req
    .withOptions({ leaveOpen: true })
    .withFilter()
    .kinds([30999 as EventKind])
    .authors([NostrProfile.id])
    .limit(50);

  const events = useRequestBuilder(req);
  console.debug(events);
  const incidents = events
    .map((ev) => {
      const dTag = ev.tags.find((t) => t[0] === "d");
      const titleTag = ev.tags.find((t) => t[0] === "title");
      const startedTag = ev.tags.find((t) => t[0] === "started");
      const endedTag = ev.tags.find((t) => t[0] === "ended");
      const serviceTags = ev.tags
        .filter((t) => t[0] === "service")
        .map((t) => t[1]);
      const locationTag = ev.tags.find((t) => t[0] === "location");
      const statusTag = ev.tags.find((t) => t[0] === "status");
      const relevantTags = ev.tags.filter((t) => t[0] === "t").map((t) => t[1]);

      return {
        id: dTag?.[1],
        title: titleTag?.[1] || "Unknown Incident",
        started: startedTag ? parseInt(startedTag[1]) : ev.created_at,
        ended: endedTag ? parseInt(endedTag[1]) : undefined,
        service: serviceTags.join(", "),
        location: locationTag?.[1],
        status: statusTag?.[1] || "Unknown",
        tags: relevantTags,
        content: ev.content,
      };
    })
    .sort((a, b) => b.started - a.started);

  const totalDowntime = incidents.reduce((acc, incident) => {
    if (incident.ended) {
      const duration = incident.ended - incident.started;
      acc += duration * 1000; // Convert to milliseconds
    }
    return acc;
  }, 0);

  const now = new Date();
  const age = now.getTime() - ServiceBirth.getTime();
  const uptime = 1 - totalDowntime / age;

  function formatDuration(n: number) {
    if (n > 3600) {
      return `${(n / 3600).toFixed(0)}h ${((n % 3600) / 60).toFixed(0)}m`;
    } else if (n > 60) {
      return `${(n % 60).toFixed(0)}m`;
    } else {
      return `${n.toFixed(0)}s`;
    }
  }

  async function updateIncident(
    incident: Incident,
    updates: Partial<Incident>,
  ) {
    const signer = LoginState.getSigner();
    if (!signer) return;

    const tags = [
      ["d", incident.id || crypto.randomUUID()],
      ["title", updates.title || incident.title],
      ["started", String(updates.started || incident.started)],
      ["location", updates.location || incident.location || ""],
      ["status", updates.status || incident.status],
    ];

    // Add multiple service tags
    const services = updates.service || incident.service || "";
    if (services) {
      services.split(",").forEach((service: string) => {
        const trimmedService = service.trim();
        if (trimmedService) tags.push(["service", trimmedService]);
      });
    }

    if (updates.ended || incident.ended) {
      tags.push(["ended", String(updates.ended || incident.ended)]);
    }

    // Add relevant tags
    const relevantTags = updates.tags || incident.tags || [];
    relevantTags.forEach((tag: string) => {
      if (tag.trim()) tags.push(["t", tag.trim()]);
    });

    const ev = await signer.generic((eb: EventBuilder) => {
      let builder = eb
        .kind(30999 as EventKind)
        .content(updates.content || incident.content || "");

      tags.forEach((tag) => (builder = builder.tag(tag)));
      return builder;
    });
    await login?.system.BroadcastEvent(ev);

    setEditingId(null);
  }

  function EditForm({
    incident,
    onCancel,
  }: {
    incident: Incident;
    onCancel: () => void;
  }) {
    const [formData, setFormData] = useState({
      title: incident.title,
      content: incident.content || "",
      service: incident.service || "",
      location: incident.location || "",
      status: incident.status,
      tags: incident.tags.join(", "),
      started: new Date(incident.started * 1000).toISOString().slice(0, 16),
      ended: incident.ended
        ? new Date(incident.ended * 1000).toISOString().slice(0, 16)
        : "",
    });

    const handleSubmit = () => {
      const updates = {
        ...formData,
        started: Math.floor(new Date(formData.started).getTime() / 1000),
        tags: formData.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean),
        ended: formData.ended
          ? Math.floor(new Date(formData.ended).getTime() / 1000)
          : undefined,
      };
      updateIncident(incident, updates);
    };

    return (
      <div className="space-y-4">
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full p-2 bg-neutral-800 rounded"
          placeholder="Incident title"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            value={formData.service}
            onChange={(e) =>
              setFormData({ ...formData, service: e.target.value })
            }
            className="p-2 bg-neutral-800 rounded"
            placeholder="Services (comma separated)"
          />
          <input
            type="text"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            className="p-2 bg-neutral-800 rounded"
            placeholder="Location"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            className="p-2 bg-neutral-800 rounded"
            required
          >
            <option value="Active">Active</option>
            <option value="Resolved">Resolved</option>
            <option value="Monitoring">Monitoring</option>
            <option value="Investigating">Investigating</option>
          </select>
          <div></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={formData.started}
              onChange={(e) =>
                setFormData({ ...formData, started: e.target.value })
              }
              className="w-full p-2 bg-neutral-800 rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              End Time (optional)
            </label>
            <input
              type="datetime-local"
              value={formData.ended}
              onChange={(e) =>
                setFormData({ ...formData, ended: e.target.value })
              }
              className="w-full p-2 bg-neutral-800 rounded"
            />
          </div>
        </div>

        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          className="w-full p-2 bg-neutral-800 rounded"
          placeholder="Tags (comma separated)"
        />

        <textarea
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
          className="w-full p-2 bg-neutral-800 rounded h-32"
          placeholder="Incident description (markdown supported)"
        />

        <div className="flex gap-2">
          <AsyncButton
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Save
          </AsyncButton>
          <button
            type="button"
            onClick={onCancel}
            className="bg-neutral-600 hover:bg-neutral-700 px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-2xl">Uptime: {(100 * uptime).toFixed(5)}%</div>

      <div className="flex justify-between items-center">
        <div className="text-xl">Incidents:</div>
        {canEdit && (
          <AsyncButton
            onClick={() => setEditingId("new")}
            className="bg-green-600 hover:bg-green-700 px-4 py-2"
          >
            New Incident
          </AsyncButton>
        )}
      </div>

      {editingId === "new" && (
        <div className="rounded-xl bg-neutral-900 px-3 py-4">
          <EditForm
            incident={{
              id: crypto.randomUUID(),
              title: "",
              content: "",
              service: "",
              location: "",
              status: "Active",
              tags: [],
              started: Math.floor(Date.now() / 1000),
              ended: undefined,
            }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}
      {incidents.map((incident, index) => {
        const end = incident.ended
          ? new Date(incident.ended * 1000)
          : undefined;
        const start = new Date(incident.started * 1000);
        const duration = end ? end.getTime() - start.getTime() : undefined;

        return (
          <div
            key={index}
            className="rounded-xl bg-neutral-900 px-3 py-4 flex flex-col gap-2"
          >
            {editingId === incident.id ? (
              <EditForm
                incident={incident}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="text-xl flex justify-between items-center">
                  <div>{incident.title}</div>
                  <div className="flex items-center gap-2">
                    <div>{start.toLocaleString()}</div>
                    {canEdit && (
                      <AsyncButton
                        onClick={() => setEditingId(incident.id || "")}
                        className="p-1 hover:bg-neutral-700 rounded"
                      >
                        <Icon name="pencil" size={16} />
                      </AsyncButton>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-neutral-400">
                  {incident.service && <div>Service: {incident.service}</div>}
                  {incident.location && (
                    <div>Location: {incident.location}</div>
                  )}
                  <div>Status: {incident.status}</div>
                </div>
                {incident.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {incident.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="bg-neutral-800 px-2 py-1 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {duration && (
                  <div className="text-sm text-neutral-400">
                    Duration: {formatDuration(duration / 1000)}
                  </div>
                )}
                <Markdown content={incident.content} />
              </>
            )}
          </div>
        );
      })}
      {incidents.length === 0 && <div>No incidents to report.</div>}
    </div>
  );
}
