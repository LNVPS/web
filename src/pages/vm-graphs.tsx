import { Link, useLocation } from "react-router-dom";
import { TimeSeriesData, VmInstance } from "../api";
import useLogin from "../hooks/login";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";

export function VmGraphsPage() {
  const { state } = useLocation() as { state?: VmInstance };
  const login = useLogin();
  const [data, setData] = useState<Array<TimeSeriesData>>();

  useEffect(() => {
    if (!state) return;
    login?.api.getVmTimeSeries(state.id).then(setData);
  }, [login]);

  const maxRam =
    data?.reduce((acc, v) => {
      const mb = v.memory_size / 1024 / 1024;
      return acc < mb ? mb : acc;
    }, 0) ?? 0;

  const KB = 1024;
  const MB = 1024 * 1024;
  function scaleLabel(v: number) {
    switch (v) {
      case MB:
        return "MiB";
      case KB:
        return "KiB";
    }
    return "B";
  }
  const net_scale =
    data?.reduce((acc, v) => {
      const b = Math.max(v.net_in, v.net_out);
      if (b > MB && b > acc) {
        return MB;
      } else if (b > KB && b > acc) {
        return KB;
      } else {
        return acc;
      }
    }, 0) ?? 0;
  const net_scale_label = scaleLabel(net_scale);
  const disk_scale =
    data?.reduce((acc, v) => {
      const b = Math.max(v.disk_read, v.disk_write);
      if (b > MB && b > acc) {
        return MB;
      } else if (b > KB && b > acc) {
        return KB;
      } else {
        return acc;
      }
    }, 0) ?? 0;
  const disk_scale_label = scaleLabel(disk_scale);
  const sortedData = (data ?? [])
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((v) => ({
      timestamp: new Date(v.timestamp * 1000).toLocaleTimeString(),
      CPU: 100 * v.cpu,
      RAM: v.memory / 1024 / 1024,
      NET_IN: v.net_in / net_scale,
      NET_OUT: v.net_out / net_scale,
      DISK_READ: v.disk_read / disk_scale,
      DISK_WRITE: v.disk_write / disk_scale,
    }));
  const toolTip = (
    <Tooltip
      cursor={{ fill: "rgba(200,200,200,0.5)" }}
      content={({ active, payload }) => {
        if (active && payload && payload.length) {
          const data = payload[0].payload as TimeSeriesData;
          return (
            <div className="flex flex-col gap-2 bg-cyber-panel-light border border-cyber-border rounded px-2 py-3">
              <div>{data.timestamp}</div>
              {payload.map((p) => (
                <div>
                  {p.name}: {Number(p.value).toFixed(2)}
                  {p.unit}
                </div>
              ))}
            </div>
          );
        }
      }}
    />
  );
  return (
    <div className="flex flex-col gap-4">
      <Link to={"/vm"} state={state}>
        &lt; Back
      </Link>
      <h2>CPU</h2>
      <ResponsiveContainer height={200}>
        <LineChart
          data={sortedData}
          margin={{ left: 0, right: 0 }}
          style={{ userSelect: "none" }}
        >
          <XAxis dataKey="timestamp" />
          <YAxis unit="%" domain={[0, 100]} />
          <Line type="monotone" dataKey="CPU" unit="%" dot={false} />
          {toolTip}
        </LineChart>
      </ResponsiveContainer>
      <h2>Memory</h2>
      <ResponsiveContainer height={200}>
        <LineChart
          data={sortedData}
          margin={{ left: 0, right: 0 }}
          style={{ userSelect: "none" }}
        >
          <XAxis dataKey="timestamp" />
          <YAxis unit="MB" domain={[0, maxRam]} />
          <Line type="monotone" dataKey="RAM" unit="MB" dot={false} />
          {toolTip}
        </LineChart>
      </ResponsiveContainer>
      <h2>Network</h2>
      <ResponsiveContainer height={200}>
        <LineChart
          data={sortedData}
          margin={{ left: 20, right: 0 }}
          style={{ userSelect: "none" }}
        >
          <XAxis dataKey="timestamp" />
          <YAxis unit={`${net_scale_label}/s`} domain={[0, "auto"]} />
          <Line
            type="monotone"
            dataKey="NET_IN"
            unit={`${net_scale_label}/s`}
            stroke="#ff0040"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="NET_OUT"
            unit={`${net_scale_label}/s`}
            stroke="#39ff14"
            dot={false}
          />
          {toolTip}
          <Legend />
        </LineChart>
      </ResponsiveContainer>
      <h2>Disk</h2>
      <ResponsiveContainer height={200}>
        <LineChart
          data={sortedData}
          margin={{ left: 20, right: 0 }}
          style={{ userSelect: "none" }}
        >
          <XAxis dataKey="timestamp" />
          <YAxis unit={`${disk_scale_label}/s`} domain={[0, "auto"]} />
          <Line
            type="monotone"
            dataKey="DISK_READ"
            unit={`${disk_scale_label}/s`}
            stroke="#ff0040"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="DISK_WRITE"
            unit={`${disk_scale_label}/s`}
            stroke="#39ff14"
            dot={false}
          />
          {toolTip}
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
