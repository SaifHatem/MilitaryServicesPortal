import http from 'k6/http';

export const options = {
  vus: 1,
  iterations: 5,
};

export default function () {
  http.get('http://localhost:5000/api/services');
}
