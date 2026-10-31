  /* ===== Minimal PDF form reader and incremental writer (no libraries) ===== */
  var PDF = (function(){
    var WSC = {" ":1,"\n":1,"\r":1,"\t":1,"\f":1,"\x00":1}, DELIM = "()<>[]{}/%";
    function b2s(u8){ var s = "", i; for(i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return s; }
    function s2b(s){ var u = new Uint8Array(s.length); for(var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }
    function skip(s, i){
      for(;;){
        var c = s[i];
        if(c === undefined) return i;
        if(c === "%"){ while(i < s.length && s[i] !== "\n" && s[i] !== "\r") i++; continue; }
        if(WSC[c]){ i++; continue; }
        return i;
      }
    }
    var reNum = /[+\-]?(?:\d+\.?\d*|\.\d+)/y, reRef = /(\d+)\s+(\d+)\s+R(?![A-Za-z])/y, reKw = /[A-Za-z]+/y;
    function parse(s, i){
      i = skip(s, i);
      var c = s[i], j;
      if(c === "<" && s[i + 1] === "<"){
        i += 2; var m = [];
        for(;;){
          i = skip(s, i);
          if(s[i] === ">" && s[i + 1] === ">"){ i += 2; break; }
          var k = parse(s, i); if(k.v.t !== "name") throw new Error("Bad key at " + i);
          var v = parse(s, k.e); m.push([k.v.raw, v.v]); i = v.e;
        }
        return {v: {t: "dict", m: m}, e: i};
      }
      if(c === "["){
        i++; var a = [];
        for(;;){ i = skip(s, i); if(s[i] === "]"){ i++; break; } var x = parse(s, i); a.push(x.v); i = x.e; }
        return {v: {t: "arr", a: a}, e: i};
      }
      if(c === "/"){ j = i + 1; while(j < s.length && !WSC[s[j]] && DELIM.indexOf(s[j]) < 0) j++; return {v: {t: "name", raw: s.slice(i, j)}, e: j}; }
      if(c === "("){
        j = i + 1; var depth = 1;
        while(j < s.length){ var ch = s[j]; if(ch === "\\"){ j += 2; continue; } if(ch === "(") depth++; else if(ch === ")"){ if(--depth === 0) break; } j++; }
        return {v: {t: "str", raw: s.slice(i, j + 1)}, e: j + 1};
      }
      if(c === "<"){ j = s.indexOf(">", i); return {v: {t: "hex", raw: s.slice(i, j + 1)}, e: j + 1}; }
      reRef.lastIndex = i; var r = reRef.exec(s);
      if(r) return {v: {t: "ref", n: +r[1], g: +r[2]}, e: reRef.lastIndex};
      reNum.lastIndex = i; var n = reNum.exec(s);
      if(n) return {v: {t: "num", raw: n[0]}, e: reNum.lastIndex};
      reKw.lastIndex = i; var k2 = reKw.exec(s);
      if(k2){ var w = k2[0]; return {v: w === "null" ? {t: "null"} : {t: "kw", raw: w}, e: reKw.lastIndex}; }
      throw new Error("Can’t read the PDF near byte " + i);
    }
    function ser(v){
      switch(v.t){
        case "dict": return "<< " + v.m.map(function(p){ return p[0] + " " + ser(p[1]); }).join(" ") + " >>";
        case "arr": return "[ " + v.a.map(ser).join(" ") + " ]";
        case "ref": return v.n + " " + v.g + " R";
        case "null": return "null";
        default: return v.raw;
      }
    }
    function get(d, k){ if(!d || d.t !== "dict") return undefined; for(var i = 0; i < d.m.length; i++) if(d.m[i][0] === k) return d.m[i][1]; return undefined; }
    function put(d, k, v){ for(var i = 0; i < d.m.length; i++) if(d.m[i][0] === k){ d.m[i][1] = v; return; } d.m.push([k, v]); }
    function del(d, k){ d.m = d.m.filter(function(p){ return p[0] !== k; }); }
    function num(v){ return v && v.t === "num" ? parseFloat(v.raw) : NaN; }
    function clone(v){ return JSON.parse(JSON.stringify(v)); }

    var PDFDOC = {0x80:0x2022,0x81:0x2020,0x82:0x2021,0x83:0x2026,0x84:0x2014,0x85:0x2013,0x86:0x0192,0x87:0x2044,0x88:0x2039,0x89:0x203A,0x8A:0x2212,0x8B:0x2030,0x8C:0x201E,0x8D:0x201C,0x8E:0x201D,0x8F:0x2018,0x90:0x2019,0x91:0x201A,0x92:0x2122,0x93:0xFB01,0x94:0xFB02,0x95:0x0141,0x96:0x0152,0x97:0x0160,0x98:0x0178,0x99:0x017D,0x9A:0x0131,0x9B:0x0142,0x9C:0x0153,0x9D:0x0161,0x9E:0x017E};
    function strBytes(v){
      if(v.t === "hex"){
        var h = v.raw.slice(1, -1).replace(/[^0-9a-fA-F]/g, ""); if(h.length % 2) h += "0";
        var o = ""; for(var i = 0; i < h.length; i += 2) o += String.fromCharCode(parseInt(h.substr(i, 2), 16)); return o;
      }
      var s = v.raw.slice(1, -1), out = "", j = 0;
      while(j < s.length){
        var c = s[j];
        if(c !== "\\"){ out += c; j++; continue; }
        var nx = s[j + 1];
        if(nx === "n"){ out += "\n"; j += 2; } else if(nx === "r"){ out += "\r"; j += 2; } else if(nx === "t"){ out += "\t"; j += 2; }
        else if(nx === "b"){ out += "\b"; j += 2; } else if(nx === "f"){ out += "\f"; j += 2; }
        else if(nx === "\r"){ j += s[j + 2] === "\n" ? 3 : 2; } else if(nx === "\n"){ j += 2; }
        else if(/[0-7]/.test(nx)){ var oct = /[0-7]{1,3}/.exec(s.slice(j + 1, j + 4))[0]; out += String.fromCharCode(parseInt(oct, 8) & 255); j += 1 + oct.length; }
        else { out += nx === undefined ? "" : nx; j += 2; }
      }
      return out;
    }
    function decodeText(v){
      if(!v || (v.t !== "str" && v.t !== "hex")) return "";
      var b = strBytes(v), o = "", i;
      if(b.charCodeAt(0) === 0xFE && b.charCodeAt(1) === 0xFF){ for(i = 2; i + 1 < b.length; i += 2) o += String.fromCharCode((b.charCodeAt(i) << 8) | b.charCodeAt(i + 1)); return o; }
      for(i = 0; i < b.length; i++){ var c = b.charCodeAt(i); o += String.fromCharCode(PDFDOC[c] || c); }
      return o;
    }
    function encodeText(t){
      t = String(t);
      if(/^[\x20-\x7E]*$/.test(t)) return {t: "str", raw: "(" + t.replace(/([\\()])/g, "\\$1") + ")"};
      var h = "FEFF";
      for(var i = 0; i < t.length; i++) h += ("000" + t.charCodeAt(i).toString(16).toUpperCase()).slice(-4);
      return {t: "hex", raw: "<" + h + ">"};
    }

    async function inflate(bytes){
      var ds = new DecompressionStream("deflate"), w = ds.writable.getWriter();
      w.write(bytes); w.close();
      var buf = await new Response(ds.readable).arrayBuffer();
      return new Uint8Array(buf);
    }
    function unpredict(data, parms){
      var pred = num(get(parms, "/Predictor")); if(!(pred >= 10)) return data;
      var cols = num(get(parms, "/Columns")) || 1, colors = num(get(parms, "/Colors")) || 1, bpc = num(get(parms, "/BitsPerComponent")) || 8;
      var bpp = Math.max(1, Math.ceil(colors * bpc / 8)), row = Math.ceil(cols * colors * bpc / 8);
      var out = new Uint8Array(Math.floor(data.length / (row + 1)) * row), prev = new Uint8Array(row);
      for(var r = 0, p = 0; p + row < data.length + 1 && r * row < out.length; r++){
        var f = data[p++], cur = out.subarray(r * row, r * row + row);
        for(var i = 0; i < row; i++){
          var x = data[p + i], a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0, v;
          if(f === 0) v = x; else if(f === 1) v = x + a; else if(f === 2) v = x + b; else if(f === 3) v = x + ((a + b) >> 1);
          else { var pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
          cur[i] = v & 255;
        }
        prev = cur; p += row;
      }
      return out;
    }

    function Doc(u8){ this.u8 = u8; this.s = b2s(u8); this.x = {}; this.cache = {}; this.objstm = {}; this.scanIdx = null; }
    Doc.prototype.scan = function(){
      if(this.scanIdx) return this.scanIdx;
      var idx = {}, re = /(?:^|[\r\n\s])(\d+)\s+(\d+)\s+obj\b/g, m;
      while((m = re.exec(this.s))){ idx[m[1]] = {off: m.index + m[0].indexOf(m[1]), gen: +m[2]}; }
      return (this.scanIdx = idx);
    };
    Doc.prototype.rawAt = function(off){
      var s = this.s, m = /^(\d+)\s+(\d+)\s+obj/.exec(s.slice(off, off + 40));
      if(!m) return null;
      var p = parse(s, off + m[0].length), e = skip(s, p.e), stream = null;
      if(s.slice(e, e + 6) === "stream"){
        var st = e + 6; if(s[st] === "\r") st++; if(s[st] === "\n") st++;
        var len = get(p.v, "/Length"), L = len && len.t === "ref" ? num(this.obj(len)) : num(len);
        if(!(L >= 0) || s.slice(st + L, st + L + 30).indexOf("endstream") < 0){ L = s.indexOf("endstream", st) - st; while(L > 0 && (s[st + L - 1] === "\n" || s[st + L - 1] === "\r")) L--; }
        stream = this.u8.subarray(st, st + L);
      }
      return {n: +m[1], g: +m[2], v: p.v, stream: stream, off: off};
    };
    Doc.prototype.entry = function(n){
      var e = this.x[n];
      if(e && e.type === 1){ var r = this.rawAt(e.off); if(r && r.n === n) return {kind: 1, off: e.off, gen: r.g}; }
      if(e && e.type === 2) return {kind: 2, stm: e.stm, idx: e.idx, gen: 0};
      var sc = this.scan()[n]; if(sc) return {kind: 1, off: sc.off, gen: sc.gen};
      return null;
    };
    Doc.prototype.obj = function(ref){
      var n = typeof ref === "number" ? ref : ref.n;
      if(this.cache[n]) return this.cache[n].v;
      var e = this.entry(n); if(!e) return {t: "null"};
      if(e.kind === 1){ var r = this.rawAt(e.off); this.cache[n] = {v: r.v, off: e.off, gen: e.gen, stream: r.stream}; return r.v; }
      var os = this.objstm[e.stm]; if(!os) return {t: "null"};
      var v = parse(os.s, os.offs[n]).v; this.cache[n] = {v: v, off: os.off, gen: 0}; return v;
    };
    Doc.prototype.resolve = function(v){ return v && v.t === "ref" ? this.obj(v) : v; };
    Doc.prototype.offsetOf = function(n){ this.obj(n); return this.cache[n] ? this.cache[n].off : -1; };
    Doc.prototype.decodeStream = async function(dict, data){
      var f = get(dict, "/Filter"), names = !f ? [] : f.t === "arr" ? f.a.map(function(x){ return x.raw; }) : [f.raw];
      var parms = get(dict, "/DecodeParms"); if(parms && parms.t === "arr") parms = parms.a[0];
      for(var i = 0; i < names.length; i++){
        if(names[i] !== "/FlateDecode") throw new Error("Unsupported PDF compression " + names[i]);
        data = await inflate(data);
        if(parms) data = unpredict(data, this.resolve(parms));
      }
      return data;
    };
    Doc.prototype.load = async function(){
      var s = this.s, sx = s.lastIndexOf("startxref");
      if(sx < 0) throw new Error("This file doesn’t look like a PDF.");
      var off = parseInt(/startxref\s+(\d+)/.exec(s.slice(sx, sx + 40))[1], 10), seen = {}, first = true, stmNums = {};
      this.lastXref = off;
      while(off >= 0 && !seen[off] && off < s.length){
        seen[off] = 1;
        var t = skip(s, off), trailer;
        if(s.slice(t, t + 4) === "xref"){
          var p = t + 4;
          for(;;){
            p = skip(s, p);
            if(s.slice(p, p + 7) === "trailer") break;
            var hdr = /(\d+)\s+(\d+)/y; hdr.lastIndex = p; var h = hdr.exec(s); if(!h) break;
            p = hdr.lastIndex; var start = +h[1], cnt = +h[2], ent = /\s*(\d{10})\s+(\d{5})\s+([nf])/y;
            for(var k = 0; k < cnt; k++){
              ent.lastIndex = p; var e = ent.exec(s); if(!e) break; p = ent.lastIndex;
              var nn = start + k; if(!(nn in this.x)) this.x[nn] = e[3] === "n" ? {type: 1, off: +e[1]} : {type: 0};
            }
          }
          trailer = parse(s, p + 7).v;
          if(first){ this.trailer = trailer; this.xrefKind = "table"; first = false; }
          var xs = get(trailer, "/XRefStm"); if(xs) await this.readXrefStream(num(xs), true);
        } else {
          var r = await this.readXrefStream(off, first);
          if(!r) break;
          trailer = r;
          if(first){ this.trailer = trailer; this.xrefKind = "stream"; first = false; }
        }
        var prev = get(trailer, "/Prev"); off = prev ? num(prev) : -1;
      }
      if(!this.trailer){
        var ti = s.lastIndexOf("trailer"); if(ti < 0) throw new Error("Couldn’t find the PDF’s trailer.");
        this.trailer = parse(s, ti + 7).v; this.xrefKind = "table";
      }
      var stms = {}; for(var key in this.x) if(this.x[key].type === 2) stms[this.x[key].stm] = 1;
      for(var sn in stms) await this.loadObjStm(+sn);
      return this;
    };
    Doc.prototype.readXrefStream = async function(off, isFirst){
      var r = this.rawAt(off); if(!r || !r.stream || (get(r.v, "/Type") || {}).raw !== "/XRef") return null;
      var data = await this.decodeStream(r.v, r.stream), W = get(r.v, "/W").a.map(num);
      var size = num(get(r.v, "/Size")), index = get(r.v, "/Index"), idx = index ? index.a.map(num) : [0, size], p = 0;
      function rd(w){ var v = 0; for(var i = 0; i < w; i++) v = v * 256 + data[p++]; return v; }
      for(var q = 0; q < idx.length; q += 2){
        for(var k = 0; k < idx[q + 1]; k++){
          var ty = W[0] ? rd(W[0]) : 1, f2 = rd(W[1]), f3 = rd(W[2]), nn = idx[q] + k;
          if(nn in this.x) continue;
          this.x[nn] = ty === 1 ? {type: 1, off: f2} : ty === 2 ? {type: 2, stm: f2, idx: f3} : {type: 0};
        }
      }
      return r.v;
    };
    Doc.prototype.loadObjStm = async function(n){
      var e = this.x[n]; if(!e || e.type !== 1) return;
      var r = this.rawAt(e.off); if(!r || !r.stream) return;
      var data = await this.decodeStream(r.v, r.stream), s = b2s(data), N = num(get(r.v, "/N")), first = num(get(r.v, "/First"));
      var head = s.slice(0, first).trim().split(/\s+/).map(Number), offs = {};
      for(var i = 0; i < N; i++) offs[head[2 * i]] = first + head[2 * i + 1];
      this.objstm[n] = {s: s, offs: offs, off: e.off};
    };

    /* fields */
    Doc.prototype.qname = function(d){
      var parts = [], guard = 0;
      while(d && guard++ < 20){ var T = get(d, "/T"); if(T) parts.unshift(decodeText(T)); var par = get(d, "/Parent"); d = par ? this.obj(par) : null; }
      return parts.join(".");
    };
    Doc.prototype.inheritFT = function(d){ var guard = 0; while(d && guard++ < 20){ var ft = get(d, "/FT"); if(ft) return ft.raw; var par = get(d, "/Parent"); d = par ? this.obj(par) : null; } return ""; };
    Doc.prototype.fields = function(){
      var self = this, map = {}, onPage = {};
      function rec(name){ return map[name] || (map[name] = {name: name, ft: "", carriers: [], widgets: [], on: null}); }
      function addWidget(ref, d){
        var hasT = !!get(d, "/T"), name = self.qname(d);
        if(!name) return;
        if(!hasT){ var par = get(d, "/Parent"); if(par){ var f = rec(name); if(f.carriers.indexOf(par.n) < 0) f.carriers.push(par.n); } }
        var r = rec(name); r.ft = r.ft || self.inheritFT(d);
        if(hasT && r.carriers.indexOf(ref.n) < 0) r.carriers.push(ref.n);
        if(r.widgets.indexOf(ref.n) < 0) r.widgets.push(ref.n);
      }
      function walk(ref, depth){
        if(depth > 20 || !ref || ref.t !== "ref") return;
        var d = self.obj(ref), kids = self.resolve(get(d, "/Kids"));
        if(kids && kids.t === "arr" && kids.a.length){
          var name = self.qname(d); if(name){ var f = rec(name); f.ft = f.ft || self.inheritFT(d); if(f.carriers.indexOf(ref.n) < 0) f.carriers.push(ref.n); }
          kids.a.forEach(function(k){ walk(k, depth + 1); });
        } else addWidget(ref, d);
      }
      var root = this.obj(get(this.trailer, "/Root")), acro = this.resolve(get(root, "/AcroForm"));
      this.acroRef = get(root, "/AcroForm");
      var arr = acro ? this.resolve(get(acro, "/Fields")) : null;
      if(arr && arr.t === "arr") arr.a.forEach(function(r){ walk(r, 0); });
      (function pages(node, depth){
        if(!node || depth > 30) return;
        var d = self.resolve(node), kids = self.resolve(get(d, "/Kids"));
        if(kids && kids.t === "arr") kids.a.forEach(function(k){ pages(k, depth + 1); });
        var an = self.resolve(get(d, "/Annots"));
        if(an && an.t === "arr") an.a.forEach(function(a){
          if(a.t !== "ref") return; var ad = self.obj(a);
          if((get(ad, "/Subtype") || {}).raw === "/Widget"){ onPage[a.n] = 1; addWidget(a, ad); }
        });
      })(get(root, "/Pages"), 0);
      Object.keys(map).forEach(function(k){
        var f = map[k];
        if(f.ft === "/Btn") f.widgets.forEach(function(w){
          var ap = self.resolve(get(self.obj(w), "/AP")), n = ap ? self.resolve(get(ap, "/N")) : null;
          if(n && n.t === "dict") n.m.forEach(function(p){ if(p[0] !== "/Off" && !f.on) f.on = p[0]; });
        });
        if(!f.on) f.on = "/Yes";
        var best = null, bo = -1, vis = f.carriers.filter(function(c){ return onPage[c]; });
        (vis.length ? vis : f.carriers).forEach(function(c){ var o = self.offsetOf(c); if(o >= bo){ bo = o; best = c; } });
        var d = best != null ? self.obj(best) : null, V = d ? get(d, "/V") : undefined;
        if(f.ft === "/Btn"){
          if(V && V.t === "name") f.value = V.raw !== "/Off" && V.raw !== "/";
          else { var w0 = f.widgets.length ? self.obj(f.widgets[0]) : null, AS = w0 ? get(w0, "/AS") : null; f.value = !!(AS && AS.raw !== "/Off"); }
        } else f.value = V ? decodeText(V) : "";
      });
      this.fieldMap = map;
      return map;
    };

    function apStream(d, text){
      var R = (get(d, "/Rect") || {a: []}).a.map(num), w = Math.abs(R[2] - R[0]) || 20, h = Math.abs(R[3] - R[1]) || 14;
      var DA = get(d, "/DA"), da = DA ? strBytes(DA) : "", m = /([\d.]+)\s+Tf/.exec(da), sz = m ? parseFloat(m[1]) : 0;
      if(!sz || sz > h - 2) sz = Math.max(6, Math.min(12, h - 4));
      var q = num(get(d, "/Q")) || 0, safe = String(text).replace(/[^\x20-\x7E]/g, "?"), tw = safe.length * sz * 0.556;
      var x = q === 1 ? (w - tw) / 2 : q === 2 ? w - 2 - tw : 2, y = (h - sz * 0.7) / 2;
      var body = "/Tx BMC\nq\n1 1 " + (w - 2).toFixed(2) + " " + (h - 2).toFixed(2) + " re W n\nBT\n/Helv " + sz + " Tf 0 g\n" +
        Math.max(1, x).toFixed(2) + " " + y.toFixed(2) + " Td\n(" + safe.replace(/([\\()])/g, "\\$1") + ") Tj\nET\nQ\nEMC\n";
      return "<< /Type /XObject /Subtype /Form /BBox [ 0 0 " + w.toFixed(2) + " " + h.toFixed(2) + " ] /Resources << /Font << /Helv << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> >> >> /Length " + body.length + " >>\nstream\n" + body + "endstream";
    }

    Doc.prototype.save = function(changes){
      var self = this, s = this.s, out = s.charAt(s.length - 1) === "\n" ? "" : "\n", base = this.u8.length;
      var size = num(get(this.trailer, "/Size")), next = size, written = {}, gens = {};
      function emit(n, gen, body){ written[n] = base + out.length; gens[n] = gen; out += n + " " + gen + " obj\n" + body + "\nendobj\n"; }
      var edits = {};
      function edit(n){ if(!edits[n]){ self.obj(n); edits[n] = {d: clone(self.cache[n].v), gen: self.cache[n].gen || 0}; } return edits[n].d; }
      Object.keys(changes).forEach(function(name){
        var f = this.fieldMap[name]; if(!f) return;
        var val = changes[name];
        if(f.ft === "/Btn"){
          var st = {t: "name", raw: val ? f.on : "/Off"};
          f.carriers.forEach(function(c){ put(edit(c), "/V", st); });
          f.widgets.forEach(function(w){ var d = edit(w); if(get(d, "/AP") || get(d, "/AS")) put(d, "/AS", st); });
        } else {
          var enc = encodeText(val);
          f.carriers.forEach(function(c){ put(edit(c), "/V", enc); });
          f.widgets.forEach(function(w){
            var d = edit(w), apn = next++;
            emit(apn, 0, apStream(d, val));
            put(d, "/AP", {t: "dict", m: [["/N", {t: "ref", n: apn, g: 0}]]});
          });
        }
      }, this);
      var acro = this.acroRef ? this.resolve(this.acroRef) : null;
      if(acro && this.acroRef.t === "ref"){
        var na = get(acro, "/NeedAppearances");
        if(!na || na.raw !== "true"){ var ad = edit(this.acroRef.n); put(ad, "/NeedAppearances", {t: "kw", raw: "true"}); }
      }
      Object.keys(edits).forEach(function(n){ emit(+n, edits[n].gen, ser(edits[n].d)); });
      var nums = Object.keys(written).map(Number).sort(function(a, b){ return a - b; });
      if(!nums.length) return null;
      var tr = clone(this.trailer);
      ["/Prev","/XRefStm","/Type","/W","/Index","/Length","/Filter","/DecodeParms"].forEach(function(k){ del(tr, k); });
      put(tr, "/Prev", {t: "num", raw: String(this.lastXref)});
      if(this.xrefKind === "stream"){
        var xn = next++; written[xn] = base + out.length; gens[xn] = 0; nums.push(xn);
        var groups = [], bin = "";
        nums.forEach(function(n){ var g = groups[groups.length - 1]; if(g && g[0] + g[1] === n) g[1]++; else groups.push([n, 1]); });
        nums.forEach(function(n){ var o = written[n]; bin += String.fromCharCode(1, (o >>> 24) & 255, (o >>> 16) & 255, (o >>> 8) & 255, o & 255, (gens[n] >> 8) & 255, gens[n] & 255); });
        put(tr, "/Type", {t: "name", raw: "/XRef"});
        put(tr, "/Size", {t: "num", raw: String(next)});
        put(tr, "/W", {t: "arr", a: [1, 4, 2].map(function(x){ return {t: "num", raw: String(x)}; })});
        put(tr, "/Index", {t: "arr", a: [].concat.apply([], groups).map(function(x){ return {t: "num", raw: String(x)}; })});
        put(tr, "/Length", {t: "num", raw: String(bin.length)});
        out += xn + " 0 obj\n" + ser(tr) + "\nstream\n" + bin + "\nendstream\nendobj\nstartxref\n" + written[xn] + "\n%%EOF\n";
      } else {
        var xoff = base + out.length, tbl = "xref\n", i = 0;
        while(i < nums.length){
          var j = i; while(j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
          tbl += nums[i] + " " + (j - i + 1) + "\n";
          for(var k = i; k <= j; k++) tbl += ("0000000000" + written[nums[k]]).slice(-10) + " " + ("00000" + gens[nums[k]]).slice(-5) + " n \n";
          i = j + 1;
        }
        put(tr, "/Size", {t: "num", raw: String(Math.max(next, size))});
        out += tbl + "trailer\n" + ser(tr) + "\nstartxref\n" + xoff + "\n%%EOF\n";
      }
      var add = s2b(out), res = new Uint8Array(base + add.length);
      res.set(this.u8, 0); res.set(add, base);
      return res;
    };

    return {
      open: async function(u8){ var d = new Doc(u8); await d.load(); d.fields(); return d; }
    };
  })();
