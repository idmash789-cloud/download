import http from 'node:http';
import {readFile, mkdtemp, readdir, rm, stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
export function platform(value){
 let u; try{u=new URL(value)}catch{throw new Error('Masukkan link video yang valid.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port) throw new Error('Gunakan link HTTPS tanpa kredensial atau port.');
 const h=u.hostname.toLowerCase();
 const groups={YouTube:['youtube.com','youtu.be'],TikTok:['tiktok.com'],Instagram:['instagram.com'],Facebook:['facebook.com','fb.watch'],X:['twitter.com','x.com']};
 for(const [name,domains] of Object.entries(groups)) if(domains.some(d=>h===d||h.endsWith('.'+d))) return name;
 throw new Error('Platform belum didukung. Gunakan YouTube, TikTok, Instagram, Facebook, atau X.');
}
export function run(args,timeout=30000){return new Promise((resolve,reject)=>{
 const p=spawn(process.env.YTDLP_BIN||'yt-dlp',['--ignore-config','--js-runtimes','node','--no-playlist','--no-warnings','--socket-timeout','15','--retries','1',...args],{stdio:['ignore','pipe','pipe']});
 let out='',err='',done=false; const timer=setTimeout(()=>{p.kill('SIGKILL');finish(new Error('Proses terlalu lama. Coba video yang lebih pendek.'));},timeout);
 function finish(e){if(done)return;done=true;clearTimeout(timer);e?reject(e):resolve(out);}
 p.on('error',()=>finish(new Error('Mesin download belum terpasang di server.')));
 p.stdout.on('data',b=>{out+=b;if(out.length>5000000){p.kill('SIGKILL');finish(new Error('Respons video terlalu besar.'));}});
 p.stderr.on('data',b=>{err=(err+b).slice(-4000);});
 p.on('close',code=>finish(code===0?null:new Error(/private|login|sign in|cookies|bot/i.test(err)?'Video memerlukan login atau dibatasi platform. Coba video publik lainnya.':'Video gagal diproses. Link mungkin tidak tersedia atau platform sedang membatasi akses.')));
 });}
const tickets=new Map(),limits=new Map();let active=0;
const cleanup=setInterval(()=>{const now=Date.now();for(const [k,v] of tickets)if(v.expires<now)tickets.delete(k);for(const [k,v] of limits)if(v.until<now)limits.delete(k);},60000);cleanup.unref();
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let s='';for await(const b of req){s+=b;if(s.length>4096)throw new Error('Permintaan terlalu besar.');}return JSON.parse(s);}
export const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' https:; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 const u=new URL(req.url,'http://localhost');
 try{
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{status:'ok'});
 if(req.method==='POST'&&u.pathname==='/api/info'){
 const ip=req.socket.remoteAddress;const now=Date.now();let l=limits.get(ip);if(!l||l.until<now){l={n:0,until:now+60000};limits.set(ip,l);}if(++l.n>10)return json(res,429,{error:'Terlalu banyak permintaan. Tunggu satu menit.'});
 if(active>=2)return json(res,503,{error:'Server sedang sibuk. Coba sebentar lagi.'});
 const {url}=await body(req);const name=platform(url);active++;
 try{const data=JSON.parse(await run(['--dump-single-json','--skip-download','--',url]));
 if(data._type==='playlist'||!data.id)throw new Error('Gunakan link satu video, bukan playlist.');
 const id=randomUUID();tickets.set(id,{url,expires:Date.now()+600000});
 return json(res,200,{id,title:data.title||'Video',platform:name,thumbnail:typeof data.thumbnail==='string'&&data.thumbnail.startsWith('https://')?data.thumbnail:null,duration:data.duration,qualities:[360,720,1080].filter(n=>n<=Math.max(0,...(data.formats||[]).map(f=>f.height||0)))});
 }finally{active--;}
 }
 if(req.method==='GET'&&u.pathname==='/api/download'){
 const t=tickets.get(u.searchParams.get('id'));if(!t||t.expires<Date.now())return json(res,410,{error:'Link kedaluwarsa. Proses ulang video.'});
 const quality=u.searchParams.get('quality');if(!['360','720','1080'].includes(quality))return json(res,400,{error:'Kualitas tidak valid.'});
 if(active>=2)return json(res,503,{error:'Server sedang sibuk. Coba sebentar lagi.'});active++;
 let dir;try{dir=await mkdtemp(path.join(tmpdir(),'ans-download-'));
 await run(['--max-filesize','500M','--match-filter','duration <= 1200','-f',`bv*[height<=${quality}]+ba/b[height<=${quality}]`,'--merge-output-format','mp4','--remux-video','mp4','-o',path.join(dir,'video.%(ext)s'),'--',t.url],180000);
 const files=await readdir(dir);if(!files.includes('video.mp4'))throw new Error('Video tidak tersedia dalam batas durasi 20 menit atau ukuran 500 MB.');
 const file=path.join(dir,'video.mp4');const info=await stat(file);if(info.size>500*1024*1024)throw new Error('Ukuran video melebihi 500 MB.');
 res.writeHead(200,{'Content-Type':'video/mp4','Content-Disposition':'attachment; filename="ANS-Download.mp4"','Content-Length':info.size,'Cache-Control':'no-store'});
 await new Promise((resolve,reject)=>{const stream=createReadStream(file);res.on('close',()=>{stream.destroy();resolve();});stream.on('error',reject);res.on('finish',resolve);stream.pipe(res);});
 }finally{active--;if(dir)await rm(dir,{recursive:true,force:true});}return;
 }
 const pages={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/api.js':['api.js','text/javascript'],'/style.css':['style.css','text/css']};
 if(req.method==='GET'&&pages[u.pathname]){const [file,type]=pages[u.pathname];res.setHeader('Content-Type',type+'; charset=utf-8');res.end(await readFile(path.join(root,'public',file)));return;}
 json(res,404,{error:'Halaman tidak ditemukan.'});
 }catch(e){if(!res.headersSent)json(res,400,{error:e.message||'Terjadi kesalahan.'});else res.destroy();}
});
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('ANS Download siap di port '+(process.env.PORT||3000)));
