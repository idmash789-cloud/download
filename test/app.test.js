import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {server,platform,run} from '../server.js';
const dir=await mkdtemp(path.join(tmpdir(),'ans-test-'));
const fake=path.join(dir,'extractor');
await writeFile(fake,`#!/usr/bin/env node
import fs from 'node:fs';
const a=process.argv.slice(2);
if(a.includes('--dump-single-json'))console.log(JSON.stringify({id:'test',title:'Test video',duration:30,formats:[{height:360},{height:720}]}));
else if(a.includes('-o'))fs.writeFileSync(a[a.indexOf('-o')+1].replace('%(ext)s','mp4'),'test-video-bytes');
`);
// .mjs ensures ESM for a temporary executable.
const executable=path.join(dir,'extractor.mjs');await writeFile(executable,await (await import('node:fs/promises')).readFile(fake));await chmod(executable,0o755);process.env.YTDLP_BIN=executable;
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
after(async()=>{await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});});
test('validates platform and rejects unsafe URLs',()=>{assert.equal(platform('https://youtu.be/abc'),'YouTube');for(const url of ['http://youtube.com/a','https://youtube.com.evil.com/a','https://user@youtube.com/a','https://127.0.0.1/a','no'])assert.throws(()=>platform(url));});
test('homepage and security headers',async()=>{const r=await fetch(base);assert.equal(r.status,200);assert.match(await r.text(),/ANS Download/);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);});
test('metadata to download flow and invalid tickets',async()=>{const r=await fetch(base+'/api/info',{method:'POST',body:JSON.stringify({url:'https://youtu.be/test'})});assert.equal(r.status,200);const d=await r.json();assert.equal(d.title,'Test video');assert.deepEqual(d.qualities,[360,720]);const file=await fetch(base+'/api/download?id='+d.id+'&quality=720');assert.equal(file.status,200);assert.equal(await file.text(),'test-video-bytes');assert.match(file.headers.get('content-disposition'),/attachment/);assert.equal((await fetch(base+'/api/download?id=missing&quality=720')).status,410);assert.equal((await fetch(base+'/api/download?id='+d.id+'&quality=999')).status,400);});
test('invalid metadata requests',async()=>{const r=await fetch(base+'/api/info',{method:'POST',body:JSON.stringify({url:'https://example.com'})});assert.equal(r.status,400);assert.match((await r.json()).error,/Platform/);});
test('missing extractor reports useful error',async()=>{process.env.YTDLP_BIN=path.join(dir,'missing');await assert.rejects(run([]),/belum terpasang/);});
