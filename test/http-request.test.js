import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { connect, createServer } from "node:net";
import handler from "../api/[...path].js";

test("malformed request targets return 400 in Vercel without throwing", async () => {
  let body;
  const res = { statusCode: 0, setHeader() {}, end(value) { body = JSON.parse(value); } };
  await handler({ url: "//[", method: "GET" }, res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(body, { error: "invalid_request_url" });
});

test("a malformed HTTP target cannot terminate the hosted Node service", { timeout: 10000 }, async t => {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: new URL("../", import.meta.url),
    env: { PORT: String(port), PUBLIC_LAUNCH_MODE: "waitlist", WAITLIST_ENABLED: "false" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const exited = once(child, "exit");
  t.after(async () => { child.kill(); await exited; });
  await Promise.race([once(child.stdout, "data"), exited.then(() => { throw new Error("server_exited_before_ready"); })]);
  const socket = connect(port, "127.0.0.1");
  t.after(() => socket.destroy());
  await once(socket, "connect");
  let raw = "";
  socket.on("data", data => { raw += data; });
  socket.write("GET //[ HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n");
  await once(socket, "end");
  assert.match(raw, /^HTTP\/1\.1 400/);
  assert.match(raw, /invalid_request_url/);
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  assert.equal(child.exitCode, null);
});
