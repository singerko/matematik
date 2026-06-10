# Matematik - Aplikácia na počítanie

Ahoj! 👋
Toto je zdrojový kód našej hry **Matematik**.
V tejto hre si môžeš precvičovať sčítanie, odčítanie, násobenie a delenie.

## 📂 Čo kde nájdeš?

Všetky dôležité veci sú v priečinku `src` (source = zdroj):

*   **`src/main.tsx`**: Štart hry.
*   **`src/App.tsx`**: Hlavný "riaditeľ", ktorý prepína obrazovky.
*   **`src/components/`**: Jednotlivé obrazovky:
    *   **`ProfileSelector.tsx`**: Výber mena.
    *   **`SettingsForm.tsx`**: Nastavenia (koľko príkladov, aké ťažké...).
    *   **`GameSession.tsx`**: Samotná hra.
    *   **`Summary.tsx`**: Vysvedčenie na konci.
*   **`src/lib/`**: Mozog aplikácie (logika):
    *   **`generator.ts`**: Vymýšľa príklady.
    *   **`storage.ts`**: Ukladá mená do pamäte.
    *   **`types.ts`**: Kniha pravidiel (čo je to Hráč, Príklad...).

## �️ Použité technológie (A prečo?)

Aby sa nám dobre pracovalo, použili sme tieto moderné nástroje:

*   **React**: Je to ako Lego. Skladáme aplikáciu z malých kociek (tlačidlo, karta, menu). Keď jednu kocku opravíme, opraví sa všade.
*   **TypeScript**: Je to "kontrola pravopisu" pre kód. Ak napíšeme hlúposť (napríklad chceme sčítať "Hruška" + 5), hneď nás upozorní červenou čiarou. Vďaka tomu robíme menej chýb.
*   **Vite**: Je to náš rýchly robotník. Keď zmeníme čo i len písmenko v kóde, on to bleskovo premietne do prehliadača, aby sme hneď videli výsledok.
*   **Tailwind CSS**: Pomáha nám s dizajnom. Namiesto písania dlhých slohov o tom, ako má vyzerať tlačidlo, mu len povieme kľúčové slová: "modré, zaoblené, veľké písmo".
*   **Capacitor**: Toto je kúzelník, ktorý premení našu webstránku na skutočnú mobilnú aplikáciu pre Android.

## �🚀 Ako to spustiť na počítači?

Ak chceš na tejto hre pracovať, potrebuješ mať nainštalovaný **Node.js**.

1.  Otvor si terminál (príkazový riadok).
2.  Nainštaluj všetko potrebné (stačí raz):
    ```bash
    npm install
    ```
3.  Spusti hru:
    ```bash
    npm run dev
    ```
4.  Otvor v prehliadači adresu, ktorú ti to vypíše (väčšinou `http://localhost:5173`).

## 📱 Ako vyrobiť aplikáciu pre Android?

Na toto potrebuješ mať nainštalované **Android Studio**.

1.  Vyrobíme "balíček" (zbalíme React kód):
    ```bash
    npm run build
    ```
2.  Pošleme to do Androidu:
    ```bash
    npx cap sync
    ```
3.  Otvoríme Android Studio:
    ```bash
    npx cap open android
    ```
4.  Tam stlačíš tlačidlo "Play" (zelený trojuholník) a hra sa spustí na mobile (ak ho máš pripojený) alebo v emulátore.

Alebo ak máš Linux a Docker, môžeš použiť náš príkaz:
```bash
make rebuild-apk
```
Tento príkaz spraví všetko naraz a nainštaluje hru do pripojeného mobilu.

---
*Veľa šťastia pri programovaní!* 💻
