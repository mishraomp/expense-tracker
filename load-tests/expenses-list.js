import http from "k6/http";
import { check } from "k6";
import { Trend } from "k6/metrics";

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";
const endpoint = "/api/v1/expenses";

export let options = {
  vus: __ENV.K6_VUS ? parseInt(__ENV.K6_VUS) : 10,
  duration: __ENV.K6_DURATION || "30s",
  thresholds: {
    "http_req_duration{endpoint:expenses}": ["p(95)<300"],
  },
};

const expLat = new Trend("expenses_latency");

export default function () {
  const url = `${baseUrl}${endpoint}?page=1&pageSize=20&sortOrder=desc&sortBy=date`;
  const res = http.get(url, { tags: { endpoint: "expenses" } });
  expLat.add(res.timings.duration);
  check(res, { "status was 200": (r) => r.status === 200 });
}
