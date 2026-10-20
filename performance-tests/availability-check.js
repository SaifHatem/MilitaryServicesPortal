import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 30,
};

export default function () {
  const response = http.get('http://localhost:5000/api/services', {
    timeout: '5s',
  });

  const ok = check(response, {
    'services endpoint returns HTTP 200': (r) => r.status === 200,
  });

  console.log(`status=${response.status} duration_ms=${response.timings.duration} available=${ok}`);

  sleep(10);
}
