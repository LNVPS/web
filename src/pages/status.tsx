import { EventKind, RequestBuilder, EventBuilder } from "@snort/system";
import { useRequestBuilder } from "@snort/system-react";
import { useState, useEffect, useMemo } from "react";
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
  type?: "outage" | "maintenance" | "degraded" | "informational";
  tags: string[];
  content: string;
  endedCleared?: boolean;
  lastUpdated: number;
}

export function StatusPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const login = useLogin();
  const canEdit = login?.publicKey === NostrProfile.id;

  function StatusBadge({ status }: { status: string }) {
    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case "resolved":
          return "bg-cyber-primary/30 text-cyber-text-bright";
        case "active":
          return "bg-cyber-danger/30 text-cyber-text-bright";
        case "monitoring":
          return "bg-cyber-warning/30 text-cyber-text-bright";
        case "investigating":
          return "bg-cyber-warning/30 text-cyber-text-bright";
        default:
          return "bg-cyber-panel-light text-cyber-text-bright";
      }
    };

    return (
      <span
        className={`px-2 py-1 rounded-sm text-xs font-medium ${getStatusColor(status)}`}
      >
        {status}
      </span>
    );
  }

  function TypeBadge({ type }: { type: string }) {
    const getTypeColor = (type: string) => {
      switch (type.toLowerCase()) {
        case "outage":
          return "bg-cyber-danger/30 text-cyber-text-bright";
        case "degraded":
          return "bg-cyber-warning/30 text-cyber-text-bright";
        case "maintenance":
          return "bg-cyber-accent/30 text-cyber-text-bright";
        case "informational":
          return "bg-cyber-muted text-cyber-text-bright";
        default:
          return "bg-cyber-panel-light text-cyber-text-bright";
      }
    };

    const getTypeLabel = (type: string) => {
      switch (type.toLowerCase()) {
        case "degraded":
          return "Degraded";
        case "maintenance":
          return "Maintenance";
        case "informational":
          return "Info";
        case "outage":
        default:
          return "Outage";
      }
    };

    return (
      <span
        className={`px-2 py-1 rounded-sm text-xs font-medium ${getTypeColor(type)}`}
      >
        {getTypeLabel(type)}
      </span>
    );
  }

  function ActiveDuration({
    startTime,
    isActive,
  }: {
    startTime: number;
    isActive: boolean;
  }) {
    const [duration, setDuration] = useState(0);

    useEffect(() => {
      if (!isActive) return;

      const updateDuration = () => {
        const now = Math.floor(Date.now() / 1000);
        setDuration(now - startTime);
      };

      updateDuration();
      const interval = setInterval(updateDuration, 1000);

      return () => clearInterval(interval);
    }, [startTime, isActive]);

    if (!isActive) return null;

    return (
      <span className="text-xs text-cyber-muted bg-cyber-panel-light px-2 py-1 rounded-sm">
        Active for {formatDuration(duration)}
      </span>
    );
  }

  const req = useMemo(() => {
    const builder = new RequestBuilder("status");
    builder
      .withOptions({ leaveOpen: true })
      .withFilter()
      .kinds([30999 as EventKind])
      .authors([NostrProfile.id])
      .limit(50);
    return builder;
  }, []);

  const events = useRequestBuilder(req);

  const allIncidents = events
    .map((ev) => {
      const dTag = ev.tags.find((t) => t[0] === "d");
      const titleTag = ev.tags.find((t) => t[0] === "title");
      const startedTag = ev.tags.find((t) => t[0] === "started");
      const endedTag = ev.tags.find((t) => t[0] === "ended");
      const serviceTags = ev.tags
        .filter((t) => t[0] === "service")
        .map((t) => t[1]);
      const locationTags = ev.tags
        .filter((t) => t[0] === "location")
        .map((t) => t[1]);
      const statusTag = ev.tags.find((t) => t[0] === "status");
      const typeTag = ev.tags.find((t) => t[0] === "type");
      const relevantTags = ev.tags.filter((t) => t[0] === "t").map((t) => t[1]);

      return {
        id: dTag?.[1],
        title: titleTag?.[1] || "Unknown Incident",
        started: startedTag ? parseInt(startedTag[1]) : ev.created_at,
        ended: endedTag ? parseInt(endedTag[1]) : undefined,
        service: serviceTags.join(", "),
        location: locationTags.join(", "),
        status: statusTag?.[1] || "Unknown",
        type:
          (typeTag?.[1] as
            | "outage"
            | "maintenance"
            | "degraded"
            | "informational") || "outage",
        tags: relevantTags,
        content: ev.content,
        lastUpdated: ev.created_at,
      };
    })
    .sort((a, b) => b.started - a.started);

  const activeIncidents = allIncidents.filter((incident) => !incident.ended);
  const resolvedIncidents = allIncidents.filter((incident) => incident.ended);

  const totalDowntime = allIncidents.reduce((acc, incident) => {
    // Only count incidents that affect uptime (exclude maintenance and informational)
    if (incident.type === "maintenance" || incident.type === "informational") {
      return acc;
    }

    let duration;
    if (incident.ended) {
      // Completed incident - use actual duration
      duration = incident.ended - incident.started;
    } else {
      // Ongoing incident - use current duration
      const now = Math.floor(currentTime / 1000);
      duration = now - incident.started;
    }
    acc += duration * 1000; // Convert to milliseconds
    return acc;
  }, 0);

  const age = currentTime - ServiceBirth.getTime();
  const uptime = 1 - totalDowntime / age;

  // Update current time every second for accurate uptime calculation, but only when needed
  useEffect(() => {
    // Only update if there are ongoing incidents and we're not in edit mode
    const hasOngoingIncidents = activeIncidents.length > 0;
    const isEditing = editingId !== null;

    if (!hasOngoingIncidents || isEditing) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [activeIncidents, editingId]);

  function formatDuration(n: number) {
    const days = Math.floor(n / 86400);
    const hours = Math.floor((n % 86400) / 3600);
    const minutes = Math.floor((n % 3600) / 60);
    const seconds = Math.floor(n % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
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
      ["status", updates.status || incident.status],
      ["type", updates.type || incident.type || "outage"],
    ];

    // Add multiple service tags
    const services = updates.service || incident.service || "";
    if (services) {
      services.split(",").forEach((service: string) => {
        const trimmedService = service.trim();
        if (trimmedService) tags.push(["service", trimmedService]);
      });
    }

    // Add multiple location tags
    const locations = updates.location || incident.location || "";
    if (locations) {
      locations.split(",").forEach((location: string) => {
        const trimmedLocation = location.trim();
        if (trimmedLocation) tags.push(["location", trimmedLocation]);
      });
    }

    // Only add ended tag if there's actually an ended value and it wasn't explicitly cleared
    if (updates.endedCleared) {
      // Don't add ended tag - this effectively removes it
    } else {
      const endedValue =
        updates.ended !== undefined ? updates.ended : incident.ended;
      if (endedValue) {
        tags.push(["ended", String(endedValue)]);
      }
    }

    // Add relevant tags
    const relevantTags = updates.tags || incident.tags || [];
    relevantTags.forEach((tag: string) => {
      if (tag.trim()) tags.push(["t", tag.trim()]);
    });

    setEditingId(null);

    const ev = await signer.generic((eb: EventBuilder) => {
      let builder = eb
        .kind(30999 as EventKind)
        .content(updates.content || incident.content || "");

      tags.forEach((tag) => (builder = builder.tag(tag)));
      return builder;
    });
    login?.system.BroadcastEvent(ev);
  }

  // Helper function to convert Unix timestamp to local datetime-local format
  function timestampToLocalDateTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    // Adjust for timezone offset to show local time in the input
    const offsetMs = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offsetMs);
    return localDate.toISOString().slice(0, 16);
  }

  // Helper function to convert datetime-local value to Unix timestamp
  function localDateTimeToTimestamp(dateTimeValue: string): number {
    // datetime-local is already in local time, so we create a date normally
    return Math.floor(new Date(dateTimeValue).getTime() / 1000);
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
      type: incident.type || "outage",
      tags: incident.tags.join(", "),
      started: timestampToLocalDateTime(incident.started),
      ended: incident.ended ? timestampToLocalDateTime(incident.ended) : "",
    });

    const handleSubmit = () => {
      const updates = {
        ...formData,
        started: localDateTimeToTimestamp(formData.started),
        tags: formData.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean),
        ended:
          formData.ended && formData.ended.trim()
            ? localDateTimeToTimestamp(formData.ended)
            : undefined, // Use undefined to explicitly indicate we want to clear it
        endedCleared: !formData.ended || !formData.ended.trim(), // Flag to indicate if ended was cleared
      };
      updateIncident(incident, updates);
    };

    return (
      <div className="space-y-4">
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full p-2 bg-cyber-panel-light rounded-sm"
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
            className="p-2 bg-cyber-panel-light rounded-sm"
            placeholder="Services (comma separated)"
          />
          <input
            type="text"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            className="p-2 bg-cyber-panel-light rounded-sm"
            placeholder="Locations (comma separated)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            className="p-2 bg-cyber-panel-light rounded-sm"
            required
          >
            <option value="Active">Active</option>
            <option value="Resolved">Resolved</option>
            <option value="Monitoring">Monitoring</option>
            <option value="Investigating">Investigating</option>
          </select>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as
                  | "outage"
                  | "maintenance"
                  | "degraded"
                  | "informational",
              })
            }
            className="p-2 bg-cyber-panel-light rounded-sm"
            required
          >
            <option value="outage">Outage</option>
            <option value="degraded">Degraded Performance</option>
            <option value="maintenance">Maintenance</option>
            <option value="informational">Informational</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-cyber-muted mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={formData.started}
              onChange={(e) =>
                setFormData({ ...formData, started: e.target.value })
              }
              className="w-full p-2 bg-cyber-panel-light rounded-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-cyber-muted mb-1">
              End Time (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={formData.ended}
                onChange={(e) =>
                  setFormData({ ...formData, ended: e.target.value })
                }
                className="flex-1 p-2 bg-cyber-panel-light rounded-sm"
              />
              {formData.ended && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ended: "" })}
                  className="px-3 py-2 bg-cyber-panel-light hover:bg-cyber-panel rounded-sm text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          className="w-full p-2 bg-cyber-panel-light rounded-sm"
          placeholder="Tags (comma separated)"
        />

        <textarea
          value={formData.content}
          onChange={(e) =>
            setFormData({ ...formData, content: e.target.value })
          }
          className="w-full p-2 bg-cyber-panel-light rounded-sm h-32"
          placeholder="Incident description (markdown supported)"
        />

        <div className="flex gap-2">
          <AsyncButton
            onClick={handleSubmit}
            className="bg-cyber-accent/20 hover:bg-cyber-accent/30 border border-cyber-accent text-cyber-accent px-4 py-2 rounded-sm"
          >
            Save
          </AsyncButton>
          <AsyncButton
            onClick={onCancel}
            className="bg-cyber-panel-light hover:bg-cyber-panel border border-cyber-border px-4 py-2 rounded-sm"
          >
            Cancel
          </AsyncButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-2xl">Uptime: {(100 * uptime).toFixed(5)}%</div>

      {canEdit && (
        <div className="flex justify-end">
          <AsyncButton
            onClick={() => setEditingId("new")}
            className="bg-cyber-primary/20 hover:bg-cyber-primary/30 border border-cyber-primary text-cyber-primary px-4 py-2"
          >
            New Incident
          </AsyncButton>
        </div>
      )}

      {editingId === "new" && (
        <div className="rounded-sm bg-cyber-panel px-3 py-4">
          <EditForm
            incident={{
              id: crypto.randomUUID(),
              title: "",
              content: "",
              service: "",
              location: "",
              status: "Active",
              type: "outage",
              tags: [],
              started: Math.floor(Date.now() / 1000),
              ended: undefined,
              lastUpdated: Math.floor(Date.now() / 1000),
            }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      {activeIncidents.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="text-lg font-semibold text-cyber-danger">
            Active Incidents
          </div>
          {activeIncidents.map((incident, index) => {
            const end = incident.ended
              ? new Date(incident.ended * 1000)
              : undefined;
            const start = new Date(incident.started * 1000);
            const duration = end ? end.getTime() - start.getTime() : undefined;

            return (
              <div
                key={index}
                className="rounded-sm bg-cyber-panel px-3 py-4 flex flex-col gap-2"
              >
                {editingId === incident.id ? (
                  <EditForm
                    incident={incident}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="text-xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div>{incident.title}</div>
                        <StatusBadge status={incident.status} />
                        <TypeBadge type={incident.type || "outage"} />
                        <ActiveDuration
                          startTime={incident.started}
                          isActive={!incident.ended}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div>
                          {start.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </div>
                        {canEdit && (
                          <AsyncButton
                            onClick={() => setEditingId(incident.id || "")}
                            className="p-1 hover:bg-cyber-panel rounded-sm"
                          >
                            <Icon name="pencil" size={16} />
                          </AsyncButton>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-cyber-muted items-center">
                      {incident.service && (
                        <div>Service: {incident.service}</div>
                      )}
                      {incident.location && (
                        <div>Location: {incident.location}</div>
                      )}
                      <div>
                        Last updated:{" "}
                        {new Date(
                          incident.lastUpdated * 1000,
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                    </div>
                    {incident.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {incident.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="bg-cyber-panel-light px-2 py-1 rounded-sm text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {duration && (
                      <div className="text-sm text-cyber-muted">
                        Duration: {formatDuration(duration / 1000)}
                      </div>
                    )}
                    <Markdown content={incident.content} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resolvedIncidents.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="text-lg font-semibold text-cyber-primary">
            Resolved Incidents
          </div>
          {resolvedIncidents.map((incident, index) => {
            const end = incident.ended
              ? new Date(incident.ended * 1000)
              : undefined;
            const start = new Date(incident.started * 1000);
            const duration = end ? end.getTime() - start.getTime() : undefined;

            return (
              <div
                key={index}
                className="rounded-sm bg-cyber-panel px-3 py-4 flex flex-col gap-2"
              >
                {editingId === incident.id ? (
                  <EditForm
                    incident={incident}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="text-xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div>{incident.title}</div>
                        <StatusBadge status={incident.status} />
                        <TypeBadge type={incident.type || "outage"} />
                        <ActiveDuration
                          startTime={incident.started}
                          isActive={!incident.ended}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div>
                          {start.toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </div>
                        {canEdit && (
                          <AsyncButton
                            onClick={() => setEditingId(incident.id || "")}
                            className="p-1 hover:bg-cyber-panel rounded-sm"
                          >
                            <Icon name="pencil" size={16} />
                          </AsyncButton>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-cyber-muted items-center">
                      {incident.service && (
                        <div>Service: {incident.service}</div>
                      )}
                      {incident.location && (
                        <div>Location: {incident.location}</div>
                      )}
                      <div>
                        Last updated:{" "}
                        {new Date(
                          incident.lastUpdated * 1000,
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                    </div>
                    {incident.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {incident.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="bg-cyber-panel-light px-2 py-1 rounded-sm text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {duration && (
                      <div className="text-sm text-cyber-muted">
                        Duration: {formatDuration(duration / 1000)}
                      </div>
                    )}
                    <Markdown content={incident.content} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {allIncidents.length === 0 && <div>No incidents to report.</div>}
    </div>
  );
}
