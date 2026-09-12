export function handleHealth(req, res) {
  const memoryUsage = process.memoryUsage();
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({
    status: 'online',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    memory: {
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    },
    services: [
      { name: 'overpass', path: '/api/overpass', status: 'ready' },
      { name: 'traffic', path: '/api/traffic', status: 'ready' },
      { name: 'cctv', path: '/api/cctv', status: 'ready' },
      { name: 'flights', path: '/api/flights', status: 'ready' },
    ],
  }));
}
