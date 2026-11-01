(function(){
  "use strict";
  var KEY = "dcc-cheat-floor", TKEY = "dcc-cheat-theme", TABKEY = "dcc-cheat-tab", TOOLKEY = "dcc-cheat-tool";
  var root = document.documentElement;
  function store(k, v){ try{ if(v === undefined) return localStorage.getItem(k); if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){ return null; } }

/*__PDFENGINE__*/


  /* ---------- helpers ---------- */
  function $(id){ return document.getElementById(id); }
  function num(id, d){ var el = $(id); if(!el) return d; var v = parseInt(el.value, 10); return isNaN(v) ? d : v; }
  function rnd(n){
    try{ var a = new Uint32Array(1); window.crypto.getRandomValues(a); return (a[0] % n) + 1; }
    catch(e){ return Math.floor(Math.random() * n) + 1; }
  }
  function rollN(n, x){ var r = []; for(var i = 0; i < n; i++) r.push(rnd(x)); return r; }
  function total(a){ return a.reduce(function(s, v){ return s + v; }, 0); }
  function sgn(n){ return (n < 0 ? "−" : "+") + Math.abs(n); }
  function op(n){ return (n < 0 ? "− " : "+ ") + Math.abs(n); }
  function plural(n, w){ return n + " " + w + (n === 1 ? "" : "s"); }
  function modOf(s){
    if(s >= 300) return 10; if(s >= 200) return 9; if(s >= 150) return 8; if(s >= 100) return 7; if(s >= 50) return 6;
    if(s >= 20) return 5; if(s >= 10) return 4; if(s >= 6) return 3; if(s >= 3) return 2; return 1;
  }
  var STATS = ["str","int","con","dex","cha"], SN = {str:"Str",int:"Int",con:"Con",dex:"Dex",cha:"Cha"};
  var SFULL = {str:"Strength",int:"Intelligence",con:"Constitution",dex:"Dexterity",cha:"Charisma"};
  var HB = ["--hb1","--hb2","--hb3","--hb4","--hb5","--hb6","--hb7","--hb8","--hb9","--hb10"];
  function span(text, eq, cls){ var s = document.createElement("span"); s.textContent = text; if(eq){ s.setAttribute("data-eq", eq); s.tabIndex = 0; } if(cls) s.className = cls; return s; }
  function fill(el, parts){ el.textContent = ""; parts.forEach(function(p){ el.appendChild(typeof p === "string" ? document.createTextNode(p) : p); }); }

  /* ---------- tooltip for equations ---------- */
  var tip = document.createElement("div"); tip.id = "tip"; tip.className = "tip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip);
  var tipFor = null;
  function placeTip(el){
    var r = el.getBoundingClientRect();
    tip.style.left = "0px"; tip.style.top = "0px";
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), window.innerWidth - tw - 8);
    var y = r.top - th - 8; if(y < 8) y = r.bottom + 8;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function showTip(el){
    var t = el.getAttribute("data-eq"); if(!t) return;
    tip.textContent = t; tip.classList.add("show"); tipFor = el; el.setAttribute("aria-describedby", "tip"); placeTip(el);
  }
  function hideTip(){ tip.classList.remove("show"); if(tipFor) tipFor.removeAttribute("aria-describedby"); tipFor = null; }
  document.addEventListener("mouseover", function(e){
    var el = e.target.closest ? e.target.closest("[data-eq]") : null;
    if(el){ if(el !== tipFor) showTip(el); } else if(tipFor) hideTip();
  });
  document.addEventListener("focusin", function(e){ var el = e.target.closest ? e.target.closest("[data-eq]") : null; if(el) showTip(el); });
  document.addEventListener("focusout", function(e){ if(tipFor && e.target === tipFor) hideTip(); });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape") hideTip(); });
  window.addEventListener("scroll", function(){ if(tipFor) placeTip(tipFor); }, {passive: true});

  /* ---------- floor ---------- */
  var LOOK = {
    num: function(F){ return String(F); },
    timer: function(F){ return ({1:"5 days",2:"6 days",3:"8 days",4:"10 days",5:"15 days"})[F]; },
    gold: function(F){ return ({1:"no gold",2:"1d6 gold",3:"2d4 gold",4:"2d6 gold",5:"2d8 gold"})[F]; },
    upgrades: function(F){ return F <= 2 ? "Rank 5 only" : "Ranks 5, 10 and 15"; }
  };
  var LOOKEQ = {
    timer: function(F){ var d = ({1:5,2:6,3:8,4:10,5:15})[F]; return "Floor " + F + " usually collapses after " + d + " dungeon days\n" + d + " × 30 hours = " + (d * 30) + " hours"; },
    gold: function(F){ return "Each dead Mob on Floor " + F + " drops " + LOOK.gold(F) + " and 1d6 Misc. Junk.\nRoll once, then multiply by the number of bodies."; },
    upgrades: function(F){ return "Floors 1–2: only Rank 5 upgrades work.\nFloor 3+: Rank 5, 10 and 15 upgrades work.\nYou’re on Floor " + F + "."; }
  };
  var formulas = {};
  /* floor formulas are always "[A +] [B *] F", so they're parsed, never run as code */
  function calc(expr, F){
    if(!formulas[expr]){
      var m = /^\s*(?:(\d+)\s*\+\s*)?(?:(\d+)\s*\*\s*)?F\s*$/.exec(expr);
      if(!m) throw new Error("Unsupported floor formula: " + expr);
      formulas[expr] = {a: m[1] ? +m[1] : 0, b: m[2] ? +m[2] : 1};
    }
    return formulas[expr].a + formulas[expr].b * F;
  }
  function pretty(expr, sub){ return expr.replace(/\*/g, " × ").replace(/\+/g, " + ").replace(/F/g, sub); }
  var floor = parseInt(store(KEY), 10);
  if(!(floor >= 1 && floor <= 5)) floor = 1;

  function setFloor(F, animate){
    floor = F;
    root.setAttribute("data-floor", F);
    document.querySelectorAll("[data-f]").forEach(function(el){
      var ex = el.getAttribute("data-f"), v = calc(ex, F);
      el.textContent = v;
      el.setAttribute("data-eq", ex === "F" ? "Your floor number: " + F : pretty(ex, "Floor") + "\n= " + pretty(ex, String(F)) + " = " + v);
    });
    document.querySelectorAll("[data-d]").forEach(function(el){
      var d = el.getAttribute("data-d"); el.textContent = d + "+" + F;
      el.setAttribute("data-eq", d + " + Floor\n= " + d + " + " + F + " each round");
    });
    document.querySelectorAll("[data-lk]").forEach(function(el){
      var k = el.getAttribute("data-lk"); el.textContent = LOOK[k](F);
      if(LOOKEQ[k]) el.setAttribute("data-eq", LOOKEQ[k](F));
    });
    document.querySelectorAll(".lv").forEach(function(el){ if(el.hasAttribute("data-eq")) el.tabIndex = 0; });
    document.querySelectorAll("[data-floors]").forEach(function(el){
      var r = el.getAttribute("data-floors").split("-"), a = +r[0], b = +r[1];
      el.classList.toggle("off", F < a || F > b);
    });
    document.querySelectorAll(".stairs button").forEach(function(b){
      b.setAttribute("aria-pressed", String(+b.getAttribute("data-floor") === F));
    });
    if(animate && !matchMedia("(prefers-reduced-motion: reduce)").matches){
      document.querySelectorAll(".lv").forEach(function(el){ el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); });
    }
    store(KEY, String(F));
    if(typeof calcRefresh === "function" && ready) calcRefresh();
  }
  var ready = false;
  document.querySelectorAll(".stairs button").forEach(function(b){
    b.addEventListener("click", function(){ setFloor(+b.getAttribute("data-floor"), true); });
  });

  /* ---------- section tabs ---------- */
  var nav = document.querySelector(".hbnav"), bands = Array.prototype.slice.call(document.querySelectorAll(".band"));
  var links = {}, current = null;
  document.querySelectorAll(".hbnav a").forEach(function(a){ links[a.getAttribute("href").slice(1)] = a; });
  function markNav(id){ Object.keys(links).forEach(function(k){ if(k === id) links[k].setAttribute("aria-current", "true"); else links[k].removeAttribute("aria-current"); }); }
  function navH(){ return nav ? nav.getBoundingClientRect().height : 0; }
  function showTab(id, opts){
    opts = opts || {};
    if(!$(id) || !links[id]) id = "calc";
    current = id;
    bands.forEach(function(b){ b.classList.toggle("tab-off", b.id !== id); });
    markNav(id); store(TABKEY, id);
    try{ if(!opts.noHash) history.replaceState(null, "", "#" + id); }catch(e){}
    if(opts.scroll !== false){
      var main = document.querySelector("main"), top = main.getBoundingClientRect().top + window.scrollY - navH() - 10;
      if(window.scrollY > top) window.scrollTo(0, top);
    }
  }
  bands.forEach(function(b, i){
    var bn = document.createElement("div"); bn.className = "bandnav noprint";
    if(i > 0){ var pv = document.createElement("a"); pv.href = "#" + bands[i - 1].id; pv.className = "btn"; pv.textContent = "Previous: " + labelOf(bands[i - 1].id); bn.appendChild(pv); }
    if(i < bands.length - 1){ var nx = document.createElement("a"); nx.href = "#" + bands[i + 1].id; nx.className = "btn next"; nx.textContent = "Next: " + labelOf(bands[i + 1].id); bn.appendChild(nx); }
    b.appendChild(bn);
  });
  function labelOf(id){ var a = links[id], f = a.querySelector(".full"); return (f ? f.textContent : a.textContent).trim(); }
  document.addEventListener("click", function(e){
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null; if(!a) return;
    var id = a.getAttribute("href").slice(1), el = $(id); if(!el) return;
    var band = el.classList.contains("band") ? el : el.closest(".band"); if(!band) return;
    e.preventDefault();
    if(q.value){ q.value = ""; filter(); }
    showTab(band.id, {scroll: el === band});
    if(el.classList.contains("toolpanel")) selectTool(el.id.slice(3));
    if(el !== band){ var top = el.getBoundingClientRect().top + window.scrollY - navH() - 12; window.scrollTo(0, top); }
  });

  /* ---------- search ---------- */
  var q = $("q"), empty = $("empty");
  function filter(){
    var term = q.value.trim().toLowerCase(), any = false;
    if(!term){
      document.querySelectorAll(".hide-s").forEach(function(el){ el.classList.remove("hide-s"); });
      empty.classList.remove("show"); empty.textContent = "";
      showTab(current || "calc", {scroll: false, noHash: true});
      return;
    }
    markNav(null);
    bands.forEach(function(band){
      band.classList.remove("tab-off");
      var blocks = band.querySelectorAll(".blk"), shown = 0;
      if(!blocks.length){ var scope = band.querySelector(".calc-wrap") || band; shown = scope.textContent.toLowerCase().indexOf(term) > -1 ? 1 : 0; }
      blocks.forEach(function(blk){
        var hit, rows = blk.querySelectorAll(".debuffs tbody tr");
        if(rows.length){
          var n = 0;
          rows.forEach(function(r){ var m = r.textContent.toLowerCase().indexOf(term) > -1; r.classList.toggle("hide-s", !m); if(m) n++; });
          blk.querySelectorAll(".debuffs").forEach(function(tb){ tb.classList.toggle("hide-s", !tb.querySelector("tbody tr:not(.hide-s)")); });
          hit = n > 0;
        } else hit = blk.textContent.toLowerCase().indexOf(term) > -1;
        blk.classList.toggle("hide-s", !hit); if(hit) shown++;
      });
      if(!shown && band.querySelector(".band-head").textContent.toLowerCase().indexOf(term) > -1){
        band.querySelectorAll(".hide-s").forEach(function(b){ b.classList.remove("hide-s"); }); shown = 1;
      }
      band.classList.toggle("hide-s", !shown); if(shown) any = true;
    });
    empty.classList.toggle("show", !any);
    empty.textContent = any ? "" : "Nothing matches “" + q.value.trim() + "”. Try a shorter word, like evade, mana or prone.";
  }
  q.addEventListener("input", filter);
  q.addEventListener("keydown", function(e){ if(e.key === "Escape"){ q.value = ""; filter(); } });

  /* ---------- theme and print ---------- */
  var tBtn = $("theme");
  function isDark(){ var t = root.getAttribute("data-theme"); return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; }
  function syncTheme(){ tBtn.textContent = isDark() ? "Light mode" : "Dark mode"; }
  var savedTheme = store(TKEY);
  if(savedTheme === "dark" || savedTheme === "light") root.setAttribute("data-theme", savedTheme);
  tBtn.addEventListener("click", function(){ var nx = isDark() ? "light" : "dark"; root.setAttribute("data-theme", nx); store(TKEY, nx); syncTheme(); });
  syncTheme();
  $("print").addEventListener("click", function(){ window.print(); });

  /* ---------- dice expressions ---------- */
  function parseDice(str){
    var out = {dice: [], flat: 0, ok: true};
    var s = String(str || "").replace(/\s+/g, "").toLowerCase().replace(/−/g, "-");
    if(!s) return out;
    var re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g, m, pos = 0;
    while((m = re.exec(s))){
      if(m.index !== pos || (pos > 0 && !(m[1] || m[4]))){ out.ok = false; break; }
      pos = re.lastIndex;
      if(m[3] !== undefined){
        var n = m[2] === "" ? 1 : +m[2], x = +m[3];
        if(n < 1 || n > 100 || x < 2 || x > 1000){ out.ok = false; break; }
        out.dice.push({n: n, x: x, neg: m[1] === "-"});
      } else out.flat += (m[4] === "-" ? -1 : 1) * (+m[5]);
    }
    if(pos !== s.length) out.ok = false;
    return out;
  }
  function rankDie(r){
    if(r <= 0) return {dice: [], flat: 0};
    if(r === 1) return {dice: [], flat: 1};
    var t = r <= 3 ? [[1,2]] : r <= 5 ? [[1,4]] : r <= 7 ? [[1,6]] : r <= 9 ? [[1,8]] : r <= 11 ? [[1,10]] :
            r <= 13 ? [[1,12]] : r <= 15 ? [[1,8],[1,6]] : r <= 17 ? [[2,8]] : r <= 19 ? [[1,10],[1,8]] : [[2,10]];
    return {dice: t.map(function(d){ return {n: d[0], x: d[1], neg: false}; }), flat: 0};
  }
  function diceText(list){ return list.map(function(d){ return (d.neg ? "−" : "") + d.n + "d" + d.x; }).join(" + ").replace(/\+ −/g, "− "); }
  function statKey(t){ var k = String(t || "").trim().slice(0, 3).toLowerCase(); return STATS.indexOf(k) > -1 ? k : ""; }

  /* ---------- your crawler ---------- */
  var CKEY = "dcc-cheat-crawler";
  (function(){
    var raw = store(CKEY); if(!raw) return;
    try{
      var o = JSON.parse(raw); document.querySelectorAll("[data-save]").forEach(function(el){ if(o[el.id] != null) el.value = o[el.id]; });
      /* older saves had no Unenhanced column: start it equal to Enhanced */
      STATS.forEach(function(k){ if(o["cu-" + k] == null && o["cr-" + k] != null) $("cu-" + k).value = o["cr-" + k]; });
    }catch(e){}
  })();
  function saveCrawler(){ var o = {}; document.querySelectorAll("[data-save]").forEach(function(el){ o[el.id] = el.value; }); store(CKEY, JSON.stringify(o)); }
  function crawler(){
    var c = {score: {}, base: {}, mod: {}};
    STATS.forEach(function(k){ var s = Math.max(1, num("cr-" + k, 3)); c.score[k] = s; c.base[k] = Math.max(1, num("cu-" + k, s)); c.mod[k] = modOf(s); });
    c.evb = num("cr-evb", 0); c.arm = Math.max(0, num("cr-arm", 0)); c.drb = Math.max(0, num("cr-drb", 0));
    c.jump = Math.max(0, num("cr-jump", 0)); c.lvl = Math.max(1, num("cr-lvl", 1)); c.fav = Math.max(0, num("cr-fav", 0));
    c.dr = c.arm + c.drb; c.evade = c.mod.dex + c.evb; c.slot = c.mod.con; c.mana = c.score.int;
    return c;
  }
  function renderCrawler(){
    var c = crawler(), F = floor;
    STATS.forEach(function(k){
      var m = $("m-" + k); m.textContent = "+" + c.mod[k];
      var gap = c.score[k] - c.base[k];
      m.setAttribute("data-eq", "Enhanced " + SFULL[k] + " " + c.score[k] + " falls in the " + modBand(c.score[k]) + " range\nso its Mod is +" + c.mod[k] +
        "\nUnenhanced " + c.base[k] + (gap ? (gap > 0 ? " + " : " \u2212 ") + Math.abs(gap) + " from gear and buffs" : ", nothing from gear or buffs")); m.tabIndex = 0;
    });
    var fame = c.score.cha >= 5 * F ? "+1 Popularity at floor’s end" : c.score.cha <= 2 * F ? "−1 Popularity at floor’s end" : "No Popularity change";
    var pts = 3 * (c.lvl - 1);
    var rows = [
      ["Evade", "d20 " + sgn(c.evade), "d20 + Dex Mod " + c.mod.dex + " + Evade Buffs " + c.evb + "\n= d20 " + sgn(c.evade)],
      ["DR", String(c.dr), "Armor " + c.arm + " + DR Buffs " + c.drb + " = " + c.dr],
      ["Health Bar", "10 slots of " + c.slot, "Each slot holds your Con Mod (" + c.slot + ")\n10 × " + c.slot + " = " + (c.slot * 10) + " Health"],
      ["Max Mana", String(c.mana), "Max Mana = Enhanced Intelligence score = " + c.mana + "\nShort rest gives back half: " + c.mana + " ÷ 2 = " + Math.floor(c.mana / 2)],
      ["Hold breath", plural(c.mod.con, "round"), "Con Mod = " + c.mod.con + " rounds"],
      ["Dying countdown", plural(c.mod.con, "round"), "Con Mod = " + c.mod.con + " rounds"],
      ["Jump", "up to " + (c.jump + c.mod.str) + " ft", "Jumping Rank " + c.jump + " + Str Mod " + c.mod.str + " = " + (c.jump + c.mod.str) + " ft" + (c.jump ? "" : "\nNo Ranks: roll with Disadvantage")],
      ["Lift", (c.score.str * 15) + " lb", "Strength " + c.score.str + " × 15 = " + (c.score.str * 15) + " lb"],
      ["Throw", c.score.str + " lb, " + (c.score.str * 10) + " ft", "Weight up to Strength: " + c.score.str + " lb\nDistance: Strength " + c.score.str + " × 10 = " + (c.score.str * 10) + " ft"],
      ["Charisma", fame, "Charisma " + c.score.cha + " on Floor " + F + "\n+1 at " + (5 * F) + " or more (5 × F), −1 at " + (2 * F) + " or less (2 × F)"],
      ["Stat points", pts + " from levels", "3 × (Level " + c.lvl + " − 1) = " + pts + (F < 3 ? "\nSpend them once you reach Floor 3, in a saferoom" : "\nSpend them in a saferoom")]
    ];
    var dl = $("cr-out"); dl.innerHTML = "";
    rows.forEach(function(r){
      var dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = r[0]; dd.appendChild(span(r[1], r[2])); dl.appendChild(dt); dl.appendChild(dd);
    });
  }
  function modBand(s){ return s >= 300 ? "300+" : s >= 200 ? "200–299" : s >= 150 ? "150–199" : s >= 100 ? "100–149" : s >= 50 ? "50–99" : s >= 20 ? "20–49" : s >= 10 ? "10–19" : s >= 6 ? "6–9" : s >= 3 ? "3–5" : "1–2"; }

  /* ---------- status strip ---------- */
  function renderStrip(){
    var c = crawler(), bar = $("strip-bar"); bar.innerHTML = "";
    for(var i = 0; i < 10; i++){ var cell = document.createElement("div"); if(i >= hm.slots) cell.className = "gone"; else cell.style.background = "var(" + HB[i] + ")"; bar.appendChild(cell); }
    var parts = [
      span("Health " + hm.slots + " of 10", hm.slots + " of 10 slots left, " + c.slot + " each\n= " + (hm.slots * c.slot) + " of " + (10 * c.slot) + " Health (" + hm.slots * 10 + "%)", "si"), ", ",
      span("Mana " + hm.mana + " of " + c.mana, "Current Mana " + hm.mana + "\nMax Mana = Intelligence " + c.mana, "si"), ", ",
      span("AI Favor " + c.fav, "Spend 1 to reroll a d20 once per Check (not a natural 1),\nor for an extra non-Attack Action once per round", "si")
    ];
    if(hm.slots === 0) parts.push(span("Dying", "Countdown: Con Mod " + c.mod.con + " rounds. Heal 1 slot to stop it.", "si dying"));
    fill($("strip-text"), parts);
  }

  /* ---------- tool tabs ---------- */
  var TOOLS = ["check","damage","health","dice"];
  function selectTool(t){
    if(TOOLS.indexOf(t) < 0) t = "check";
    TOOLS.forEach(function(k){
      $("tt-" + k).setAttribute("aria-selected", String(k === t));
      $("tt-" + k).tabIndex = k === t ? 0 : -1;
      $("tp-" + k).classList.toggle("hide", k !== t);
    });
    store(TOOLKEY, t);
  }
  TOOLS.forEach(function(k, i){
    $("tt-" + k).addEventListener("click", function(){ selectTool(k); });
    $("tt-" + k).addEventListener("keydown", function(e){
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if(!d) return;
      var nk = TOOLS[(i + d + TOOLS.length) % TOOLS.length]; selectTool(nk); $("tt-" + nk).focus();
    });
  });

  /* ---------- check calculator ---------- */
  var ck = {kind: "skill", fav: false, tgtSrc: "manual", src: null};
  var EFF = {
    crit:    ["Critical Hit", ["Always hits: roll double base damage dice.", "Advantage on your next attack against that foe.", "The best possible result."]],
    amazing: ["Amazing Success", ["Hit, with +F extra damage.", "Advantage on your next attack against that foe.", "Faster, quieter or more impressive than usual."]],
    success: ["Success", ["Hit: roll damage.", "You avoid that attack.", "It works."]],
    near:    ["Near Miss", ["Miss, but an ally can Intervene with 1d6.", "You’re hit, unless an ally Intervenes with 1d6.", "Fail, or succeed with a complication."]],
    fail:    ["Fail", ["Miss.", "You’re hit.", "Fail, or fail forward at a cost."]],
    major:   ["Major Fail", ["Miss badly: drop something, reload, or gain Take Down.", "You’re hit for +F damage and gain a Minor Injury after combat.", "Fail and waste time, materials or tools. No retry this scene."]],
    fumble:  ["Critical Fail", ["Always misses: hit a friend, break your weapon, or gain Stunned.", "Double damage, and a Major Injury after combat.", "The worst possible outcome. No retry this scene."]]
  };
  function ckState(){
    var c = crawler(), kind = ck.kind, sel = $("ck-stat");
    Array.prototype.forEach.call(sel.options, function(o){ o.textContent = SN[o.value] + " " + sgn(c.mod[o.value]); });
    if(kind === "evade"){ sel.value = "dex"; sel.disabled = true; } else sel.disabled = false;
    var usesRank = kind === "skill" || kind === "attack";
    $("ck-rank-l").classList.toggle("hide", !usesRank);
    $("ck-untr-l").classList.toggle("hide", !usesRank);
    $("ck-tgt-lab").textContent = kind === "attack" ? "Target (the Mob’s Evade)" : kind === "evade" ? "Target (the attack’s value)" : "Target";
    var untr = usesRank && $("ck-untr").checked;
    var rank = usesRank && !untr ? Math.max(0, num("ck-rank", 0)) : 0;
    var mod = c.mod[sel.value], evb = kind === "evade" ? c.evb : 0, other = num("ck-other", 0);
    var pens = [];
    if($("ck-minor").checked) pens.push(["Minor Injury", 2]);
    if($("ck-major").checked) pens.push(["Major Injury", 5]);
    if($("ck-sore").checked) pens.push(["Sore as Shit", 1]);
    var fat = Math.max(0, num("ck-fat", 0)); if(fat) pens.push(["Fatigued × " + fat, fat]);
    var pen = pens.reduce(function(s, p){ return s + p[1]; }, 0);
    var bonus = rank + mod + evb + other - pen;
    var adv = $("ck-mode").value === "a", dis = $("ck-mode").value === "d" || untr;
    var net = adv && dis ? "n" : adv ? "a" : dis ? "d" : "n";
    var lines = [];
    if(usesRank) lines.push(op(rank) + "  Skill Rank" + (untr ? " (none, untrained)" : ""));
    lines.push(op(mod) + "  " + SN[sel.value] + " Mod (" + SFULL[sel.value] + " " + c.score[sel.value] + ")");
    if(evb) lines.push(op(evb) + "  Evade Buffs");
    if(other) lines.push(op(other) + "  Other bonus");
    pens.forEach(function(p){ lines.push(op(-p[1]) + "  " + p[0]); });
    var base = num("ck-tgt", NaN), shift = parseInt($("ck-mob").value, 10) || 0;
    var tl = [];
    if(ck.tgtSrc === "unopp") tl.push("Unopposed: 10 + 2 × Floor " + floor + " = " + (10 + 2 * floor));
    else if(ck.tgtSrc === "stat") tl.push("Stat check: 10 + Floor " + floor + " = " + (10 + floor));
    else if(ck.tgtSrc === "foe") tl.push("10 + Floor " + floor + " + foe’s Mod " + num("ck-foe", 0) + " = " + base);
    else tl.push("Typed in: " + base);
    if(shift) tl.push(op(shift) + "  Mob has " + (shift > 0 ? "Advantage" : "Disadvantage") + "\n= " + (base + shift));
    return {kind: kind, bonus: bonus, net: net, lines: lines, base: base, shift: shift, tgt: base + shift, tgtEq: tl.join("\n"), untr: untr};
  }
  function ckRefresh(){
    var s = ckState(), c = crawler();
    $("ck-d2-l").classList.toggle("hide", s.net === "n");
    var odds = $("ck-odds"), out = $("ck-out"), fav = $("ck-fav");
    var bonusEq = "Bonus added to the d20:\n" + s.lines.join("\n") + "\n= " + sgn(s.bonus) + (s.net !== "n" ? "\nRoll 2 d20s and keep the " + (s.net === "a" ? "higher (Advantage)" : "lower (Disadvantage)") : "");
    if(isNaN(s.base)){ fill(odds, ["Enter a target number, or pick a preset."]); out.textContent = ""; fav.disabled = true; return; }
    var good = 0;
    for(var f = 1; f <= 20; f++){ if(f === 20 || (f !== 1 && f + s.bonus >= s.tgt)) good++; }
    var p = good / 20, pn = s.net === "a" ? 1 - (1 - p) * (1 - p) : s.net === "d" ? p * p : p;
    var need = s.tgt - s.bonus;
    var needTxt = need <= 2 ? "anything but a natural 1 succeeds" : need >= 20 ? "only a natural 20 succeeds" : "you need " + need + " or higher on the die";
    var oddsEq = "Target " + s.tgt + " − bonus " + sgn(s.bonus) + " = " + need + " on the die\n" + good + " of 20 faces succeed (natural 1 always fails, natural 20 always hits)" +
      (s.net === "a" ? "\nAdvantage: 1 − (1 − " + good + "/20)² ≈ " + Math.round(pn * 100) + "%" : s.net === "d" ? "\nDisadvantage: (" + good + "/20)² ≈ " + Math.round(pn * 100) + "%" : "");
    fill(odds, [span("Bonus " + sgn(s.bonus), bonusEq), " against ", span("target " + s.tgt, s.tgtEq), ": " + needTxt + ". ",
      span("About " + Math.round(pn * 100) + "% to succeed", oddsEq), s.net === "a" ? " with Advantage." : s.net === "d" ? " with Disadvantage." : "."]);
    var d1 = num("ck-d1", NaN), d2 = num("ck-d2", NaN), okd = function(d){ return d >= 1 && d <= 20; };
    if(!okd(d1) || (s.net !== "n" && !okd(d2))){
      fill(out, ["Roll for me, or type your d20" + (s.net !== "n" ? "s" : "") + " to see the result."]);
      fav.disabled = true; fav.textContent = "Reroll with AI Favor"; return;
    }
    var kept = s.net === "a" ? Math.max(d1, d2) : s.net === "d" ? Math.min(d1, d2) : d1;
    var tot = kept + s.bonus, m = tot - s.tgt, key;
    if(kept === 20) key = "crit"; else if(kept === 1) key = "fumble";
    else if(m >= 10) key = "amazing"; else if(m >= 0) key = "success";
    else if(m >= -2) key = "near"; else if(m >= -9) key = "fail"; else key = "major";
    var col = s.kind === "attack" ? 0 : s.kind === "evade" ? 1 : 2;
    var eff = EFF[key][1][col].replace("+F", "+" + floor);
    if(key === "near" && s.kind === "stat") eff = "Fail, or succeed with a complication. Nobody can Intervene on a Stat Check.";
    else if(key === "near" && col === 2) eff += " An ally can Intervene with 1d6.";
    var dieLine = s.net !== "n" ? "d20s rolled " + d1 + " and " + d2 + ", kept " + kept + " (" + (s.net === "a" ? "Advantage" : "Disadvantage") + ")" : "d20 rolled " + kept;
    var totEq = dieLine + "\n" + s.lines.join("\n") + "\n= " + tot + "\nvs target " + s.tgt + ": " + (m >= 0 ? "beat by " + m : "missed by " + (-m)) +
      (key === "crit" || key === "fumble" ? "\nA natural " + kept + " overrides the total" : "");
    var parts = [];
    if(key === "crit" || key === "fumble") parts.push(span("Natural " + kept, totEq), ": " + EFF[key][0] + ". ");
    else parts.push("Total ", span(String(tot), totEq), " against ", span(String(s.tgt), s.tgtEq), ", " + (m >= 0 ? "beat by " + m : "missed by " + (-m)) + ": " + EFF[key][0] + ". ");
    parts.push(eff);
    if(ck.fav) parts.push(" (AI Favor spent.)");
    fill(out, parts);
    fav.disabled = ck.fav || kept === 1 || c.fav < 1;
    fav.textContent = kept === 1 ? "Can’t reroll a natural 1" : ck.fav ? "AI Favor used" : c.fav < 1 ? "No AI Favor left" : "Reroll with AI Favor";
    if(ck.src) tickSkill(ck.src.name);
  }
  document.querySelectorAll("#tp-check .seg button").forEach(function(b){
    b.addEventListener("click", function(){
      ck.kind = b.getAttribute("data-kind");
      document.querySelectorAll("#tp-check .seg button").forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); });
      ckRefresh();
    });
  });
  ["ck-stat","ck-rank","ck-other","ck-mode","ck-untr","ck-minor","ck-major","ck-sore","ck-fat","ck-foe","ck-mob"].forEach(function(id){
    $(id).addEventListener($(id).tagName === "SELECT" || $(id).type === "checkbox" ? "change" : "input", ckRefresh);
  });
  $("ck-tgt").addEventListener("input", function(){ ck.tgtSrc = "manual"; ckRefresh(); });
  ["ck-d1","ck-d2"].forEach(function(id){ $(id).addEventListener("input", function(){ ck.fav = false; ckRefresh(); }); });
  document.querySelectorAll("#tp-check [data-preset]").forEach(function(b){
    b.addEventListener("click", function(){
      var p = b.getAttribute("data-preset"); ck.tgtSrc = p;
      $("ck-tgt").value = p === "unopp" ? 10 + 2 * floor : p === "stat" ? 10 + floor : 10 + floor + num("ck-foe", 0);
      ckRefresh();
    });
  });
  $("ck-roll").addEventListener("click", function(){
    var s = ckState(); ck.fav = false;
    $("ck-d1").value = rnd(20); $("ck-d2").value = s.net === "n" ? "" : rnd(20);
    ckRefresh();
  });
  $("ck-fav").addEventListener("click", function(){
    var s = ckState(), d1 = num("ck-d1", 0), d2 = num("ck-d2", 0);
    var useSecond = s.net === "a" ? d2 > d1 : s.net === "d" ? d2 < d1 : false;
    $(useSecond ? "ck-d2" : "ck-d1").value = rnd(20);
    $("cr-fav").value = Math.max(0, num("cr-fav", 0) - 1); saveCrawler();
    ck.fav = true; calcRefresh(); sheetChanged();
  });
  $("ck-src").addEventListener("change", function(){
    var v = $("ck-src").value; ck.src = null;
    if(!v || !SH.model) { ckRefresh(); return; }
    var parts = v.split(":"), row = (parts[0] === "s" ? SH.cur.skills : SH.cur.attacks)[+parts[1]];
    if(!row){ ckRefresh(); return; }
    ck.src = {type: parts[0], name: row.name};
    var kind = parts[0] === "a" ? "attack" : "skill";
    document.querySelector('#tp-check .seg button[data-kind="' + kind + '"]').click();
    $("ck-rank").value = row.rank || 0; $("ck-untr").checked = !row.rank;
    if(row.stat) $("ck-stat").value = row.stat;
    ckRefresh();
  });

  /* ---------- damage roll ---------- */
  function dmPlan(){
    var c = crawler(), F = floor, res = $("dm-res").value, crit = res === "crit";
    var n = Math.max(0, num("dm-n", 1)), x = +$("dm-x").value, extra = parseDice($("dm-extra").value);
    var groups = {}, order = [];
    function add(d){ var k = (d.neg ? "-" : "") + d.x; if(!groups[k]){ groups[k] = {n: 0, x: d.x, neg: d.neg}; order.push(k); } groups[k].n += d.n; }
    if(n) add({n: n * (crit ? 2 : 1), x: x, neg: false});
    if(extra.ok) extra.dice.forEach(function(d){ add({n: d.n * (crit ? 2 : 1), x: d.x, neg: d.neg}); });
    var baseList = order.map(function(k){ return groups[k]; });
    var rkOn = $("dm-rank-on").checked, rr = Math.max(1, num("dm-rank", 1)), rk = rkOn ? rankDie(rr) : {dice: [], flat: 0};
    var statKey2 = $("dm-stat").value, statMod = statKey2 === "none" ? 0 : c.mod[statKey2], flatB = num("dm-flat", 0);
    var flat = statMod + flatB + rk.flat + (extra.ok ? extra.flat : 0) + (res === "amazing" ? F : 0);
    var why = [], eq = [];
    eq.push("Base dice: " + (n ? n + "d" + x : "none") + (extra.ok && extra.dice.length ? " + " + diceText(extra.dice) + " extra base" : "") + (crit ? "\nCritical Hit doubles them: " + diceText(baseList) : ""));
    if(rk.dice.length || rk.flat) eq.push("Rank die for Rank " + rr + ": " + (rk.dice.length ? diceText(rk.dice) : "+1") + (crit ? " (not doubled)" : ""));
    if(statKey2 !== "none") eq.push(op(statMod) + "  " + SN[statKey2] + " Mod");
    if(flatB) eq.push(op(flatB) + "  flat bonus");
    if(extra.ok && extra.flat) eq.push(op(extra.flat) + "  from extra dice box");
    if(res === "amazing") eq.push("+ " + F + "  Amazing Success (Floor " + F + ")");
    if(crit) why.push("base dice doubled for the Critical Hit");
    if(rk.dice.length || rk.flat) why.push("Rank die " + (rk.dice.length ? diceText(rk.dice) : "+1") + (crit ? ", not doubled" : ""));
    if(statKey2 !== "none") why.push(SN[statKey2] + " " + sgn(statMod));
    if(res === "amazing") why.push("+" + F + " for the Amazing Success");
    if(flatB) why.push("flat " + sgn(flatB));
    return {base: baseList, rank: rk.dice, flat: flat, why: why, eq: eq.join("\n"), extraOk: extra.ok};
  }
  function dmRefresh(){
    $("dm-rank-l").classList.toggle("hide", !$("dm-rank-on").checked);
    var p = dmPlan(), all = p.base.concat(p.rank), txt = diceText(all);
    if(p.flat) txt += (txt ? (p.flat < 0 ? " − " : " + ") + Math.abs(p.flat) : String(p.flat));
    var avg = all.reduce(function(s, d){ return s + (d.neg ? -1 : 1) * d.n * (d.x + 1) / 2; }, 0) + p.flat;
    var fo = $("dm-formula"); fo.textContent = txt || "0"; fo.setAttribute("data-eq", p.eq + "\nAverage about " + Math.max(0, Math.floor(avg))); fo.tabIndex = 0;
    $("dm-why").textContent = (p.extraOk ? "" : "Extra base dice should look like 1d2 or 2d4+1d6. ") + (p.why.length ? p.why.join("; ") + ". " : "") + "Averages about " + Math.max(0, Math.floor(avg)) + ".";
  }
  ["dm-n","dm-x","dm-extra","dm-stat","dm-flat","dm-rank-on","dm-rank","dm-res"].forEach(function(id){
    $(id).addEventListener($(id).tagName === "SELECT" || $(id).type === "checkbox" ? "change" : "input", function(){ dmRefresh(); $("dm-out").textContent = ""; });
  });
  $("dm-roll").addEventListener("click", function(){
    var p = dmPlan(), sum = p.flat, bits = [], lines = [];
    p.base.concat(p.rank).forEach(function(d){
      var r = rollN(d.n, d.x), t = total(r); sum += d.neg ? -t : t;
      bits.push((d.neg ? "−" : "") + d.n + "d" + d.x + " [" + r.join(", ") + "]");
      lines.push((d.neg ? "− " : "+ ") + d.n + "d" + d.x + " rolled " + r.join(", ") + " = " + t);
    });
    if(p.flat){ bits.push(sgn(p.flat)); lines.push(op(p.flat) + "  flat (Mod and bonuses)"); }
    var tot = Math.max(0, sum);
    lines[0] = lines.length ? lines[0].replace(/^\+ /, "") : "";
    fill($("dm-out"), [span(tot + " damage", lines.join("\n") + "\n= " + tot), ": " + bits.join(" ") + ". The target’s DR comes off after."]);
  });
  $("dm-src").addEventListener("change", function(){
    var v = $("dm-src").value; if(!v || !SH.cur) return;
    var row = SH.cur.attacks[+v]; if(!row) return;
    var d = parseDice(row.dice);
    if(d.ok && d.dice.length){ $("dm-n").value = d.dice[0].n; $("dm-x").value = String(d.dice[0].x); $("dm-extra").value = d.dice.slice(1).map(function(x){ return x.n + "d" + x.x; }).join("+"); }
    $("dm-stat").value = row.dstat || "none";
    $("dm-rank").value = row.rank || 1;
    dmRefresh();
  });

  /* ---------- health and mana tracker ---------- */
  var HKEY = "dcc-cheat-hb", hm = {slots: 10, mana: null};
  try{ var hs = JSON.parse(store(HKEY) || "null"); if(hs){ hm.slots = Math.min(10, Math.max(0, +hs.slots || 0)); hm.mana = hs.mana == null ? null : +hs.mana; } }catch(e){}
  function hmSave(){ store(HKEY, JSON.stringify(hm)); }
  function hmCalc(){
    var c = crawler(), dmg = Math.max(0, num("hm-dmg", 0)), type = $("hm-type").value,
        area = parseFloat($("hm-area").value), deb = $("hm-deb").checked, steps = [], eq = [dmg + " damage"], d = dmg;
    if(area < 1){ d = Math.floor(dmg * area); steps.push((area === 0.5 ? "halved" : "quartered") + " to " + d); eq.push("× " + (area === 0.5 ? "½" : "¼") + " for the area, rounded down = " + d); }
    if(!deb && c.dr){ d = Math.max(0, d - c.dr); steps.push("DR " + c.dr + " leaves " + d); eq.push("− DR " + c.dr + " = " + d); }
    if(deb){ steps.push("Debuff damage skips DR"); eq.push("Debuff damage skips DR"); }
    if(type === "r"){ d = Math.floor(d / 2); steps.push("resisted to " + d); eq.push("÷ 2 for Resistance = " + d); }
    if(type === "v"){ d = d * 2; steps.push("vulnerable, doubled to " + d); eq.push("× 2 for Vulnerability = " + d); }
    if(type === "i"){ d = 0; steps.push("immune"); eq.push("Immune: 0"); }
    var slot = Math.max(1, c.slot), want = Math.floor(d / slot), lost = Math.min(want, hm.slots), spare = d - want * slot;
    eq.push(d + " ÷ " + slot + " per slot = " + want + " slot" + (want === 1 ? "" : "s") + (spare ? ", " + spare + " left over is ignored" : ""));
    if(want > hm.slots) eq.push("Only " + hm.slots + " left to lose");
    return {dmg: dmg, d: d, slot: slot, lost: lost, spare: spare, steps: steps, eq: eq.join("\n")};
  }
  function hmRender(){
    var c = crawler();
    if(hm.mana == null || hm.mana > c.mana) hm.mana = c.mana;
    var bar = $("hm-bar"); bar.innerHTML = "";
    for(var i = 0; i < 10; i++){
      var cell = document.createElement("div"); cell.textContent = c.slot;
      if(i >= hm.slots) cell.className = "gone"; else cell.style.background = "var(" + HB[i] + ")";
      bar.appendChild(cell);
    }
    fill($("hm-status"), [hm.slots + " of 10 slots (" + hm.slots * 10 + "%). Mana " + hm.mana + " of " + c.mana + "." +
      (hm.slots === 0 ? " Dying: " + plural(c.mod.con, "round") + " on the countdown. Heal 1 slot to stop it." : "")]);
    var h = hmCalc(), pv = $("hm-preview");
    if(!num("hm-dmg", 0)) fill(pv, ["Enter damage to see how many slots it costs."]);
    else fill(pv, [(h.steps.length ? h.steps.join(", ") + ". " : ""),
      span(h.d < h.slot ? "No slots lost" : "Lose " + plural(h.lost, "slot"), h.eq),
      h.d < h.slot ? " (" + h.d + " is less than one slot of " + h.slot + ")." : (h.spare ? ", " + h.spare + " leftover ignored." : ".")]);
    $("hm-spell").disabled = hm.mana < 2 || hm.slots >= 10;
    hmSave(); renderStrip();
  }
  function hmLog(t){ $("hm-log").textContent = t; }
  ["hm-dmg","hm-type","hm-area","hm-deb"].forEach(function(id){ $(id).addEventListener($(id).tagName === "SELECT" || $(id).type === "checkbox" ? "change" : "input", hmRender); });
  $("hm-hit").addEventListener("click", function(){
    var h = hmCalc(); if(!h.dmg){ hmLog("Enter the damage first."); return; }
    hm.slots -= h.lost;
    hmLog("Took " + h.dmg + " damage and lost " + plural(h.lost, "slot") + "." + (hm.slots === 0 && h.lost ? " You’re Dying." : ""));
    $("hm-dmg").value = ""; hmRender(); sheetChanged();
  });
  function heal(n, why){ var b = hm.slots; hm.slots = Math.min(10, hm.slots + n); return (why ? why + ": " : "") + "healed " + plural(hm.slots - b, "slot") + "."; }
  $("hm-heal-b").addEventListener("click", function(){ hmLog(heal(Math.max(1, num("hm-heal", 1)), "")); hmRender(); sheetChanged(); });
  $("hm-spell").addEventListener("click", function(){ if(hm.mana < 2){ hmLog("Heal needs 2 Mana."); return; } hm.mana -= 2; hmLog(heal(2, "Heal Spell, 2 Mana spent")); hmRender(); sheetChanged(); });
  $("hm-mana-b").addEventListener("click", function(){
    var cost = Math.max(1, num("hm-mana", 1));
    if(cost > hm.mana){ hmLog("Not enough Mana: you have " + hm.mana + "."); return; }
    hm.mana -= cost; hmLog("Spent " + cost + " Mana."); hmRender(); sheetChanged();
  });
  document.querySelectorAll("#tp-health [data-rest]").forEach(function(b){
    b.addEventListener("click", function(){
      var c = crawler(), r = b.getAttribute("data-rest"), s0 = hm.slots, m0 = hm.mana;
      if(r === "hour"){ hm.slots = Math.min(10, hm.slots + 1); hm.mana = Math.min(c.mana, hm.mana + 5); }
      if(r === "short"){ hm.slots = Math.min(10, hm.slots + 5); hm.mana = Math.min(c.mana, hm.mana + Math.floor(c.mana / 2)); }
      if(r === "long"){ hm.slots = 10; hm.mana = c.mana; }
      hmLog(b.textContent + ": +" + plural(hm.slots - s0, "slot") + ", +" + (hm.mana - m0) + " Mana" + (r === "long" ? ". Fatigued is gone too." : "."));
      hmRender(); sheetChanged();
    });
  });

  /* ---------- dice tray ---------- */
  function addHist(head, detail, eq){
    var li = document.createElement("li"), b = span(head, eq || null); b.className = "h";
    var sp = document.createElement("span"); sp.textContent = detail ? " " + detail : "";
    li.appendChild(b); li.appendChild(sp);
    var ol = $("dt-hist"); ol.insertBefore(li, ol.firstChild);
    while(ol.children.length > 8) ol.removeChild(ol.lastChild);
  }
  function natNote(v){ return v === 20 ? ", natural 20" : v === 1 ? ", natural 1" : ""; }
  document.querySelectorAll("#tp-dice [data-roll]").forEach(function(b){
    b.addEventListener("click", function(){
      var k = b.getAttribute("data-roll"), a, c, r;
      if(k === "d20"){ a = rnd(20); addHist(String(a), "d20" + natNote(a), "1d20 rolled " + a); }
      if(k === "adv" || k === "dis"){
        a = rnd(20); c = rnd(20); r = k === "adv" ? Math.max(a, c) : Math.min(a, c);
        addHist(String(r), "d20 with " + (k === "adv" ? "Advantage" : "Disadvantage") + natNote(r), "2d20 rolled " + a + " and " + c + "\nkeep the " + (k === "adv" ? "higher" : "lower") + " = " + r);
      }
      if(k === "help"){ a = rnd(2); addHist(String(a), "Help 1d2", "1d2 rolled " + a + "\nadd it before the ally rolls"); }
      if(k === "d6"){ a = rnd(6); addHist(String(a), "1d6 for Help or Intervene", "1d6 rolled " + a + "\nHelp: add before the roll. Intervene: add after."); }
      if(k === "play"){ a = rnd(6); c = rnd(6); addHist(String(Math.max(a, c)), "Call a Play bonus", "2d6 rolled " + a + " and " + c + "\nkeep the higher = " + Math.max(a, c) + "\nAdd to the ally’s Check, or to damage if they’d have hit anyway"); }
      if(k === "advance"){
        var rank = Math.max(1, num("dt-rank", 1)); a = rnd(20);
        addHist(a >= rank ? "+1 Rank" : "No change", "Advancement check at Rank " + rank, "1d20 rolled " + a + " against your Rank " + rank + "\n" + (a >= rank ? a + " is " + rank + " or more: gain 1 Rank (now " + Math.min(15, rank + 1) + ", cap 15)" : a + " is under " + rank + ": no change"));
      }
    });
  });
  function rollExpr(){
    var raw = $("dt-expr").value, p = parseDice(raw);
    if(!raw.trim()){ addHist("Nothing to roll", "Type dice like 3d6+2."); return; }
    if(!p.ok || (!p.dice.length && !p.flat)){ addHist("Couldn’t read that", "Try something like 2d6+3 or 1d8+1d4."); return; }
    var sum = p.flat, lines = [];
    p.dice.forEach(function(d){ var r = rollN(d.n, d.x), t = total(r); sum += d.neg ? -t : t; lines.push((d.neg ? "− " : "+ ") + d.n + "d" + d.x + " rolled " + r.join(", ") + " = " + t); });
    if(p.flat) lines.push(op(p.flat));
    lines[0] = lines[0].replace(/^\+ /, "");
    addHist(String(sum), raw.trim(), lines.join("\n") + "\n= " + sum);
  }
  $("dt-go").addEventListener("click", rollExpr);
  $("dt-expr").addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); rollExpr(); } });
  function runAdvancement(all){
    if(!SH.cur) return;
    var did = 0;
    SH.cur.skills.forEach(function(s){
      if(!s.mark) return;
      if(!all && s.rank >= 5) return;
      var a = rnd(20), r0 = s.rank || 0;
      var up = a >= r0 && r0 < 15;
      if(up) s.rank = r0 + 1;
      s.mark = false; did++;
      addHist(up ? s.name + " +1" : s.name + " no change", "advancement check", "1d20 rolled " + a + " against " + s.name + " Rank " + r0 + "\n" + (up ? "gain 1 Rank, now " + s.rank : r0 >= 15 ? "already at the Rank 15 cap" : "under " + r0 + ": no change") + "\nTick cleared");
    });
    if(!did) addHist("Nothing to roll", all ? "No Skills are ticked." : "No ticked Skills at Rank 4 or lower.");
    renderAdv(); sheetChanged();
  }
  $("adv-2h").addEventListener("click", function(){ runAdvancement(false); });
  $("adv-floor").addEventListener("click", function(){ runAdvancement(true); });
  function renderAdv(){
    var on = !!SH.cur;
    $("adv-sheet").classList.toggle("hide", !on);
    if(!on) return;
    var t = SH.cur.skills.filter(function(s){ return s.mark; });
    $("adv-list").textContent = t.length ? "Ticked on your sheet: " + t.map(function(s){ return s.name + " (Rank " + s.rank + ")"; }).join(", ") + "." : "No Skills are ticked yet. Rolling a Skill or attack from your sheet ticks it.";
  }
  function tickSkill(name){
    if(!SH.cur) return;
    var k = String(name).trim().toLowerCase(), hit = false;
    SH.cur.skills.forEach(function(s){ if(s.name.trim().toLowerCase() === k && !s.mark){ s.mark = true; hit = true; } });
    if(hit){ renderAdv(); sheetChanged(); }
  }

  /* ===================== character sheet link ===================== */
  var FN = {
    name: "Name", race: "Race", cls: "class", crawler: "crawler number", level: "level", floor: "Floor",
    slotVals: ["10","20","30","40","50","60","70","80","90","100"],
    slotBoxes: ["Check Box6 2","Check Box6 1","Check Box6 1 1","Check Box6 1 2","Check Box6 1 3","Check Box6 1 4","Check Box6 1 5","Check Box6 1 6","Check Box6 1 7","Check Box6 1 8"],
    stats: {str: [21,22,23], int: [34,35,36], con: [43,44,45], dex: [46,47,48], cha: [49,50,51]},
    dexMod: 24, evb: 25, evTot: 26, arm: 29, drb: 30, drTot: 31, fav: 32, mana: 37, maxMana: 38, debuffs: 39, ext: [40,41,42], pop: 98,
    attacks: [[55,551,52,53,54],[61,57,59,58,60],[67,63,65,64,66],[73,69,71,70,72],[79,75,77,76,78]]
  };
  function tf(n){ return "Text Field " + n; }
  var SH = {doc: null, handle: null, fileName: "", mode: "", base: null, cur: null, model: null, lastMod: 0, saving: false, timer: null};
  function fv(name){ var f = SH.doc && SH.doc.fieldMap[name]; return f ? f.value : undefined; }
  function fnum(name){ var x = parseInt(String(fv(name) == null ? "" : fv(name)).trim(), 10); return isNaN(x) ? null : x; }
  function readSheet(){
    var m = {name: (fv(FN.name) || "").trim(), race: (fv(FN.race) || "").trim(), cls: (fv(FN.cls) || "").trim(), crawler: (fv(FN.crawler) || "").trim(),
      level: fnum(FN.level), floor: fnum(FN.floor), stats: {}, evb: fnum(tf(FN.evb)), arm: fnum(tf(FN.arm)), drb: fnum(tf(FN.drb)),
      fav: fnum(tf(FN.fav)), mana: fnum(tf(FN.mana)), debuffs: (fv(tf(FN.debuffs)) || "").trim(),
      ext: FN.ext.map(function(n){ return (fv(tf(n)) || "").trim(); }).filter(Boolean), pop: (fv(tf(FN.pop)) || "").trim(), skills: [], attacks: []};
    m.base = {};
    STATS.forEach(function(k){
      var e = fnum(tf(FN.stats[k][0])), u = fnum(tf(FN.stats[k][1]));
      m.stats[k] = e != null ? e : u; m.base[k] = u != null ? u : e;
    });
    m.slots = 10 - FN.slotBoxes.filter(function(b){ return !!fv(b); }).length;
    for(var k = 0; k < 20; k++){
      var nm = (fv(tf(103 + 6 * k)) || "").trim(); if(!nm) continue;
      m.skills.push({row: k, name: nm, rank: fnum(tf(104 + 6 * k)) || 0, stat: statKey(fv(tf(105 + 6 * k))), mark: !!fv("Check Box " + (k + 1))});
    }
    FN.attacks.forEach(function(a, i){
      var nm = (fv(tf(a[0])) || "").trim(); if(!nm) return;
      m.attacks.push({row: i, name: nm, rank: fnum(tf(a[1])) || 0, stat: statKey(fv(tf(a[2]))), dice: (fv(tf(a[3])) || "").trim(), dstat: statKey(fv(tf(a[4])))});
    });
    return m;
  }
  function looksLikeSheet(doc){ var f = doc.fieldMap; return !!(f[FN.name] && f[tf(21)] && f[FN.slotBoxes[0]]); }
  function applySheet(m){
    SH.model = m;
    STATS.forEach(function(k){ if(m.stats[k] != null) $("cr-" + k).value = m.stats[k]; if(m.base[k] != null) $("cu-" + k).value = m.base[k]; });
    syncPrev();
    $("cr-evb").value = m.evb != null ? m.evb : 0;
    $("cr-arm").value = m.arm != null ? m.arm : 0;
    $("cr-drb").value = m.drb != null ? m.drb : 0;
    $("cr-fav").value = m.fav != null ? m.fav : 0;
    if(m.level != null) $("cr-lvl").value = m.level;
    if(m.floor >= 1 && m.floor <= 5 && m.floor !== floor) setFloor(m.floor, false);
    hm.slots = m.slots;
    hm.mana = m.mana != null ? m.mana : null;
    var d = m.debuffs.toLowerCase();
    $("ck-minor").checked = /minor injur/.test(d); $("ck-major").checked = /major injur/.test(d); $("ck-sore").checked = /sore as/.test(d);
    var fm = /fatigued?\D{0,4}(\d+)/.exec(d); $("ck-fat").value = /fatigue/.test(d) ? (fm ? fm[1] : 1) : 0;
    SH.cur = {skills: m.skills.map(function(s){ return Object.assign({}, s); }), attacks: m.attacks.map(function(a){ return Object.assign({}, a); })};
    saveCrawler();
    calcRefresh();
    SH.base = curModel();
    fillSources(); renderSheetBox();
  }
  function curModel(){
    var c = crawler();
    return {level: c.lvl, floor: floor, stats: Object.assign({}, c.score), base: Object.assign({}, c.base), evb: c.evb, arm: c.arm, drb: c.drb, fav: c.fav,
      mana: hm.mana, slots: hm.slots,
      skills: SH.cur ? SH.cur.skills.map(function(s){ return {row: s.row, name: s.name, rank: s.rank, mark: s.mark}; }) : []};
  }
  function diff(){
    var out = {list: [], writes: {}};
    if(!SH.base || !SH.doc) return out;
    var a = SH.base, b = curModel(), w = out.writes, c = crawler();
    function L(t){ out.list.push(t); }
    if(a.level !== b.level){ L("Level " + a.level + " to " + b.level); w[FN.level] = String(b.level); }
    if(a.floor !== b.floor){ L("Floor " + a.floor + " to " + b.floor); w[FN.floor] = String(b.floor); }
    STATS.forEach(function(k){
      if(a.base && a.base[k] !== b.base[k]){ L(SFULL[k] + " (Unenhanced) " + a.base[k] + " to " + b.base[k]); w[tf(FN.stats[k][1])] = String(b.base[k]); }
      if(a.stats[k] === b.stats[k]) return;
      L(SFULL[k] + " (Enhanced) " + a.stats[k] + " to " + b.stats[k]);
      w[tf(FN.stats[k][0])] = String(b.stats[k]); w[tf(FN.stats[k][2])] = String(modOf(b.stats[k]));
      if(k === "dex"){ w[tf(FN.dexMod)] = String(c.mod.dex); w[tf(FN.evTot)] = String(c.evade); }
      if(k === "int") w[tf(FN.maxMana)] = String(c.mana);
      if(k === "con") FN.slotVals.forEach(function(n){ w[n] = String(c.mod.con); });
    });
    if(a.evb !== b.evb){ L("Evade Buffs " + a.evb + " to " + b.evb); w[tf(FN.evb)] = String(b.evb); w[tf(FN.evTot)] = String(c.evade); }
    if(a.arm !== b.arm){ L("Armor " + a.arm + " to " + b.arm); w[tf(FN.arm)] = String(b.arm); w[tf(FN.drTot)] = String(c.dr); }
    if(a.drb !== b.drb){ L("DR Buffs " + a.drb + " to " + b.drb); w[tf(FN.drb)] = String(b.drb); w[tf(FN.drTot)] = String(c.dr); }
    if(a.fav !== b.fav){ L("AI Favor " + a.fav + " to " + b.fav); w[tf(FN.fav)] = String(b.fav); }
    if(a.mana !== b.mana){ L("Current Mana " + a.mana + " to " + b.mana); w[tf(FN.mana)] = String(b.mana); }
    if(a.slots !== b.slots){
      L("Health Bar " + a.slots + " to " + b.slots + " slots");
      FN.slotBoxes.forEach(function(n, i){ w[n] = (i + 1) > b.slots; });
    }
    b.skills.forEach(function(s, i){
      var o = a.skills[i]; if(!o) return;
      if(o.rank !== s.rank){
        L(s.name + " Rank " + o.rank + " to " + s.rank); w[tf(104 + 6 * s.row)] = String(s.rank);
        if(SH.cur) SH.cur.attacks.forEach(function(at){ if(at.name.trim().toLowerCase() === s.name.trim().toLowerCase()) w[tf(FN.attacks[at.row][1])] = String(s.rank); });
      }
      if(o.mark !== s.mark){ L(s.name + (s.mark ? " ticked for advancement" : " tick cleared")); w["Check Box " + (s.row + 1)] = s.mark; }
    });
    return out;
  }
  function renderSheetBox(){
    var on = !!SH.doc;
    $("sb-off").classList.toggle("hide", on); $("sb-on").classList.toggle("hide", !on);
    $("cr-note").textContent = on ? "Numbers come from your linked sheet. Changes save back to it." : "Saved in this browser only.";
    if(!on){ renderAdv(); return; }
    var m = SH.model;
    $("sb-who").textContent = (m.name || "Your crawler") + (m.race ? ", " + m.race : "") + (m.cls ? " " + m.cls : "");
    $("sb-file-name").textContent = SH.fileName + (SH.mode === "handle" ? " (linked)" : " (read-only here)");
    var info = [];
    if(m.crawler) info.push("Crawler " + m.crawler);
    if(m.debuffs) info.push("Debuffs: " + m.debuffs);
    if(m.ext.length) info.push("External Buffs: " + m.ext.join(", "));
    if(m.pop) info.push("Popularity " + m.pop);
    $("sb-info").textContent = info.join(". ") + (info.length ? "." : "");
    var d = diff(), ul = $("sb-changes"); ul.innerHTML = "";
    d.list.forEach(function(t){ var li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
    $("sb-count").textContent = d.list.length ? plural(d.list.length, "unsaved change") : "No unsaved changes";
    $("sb-save").disabled = SH.mode !== "handle" || !d.list.length || SH.saving;
    $("sb-save").textContent = SH.mode === "handle" ? "Save to sheet" : "Saving needs Chrome or Edge";
    $("sb-auto-l").classList.toggle("hide", SH.mode !== "handle");
    renderAdv();
  }
  function fillSources(){
    var on = !!SH.cur, s1 = $("ck-src"), s2 = $("dm-src");
    $("ck-src-l").classList.toggle("hide", !on); $("dm-src-l").classList.toggle("hide", !on);
    s1.innerHTML = '<option value="">Pick a Skill or attack</option>'; s2.innerHTML = '<option value="">Pick an attack</option>';
    if(!on) return;
    function og(label, rows, pre){
      if(!rows.length) return null;
      var g = document.createElement("optgroup"); g.label = label;
      rows.forEach(function(r, i){ var o = document.createElement("option"); o.value = pre + i; o.textContent = r.name + " (Rank " + r.rank + (r.stat ? ", " + SN[r.stat] : "") + ")"; g.appendChild(o); });
      return g;
    }
    var g1 = og("Skills", SH.cur.skills, "s:"), g2 = og("Attacks", SH.cur.attacks, "a:");
    if(g1) s1.appendChild(g1); if(g2) s1.appendChild(g2);
    SH.cur.attacks.forEach(function(r, i){ var o = document.createElement("option"); o.value = String(i); o.textContent = r.name + " (" + (r.dice || "?") + (r.dstat ? " + " + SN[r.dstat] : "") + ")"; s2.appendChild(o); });
  }
  function status(t){ $("sb-status").textContent = t; }
  function stamp(){ var d = new Date(); return d.toLocaleTimeString([], {hour: "numeric", minute: "2-digit"}); }
  function sheetChanged(){
    if(!SH.doc) return;
    renderSheetBox();
    if(SH.mode === "handle" && $("sb-auto").checked){
      clearTimeout(SH.timer);
      SH.timer = setTimeout(function(){ if(diff().list.length) saveSheet(); }, 1200);
    }
  }
  async function openBytes(u8, name, handle){
    var doc = await PDF.open(u8);
    if(!looksLikeSheet(doc)) throw new Error("This PDF doesn’t look like the Dungeon Crawler Carl fillable character sheet.");
    SH.doc = doc; SH.fileName = name; SH.handle = handle || null; SH.mode = handle ? "handle" : "copy";
    applySheet(readSheet());
  }
  async function saveSheet(){
    if(!SH.doc || SH.saving) return;
    /* the page only ever writes through a file the user linked; it never builds a download */
    if(SH.mode !== "handle"){ status("This browser can\u2019t write into the PDF. Open the page in Chrome or Edge to save, or copy the changes listed here into your PDF reader."); return; }
    var d = diff(); if(!d.list.length) return;
    SH.saving = true; renderSheetBox(); status("Saving…");
    try{
      var file = await SH.handle.getFile();
      if(file.lastModified !== SH.lastMod){ SH.doc = await PDF.open(new Uint8Array(await file.arrayBuffer())); }
      var bytes = SH.doc.save(diff().writes);
      var wr = await SH.handle.createWritable(); await wr.write(bytes); await wr.close();
      SH.lastMod = (await SH.handle.getFile()).lastModified;
      SH.doc = await PDF.open(bytes);
      status("Saved to " + SH.fileName + " at " + stamp() + ".");
      var m = readSheet(); SH.model = m;
      SH.cur = {skills: m.skills.map(function(s){ return Object.assign({}, s); }), attacks: m.attacks.map(function(a2){ return Object.assign({}, a2); })};
      SH.base = curModel(); fillSources();
    }catch(e){
      status(/NotAllowed|permission/i.test(String(e)) ? "Couldn’t save: this page doesn’t have permission to write to the file. Choose Reload, then try again." :
        /NoModification|InvalidState|locked|busy/i.test(String(e && e.name) + e) ? "Couldn’t save: the PDF is open in another program that’s locking it. Close it there and try again." :
        "Couldn’t save: " + (e && e.message ? e.message : e));
    }
    SH.saving = false; renderSheetBox();
  }

  /* IndexedDB for remembering the linked file (Chrome and Edge) */
  function idb(fn){
    return new Promise(function(res){
      try{
        var r = indexedDB.open("dcc-cheat", 1);
        r.onupgradeneeded = function(){ r.result.createObjectStore("kv"); };
        r.onsuccess = function(){ try{ fn(r.result.transaction("kv", "readwrite").objectStore("kv"), res); }catch(e){ res(null); } };
        r.onerror = function(){ res(null); };
      }catch(e){ res(null); }
    });
  }
  function idbSet(k, v){ return idb(function(s, res){ var q2 = v == null ? s.delete(k) : s.put(v, k); q2.onsuccess = function(){ res(true); }; q2.onerror = function(){ res(null); }; }); }
  function idbGet(k){ return idb(function(s, res){ var q2 = s.get(k); q2.onsuccess = function(){ res(q2.result || null); }; q2.onerror = function(){ res(null); }; }); }

  var canHandle = typeof window.showOpenFilePicker === "function";
  async function linkWithHandle(h){
    var perm = "prompt";
    try{ perm = await h.queryPermission({mode: "readwrite"}); if(perm !== "granted") perm = await h.requestPermission({mode: "readwrite"}); }catch(e){}
    var file = await h.getFile();
    var u8 = new Uint8Array(await file.arrayBuffer());
    await openBytes(u8, file.name, perm === "granted" ? h : null);
    SH.lastMod = file.lastModified;
    if(perm === "granted") idbSet("sheet", h);
    $("sb-msg").textContent = "";
    status(perm === "granted" ? "Linked at " + stamp() + "." : "Opened read-only. To save, link the sheet again and choose Allow when your browser asks.");
  }
  $("sb-link").addEventListener("click", async function(){
    $("sb-msg").textContent = "";
    if(canHandle){
      try{
        var hs2 = await window.showOpenFilePicker({types: [{description: "PDF character sheet", accept: {"application/pdf": [".pdf"]}}], multiple: false});
        await linkWithHandle(hs2[0]);
      }catch(e){ if(e && e.name !== "AbortError") $("sb-msg").textContent = e.message || String(e); }
    } else $("sb-file").click();
  });
  $("sb-file").addEventListener("change", async function(){
    var f = this.files && this.files[0]; if(!f) return;
    try{ await openBytes(new Uint8Array(await f.arrayBuffer()), f.name, null); status("Opened at " + stamp() + ", read-only. This browser can\u2019t save into the PDF, so use Chrome or Edge to save, or copy the listed changes into your PDF reader."); }
    catch(e){ $("sb-msg").textContent = e.message || String(e); }
    this.value = "";
  });
  $("sb-relink").addEventListener("click", async function(){
    var h = await idbGet("sheet"); if(!h) return;
    try{ await linkWithHandle(h); $("sb-relink").classList.add("hide"); }catch(e){ $("sb-msg").textContent = "Couldn’t reopen the sheet. Link it again. (" + (e.message || e) + ")"; }
  });
  $("sb-save").addEventListener("click", saveSheet);
  $("sb-auto").addEventListener("change", function(){ store("dcc-cheat-autosave", this.checked ? "1" : "0"); if(this.checked) sheetChanged(); });
  if(store("dcc-cheat-autosave") === "0") $("sb-auto").checked = false;
  $("sb-reload").addEventListener("click", async function(){
    try{
      if(SH.mode === "handle"){ var file = await SH.handle.getFile(); await openBytes(new Uint8Array(await file.arrayBuffer()), file.name, SH.handle); SH.lastMod = file.lastModified; status("Reloaded from the sheet at " + stamp() + "."); }
      else { $("sb-file").click(); }
    }catch(e){ status("Couldn’t reload: " + (e.message || e)); }
  });
  $("sb-unlink").addEventListener("click", function(){
    if(diff().list.length && !window.confirm("You have unsaved changes. Unlink anyway?")) return;
    SH.doc = null; SH.handle = null; SH.cur = null; SH.model = null; SH.base = null; SH.mode = "";
    idbSet("sheet", null); fillSources(); renderSheetBox(); $("sb-relink").classList.add("hide");
  });
  async function watchFile(){
    if(SH.mode !== "handle" || SH.saving || document.visibilityState !== "visible") return;
    try{
      var file = await SH.handle.getFile();
      if(file.lastModified === SH.lastMod) return;
      if(!diff().list.length){
        await openBytes(new Uint8Array(await file.arrayBuffer()), file.name, SH.handle);
        SH.lastMod = file.lastModified;
        status("Your sheet changed in another program. Loaded its new numbers at " + stamp() + ".");
      } else {
        SH.lastMod = file.lastModified;
        status("Your sheet changed in another program. When you save, its changes are kept and yours are added on top.");
      }
    }catch(e){}
  }
  setInterval(watchFile, 4000);
  document.addEventListener("visibilitychange", watchFile);

  /* ---------- wiring ---------- */
  function calcRefresh(){ renderCrawler(); ckRefresh(); dmRefresh(); hmRender(); renderSheetBox(); }
  /* changing Unenhanced moves Enhanced by the same amount, so gear and buff bonuses stay put */
  function syncPrev(){ STATS.forEach(function(k){ var u = $("cu-" + k); u.setAttribute("data-prev", u.value); }); }
  STATS.forEach(function(k){
    $("cu-" + k).addEventListener("input", function(){
      var nv = parseInt(this.value, 10), pv = parseInt(this.getAttribute("data-prev"), 10);
      if(isNaN(nv)) return;
      if(!isNaN(pv) && nv !== pv){ var e = $("cr-" + k); e.value = Math.max(1, (parseInt(e.value, 10) || nv) + (nv - pv)); }
      this.setAttribute("data-prev", nv);
    });
  });
  syncPrev();
  document.querySelectorAll("[data-save]").forEach(function(el){ el.addEventListener("input", function(){ saveCrawler(); calcRefresh(); sheetChanged(); }); });

  /* ---------- start ---------- */
  setFloor(floor, false);
  ready = true;
  if(window.matchMedia("(max-width: 640px)").matches) $("cr-more").open = false;
  selectTool(store(TOOLKEY) || "check");
  calcRefresh();
  (function(){
    var h = location.hash.slice(1), el = h ? $(h) : null, band = el ? (el.classList.contains("band") ? el : el.closest(".band")) : null;
    showTab(band ? band.id : (store(TABKEY) || "calc"), {scroll: false, noHash: !band});
    if(el && el.classList.contains("toolpanel")) selectTool(el.id.slice(3));
  })();
  if(canHandle) idbGet("sheet").then(async function(h){
    if(!h) return;
    try{
      var p = await h.queryPermission({mode: "readwrite"});
      if(p === "granted") await linkWithHandle(h);
      else { $("sb-relink").textContent = "Reconnect to " + h.name; $("sb-relink").classList.remove("hide"); }
    }catch(e){}
  });
  window.__cheat = {linkWithHandle: linkWithHandle, watchFile: watchFile, SH: SH};
})();
