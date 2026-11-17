// Plain TCP forwarding: localhost:<port> in this container -> <service>:<port>
// on the backend network. The browser then uses exactly the URLs a developer
// uses on the host (http://localhost:4200, :9595, :3000), so the API's
// absolute image URLs and the CMS's API URL resolve as they do for a person.
import net from "node:net";

function target(spec) {
  const [host, port] = String(spec).split(":");
  return { host, port: Number(port) };
}

const routes = [
  [4200, target(process.env.WEB_TARGET || "web:80")],
  [9595, target(process.env.API_TARGET || "api:9595")],
  [3000, target(process.env.CMS_TARGET || "cms:3000")],
];

function handler(to) {
  return (client) => {
    const upstream = net.connect(to.port, to.host);
    client.pipe(upstream).pipe(client);
    const close = () => { client.destroy(); upstream.destroy(); };
    client.on("error", close);
    upstream.on("error", close);
  };
}

for (const [localPort, to] of routes) {
  net.createServer(handler(to)).listen(localPort, "127.0.0.1", () => {
    console.log(`[forward] localhost:${localPort} -> ${to.host}:${to.port}`);
  });
  // "localhost" may resolve to ::1; containers without IPv6 just skip this
  net.createServer(handler(to)).on("error", () => {}).listen(localPort, "::1");
}
