import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 5 },
    { duration: '15s', target: 10 },
    { duration: '15s', target: 15 },
    { duration: '15s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const services = http.get('http://localhost:5000/api/services');
  check(services, {
    'services returns HTTP 200': (r) => r.status === 200,
  });

  const requirements = http.get(
    'http://localhost:5000/api/requirements/6aa2a7960d5df965d2b78d5e'
  );
  check(requirements, {
    'requirements returns HTTP 200': (r) => r.status === 200,
  });

  sleep(1);
}
