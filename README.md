# 🏆 Céges Csocsóbajnokság · E-Group ICT Software Zrt.

Modern, reszponzív egylapos webalkalmazás céges **csocsó (asztali foci) bajnokság**
teljes lebonyolítására: csapatfelvételtől a csoportkörön át a kieséses szakaszig és a
döntőig. Az alkalmazás kliensoldali — minden adat a böngésződ `localStorage`-ában
tárolódik, automatikus mentéssel. Nincs szükség szerverre.

![stack](https://img.shields.io/badge/React-19-149eca) ![ts](https://img.shields.io/badge/TypeScript-6-3178c6) ![vite](https://img.shields.io/badge/Vite-8-646cff) ![tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8)

## ✨ Funkciók

- **Konfigurálható torna** – tetszőleges csapat- és csoportszám, csoportonként
  állítható továbbjutók száma, oda-visszavágó ki/be kapcsolható.
- **Csapatkezelés** – csapatok és 2-2 játékos felvétele, szerkesztése, törlése,
  csapatok áthelyezése csoportok között.
- **Automatikus sorsolás** – körmérkőzéses (round-robin) menetrend oda-visszavágóval;
  a mérkőzések **csoportonként váltakozva** kerülnek ütemezésre, így egy csapat sem
  játszik többször egymás után, miközben mások sokáig várnak.
- **Élő tabella** – M / Gy / V / LG / KG / GK / P oszlopokkal, a továbbjutó helyek
  **zölddel** kiemelve. Rangsorolás: pontszám → gólkülönbség → egymás elleni eredmény.
  Pontozás: győzelem = 2, vereség = 0, döntetlen nincs.
- **Eredményrögzítés** – minden mérkőzésnél gólok rögzítése, győztes automatikus
  meghatározása; a tabella és a továbbjutási helyzet azonnal újraszámolódik.
- **Kieséses szakasz** – a csoportkör végén automatikusan generált ágrajz
  (negyeddöntő / elődöntő / bronzmérkőzés / döntő), bye-okkal a kiemeltek számára.
  A csoportkör eredményei megmaradnak.
- **Kivetítő nézet** – nagy felirattal: *„Következő mérkőzés: A vs B”*, az aktuális és
  következő meccs, élbolyok és tabellák — teljes képernyős módban is.
- **Statisztikák** – legtöbb győzelem, legjobb gólkülönbség, legtöbb lőtt gól.
- **Export** – PDF versenytábla, PDF végeredmény és Excel (xlsx) export.
- **Sötét / világos mód**, mobil-, tablet- és desktopbarát kialakítás.
- **Egy kattintásos új torna** – jövőre újra használható.

## 🚀 Indítás

```bash
npm install
npm run dev        # fejlesztői szerver (http://localhost:5173)
npm run build      # éles build a dist/ mappába
npm run preview    # az éles build helyi kiszolgálása
npm run check      # a versenylogika önellenőrző tesztjei (tsx)
```

## 📦 Deploy

A build relatív útvonalakat használ (`base: './'`), így bárhová telepíthető.

- **GitHub Pages** – a `main` ágra való push automatikusan deployol a mellékelt
  `.github/workflows/deploy.yml` workflow segítségével (kapcsold be: *Settings →
  Pages → Source: GitHub Actions*). Hash-alapú útválasztás, nincs szükség 404
  átirányításra.
- **Vercel / Netlify** – importáld a repót; a Vite automatikusan felismerésre kerül
  (build parancs: `npm run build`, kimenet: `dist`).

## 🎨 Arculat

Az alkalmazás az **E-Group ICT Software Zrt.** hivatalos logóját és arculati színét
(bordó, `#79233a`) használja, kombinálva a csocsópálya zöld tematikájával.

## 🗂️ Felépítés

```
src/
  lib/         tiszta logika: sorsolás, tabella, kieséses ágrajz, export, mentés
  state/       React állapotkezelés (reducer + context), szelektorok, téma
  components/  UI primitívek, közös komponensek, arculati elemek
  views/       nézetek: Áttekintés, Csapatok, Tabella, Mérkőzések, Kieséses,
               Statisztika, Kivetítő, Beállítások
scripts/       fejlesztői eszközök (logikai tesztek, demó-állapot generálás)
```

---

Készült az E-Group ICT Software Zrt. számára.
