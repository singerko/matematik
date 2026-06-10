# Plan rozvoja doucovania matematiky

## Ciel

Aplikacia nema iba overovat vysledok, ale viest ziaka k oprave vlastneho postupu. Prva iteracia sa zameria na chyby pri zakladnych operaciach, jednoduche napovedy a odporucania po treningu.

## Iteracia 1

- Po nespravnej odpovedi najprv zobrazit napovedu a dat druhy pokus.
- Az po druhom nespravnom pokuse ukazat spravny postup.
- Vytvorit zakladne krokove vysvetlenia pre scitanie, odcitanie, nasobenie, delenie a doplnovacky.
- V suhrne pomenovat temy, v ktorych ziak chyboval, a navrhnut dalsi trening.
- Opravit lint problemy v dotknutych suboroch.

## Iteracia 2

- Rozsirit skolsku mapu uciva o 1. a 3. rocnik.
- Pridat cielene opakovanie prikladov, v ktorych ziak urobil chybu.
- Pridat samostatne tutorialy pre prechod cez desiatku, nasobilku a delenie.

Stav: 3. rocnik a cielene opakovanie po chybe su implementovane. Samostatne tutorialy zostavaju otvorene.

## Iteracia 3

- Pridat diagnostiku typu chyby, napriklad zamenene znamienko, chyba v nasobilke, zly prenos zvysku.
- Pridat profilovy prehlad pokroku podla tem.
- Rozsirit 5. rocnik o poradie operacii, zatvorky, delitelnost a uvod do zlomkov.

## Iteracia 4

- Pridat samostatne tutorialy pre scitanie s prechodom cez desiatku, odcitanie s prechodom cez desiatku, nasobilku a delenie.
- Pridat rezimy treningu:
  - Ucim sa: napovedy, druhy pokus, postup po druhej chybe, adaptivne opakovanie.
  - Testujem sa: bez napovedy pocas treningu, vyhodnotenie az v suhrne.
- Pridat tlacidlo Trening odporucanych prikladov zo suhrnu.
- Ukladat historiu pokroku v profile podla tem.
- Rozsirit diagnostiku chyby o konkretne priciny: prechod cez desiatku, chyba v nasobilke, zamenena operacia, zly zvyšok.
- Pridat jednoduche slovne ulohy podla rocnika.
- Zlepsit vizualizaciu prechodu cez desiatku cez rozklad na 10.

Stav: implementovane su rezimy treningu, odporucany trening zo suhrnu aj z historie profilu, historia pokroku, zakladna diagnostika chyb, slovne ulohy, 1. az 5. rocnik, poradie operacii pre 5. rocnik, vizualizacia prechodu cez desiatku a vizualne tutorialy pre scitanie, odcitanie, nasobenie, delenie, poradie operacii, zatvorky, delitelnost, nasobky a delitele, zlomky, porovnavanie zlomkov aj indicke delenie. Diagnostika uz rozlisuje aj typicke chyby pri delitelnosti, nasobkoch, deliteloch a zlomkoch. Otvorene ostava hlavne dalsie rozsirovanie obsahu a jemnejsie diagnostiky pre viac specifickych typov chyb.

## Iteracia 5

- Ukladat pokrok aj podla konkretnej nasobilky, aby sa slabe miesta typu "nasobilka 7" dali trenovat cielene.
- Generovat odporucane priklady pre konkretnu nasobilku.
- Doplnit vizualny tutorial delitelnosti ako rovnomerne rozdelenie bez zvysku.

Stav: implementovane.

## Iteracia 6

- Doplnit vizualny tutorial pre nasobky a delitele.
- Vysvetlit nasobok ako rastuci rad rovnakych skupin.
- Vysvetlit delitel ako cislo, ktore vytvori presne skupiny bez zvysku.

Stav: implementovane.

## Iteracia 7

- Doplnit vizualny tutorial pre poradie operacii a zatvorky.
- Ukazat, ze bez zatvoriek ma nasobenie prednost pred scitanim.
- Ukazat, ze zatvorka meni poradie pocitania aj vysledok.

Stav: implementovane.

## Iteracia 8

- Doplnit samostatny vizualny tutorial pre porovnavanie zlomkov s rovnakym menovatelom.
- Rozsirit tutorial renderer o dva zlomkove pasy pod sebou.
- Ukazat, ze pri rovnakom menovateli rozhoduje vacsi citatel.

Stav: implementovane.

## Iteracia 9

- Opravit hodnotenie uloh, kde existuje viac spravnych delitelov.
- Doplnit presnejsiu diagnostiku pri delitelnosti: odpoved ano/nie, najblizsie nasobky a zamena za podiel.
- Doplnit presnejsiu diagnostiku pri nasobkoch, deliteloch a zlomkoch.

Stav: implementovane.

## Mimo scope

- Jemne rodicovske nastavovanie obsahu na tyzden alebo povolenie iba konkretnych tem na tyzden.
