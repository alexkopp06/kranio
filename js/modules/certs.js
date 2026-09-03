/* ============================================================
   certs.js — LUPA NA DOKLADY

   Karta ukazuje náhled certifikátu; klepnutí ho otevře v plné
   velikosti. Nic víc.

   ------------------------------------------------------------
   PROČ TAK MÁLO KÓDU

   Doklad je nejdůvěryhodnější věc na celé stránce a nesmí
   záviset na tom, jestli se načte skript. Proto:

     · plný obrázek je v HTML jako `data-cert-open`, takže se
       na něj dá odkázat i bez JS,
     · lupa je v DOM od začátku, jen `hidden` — nic se
       nevytváří za běhu,
     · když modul spadne nebo se nenačte, karta zůstane kartou
       s náhledem a popisem. Ztratí se zvětšení, ne obsah.

   ------------------------------------------------------------
   CO LUPA UMÍ

     Esc            zavře
     klepnutí mimo  zavře
     × vpravo       zavře
     ohnisko        se vrátí na tlačítko, ze kterého se otevřelo

   Plný obrázek se stahuje AŽ PŘI OTEVŘENÍ. Dva scany po sto
   kilobajtech nemá smysl tahat kvůli tomu, že si je někdo
   možná prohlédne.
   ============================================================ */
(function () {
  "use strict";
  var KJ = window.KJ;
  if (!KJ) return;

  var root = document.querySelector("[data-certs]");
  var box = document.querySelector("[data-certbox]");
  if (!root || !box) return;

  var img = box.querySelector("[data-certbox-img]");
  var cap = box.querySelector("[data-certbox-cap]");
  var opener = null;

  function open(btn) {
    var src = btn.getAttribute("data-cert-open");
    if (!src || !img) return;
    opener = btn;
    /* Popisek bere alt z náhledu — jeden popis, jedno místo,
       kde se opravuje.                                      */
    var thumb = btn.querySelector("img");
    img.alt = thumb ? thumb.alt : "";
    img.src = src;
    if (cap) cap.textContent = btn.getAttribute("data-cert-title") || "";
    box.hidden = false;
    document.documentElement.style.overflow = "hidden";
    /* Dva snímky: prvek musí být v layoutu, než na něj sedne
       přechod, jinak naskočí bez náběhu.                    */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { box.setAttribute("data-open", ""); });
    });
    var x = box.querySelector("[data-certbox-close]");
    if (x && x.focus) x.focus();
  }

  function close() {
    if (box.hidden) return;
    box.removeAttribute("data-open");
    document.documentElement.style.overflow = "";
    /* Necháme doběhnout přechod, teprve pak prvek zmizí
       z přístupnostního stromu.                            */
    setTimeout(function () {
      box.hidden = true;
      if (img) img.removeAttribute("src");
    }, 260);
    if (opener && opener.focus) opener.focus();
    opener = null;
  }

  KJ.$$("[data-cert-open]", root).forEach(function (btn) {
    btn.addEventListener("click", function () { open(btn); });
  });

  KJ.$$("[data-certbox-close]", box).forEach(function (el) {
    el.addEventListener("click", close);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
})();
