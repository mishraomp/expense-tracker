import http from "k6/http";
import { check } from "k6";
import { Trend } from "k6/metrics";

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";
const reportEndpoint = "/api/v1/reports/spending-over-time";

export let options = {
  vus: __ENV.K6_VUS ? parseInt(__ENV.K6_VUS) : 10,
  duration: __ENV.K6_DURATION || "30s",
  thresholds: {
    "http_req_duration{endpoint:reports}": ["p(95)<300"],
  },
};

const reportLat = new Trend("report_latency");

export default function () {
  const url = `${baseUrl}${reportEndpoint}`;
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = "2025-01-01";
  const res = http.get(
    `${url}?startDate=${start}&endDate=${end}&interval=month`,
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "reports" },
    }
  );
  reportLat.add(res.timings.duration);
  check(res, { "status was 200": (r) => r.status === 200 });
}
