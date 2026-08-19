"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const runtimeJs = path.join(__dirname, "..", "runtime", "js");
const project = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "wrapper-source", "config", "project.json"), "utf8"));
const expectedVersion = project.version;
const expectedChannel = project.channel;
const source = (name) => fs.readFileSync(path.join(runtimeJs, name), "utf8");
const run = (name, context) => vm.runInContext(source(name), context, { filename: name });

const browserWindow = {};
const browser = vm.createContext({
  window: browserWindow,
  location: { search: "", protocol: "file:", href: "file:///DiceBound/runtime/index.html" },
  navigator: { userAgent: "DiceBound identity test", language: "en", onLine: true },
  URLSearchParams,
  console,
});
browserWindow.window = browserWindow;
run("version.js", browser);
const identity = browserWindow.DiceboundVersion;
assert.ok(identity);
assert.ok(Object.isFrozen(identity));
assert.equal(identity.apiVersion, 1);
assert.equal(identity.name, "Dicebound");
assert.equal(identity.version, expectedVersion);
assert.equal(identity.channel, expectedChannel);
assert.equal(identity.displayTitle, `Dicebound: ${expectedChannel} v${expectedVersion}`);
assert.equal(identity.displayVersion, `${expectedChannel} v${expectedVersion}`);
assert.ok(identity.subtitle.startsWith(`${identity.displayVersion} · `));

run("native-http-host.js", browser);
assert.equal(browserWindow.DiceboundHost, undefined, "browser mode unexpectedly installed a native host");
run("wrapper-contract.js", browser);
assert.equal(browserWindow.DiceboundWrapperContract.appVersion, identity.version);
assert.equal(browserWindow.DiceboundWrapper.appVersion, identity.version);
run("platform.js", browser);
assert.deepEqual(JSON.parse(JSON.stringify(browserWindow.DiceboundPlatform.appInfo())), {
  appVersion: expectedVersion,
  contractVersion: 1,
  kind: "browser",
  wrapperVersion: null,
  platform: null,
  architecture: null,
  channel: expectedChannel,
  isWrapped: false,
});

const values = new Map();
browserWindow.DiceboundStorage = {
  getString: (key) => values.get(key) ?? null,
  setString: (key, value) => { values.set(key, String(value)); return true; },
  remove: (key) => values.delete(key),
  keys: () => Array.from(values.keys()),
  has: (key) => values.has(key),
  diagnostics: () => ({}),
};
run("save-system.js", browser);
assert.equal(browserWindow.DiceboundSave.gameVersion, identity.version);
assert.equal(browserWindow.DiceboundSave.diagnostics().gameVersion, identity.version);

const requests = [];
class FakeXhr {
  open(method, requestPath) { this.method = method; this.path = requestPath; }
  send(body) {
    requests.push({ method: this.method, path: this.path, body });
    this.status = 200;
    this.responseText = this.path === "/__dicebound/health" ? "dicebound-native-webview2" : "ok";
  }
}
const nativeWindow = {};
const native = vm.createContext({
  window: nativeWindow,
  location: { search: "?diceboundNative=1", protocol: "http:", href: "http://127.0.0.1/index.html?diceboundNative=1" },
  navigator: { userAgent: "DiceBound native identity test" },
  document: { readyState: "complete" },
  URLSearchParams,
  XMLHttpRequest: FakeXhr,
  encodeURIComponent,
  console,
});
nativeWindow.window = nativeWindow;
run("version.js", native);
run("native-http-host.js", native);
assert.equal(nativeWindow.DiceboundHost.metadata.wrapperVersion, identity.version);
assert.equal(nativeWindow.DiceboundHost.metadata.appVersion, identity.version);
assert.equal(nativeWindow.DiceboundHost.metadata.channel, identity.channel);
const ready = requests.find((request) => request.path === "/__dicebound/platform/ready");
assert.ok(ready, "native host did not send its ready identity");
assert.deepEqual(JSON.parse(ready.body), {
  version: expectedVersion,
  channel: expectedChannel,
  href: "http://127.0.0.1/index.html?diceboundNative=1",
  userAgent: "DiceBound native identity test",
});

const monolith = source("dicebound.js");
assert.match(monolith, /document\.title=APP_IDENTITY\.displayTitle/);
assert.match(monolith, /db060Brand\.textContent=APP_IDENTITY\.displayTitle/);
assert.match(monolith, /db060Sub\.textContent=APP_IDENTITY\.subtitle/);
assert.match(monolith, /version:APP_IDENTITY\.version,channel:APP_IDENTITY\.channel/);

console.log("Version consumers agree: central API, browser wrapper/platform/save, native host ready payload and monolith presentation pass");
