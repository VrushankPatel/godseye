import { dispatchApiRequest } from './dispatcher.mjs';

/**
 * Vite plugin to attach backend API proxy endpoints to Vite dev server
 */
export function godseyeBackendPlugin() {
  return {
    name: 'godseye-backend-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/')) {
          try {
            const handled = await dispatchApiRequest(req, res, next);
            if (!handled && typeof next === 'function') {
              next();
            }
          } catch (err) {
            console.error('[Backend Proxy Error]', err);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Internal server error in backend proxy' }));
            }
          }
        } else if (typeof next === 'function') {
          next();
        }
      });
    },
  };
}
