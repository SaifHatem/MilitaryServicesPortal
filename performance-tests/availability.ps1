
$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "availability-check.js"
$logPath = Join-Path $PSScriptRoot "availability.csv"

@'
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 30,
};

export default function () {
  const response = http.get('http://localhost:5000/api/services', {
    timeout: '5s',
    tags: { check_type: 'availability' },
  });

  console.log(
    `status=${response.status} duration_ms=${response.timings.duration}`
  );

  sleep(10);
}
'@ | Set-Content -Encoding utf8 $scriptPath

& "C:\Program Files\k6\k6.exe" run `
    --summary-export $logPath `
    $scriptPath
