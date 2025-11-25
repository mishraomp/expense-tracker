import http from "k6/http";
import { check } from "k6";
import { Trend } from "k6/metrics";
import { randomSeed, randomString } from "k6";

const baseUrl = __ENV.BASE_URL || "http://localhost:3000";
const endpoint = "/api/v1/attachments";

export let options = {
  vus: __ENV.K6_VUS ? parseInt(__ENV.K6_VUS) : 5,
  duration: __ENV.K6_DURATION || "30s",
  thresholds: {
    "http_req_duration{endpoint:attachments}": ["p(95)<300"],
  },
};

const uploadLat = new Trend("attachments_upload_latency");

randomSeed(1234);

function randomFileContent(size) {
  let s = "";
  for (let i = 0; i < size; i++)
    s += String.fromCharCode(97 + Math.floor(Math.random() * 26));
  return s;
}

export default function () {
  const url = `${baseUrl}${endpoint}`;
  const boundary = `----WebKitFormBoundary${randomString(12)}`;
  const filename = `synthetic-${randomString(6)}.txt`;
  const payload = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: text/plain\r\n\r\n${randomFileContent(
    512
  )}\r\n--${boundary}--\r\n`;
  const res = http.post(url, payload, {
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    tags: { endpoint: "attachments" },
  });
  uploadLat.add(res.timings.duration);
  check(res, { "status was 201": (r) => r.status === 201 });
}
