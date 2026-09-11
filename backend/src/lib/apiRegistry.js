// Construit la liste réelle des routes enregistrées à partir des routeurs
// Express eux-mêmes (aucune route inventée) : chaque entrée reflète un
// app.use(prefix, router) réellement présent dans server.js.
let routes = [];

export function registerRoutes(prefix, router) {
  for (const layer of router.stack || []) {
    if (!layer.route) continue;
    const routePath = layer.route.path === '/' ? '' : layer.route.path;
    const methods = Object.keys(layer.route.methods).filter((m) => layer.route.methods[m]);
    for (const method of methods) {
      routes.push({ method: method.toUpperCase(), path: `${prefix}${routePath}` });
    }
  }
}

export function getRoutes() {
  return routes;
}
