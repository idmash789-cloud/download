export async function readJson(response) {
 const text = await response.text();
 const code = `HTTP ${response.status}`;
 if ([404,405].includes(response.status)) throw new Error(`API download tidak ditemukan (${code}). Pastikan website menjalankan backend Node.js, bukan hosting statis saja.`);
 if ([502,503,504].includes(response.status) && !response.headers.get('content-type')?.includes('application/json')) throw new Error(`Server download tidak tersedia atau melewati batas waktu (${code}). Coba lagi sebentar.`);
 if (!text.trim()) throw new Error(`Server mengirim respons kosong (${code}). Backend mungkin belum berjalan atau koneksi terputus.`);
 let data;
 try { data = JSON.parse(text); } catch { throw new Error(`Respons server bukan JSON yang valid (${code}). Periksa konfigurasi backend dan rute /api.`); }
 if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`Format respons server tidak sesuai (${code}).`);
 if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `Permintaan gagal (${code}).`);
 return data;
}
