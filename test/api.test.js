import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readJson} from '../public/api.js';
test('valid JSON and API errors',async()=>{
 assert.deepEqual(await readJson(Response.json({id:'video'})),{id:'video'});
 await assert.rejects(readJson(Response.json({error:'Video privat'},{status:400})),/Video privat/);
});
test('empty and truncated JSON responses',async()=>{
 await assert.rejects(readJson(new Response('')),/respons kosong.*HTTP 200/);
 await assert.rejects(readJson(new Response('{"id":')),/bukan JSON/);
});
test('static hosts and gateway errors',async()=>{
 await assert.rejects(readJson(new Response('',{status:405})),/backend Node.js/);
 await assert.rejects(readJson(new Response('<html>Timeout</html>',{status:504})),/batas waktu/);
 await assert.rejects(readJson(new Response('<html>index</html>')),/bukan JSON/);
});
test('invalid JSON shapes',async()=>{
 for(const d of [null,[],1])await assert.rejects(readJson(Response.json(d)),/Format respons/);
});
