
/*
 *
 *
脚本功能：One App · 列表已购 / 详情真链 / VIP / 去广告
软件版本：
下载地址：
脚本作者：whylkk
更新时间：+20260925
电报频道：https://t.me/GieGie777
问题反馈：
使用声明：此脚本仅供学习与交流，请在下载使用24小时内删除！请勿在中国大陆转载与贩卖！
*******************************
[rewrite_local]

# > One bootstrap / vip / detail / list / series
^https?:\/\/[^\/]+\/v2\.5\/(bootstrap|vip\/download|article\/detail|article\/(day|discovery|search|list)|series\/(list|chapters)) url script-response-body https://raw.githubusercontent.com/whylkk/one-tk/main/one1.js
# > One 去广告
^https?:\/\/.*\/v2\.5\/ad\/space url reject
[mitm]
hostname = api.*, *.einhn4.com, *.em1oifd0.com, *.xqjby.com, *.scycjz.com, 38.46.10.*, 202.95.22.*, 198.44.248.*, 122.10.20.249

*
*
*/




const SCRIPT_VERSION = 'ONE1_20260925';
const DEBUG = true;
const STORE_KEY = 'one_core_token_v3';

// ==================== 开关 ====================
// true  = 忽略 JWT 过期（仅本地判断；服务端仍可能拒）
// false = 正常过期检查（推荐，配合 bootstrap 续期）
const IGNORE_TOKEN_EXPIRE = false;
// ==============================================

const UUID = '48b067ec-6cfd-3491-84f5-023eb1e7d562';
const USER_KEY = '563e8eeef42931cc858dc0d1080f4f6f';
const APP_VERSION = '2.6.3.1';
const PLATFORM = '3';
const IP = '0.0.0.0';
const SIGN_SALT = 'm4n2hjPeYWkD6tFpqKF^3HO^h24P@idT';
const CHANNEL = 'vjc';
const ONE_AES_KEY = 'l*bv%Ziq000Biaog';
const ONE_AES_IV = '8597506002939249';

const ONE_DOMAINS = [
  'https://api.em1oifd0.com/',
  'https://api.einhn4.com/',
  'https://api.3459381.com/',
  'https://api.61c76a0.com/',
  'https://api.j7y675.com/',
  'https://api.87735d5.com/',
  'https://api.c6dd5cc.com/',
];
const DEFAULT_MEDIA = {
  one: '',
  one_img: 'https://jmt612.xqjby.com/',
  one_video: 'https://dlmk0129.scycjz.com/',
};

const TOKEN_JSON_URL = 'https://raw.githubusercontent.com/whylkk/one-tk/refs/heads/main/token.json';

const FALLBACK_TOKEN_ONE = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOjc3OTM1ODcsImlzX3Zpc2l0b3IiOjAsInV1aWQiOiI0OGIwNjdlYy02Y2ZkLTM0OTEtODRmNS0wMjNlYjFlN2Q1NjIiLCJuaWNrbmFtZSI6IjE1OCoqKioqNDQzIiwiaXAiOiIzNC4yMS4zLjExMiIsImlhdCI6MTc5MDIzODk0NiwiZXhwIjoxNzkwODQ3MzQ2LCJuYmYiOjE3OTAyMzg5NDYsInN1YiIjoiYXBpLmVtMW9pZmQwLmNvbSIsImp0aSI6IjRkZGJjZGZjODBhZGE0MDI2YmJiZmQ5N2M5OWE4Nzg1In0.SMiLO7x3FMdCOF6hoE6ysqXQngl7trteAOHob8SGNmA';
const FALLBACK_SESSION = {
  tokenOne: FALLBACK_TOKEN_ONE,
  baseUrl: 'https://api.em1oifd0.com/',
  media: {
    one: 'https://api.em1oifd0.com/',
    one_img: 'https://jmt612.xqjby.com/',
    one_video: 'https://dlmk0129.scycjz.com/',
  },
  tokenAt: 0,
};

function log() {
  if (!DEBUG) return;
  try {
    const parts = [];
    for (let i = 0; i < arguments.length; i++) {
      const x = arguments[i];
      if (x == null) parts.push(String(x));
      else if (typeof x === 'object') {
        try { parts.push(JSON.stringify(x)); } catch (_) { parts.push(String(x)); }
      } else parts.push(String(x));
    }
    console.log('[One1][V] ' + parts.join(' '));
  } catch (_) {}
}
function step(s, d) { log('--', s, d != null ? ('| ' + d) : ''); }

function httpRequest(opts, cb) {
  var method = String((opts && opts.method) || 'GET').toUpperCase();
  var url = opts && opts.url;
  var headers = (opts && opts.headers) || {};
  var body = opts && opts.body;
  if (typeof $task !== 'undefined' && $task.fetch) {
    $task.fetch({ url: url, method: method, headers: headers, body: body })
      .then(function (resp) {
        cb(null, { statusCode: resp.statusCode, headers: resp.headers, body: resp.body });
      })
      .catch(function (e) { cb(e || new Error('fetch fail')); });
    return;
  }
  if (typeof $httpClient !== 'undefined') {
    var req = { url: url, headers: headers };
    if (body != null) req.body = body;
    var done = function (err, resp, data) {
      if (err) { cb(err); return; }
      cb(null, {
        statusCode: (resp && (resp.status || resp.statusCode)) || 0,
        headers: (resp && resp.headers) || {},
        body: data
      });
    };
    if (method === 'GET') $httpClient.get(req, done);
    else if (method === 'PUT') $httpClient.put(req, done);
    else if (method === 'DELETE') $httpClient.delete(req, done);
    else $httpClient.post(req, done);
    return;
  }
  cb(new Error('no http client'));
}


/* ========== tiny-inflate + zlib wrapper ========== */
var TINF_OK = 0;
var TINF_DATA_ERROR = -3;

function Tree() {
  this.table = new Uint16Array(16);
  this.trans = new Uint16Array(288);
}

function Data(source, dest) {
  this.source = source;
  this.sourceIndex = 0;
  this.tag = 0;
  this.bitcount = 0;
  this.dest = dest;
  this.destLen = 0;
  this.ltree = new Tree();
  this.dtree = new Tree();
}

var sltree = new Tree();
var sdtree = new Tree();
var length_bits = new Uint8Array(30);
var length_base = new Uint16Array(30);
var dist_bits = new Uint8Array(30);
var dist_base = new Uint16Array(30);
var clcidx = new Uint8Array([
  16, 17, 18, 0, 8, 7, 9, 6,
  10, 5, 11, 4, 12, 3, 13, 2,
  14, 1, 15
]);
var code_tree = new Tree();
var lengths = new Uint8Array(288 + 32);

function tinf_build_bits_base(bits, base, delta, first) {
  var i, sum;
  for (i = 0; i < delta; ++i) bits[i] = 0;
  for (i = 0; i < 30 - delta; ++i) bits[i + delta] = i / delta | 0;
  for (sum = first, i = 0; i < 30; ++i) {
    base[i] = sum;
    sum += 1 << bits[i];
  }
}

function tinf_build_fixed_trees(lt, dt) {
  var i;
  for (i = 0; i < 7; ++i) lt.table[i] = 0;
  lt.table[7] = 24;
  lt.table[8] = 152;
  lt.table[9] = 112;
  for (i = 0; i < 24; ++i) lt.trans[i] = 256 + i;
  for (i = 0; i < 144; ++i) lt.trans[24 + i] = i;
  for (i = 0; i < 8; ++i) lt.trans[24 + 144 + i] = 280 + i;
  for (i = 0; i < 112; ++i) lt.trans[24 + 144 + 8 + i] = 144 + i;
  for (i = 0; i < 5; ++i) dt.table[i] = 0;
  dt.table[5] = 32;
  for (i = 0; i < 32; ++i) dt.trans[i] = i;
}

var offs = new Uint16Array(16);

function tinf_build_tree(t, lengths, off, num) {
  var i, sum;
  for (i = 0; i < 16; ++i) t.table[i] = 0;
  for (i = 0; i < num; ++i) t.table[lengths[off + i]]++;
  t.table[0] = 0;
  for (sum = 0, i = 0; i < 16; ++i) {
    offs[i] = sum;
    sum += t.table[i];
  }
  for (i = 0; i < num; ++i) {
    if (lengths[off + i]) t.trans[offs[lengths[off + i]]++] = i;
  }
}

function tinf_getbit(d) {
  if (!d.bitcount--) {
    d.tag = d.source[d.sourceIndex++];
    d.bitcount = 7;
  }
  var bit = d.tag & 1;
  d.tag >>>= 1;
  return bit;
}

function tinf_read_bits(d, num, base) {
  if (!num) return base;
  while (d.bitcount < 24) {
    d.tag |= d.source[d.sourceIndex++] << d.bitcount;
    d.bitcount += 8;
  }
  var val = d.tag & (0xffff >>> (16 - num));
  d.tag >>>= num;
  d.bitcount -= num;
  return val + base;
}

function tinf_decode_symbol(d, t) {
  while (d.bitcount < 24) {
    d.tag |= d.source[d.sourceIndex++] << d.bitcount;
    d.bitcount += 8;
  }
  var sum = 0, cur = 0, len = 0;
  var tag = d.tag;
  do {
    cur = 2 * cur + (tag & 1);
    tag >>>= 1;
    ++len;
    sum += t.table[len];
    cur -= t.table[len];
  } while (cur >= 0);
  d.tag = tag;
  d.bitcount -= len;
  return t.trans[sum + cur];
}

function tinf_decode_trees(d, lt, dt) {
  var hlit, hdist, hclen;
  var i, num, length;
  hlit = tinf_read_bits(d, 5, 257);
  hdist = tinf_read_bits(d, 5, 1);
  hclen = tinf_read_bits(d, 4, 4);
  for (i = 0; i < 19; ++i) lengths[i] = 0;
  for (i = 0; i < hclen; ++i) {
    var clen = tinf_read_bits(d, 3, 0);
    lengths[clcidx[i]] = clen;
  }
  tinf_build_tree(code_tree, lengths, 0, 19);
  for (num = 0; num < hlit + hdist;) {
    var sym = tinf_decode_symbol(d, code_tree);
    switch (sym) {
      case 16:
        var prev = lengths[num - 1];
        for (length = tinf_read_bits(d, 2, 3); length; --length) lengths[num++] = prev;
        break;
      case 17:
        for (length = tinf_read_bits(d, 3, 3); length; --length) lengths[num++] = 0;
        break;
      case 18:
        for (length = tinf_read_bits(d, 7, 11); length; --length) lengths[num++] = 0;
        break;
      default:
        lengths[num++] = sym;
        break;
    }
  }
  tinf_build_tree(lt, lengths, 0, hlit);
  tinf_build_tree(dt, lengths, hlit, hdist);
}

function tinf_inflate_block_data(d, lt, dt) {
  while (1) {
    var sym = tinf_decode_symbol(d, lt);
    if (sym === 256) return TINF_OK;
    if (sym < 256) {
      d.dest[d.destLen++] = sym;
    } else {
      var length, dist, offsi, i;
      sym -= 257;
      length = tinf_read_bits(d, length_bits[sym], length_base[sym]);
      dist = tinf_decode_symbol(d, dt);
      offsi = d.destLen - tinf_read_bits(d, dist_bits[dist], dist_base[dist]);
      for (i = offsi; i < offsi + length; ++i) d.dest[d.destLen++] = d.dest[i];
    }
  }
}

function tinf_inflate_uncompressed_block(d) {
  var length, invlength, i;
  while (d.bitcount > 8) {
    d.sourceIndex--;
    d.bitcount -= 8;
  }
  length = d.source[d.sourceIndex + 1];
  length = 256 * length + d.source[d.sourceIndex];
  invlength = d.source[d.sourceIndex + 3];
  invlength = 256 * invlength + d.source[d.sourceIndex + 2];
  if (length !== (~invlength & 0x0000ffff)) return TINF_DATA_ERROR;
  d.sourceIndex += 4;
  for (i = length; i; --i) d.dest[d.destLen++] = d.source[d.sourceIndex++];
  d.bitcount = 0;
  return TINF_OK;
}

function tinf_uncompress(source, dest) {
  var d = new Data(source, dest);
  var bfinal, btype, res;
  do {
    bfinal = tinf_getbit(d);
    btype = tinf_read_bits(d, 2, 0);
    switch (btype) {
      case 0: res = tinf_inflate_uncompressed_block(d); break;
      case 1: res = tinf_inflate_block_data(d, sltree, sdtree); break;
      case 2:
        tinf_decode_trees(d, d.ltree, d.dtree);
        res = tinf_inflate_block_data(d, d.ltree, d.dtree);
        break;
      default: res = TINF_DATA_ERROR;
    }
    if (res !== TINF_OK) throw new Error('Data error');
  } while (!bfinal);
  if (d.destLen < d.dest.length) {
    if (typeof d.dest.slice === 'function') return d.dest.slice(0, d.destLen);
    else return d.dest.subarray(0, d.destLen);
  }
  return d.dest;
}

tinf_build_fixed_trees(sltree, sdtree);
tinf_build_bits_base(length_bits, length_base, 4, 3);
tinf_build_bits_base(dist_bits, dist_base, 2, 1);
length_bits[28] = 0;
length_base[28] = 258;

function zlibInflateBytes(bytes) {
  const src = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  if (src.length < 6) throw new Error('zlib too short');
  const deflate = src.subarray(2, src.length - 4);
  const out = new Uint8Array(Math.max(src.length * 40, 65536));
  const result = tinf_uncompress(deflate, out);
  if (result && result.length) return result;
  return out;
}

/* ========== AES ========== */
const Sbox = [99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22];
const InvSbox = (() => { const a = new Array(256); for (let i = 0; i < 256; i++) a[Sbox[i]] = i; return a; })();
const Rcon = [0,1,2,4,8,16,32,64,128,27,54];
function rotWord(w){return ((w<<8)|(w>>>24))>>>0;}
function subWord(w){return (Sbox[(w>>>24)&255]<<24)|(Sbox[(w>>>16)&255]<<16)|(Sbox[(w>>>8)&255]<<8)|Sbox[w&255];}
function keyExpand(key){
  const w=new Array(44);
  for(let i=0;i<4;i++)w[i]=((key[4*i]<<24)|(key[4*i+1]<<16)|(key[4*i+2]<<8)|key[4*i+3])>>>0;
  for(let i=4;i<44;i++){let t=w[i-1];if(i%4===0)t=(subWord(rotWord(t))^(Rcon[i/4]<<24))>>>0;w[i]=(w[i-4]^t)>>>0;}
  const rk=new Array(176);
  for(let i=0;i<44;i++){rk[4*i]=(w[i]>>>24)&255;rk[4*i+1]=(w[i]>>>16)&255;rk[4*i+2]=(w[i]>>>8)&255;rk[4*i+3]=w[i]&255;}
  return rk;
}
function addRoundKey(s,rk,round){const off=round*16;for(let i=0;i<16;i++)s[i]^=rk[off+i];}
function subBytes(s){for(let i=0;i<16;i++)s[i]=Sbox[s[i]];}
function invSubBytes(s){for(let i=0;i<16;i++)s[i]=InvSbox[s[i]];}
function shiftRows(s){let t;t=s[1];s[1]=s[5];s[5]=s[9];s[9]=s[13];s[13]=t;t=s[2];s[2]=s[10];s[10]=t;t=s[6];s[6]=s[14];s[14]=t;t=s[15];s[15]=s[11];s[11]=s[7];s[7]=s[3];s[3]=t;}
function invShiftRows(s){let t;t=s[13];s[13]=s[9];s[9]=s[5];s[5]=s[1];s[1]=t;t=s[2];s[2]=s[10];s[10]=t;t=s[6];s[6]=s[14];s[14]=t;t=s[3];s[3]=s[7];s[7]=s[11];s[11]=s[15];s[15]=t;}
function xtime(a){return ((a<<1)^(((a>>7)&1)*0x1b))&255;}
function mixColumns(s){for(let c=0;c<4;c++){const i=4*c,a=s[i],b=s[i+1],c0=s[i+2],d=s[i+3],e=a^b^c0^d;s[i]^=e^xtime(a^b);s[i+1]^=e^xtime(b^c0);s[i+2]^=e^xtime(c0^d);s[i+3]^=e^xtime(d^a);}}
function mul(a,b){let p=0;for(let i=0;i<8;i++){if(b&1)p^=a;const hi=a&0x80;a=(a<<1)&255;if(hi)a^=0x1b;b>>=1;}return p;}
function invMixColumns(s){for(let c=0;c<4;c++){const i=4*c,a=s[i],b=s[i+1],c0=s[i+2],d=s[i+3];s[i]=mul(a,14)^mul(b,11)^mul(c0,13)^mul(d,9);s[i+1]=mul(a,9)^mul(b,14)^mul(c0,11)^mul(d,13);s[i+2]=mul(a,13)^mul(b,9)^mul(c0,14)^mul(d,11);s[i+3]=mul(a,11)^mul(b,13)^mul(c0,9)^mul(d,14);}}
function encryptBlock(input,rk){const s=input.slice();addRoundKey(s,rk,0);for(let r=1;r<10;r++){subBytes(s);shiftRows(s);mixColumns(s);addRoundKey(s,rk,r);}subBytes(s);shiftRows(s);addRoundKey(s,rk,10);return s;}
function decryptBlock(input,rk){const s=input.slice();addRoundKey(s,rk,10);for(let r=9;r>=1;r--){invShiftRows(s);invSubBytes(s);addRoundKey(s,rk,r);invMixColumns(s);}invShiftRows(s);invSubBytes(s);addRoundKey(s,rk,0);return s;}
function utf8Encode(str){const out=[];for(let i=0;i<str.length;i++){let c=str.charCodeAt(i);if(c<0x80)out.push(c);else if(c<0x800)out.push(0xc0|(c>>6),0x80|(c&0x3f));else if(c<0xd800||c>=0xe000)out.push(0xe0|(c>>12),0x80|((c>>6)&0x3f),0x80|(c&0x3f));else{i++;c=0x10000+(((c&0x3ff)<<10)|(str.charCodeAt(i)&0x3ff));out.push(0xf0|(c>>18),0x80|((c>>12)&0x3f),0x80|((c>>6)&0x3f),0x80|(c&0x3f));}}return out;}
function utf8Decode(bytes){let out='',i=0;while(i<bytes.length){const c=bytes[i++];if(c<0x80)out+=String.fromCharCode(c);else if(c<0xe0)out+=String.fromCharCode(((c&0x1f)<<6)|(bytes[i++]&0x3f));else if(c<0xf0)out+=String.fromCharCode(((c&0x0f)<<12)|((bytes[i++]&0x3f)<<6)|(bytes[i++]&0x3f));else{const cp=((c&7)<<18)|((bytes[i++]&0x3f)<<12)|((bytes[i++]&0x3f)<<6)|(bytes[i++]&0x3f);const x=cp-0x10000;out+=String.fromCharCode(0xd800+(x>>10),0xdc00+(x&0x3ff));}}return out;}
function b64Encode(bytes){const ch='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=i+1<bytes.length?bytes[i+1]:0,c=i+2<bytes.length?bytes[i+2]:0;out+=ch[a>>2]+ch[((a&3)<<4)|(b>>4)]+(i+1<bytes.length?ch[((b&15)<<2)|(c>>6)]:'=')+(i+2<bytes.length?ch[c&63]:'=');}return out;}
function b64Decode(str){const ch='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';const clean=String(str).replace(/[^A-Za-z0-9+/=]/g,'');const out=[];for(let i=0;i<clean.length;i+=4){const a=ch.indexOf(clean[i]),b=ch.indexOf(clean[i+1]),c=ch.indexOf(clean[i+2]),d=ch.indexOf(clean[i+3]);out.push((a<<2)|(b>>4));if(c>=0&&clean[i+2]!=='=')out.push(((b&15)<<4)|(c>>2));if(d>=0&&clean[i+3]!=='=')out.push(((c&3)<<6)|d);}return out;}
function aesEncrypt(plain,keyStr,ivStr){const rk=keyExpand(utf8Encode(keyStr)),iv=utf8Encode(ivStr);let data=utf8Encode(plain);const pad=16-(data.length%16);for(let i=0;i<pad;i++)data.push(pad);const out=[];let prev=iv.slice();for(let i=0;i<data.length;i+=16){const block=[];for(let j=0;j<16;j++)block[j]=data[i+j]^prev[j];const enc=encryptBlock(block,rk);for(let j=0;j<16;j++)out.push(enc[j]);prev=enc;}return b64Encode(out);}
function aesDecryptBytes(data,keyStr,ivStr){const rk=keyExpand(utf8Encode(keyStr)),iv=utf8Encode(ivStr);if(data.length<16||data.length%16!==0)throw new Error('bad len '+data.length);const out=[];let prev=iv.slice();for(let i=0;i<data.length;i+=16){const block=data.slice?data.slice(i,i+16):data.subarray(i,i+16);const arr=Array.from(block);const dec=decryptBlock(arr,rk);for(let j=0;j<16;j++)out.push(dec[j]^prev[j]);prev=arr;}const pad=out[out.length-1];if(pad>0&&pad<=16)out.length-=pad;return out;}
function aesDecryptB64(b64,keyStr,ivStr){return utf8Decode(aesDecryptBytes(b64Decode(b64),keyStr,ivStr));}
function oneEnc(plain){return aesEncrypt(plain,ONE_AES_KEY,ONE_AES_IV);}
function oneDec(b64){return aesDecryptB64(String(b64).replace(/^"|"$/g,'').replace(/\s+/g,''),ONE_AES_KEY,ONE_AES_IV);}

function md5(str){
  function cmn(q,a,b,x,s,t){a=(a+q+x+t)|0;return (((a<<s)|(a>>>(32-s)))+b)|0;}
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|((~b)&d),a,b,x,s,t);}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&(~d)),a,b,x,s,t);}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t);}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|(~d)),a,b,x,s,t);}
  function md5cycle(x,k){let a=x[0],b=x[1],c=x[2],d=x[3];
    a=ff(a,b,c,d,k[0],7,-680876936);d=ff(d,a,b,c,k[1],12,-389564586);c=ff(c,d,a,b,k[2],17,606105819);b=ff(b,c,d,a,k[3],22,-1044525330);
    a=ff(a,b,c,d,k[4],7,-176418897);d=ff(d,a,b,c,k[5],12,1200080426);c=ff(c,d,a,b,k[6],17,-1473231341);b=ff(b,c,d,a,k[7],22,-45705983);
    a=ff(a,b,c,d,k[8],7,1770035416);d=ff(d,a,b,c,k[9],12,-1958414417);c=ff(c,d,a,b,k[10],17,-42063);b=ff(b,c,d,a,k[11],22,-1990404162);
    a=ff(a,b,c,d,k[12],7,1804603682);d=ff(d,a,b,c,k[13],12,-40341101);c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329);
    a=gg(a,b,c,d,k[1],5,-165796510);d=gg(d,a,b,c,k[6],9,-1069501632);c=gg(c,d,a,b,k[11],14,643717713);b=gg(b,c,d,a,k[0],20,-373897302);
    a=gg(a,b,c,d,k[5],5,-701558691);d=gg(d,a,b,c,k[10],9,38016083);c=gg(c,d,a,b,k[15],14,-660478335);b=gg(b,c,d,a,k[4],20,-405537848);
    a=gg(a,b,c,d,k[9],5,568446438);d=gg(d,a,b,c,k[14],9,-1019803690);c=gg(c,d,a,b,k[3],14,-187363961);b=gg(b,c,d,a,k[8],20,1163531501);
    a=gg(a,b,c,d,k[13],5,-1444681467);d=gg(d,a,b,c,k[2],9,-51403784);c=gg(c,d,a,b,k[7],14,1735328473);b=gg(b,c,d,a,k[12],20,-1926607734);
    a=hh(a,b,c,d,k[5],4,-378558);d=hh(d,a,b,c,k[8],11,-2022574463);c=hh(c,d,a,b,k[11],16,1839030562);b=hh(b,c,d,a,k[14],23,-35309556);
    a=hh(a,b,c,d,k[1],4,-1530992060);d=hh(d,a,b,c,k[4],11,1272893353);c=hh(c,d,a,b,k[7],16,-155497632);b=hh(b,c,d,a,k[10],23,-1094730640);
    a=hh(a,b,c,d,k[13],4,681279174);d=hh(d,a,b,c,k[0],11,-358537222);c=hh(c,d,a,b,k[3],16,-722521979);b=hh(b,c,d,a,k[6],23,76029189);
    a=hh(a,b,c,d,k[9],4,-640364487);d=hh(d,a,b,c,k[12],11,-421815835);c=hh(c,d,a,b,k[15],16,530742520);b=hh(b,c,d,a,k[2],23,-995338651);
    a=ii(a,b,c,d,k[0],6,-198630844);d=ii(d,a,b,c,k[7],10,1126891415);c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055);
    a=ii(a,b,c,d,k[12],6,1700485571);d=ii(d,a,b,c,k[3],10,-1894986606);c=ii(c,d,a,b,k[10],15,-1051523);b=ii(b,c,d,a,k[1],21,-2054922799);
    a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);c=ii(c,d,a,b,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649);
    a=ii(a,b,c,d,k[4],6,-145523070);d=ii(d,a,b,c,k[11],10,-1120210379);c=ii(c,d,a,b,k[2],15,718787259);b=ii(b,c,d,a,k[9],21,-343485551);
    x[0]=(a+x[0])|0;x[1]=(b+x[1])|0;x[2]=(c+x[2])|0;x[3]=(d+x[3])|0;}
  function md5blk(s){const blks=[];for(let i=0;i<64;i+=4)blks[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24);return blks;}
  function md51(s){const n=s.length,state=[1732584193,-271733879,-1732584194,271733878];let i;for(i=64;i<=n;i+=64)md5cycle(state,md5blk(s.substring(i-64,i)));s=s.substring(i-64);const tail=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];for(i=0;i<s.length;i++)tail[i>>2]|=s.charCodeAt(i)<<((i%4)<<3);tail[i>>2]|=0x80<<((i%4)<<3);if(i>55){md5cycle(state,tail);for(i=0;i<16;i++)tail[i]=0;}tail[14]=n*8;md5cycle(state,tail);return state;}
  function rhex(n){const s='0123456789abcdef';let o='';for(let j=0;j<4;j++)o+=s.charAt((n>>(j*8+4))&15)+s.charAt((n>>(j*8))&15);return o;}
  try{str=unescape(encodeURIComponent(String(str)));}catch(_){str=String(str);}
  const st=md51(str);return rhex(st[0])+rhex(st[1])+rhex(st[2])+rhex(st[3]);
}
function buildSign(ts){return md5(md5('0.0.0.0.3.'+ts+'.'+USER_KEY+'.'+UUID)+SIGN_SALT);}

function nowSec(){return Math.floor(Date.now()/1000);}
function short(s,n){s=String(s||'');return s.length>(n||100)?s.slice(0,n)+'...':s;}
function formQuery(data){const obj=data||{};return Object.keys(obj).sort().map(function(k){return k+'='+(obj[k]==null?'':obj[k]);}).join('&');}
function joinUrl(base,path){if(!path)return'';if(/^https?:\/\//i.test(path))return path;if(!base)return path;return String(base).replace(/\/+$/,'')+'/'+String(path).replace(/^\/+/,'');}
function isPlainJson(t){t=String(t||'').trim();return t.charAt(0)==='{'||t.charAt(0)==='[';}
function looksLikeBase64(t){t=String(t||'').trim().replace(/^"|"$/g,'');return t.length>=16&&/^[A-Za-z0-9+/=]+$/.test(t);}
function parseForm(q){const out={};String(q||'').split('&').forEach(function(pair){if(!pair)return;const i=pair.indexOf('=');const k=i>=0?decodeURIComponent(pair.slice(0,i)):decodeURIComponent(pair);const v=i>=0?decodeURIComponent(pair.slice(i+1)||''):'';if(k)out[k]=v;});return out;}
function getPath(){try{const u=($request&&$request.url)||'';const m=u.match(/\/v2\.5\/[a-zA-Z0-9_\/.-]+/);return m?m[0]:'';}catch(_){return'';}}

function storeWrite(obj){
  try{
    const s=JSON.stringify(obj);
    if(typeof $prefs!=='undefined'&&$prefs.setValueForKey){
      const ok=$prefs.setValueForKey(s,STORE_KEY);
      step('store.write','qx prefs='+!!ok);
      return !!ok;
    }
    if(typeof $persistentStore!=='undefined'&&$persistentStore.write){
      const ok=$persistentStore.write(s,STORE_KEY);
      step('store.write','surge/loon='+!!ok);
      return ok!==false;
    }
  }catch(e){step('store.write.err',e.message||e);}
  step('store.write','no backend');
  return false;
}
function storeRead(){
  try{
    let s=null;
    if(typeof $prefs!=='undefined'&&$prefs.valueForKey){
      s=$prefs.valueForKey(STORE_KEY);
      if(s){step('store.read','qx hit len='+String(s).length);return JSON.parse(s);}
    }
    if(typeof $persistentStore!=='undefined'&&$persistentStore.read){
      s=$persistentStore.read(STORE_KEY);
      if(s){step('store.read','surge/loon hit len='+String(s).length);return JSON.parse(s);}
    }
  }catch(e){step('store.read.err',e.message||e);}
  step('store.read','miss');
  return null;
}
function parseJwtExp(token){
  if(!token)return 0;
  try{
    const part=String(token).split('.')[1];
    if(!part)return 0;
    let s=part.replace(/-/g,'+').replace(/_/g,'/');
    while(s.length%4)s+='=';
    const payload=JSON.parse(utf8Decode(b64Decode(s)));
    return Number(payload.exp||0)||0;
  }catch(_){return 0;}
}
const TOKEN_SKEW_SEC = 3600;
function tokenExpiringSoon(token){
  if (IGNORE_TOKEN_EXPIRE) return false;
  if(!token)return true;
  const exp=parseJwtExp(token);
  if(!exp)return true;
  return exp-nowSec()<TOKEN_SKEW_SEC;
}
function tokenLeftSec(token){
  const exp=parseJwtExp(token);
  if(!exp)return -1;
  return exp-nowSec();
}

/* ========== bootstrap 续期（内置） ========== */
function postBootstrap(baseUrl, oldToken, cb){
  if(typeof $task==='undefined'&&typeof $httpClient==='undefined'){cb(null,'no http');return;}
  const base=String(baseUrl||ONE_DOMAINS[0]).replace(/\/+$/,'')+'/';
  const url=base+'v2.5/bootstrap';
  const ts=nowSec(),sign=buildSign(ts);
  const query='channel='+CHANNEL+'&uuid='+UUID;
  let body;try{body=oneEnc(query);}catch(e){cb(null,'enc '+e);return;}
  const headers={
    'Content-Type':'application/x-www-form-urlencoded',Accept:'*/*','User-Agent':'Dart/3.0 (dart:io)',
    uuid:UUID,'user-key':USER_KEY,timestamp:String(ts),
    platform:PLATFORM,ip:IP,'app-version':APP_VERSION,sign:sign,
  };
  if(oldToken)headers.token=oldToken;
  step('bootstrap.try',url);
  httpRequest({url:url,method:'POST',headers:headers,body:body},function(err,resp){
    if(err){cb(null,String(err));return;}
    try{
      let text=resp&&resp.body!=null?String(resp.body).trim():'';
      step('bootstrap.raw','st='+(resp.statusCode||'')+' len='+text.length);
      if(!text){cb(null,'empty');return;}
      let json;
      if(isPlainJson(text))json=JSON.parse(text);
      else{const plain=oneDec(text);step('bootstrap.plain',short(plain,120));json=JSON.parse(plain);}
      if(!(json.code==0||json.code==200||json.code=='0'||json.code=='200')){
        cb(null,'code='+json.code+' '+(json.message||json.msg||''));return;
      }
      let tok=null;
      const data=json.data||{};
      if(typeof data.token==='string'&&data.token.indexOf('eyJ')===0)tok=data.token;
      else if(data.user&&typeof data.user.token==='string'&&data.user.token.indexOf('eyJ')===0)tok=data.user.token;
      else{
        const s=JSON.stringify(data);
        const m=s.match(/"token"\s*:\s*"(eyJ[^"]+)"/);
        if(m)tok=m[1];
      }
      if(!tok){cb(null,'no token in bootstrap');return;}
      const saved={
        tokenOne:String(tok),
        baseUrl:base,
        media:{one:base,one_img:DEFAULT_MEDIA.one_img,one_video:DEFAULT_MEDIA.one_video},
        tokenAt:nowSec(),
        tokenExp:parseJwtExp(tok),
        source:'bootstrap',
      };
      step('bootstrap.ok','left='+tokenLeftSec(tok)+'s len='+tok.length);
      cb(saved,null);
    }catch(e){cb(null,e.message||e);}
  });
}

function refreshTokenViaBootstrap(seed,cb){
  const bases=[];
  if(seed&&seed.baseUrl)bases.push(seed.baseUrl);
  if(seed&&seed.media&&seed.media.one)bases.push(seed.media.one);
  for(let i=0;i<ONE_DOMAINS.length;i++)bases.push(ONE_DOMAINS[i]);
  const seen={};const list=[];
  for(let i=0;i<bases.length;i++){
    const b=String(bases[i]||'').replace(/\/+$/,'');
    if(!b||seen[b])continue;
    seen[b]=1;list.push(b);
  }
  const oldToken=(seed&&seed.tokenOne)||FALLBACK_TOKEN_ONE||'';
  let idx=0,lastErr='';
  function next(){
    if(idx>=list.length){step('bootstrap.fail',lastErr);cb(null);return;}
    const base=list[idx++];
    postBootstrap(base,oldToken,function(saved,err){
      if(saved&&saved.tokenOne&&!tokenExpiringSoon(saved.tokenOne)){
        if(seed&&seed.media){
          saved.media={
            one:seed.media.one||saved.media.one,
            one_img:seed.media.one_img||saved.media.one_img,
            one_video:seed.media.one_video||saved.media.one_video,
          };
          if(seed.baseUrl)saved.baseUrl=seed.baseUrl;
        }
        storeWrite(saved);
        cb(saved);
        return;
      }
      if(saved&&saved.tokenOne){
        storeWrite(saved);
        cb(saved);
        return;
      }
      lastErr=err||'invalid';
      next();
    });
  }
  next();
}

function fetchTokenFromGithub(cb){
  if(typeof $task==='undefined'&&typeof $httpClient==='undefined'){cb(null);return;}
  const url=TOKEN_JSON_URL+(TOKEN_JSON_URL.indexOf('?')>=0?'&':'?')+'t='+Date.now();
  step('github.try',url);
  httpRequest({url:url,method:'GET',headers:{'Accept':'*/*','User-Agent':'One1'}},function(err,resp){
    if(err){step('github.fail',String(err));cb(null);return;}
    try{
      let text=resp&&resp.body!=null?String(resp.body).trim():'';
      step('github.raw','st='+(resp.statusCode||'')+' len='+text.length+' head='+short(text,40));
      if(!text){cb(null);return;}
      let obj=null;
      if(text.charAt(0)==='{'){
        obj=JSON.parse(text);
      }else{
        const plain=oneDec(text);
        step('github.dec',short(plain,80));
        obj=JSON.parse(plain);
      }
      if(!obj||!obj.token_one){cb(null);return;}
      if(tokenExpiringSoon(obj.token_one)){
        step('github.expired','exp='+parseJwtExp(obj.token_one));
        cb(null);
        return;
      }
      const saved={
        tokenOne:String(obj.token_one),
        baseUrl:String(obj.base_url||(obj.media&&obj.media.one)||ONE_DOMAINS[0]),
        media:{
          one:(obj.media&&obj.media.one)||obj.base_url||ONE_DOMAINS[0],
          one_img:(obj.media&&obj.media.one_img)||DEFAULT_MEDIA.one_img,
          one_video:(obj.media&&obj.media.one_video)||DEFAULT_MEDIA.one_video
        },
        tokenAt:nowSec(),
        tokenExp:parseJwtExp(obj.token_one),
        source:'github',
      };
      cb(saved);
    }catch(e){step('github.err',e.message||e);cb(null);}
  });
}

/**
 * 续期顺序：
 *  ① 缓存有效 → 直接用
 *  ② 快过期/已过期 → bootstrap
 *  ③ bootstrap 失败 → GitHub
 *  ④ 仍失败 → FALLBACK / 过期缓存
 */
function ensureSession(cb){
  const cached = storeRead();
  if (cached && cached.tokenOne && !tokenExpiringSoon(cached.tokenOne)) {
    step('session.cache', 'hit left=' + tokenLeftSec(cached.tokenOne) + 's len=' + cached.tokenOne.length);
    cb(cached);
    return;
  }

  step('session.refresh', cached ? ('need_refresh left=' + tokenLeftSec(cached.tokenOne) + 's') : 'no_cache');

  step('session.bootstrap', 'try v2.5/bootstrap');
  refreshTokenViaBootstrap(cached || FALLBACK_SESSION, function (boot) {
    if (boot && boot.tokenOne && !tokenExpiringSoon(boot.tokenOne)) {
      step('session.bootstrap', 'ok left=' + tokenLeftSec(boot.tokenOne) + 's');
      cb(boot);
      return;
    }
    if (boot && boot.tokenOne) {
      step('session.bootstrap', 'got token left=' + tokenLeftSec(boot.tokenOne) + 's (use anyway)');
      cb(boot);
      return;
    }

    step('session.github', 'bootstrap fail, try github');
    fetchTokenFromGithub(function (saved) {
      if (saved && saved.tokenOne && !tokenExpiringSoon(saved.tokenOne)) {
        step('session.github', 'ok left=' + tokenLeftSec(saved.tokenOne) + 's');
        storeWrite(saved);
        cb(saved);
        return;
      }

      if (FALLBACK_TOKEN_ONE && !tokenExpiringSoon(FALLBACK_TOKEN_ONE)) {
        const fb = Object.assign({}, FALLBACK_SESSION, {
          tokenAt: nowSec(),
          tokenExp: parseJwtExp(FALLBACK_TOKEN_ONE),
        });
        step('session.fallback', 'left=' + tokenLeftSec(fb.tokenOne) + 's');
        storeWrite(fb);
        cb(fb);
        return;
      }

      if (cached && cached.tokenOne) {
        step('session.stale', 'left=' + tokenLeftSec(cached.tokenOne) + 's');
        cb(cached);
        return;
      }
      cb(null);
    });
  });
}

function postOne(session,path,data,cb){
  if(!session||!session.tokenOne){cb(null,'no token');return;}
  if(typeof $task==='undefined'&&typeof $httpClient==='undefined'){cb(null,'no http');return;}
  const base=String(session.baseUrl||ONE_DOMAINS[0]).replace(/\/+$/,'')+'/';
  const url=base+String(path).replace(/^\/+/,'');
  const ts=nowSec(),sign=buildSign(ts),query=formQuery(data);
  let body;try{body=oneEnc(query);}catch(e){cb(null,'enc '+e);return;}
  const headers={
    'Content-Type':'application/x-www-form-urlencoded',Accept:'*/*','User-Agent':'Dart/3.0 (dart:io)',
    uuid:UUID,'user-key':USER_KEY,token:session.tokenOne,timestamp:String(ts),
    platform:PLATFORM,ip:IP,'app-version':APP_VERSION,sign:sign,
  };
  step('post',path+' q='+query);
  httpRequest({url:url,method:'POST',headers:headers,body:body},function(err,resp){
    if(err){cb(null,String(err));return;}
    try{
      let text=resp&&resp.body!=null?String(resp.body).trim():'';
      step('post.raw','st='+(resp.statusCode||'')+' len='+text.length);
      if(!text){cb(null,'empty');return;}
      let json;
      if(isPlainJson(text))json=JSON.parse(text);
      else{const plain=oneDec(text);step('post.plain',short(plain,160));json=JSON.parse(plain);}
      if(!(json.code==0||json.code==200||json.code=='0'||json.code=='200')){cb(null,'code='+json.code+' '+(json.message||json.msg||''));return;}
      cb(json.data!==undefined?json.data:json,null);
    }catch(e){cb(null,e.message||e);}
  });
}

function mediaUrl(session,path,type){
  if(!path)return'';
  if(/^https?:\/\//i.test(path))return path;
  const media=(session&&session.media)||DEFAULT_MEDIA;
  let host=media.one||(session&&session.baseUrl)||ONE_DOMAINS[0];
  if(type==='video'||/\/one\/|compress|video|\.mp4|\.m3u8/i.test(path))host=media.one_video||DEFAULT_MEDIA.one_video;
  if(type==='img')host=media.one_img||host;
  return joinUrl(host,path);
}

function isFakeVideoPath(p){
  p=String(p||'');
  if(/decrypt|compress\/decry/i.test(p)) return false;
  if(/\/one\/\d{8}\//i.test(p)) return true;
  if(/\/one\/[a-z0-9_\-]+\.mp4$/i.test(p) && p.indexOf('compress')<0) return true;
  return false;
}
function pickVideos(session,item){
  if(!item||typeof item!=='object')return{title:'',mainUrl:'',previewUrl:''};
  const title=item.title||item.name||item.subtitle||'未命名视频';
  const cands=[item.video_file,item.video,item.video_hls,item.video_hls_h265,item.video_url,item.video_file_url,item.video_hls_url]
    .filter(Boolean).map(String);
  let mainPath=cands.find(p=>/decrypt|compress\/decry/i.test(p))||'';
  if(!mainPath) mainPath=cands.find(p=>!isFakeVideoPath(p))||'';
  if(!mainPath) mainPath=cands[0]||'';
  if(/^https?:\/\//i.test(mainPath)&&isFakeVideoPath(mainPath)){
    const rel=cands.find(p=>!/^https?:\/\//i.test(p)&&/decrypt|compress\/decry/i.test(p));
    if(rel) mainPath=rel;
  }
  const mainUrl=mediaUrl(session,mainPath,'video');
  const previewPath=item.preview_video||item.preview_video_url||'';
  const previewUrl=mediaUrl(session,previewPath,'video');
  return{title,mainUrl,previewUrl};
}

function buildSen(url,title){let u='SenPlayer://x-callback-url/play?url='+encodeURIComponent(url);if(title)u+='&name='+encodeURIComponent(String(title).slice(0,80));return u;}
function notify(title,subtitle,body,openUrl){
  const t=title||'One',s=subtitle||'',b=body||'';
  try{if(typeof $notify==='function'){$notify(t,s,b,openUrl?{'open-url':openUrl}:{});return;}}catch(_){}
  try{if(typeof $notification!=='undefined'&&$notification.post){$notification.post(t,s,b,openUrl?{url:openUrl}:{});return;}}catch(_){}
  try{if(typeof $loon!=='undefined'){$notification.post(t,s,b,openUrl||'');return;}}catch(_){}
  step('notify.fallback',openUrl);
}

function extractIdFromRequest(){
  try{
    let body='';try{body=$request&&$request.body!=null?String($request.body):'';}catch(_){}
    body=body.trim();let plain='';
    if(looksLikeBase64(body)){try{plain=oneDec(body);step('req.body',short(plain,80));}catch(e){step('req.decFail',e.message||e);}}
    else if(body.indexOf('=')>=0)plain=body;
    if(plain){
      let params={};
      if(plain.charAt(0)==='{'){try{params=JSON.parse(plain);}catch(_){params=parseForm(plain);}}
      else params=parseForm(plain);
      const id=params.id||params.article_id||'';
      if(id)return String(id);
    }
    const u=($request&&$request.url)||'';
    const m=u.match(/[?&]id=([^&]+)/);
    if(m)return decodeURIComponent(m[1]);
  }catch(e){step('req.id.err',e.message||e);}
  return'';
}

function modifyBootstrap(obj){
  if(!obj||typeof obj!=='object')return obj;
  if(obj.data&&obj.data.user){const u=obj.data.user;u.vip_level=9;u.vip_expiry='2099-12-31';u.permanent_vip=1;u.vip_status=1;}
  if(obj.data){if(!obj.data.vip)obj.data.vip={};obj.data.vip.skip_ad=1;}
  return obj;
}
function modifyVipDownload(obj){
  if(!obj||typeof obj!=='object'||!obj.data||obj.code===412||obj.code===401)
    return{code:200,message:'请求成功',data:{limit:9999,use:0,last:9999,articles:[],downloaded_collection:0}};
  obj.code=200;obj.message='请求成功';obj.data.limit=9999;obj.data.use=0;obj.data.last=9999;return obj;
}
function parseResponseBody(text){
  text=String(text||'').trim();
  if(!text)return{json:null,encrypted:false};
  if(isPlainJson(text))return{json:JSON.parse(text),encrypted:false};
  if(looksLikeBase64(text))return{json:JSON.parse(oneDec(text)),encrypted:true};
  return{json:null,encrypted:false};
}
function doneResponse(json,wasEncrypted){
  const headers=Object.assign({},($response&&$response.headers)||{});
  delete headers['Content-Length'];delete headers['content-length'];
  const plain=JSON.stringify(json);
  if(wasEncrypted){headers['Content-Type']='text/plain; charset=utf-8';$done({body:oneEnc(plain),headers});}
  else{headers['Content-Type']='application/json; charset=utf-8';$done({body:plain,headers});}
}

function markPurchased(node){
  if(node==null)return node;
  if(Array.isArray(node)){
    for(let i=0;i<node.length;i++)node[i]=markPurchased(node[i]);
    return node;
  }
  if(typeof node!=='object')return node;
  const buyKeys=[
    'is_buy','is_bought','buy','bought','purchased','is_purchase','is_purchased',
    'has_buy','has_bought','is_paid','paid','is_unlock','unlocked','is_unlocked',
    'unlock','is_own','owned','is_owning','has_permission','can_play','can_watch',
    'is_free','free','vip_free','is_vip_free'
  ];
  for (var bi=0;bi<buyKeys.length;bi++){ var k=buyKeys[bi];
    if(k in node){
      const v=node[k];
      if(typeof v==='boolean')node[k]=true;
      else if(typeof v==='number')node[k]=1;
      else if(typeof v==='string')node[k]=(v==='0'||v==='false')?'1':'1';
      else node[k]=1;
    }
  }
  const statusKeys=['buy_status','purchase_status','pay_status','unlock_status','status_buy'];
  for(var si=0;si<statusKeys.length;si++){var k=statusKeys[si];
    if(k in node){
      const v=node[k];
      if(typeof v==='number')node[k]=1;
      else if(typeof v==='string')node[k]='1';
      else node[k]=1;
    }
  }
  const offKeys=['need_buy','need_purchase','need_pay','is_lock','locked','is_locked','lock'];
  for(var oi=0;oi<offKeys.length;oi++){var k=offKeys[oi];
    if(k in node){
      const v=node[k];
      if(typeof v==='boolean')node[k]=false;
      else if(typeof v==='number')node[k]=0;
      else if(typeof v==='string')node[k]='0';
      else node[k]=0;
    }
  }
  var _pk=['price','coin','coins','pay_coin','pay_price','amount'];for(var pi=0;pi<_pk.length;pi++){var k=_pk[pi];
    if(k in node && (typeof node[k]==='number'||typeof node[k]==='string'))node[k]=0;
  }
  var _nk=['data','list','info','articles','chapters','items','rows','records','result'];for(var ni=0;ni<_nk.length;ni++){var k=_nk[ni];
    if(node[k]!=null)node[k]=markPurchased(node[k]);
  }
  return node;
}

function buildDetailResponse(data){
  const payload=markPurchased(data&&typeof data==='object'?JSON.parse(JSON.stringify(data)):data);
  return{code:200,message:'请求成功',data:payload};
}

function isListPath(path){
  path=String(path||'');
  return /\/article\/(day|discovery|search|list)\b/.test(path)
    || /\/series\/(list|chapters)\b/.test(path)
    || /\/article\/recommend\b/.test(path)
    || /\/collection\//.test(path);
}

function handleListPurchased(json,wasEncrypted){
  try{
    const out=markPurchased(json);
    step('list.buy','marked');
    doneResponse(out,wasEncrypted);
  }catch(e){
    step('list.buy.err',e.message||e);
    doneResponse(json,wasEncrypted);
  }
}

function handleDetailAndNotify(passthroughJson,wasEncrypted){
  let id=extractIdFromRequest();
  if(!id&&passthroughJson){const d=passthroughJson.data||passthroughJson;if(d&&d.id!=null)id=String(d.id);}
  step('detail.id',id||'(empty)');
  if(!id){notify('One','无法取链','无 id','');doneResponse(markPurchased(passthroughJson),wasEncrypted);return;}

  ensureSession(session=>{
    if(!session||!session.tokenOne){
      step('detail.noSession');
      notify('One','无 token_one','续期失败，无法取真链','');
      doneResponse(markPurchased(passthroughJson),wasEncrypted);
      return;
    }
    postOne(session,'v2.5/article/detail',{id:id},(data,err)=>{
      if(err||!data){
        step('detail.post.fail',err);
        notify('One','detail 失败',String(err||''),'');
        doneResponse(markPurchased(passthroughJson),wasEncrypted);
        return;
      }
      step('detail.rawVideo',{video:data.video,video_file:data.video_file,preview:data.preview_video});
      const v=pickVideos(session,data);
      step('detail.main',short(v.mainUrl,140)||'(empty)');
      const isReal=/decrypt|compress\/decry/i.test(v.mainUrl);
      if(v.mainUrl&&/^https?:\/\//i.test(v.mainUrl)){
        notify(v.title,isReal?'真链 · 点按 SenPlayer 播放':'链路异常（可能仍是假链）',v.mainUrl,buildSen(v.mainUrl,v.title));
      }else if(v.previewUrl&&/^https?:\/\//i.test(v.previewUrl)){
        notify(v.title,'仅预览',v.previewUrl,buildSen(v.previewUrl,v.title+'（预览）'));
      }else{
        notify(v.title||'One','未取到视频链','见日志 detail.rawVideo','');
      }
      const resp=buildDetailResponse(data);
      step('detail.return','real+bought code='+resp.code);
      doneResponse(resp,wasEncrypted);
    });
  });
}

function handleResponse(){
  step('VER',SCRIPT_VERSION+(IGNORE_TOKEN_EXPIRE?' [IGNORE_EXPIRE]':''));
  step('RESP',getPath());
  const path=getPath();
  let text='';try{text=($response&&$response.body)!=null?String($response.body):'';}catch(_){}
  text=text.trim();
  if(!text){$done({});return;}
  let parsed;try{parsed=parseResponseBody(text);}catch(e){step('parse.err',e.message||e);$done({});return;}
  if(!parsed.json){$done({});return;}
  if(path.indexOf('/bootstrap')>=0){doneResponse(modifyBootstrap(parsed.json),parsed.encrypted);return;}
  if(path.indexOf('/vip/download')>=0){doneResponse(modifyVipDownload(parsed.json),parsed.encrypted);return;}
  if(path.indexOf('/article/detail')>=0){handleDetailAndNotify(parsed.json,parsed.encrypted);return;}
  if(isListPath(path)){handleListPurchased(parsed.json,parsed.encrypted);return;}
  $done({});
}

(function(){
  try {
    var isReq = typeof $request !== 'undefined' && typeof $response === 'undefined';
    if (isReq) { $done({}); return; }
    handleResponse();
  } catch (e) {
    try { console.log('[One1][FATAL] ' + (e && e.message ? e.message : e)); } catch (_) {}
    try { $done({}); } catch (_) {}
  }
})();
