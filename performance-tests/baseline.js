import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = "http://localhost:5000";

export const options = {
  stages: [
    { duration: "10s", target: 5 },
    { duration: "10s", target: 10 },
    { duration: "20s", target: 10 },
    { duration: "5s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const services = http.get(`${BASE_URL}/api/services`);

  check(services, {
    "services status is 200": (r) => r.status === 200,
  });

  const requirements = http.get(
    `${BASE_URL}/api/requirements/6aa2a7960d5df965d2b78d5e`,
  );

  check(requirements, {
    "requirements status is 200": (r) => r.status === 200,
    "requirements response is JSON": (r) =>
      r.headers["Content-Type"]?.includes("application/json"),
  });

  sleep(1);
}
