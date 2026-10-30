import test from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { installFlockShim } from "./helpers/flock.js";

const digest = `sha256:${"a".repeat(64)}`;
const oldImage = `sha256:${"b".repeat(64)}`;
const root = resolve(".");
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "bloli-deploy-"));
  const app = join(dir, "app"), remote = join(dir, "remote.git"), bin = join(dir, "bin");
  mkdirSync(app); mkdirSync(bin); mkdirSync(join(app, "scripts"));
  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd: app, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "Test", GIT_AUTHOR_EMAIL: "test@example.org", GIT_COMMITTER_NAME: "Test", GIT_COMMITTER_EMAIL: "test@example.org" } });
    assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
  };
  git("init", "-b", "main");
  writeFileSync(join(app, ".gitignore"), ".deploy/\nbackups/\n");
  copyFileSync(join(root, "scripts/compose.sh"), join(app, "scripts/compose.sh"));
  for (const file of ["operation-lock.sh", "refresh-countries.sh"]) copyFileSync(join(root,"scripts",file),join(app,"scripts",file));
  writeFileSync(join(app, "scripts/backup.sh"), '#!/bin/sh\n[ "${FAIL_BACKUP:-}" != 1 ] || exit 1\nmkdir -p backups\nprintf verified >backups/test.dump\nprintf "backups/test.dump\\n"\n', { mode: 0o755 });
  git("add", "."); git("commit", "-m", "baseline"); const before = git("rev-parse", "HEAD");
  git("init", "--bare", remote); git("remote", "add", "origin", remote); git("push", "origin", "main");
  writeFileSync(join(app, "release-marker"), "new code"); git("add", "."); git("commit", "-m", "release");
  const sha = git("rev-parse", "HEAD"); git("push", "origin", "main"); git("reset", "--hard", before);
  writeFileSync(join(bin, "docker"), `#!/usr/bin/env node
const fs = require('node:fs'); const a = process.argv.slice(2); const env=process.env;
fs.appendFileSync(env.TEST_LOG, JSON.stringify({args:a, api:env.BLOLI_API_IMAGE, web:env.BLOLI_WEB_IMAGE, importer:env.BLOLI_IMPORTER_IMAGE})+'\\n');
if(a[0]==='pull') { if(env.FAIL_PULL==='1') process.exit(1); }
else if(a[0]==='login') { const input=fs.readFileSync(0,'utf8'); fs.mkdirSync(env.DOCKER_CONFIG,{recursive:true}); fs.writeFileSync(env.DOCKER_CONFIG+'/config.json',JSON.stringify({auths:{'ghcr.io':{auth:input}}}),{mode:0o600}); }
else if(a[0]==='ps') { if(env.RUNNING_IMPORT==='1') console.log('running-import'); }
else if(a[0]==='image' && a[1]==='inspect') {
 const isNew=a.some(x=>x.includes('@sha256:'));
 if(a.some(x=>x.includes('org.opencontainers.image.source'))) console.log('https://github.com/orailean/bloli-nearby');
 else if(a.some(x=>x.includes('org.opencontainers.image.revision'))) console.log(env.BAD_LABEL==='1'?'wrong':env.TEST_SHA);
 else console.log(isNew?'${digest}':'${oldImage}');
}
else if(a[0]==='compose' && a.includes('config')) {
 const services={api:{image:'bloli-nearby-api:latest'},web:{image:'bloli-nearby-web:latest'},importer:{image:'bloli-nearby-importer:latest'}};
 if(!a.includes('--profile') || !a.includes('tools')) delete services.importer;
 console.log(JSON.stringify({services}));
}
else if(a[0]==='compose' && a.includes('up') && env.FAIL_UP==='1') process.exit(1);
`, { mode: 0o755 });
  installFlockShim(bin);
  writeFileSync(join(bin, "curl"), `#!/bin/sh
[ "\$FAIL_HEALTH" != 1 ] || exit 22
case "\$*" in
 */api/site*) printf '{"id":"%s"}' "$(printf '%s' "$*" | sed -E 's@.*https://([a-z]+)\\.bloli\\.com.*@\\1@')" ;;
 *) printf '{"ready":true,"countries":[{"code":"de","status":"active","ready":true},{"code":"ro","status":"active","ready":true},{"code":"at","status":"active","ready":true},{"code":"hu","status":"active","ready":true}]}' ;;
esac
`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, BLOLI_DEPLOY_ROOT: app, BLOLI_LOCK_WAIT_SECONDS: "0", TEST_SHA: sha, TEST_LOG: join(dir, "docker.log") };
  const run = (args = ["deploy", sha, digest, digest, digest], extra: Record<string,string> = {}, input?: string) => spawnSync("bash", [join(root, "scripts/deploy-production.sh"), ...args], { cwd: app, encoding: "utf8", env: { ...env, ...extra }, input });
  const calls = () => existsSync(env.TEST_LOG) ? readFileSync(env.TEST_LOG, "utf8").trim().split("\n").filter(Boolean).map(s=>JSON.parse(s)) : [];
  return { dir, app, sha, before, git, run, calls, env, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("deployment rejects shell syntax and malformed image digests before side effects", () => {
  const f = fixture(); try {
    for (const args of [["deploy", `${f.sha};touch /tmp/invalid`, digest, digest, digest], ["deploy", f.sha, "latest", digest, digest], ["finalize", f.sha, "success;true"]]) {
      const r=f.run(args); assert.notEqual(r.status,0); assert.match(r.stderr,/INVALID_DEPLOY_COMMAND/);
    }
    assert.equal(f.calls().length,0); assert.equal(f.git("rev-parse","HEAD"),f.before);
  } finally { f.cleanup(); }
});

test("registry login reads the token from stdin into app-private Docker config",()=>{
  const f=fixture(); try {
    const token="synthetic-read-only-token";
    const r=f.run(["registry-login"],{},token);
    assert.equal(r.status,0,r.stderr); assert.ok(existsSync(join(f.app,".deploy/docker/config.json")));
    assert.ok(!r.stdout.includes(token) && !r.stderr.includes(token));
    assert.ok(!readFileSync(f.env.TEST_LOG,"utf8").includes(token));
  } finally { f.cleanup(); }
});

test("bootstrap baseline survives fast-forwarding source before the first pipeline run",()=>{
  const f=fixture(); try {
    mkdirSync(join(f.app,".deploy"));
    writeFileSync(join(f.app,".deploy/previous.json"),JSON.stringify({source:f.before,imageIds:[oldImage,oldImage,oldImage]}));
    f.git("merge","--ff-only",f.sha);
    const r=f.run(); assert.equal(r.status,0,r.stderr+r.stdout);
    const pending=JSON.parse(readFileSync(join(f.app,".deploy/pending.json"),"utf8"));
    assert.equal(pending.previous.source,f.before); assert.deepEqual(pending.previous.imageIds,[oldImage,oldImage,oldImage]);
  } finally { f.cleanup(); }
});

for (const failure of ["FAIL_PULL", "BAD_LABEL", "FAIL_BACKUP", "RUNNING_IMPORT"]) {
  test(`${failure} leaves source and release configuration unchanged`, () => {
    const f=fixture(); try {
      const r=f.run(undefined,{[failure]:"1"}); assert.notEqual(r.status,0, r.stdout);
      assert.match(r.stderr, new RegExp(({FAIL_PULL:"IMAGE_PULL_FAILED",BAD_LABEL:"IMAGE_REVISION_MISMATCH",FAIL_BACKUP:"BACKUP_FAILED",RUNNING_IMPORT:"IMPORT_RUNNING"})[failure]!));
      assert.equal(f.git("rev-parse","HEAD"),f.before);
      assert.equal(existsSync(join(f.app,".deploy/release.env")),false);
      assert.equal(f.calls().some(c=>c.args.includes("up")),false);
    } finally { f.cleanup(); }
  });
}

test("dirty and stale source are rejected before pulling images", () => {
  const f=fixture(); try {
    writeFileSync(join(f.app,".gitignore"),"dirty\n");
    assert.match(f.run().stderr,/DIRTY_CHECKOUT/);
    f.git("restore",".gitignore");
    assert.match(f.run(["deploy",f.before,digest,digest,digest]).stderr,/STALE_MAIN/);
    assert.equal(f.calls().some(c=>c.args[0]==="pull"),false);
  } finally { f.cleanup(); }
});

test("a blocked host lock prevents deployment and refresh", () => {
  const f=fixture(); try {
    // Hold the real OS lock in a separate process through the inherited file.
    mkdirSync(join(f.app,".deploy"));
    const lock=spawnSync("python3",["-c", `import fcntl,subprocess,os
with open('.deploy/operation.lock','w') as h:
 fcntl.flock(h,fcntl.LOCK_EX)
 for args in [['bash',${JSON.stringify(join(root,"scripts/deploy-production.sh"))},'deploy',${JSON.stringify(f.sha)},${JSON.stringify(digest)},${JSON.stringify(digest)},${JSON.stringify(digest)}],['sh','scripts/refresh-countries.sh']]:
  r=subprocess.run(args,capture_output=True,text=True)
  print(r.stderr); assert r.returncode != 0 and 'OPERATION_LOCKED' in r.stderr
`],{cwd:f.app,encoding:"utf8",env:f.env});
    assert.equal(lock.status,0,lock.stderr+lock.stdout); assert.equal(f.calls().length,0);
  } finally { f.cleanup(); }
});

test("restricted SSH entry point rejects arbitrary commands",()=>{
  for(const command of ["bash", `deploy ${"a".repeat(40)} ${digest} ${digest} ${digest}; id`, `finalize ${"a".repeat(40)} success\nid`, ""]) {
    const r=spawnSync("bash",[resolve("deploy/ssh/ghcr-entrypoint.sh")],{env:{...process.env,SSH_ORIGINAL_COMMAND:command},encoding:"utf8"});
    assert.equal(r.status,2,r.stderr); assert.match(r.stderr,/INVALID_DEPLOY_COMMAND/);
  }
});

test("release pins all three digests and retains rollback state until matching finalization", () => {
  const f=fixture(); try {
    const r=f.run(); assert.equal(r.status,0,r.stderr+r.stdout);
    assert.equal(f.git("rev-parse","HEAD"),f.sha);
    const release=readFileSync(join(f.app,".deploy/release.env"),"utf8");
    for(const service of ["api","web","importer"]) assert.ok(release.includes(`ghcr.io/orailean/bloli-nearby-${service}@${digest}`));
    const up=f.calls().find(c=>c.args.includes("up")); assert.ok(up); assert.ok(up.args.includes("--no-build")); assert.ok(up.args.includes("--no-deps"));
    assert.equal(up.importer,`ghcr.io/orailean/bloli-nearby-importer@${digest}`);
    assert.equal(f.calls().some(c=>c.args.includes("rm")),false);
    assert.match(f.run().stderr,/PENDING_RELEASE/);
    assert.match(f.run(["finalize",f.before,"success"]).stderr,/RELEASE_MISMATCH/);
    assert.equal(f.run(["finalize",f.sha,"success"]).status,0);
    assert.equal(existsSync(join(f.app,".deploy/pending.json")),false);
    const record=JSON.parse(readFileSync(join(f.app,`.deploy/releases/${f.sha}/release.json`),"utf8"));
    assert.equal(record.status,"success"); assert.equal(record.previous.source,f.before);
    assert.equal(record.backup,"backups/test.dump");
    assert.equal(f.run().status,0);
    assert.equal(f.run(["finalize",f.sha,"success"]).status,0);
    const rerun=JSON.parse(readFileSync(join(f.app,`.deploy/releases/${f.sha}/release.json`),"utf8"));
    assert.equal(rerun.previous.source,f.before,"same-revision rerun preserves the real rollback source");
  } finally { f.cleanup(); }
});

for(const failure of ["FAIL_UP","FAIL_HEALTH"]) test(`${failure} retains pending release and never restores the database`,()=>{
  const f=fixture(); try {
    const r=f.run(undefined,{[failure]:"1"}); assert.notEqual(r.status,0);
    assert.equal(existsSync(join(f.app,".deploy/pending.json")),true);
    assert.equal(existsSync(join(f.app,".deploy/previous.json")),true);
    assert.equal(f.calls().some(c=>c.args.includes("rm")||c.args.includes("down")||c.args.some((a:string)=>a.includes("pg_restore"))),false);
    assert.equal(f.run(["finalize",f.sha,"failure"]).status,0);
    const record=JSON.parse(readFileSync(join(f.app,`.deploy/releases/${f.sha}/release.json`),"utf8")); assert.equal(record.status,"failure");
    assert.equal(f.run().status,0);
    assert.equal(f.run(["finalize",f.sha,"success"]).status,0);
    const retry=JSON.parse(readFileSync(join(f.app,`.deploy/releases/${f.sha}/release.json`),"utf8"));
    assert.equal(retry.previous.source,f.before,"a failed release is never promoted to rollback baseline");
  } finally { f.cleanup(); }
});
