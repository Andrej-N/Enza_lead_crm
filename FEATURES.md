# Enza Lead Database - Lista Funkcionalnosti

## 1. Autentifikacija i Korisnici

- Login sistem sa username/password autentifikacijom
- JWT token autentifikacija (7-dnevni tokeni u HTTP-only kolacicima)
- Rate limiting na login (5 pokusaja po minutu po IP adresi)
- Automatsko odrzavanje sesije pri ucitavanju aplikacije
- Logout sa brisanjem sesije i kolacica
- Prikaz imena ulogovanog korisnika u sidebar-u
- Bcrypt hashovanje lozinki
- Autentifikacioni middleware za zastitu API ruta

---

## 2. Navigacija i Prikazi

- **Dashboard** - Pregled statistika i upravljanje lead-ovima
- **Kalendar** - Mesecni kalendar sa zakazanim sastancima i pozivima
- **Leads tabela** - Tabelarni prikaz lead-ova sa filterima i pretragom
- **Sidebar navigacija** - Brza navigacija izmedju prikaza i kategorija
- **Quick access po kategorijama** - Direktan pristup hotelima, klinikama, investitorima ili prodavcima namestaja
- **Status summary** - Brojevi statusa u realnom vremenu u sidebar-u

---

## 3. Upravljanje Lead-ovima (CRUD)

- **Kreiranje** - Dodavanje novih lead-ova rucno sa poljima specificnim za kategoriju
- **Citanje** - Prikaz lead-ova sa svim detaljima
- **Azuriranje** - Izmena svih polja sa sinhronizacijom u realnom vremenu
- **Brisanje** - Uklanjanje lead-ova iz baze (sa potvrdom)
- **Lead modal** - Detaljni panel sa informacijama i mogucnoscu editovanja

---

## 4. Kategorije Lead-ova

Cetiri glavne kategorije:

| Kategorija | Opis |
|---|---|
| **Hoteli** | 10 podkategorija (luksuzni 5*, 4*, srednji, u izgradnji, apartmani, hosteli...) |
| **Privatne Klinike** | Medicinske ustanove sa specijalnostima |
| **Investitori** | Developeri i gradjevinci nekretnina |
| **Prodavci Namestaja** | Maloprodaja namestaja i osvetljenja |

---

## 5. Polja za Lead-ove

### Osnovne informacije
- Naziv / Ime firme
- Kategorija i podkategorija
- Grad / Lokacija
- Adresa
- Web sajt
- Kontakt osoba

### Kontakt informacije (editabilne)
- Telefon 1 i Telefon 2
- Email i Email 2
- Ime kontakt osobe

### Polja specificna za hotele
- Broj zvezdica (1-5*)
- Broj soba
- Google rejting
- Status email-a

### Polja specificna za klinike
- Tip klinike
- Broj kreveta
- Skor relevantnosti
- Usluge: Stacionarno, Hirurgija, Porodiliste, Palijativna nega

### Polja specificna za investitore
- Naziv projekta
- Povrsina (m²)
- Broj stanova
- Faza gradnje
- Velicina investitora (Mali <2000m², Srednji 2-5k m², Veliki 5000+ m²)
- Iznos investicije (EUR)
- Datum otvaranja

### Pracenje lead-ova
- Status outreach-a
- Datum poziva
- Datum sastanka
- Beleske sa sastanka
- Opste beleske

---

## 6. Pipeline i Statusi

| Status | Opis |
|---|---|
| Not Contacted | Novi lead-ovi |
| Called | Inicijalni kontakt ostvaren |
| Meeting Scheduled | Sastanak zakazan |
| Negotiation | Aktivni pregovori |
| Deal Closed | Zavrsen dogovor |
| Not Interested | Odbijeni lead-ovi |

---

## 7. Filtriranje i Pretraga

- **Filter po kategoriji** - Hoteli, Klinike, Investitori, Prodavci
- **Filter po podkategoriji** - Podkategorije specificne za hotele
- **Filter po statusu** - Filtriranje po outreach statusu
- **Filter po gradu** - Sa mogucnoscu unosa custom grada
- **Filter po kontaktu** - Filtriranje po dostupnosti telefona i email-a
- **Filter po velicini investitora** - Mali/Srednji/Veliki
- **Filter po fazi gradnje** - Selekcija faze izgradnje
- **Full text pretraga** - Pretraga po imenu, email-u, telefonu, nazivu projekta, kontakt osobi
- **Kombinovani filteri** - Primena vise filtera istovremeno
- **Reset filtera** - Brisanje svih filtera

---

## 8. Aktivnosti i Istorija

- **Timeline aktivnosti** - Hronoloski log svih akcija na lead-u
- **Rucne beleske** - Dodavanje komentara sa vremenskim oznakama
- **Logovanje poziva** - Evidencija poziva sa datumom i beleskama
- **Dokumentacija sastanaka** - Evidencija sastanaka sa datumima i beleskama
- **Pracenje promena statusa** - Automatsko logovanje promene outreach statusa
- **Tipovi aktivnosti** - Sistemski dogadjaji, pozivi, sastanci, beleske
- **Relativno vreme** - Prikaz "pre X minuta", "pre X dana" itd.

---

## 9. Kalendar i Zakazivanje

- **Interaktivni kalendar** - Mesecni prikaz sa navigacijom
- **Vizualizacija sastanaka** - Kodirani bojama po kategoriji
- **Prikaz poziva** - Zuti indikatori za telefonske pozive
- **Panel detalja** - Desni sidebar sa dogadjajima izabranog dana
- **Beleske sa sastanaka** - Prikaz beleski na kalendaru
- **Quick access kontakta** - Linkovi za telefon i email iz kalendara
- **Follow-up tracker** - Lista poziva kojima treba follow-up
- **Indikatori hitnosti** - Kodirani bojama prema danima od poziva:
  - Crveno (7+ dana)
  - Narandzasto (5-6 dana)
  - Zuto (3-4 dana)

---

## 10. Dashboard i Analitika

### Kljucne statistike (kartice)
- Ukupan broj lead-ova
- Broj kontaktiranih lead-ova
- Broj zakazanih sastanaka
- Broj zatvorenih dogovora

### Grafikoni i vizualizacije
- **Breakdown po kategorijama** - Broj lead-ova po kategoriji
- **Pregled statusa** - Raspodela po outreach statusu sa progress barovima
- **Pipeline funnel** - Vizualizacija konverzije lead-ova kroz faze
- **Response rate donut chart** - Kontaktirani vs nekontaktirani vs nezainteresovani
- **Konverzija po kategoriji** - Procenat kontaktiranja po kategoriji
- **Top 10 gradova** - Distribucija lead-ova po gradovima
- **Nedeljni sumarij** - Ova nedelja vs prosla nedelja:
  - Novi lead-ovi
  - Obavljeni pozivi
  - Zakazani sastanci
  - Zatvoreni dogovori
  - Ukupna aktivnost

---

## 11. Izvestaji i Eksport

- **PDF eksport** - Generisanje nedeljnog analitickog izvestaja kao PDF
- **Visestruke stranice** - Podrska za vise stranica u PDF-u
- **Zaglavlje izvestaja** - Naslov i datum generisanja
- **Snimak dashboard-a** - Eksport analitike kao PDF
- **Auto-imenovanje** - Automatsko imenovanje fajla sa datumom (`enza-nedeljni-izvestaj-YYYY-MM-DD.pdf`)

---

## 12. Import Podataka

- **Bulk import** - Ucitavanje lead-ova iz Excel/CSV fajlova
- **Vise izvora** - Import iz 4 odvojena izvora:
  - Hoteli (XLSX sa vise sheet-ova)
  - Klinike (XLSX)
  - Investitori (XLSX)
  - Prodavci namestaja (CSV)
- **Multi-sheet podrska** - Obrada razlicitih sheet-ova u Excel fajlovima
- **Mapiranje podataka** - Transformacija izvornih podataka u standardnu shemu
- **Seed podaci** - Popunjavanje baze sa inicijalnim lead-ovima

---

## 13. Tabela Lead-ova

- **Dinamicke kolone** - Prikaz kolona specificnih za kategoriju
- **Status dropdown** - Brza promena statusa iz tabele
- **Linkovi za telefon** - Klikabilni `tel:` linkovi
- **Linkovi za email** - Klikabilni `mailto:` linkovi
- **Responsivni overflow** - Horizontalni scroll za siroke podatke
- **Hover efekti** - Interaktivno isticanje redova

---

## 14. Forme

- **Add Lead forma** - Polja specificna za kategoriju
- **Dinamicka polja** - Prikazivanje/skrivanje polja na osnovu kategorije
- **Validacija** - Validacija obaveznih polja
- **Editabilna polja** - Inline editovanje sa save/cancel opcijama
- **Date picker** - Unos datuma za pozive i sastanke
- **Checkboxovi** - Toggle za usluge klinika
- **Dropdown-ovi** - Izbor iz predefinisanih opcija
- **Text area** - Viselinijski unos beleski

---

## 15. Bezbednost

- CORS konfiguracija
- Autentifikacioni middleware za zastitu API ruta
- JWT isticanje tokena nakon 7 dana
- Secure kolacici (HTTP-only, sameSite=lax)
- Bcrypt hashovanje sa salt-om
- Rate limiting na login endpoint
- Konfigurabilan JWT secret preko environment varijabli

---

## 16. Lokalizacija

- Sav UI tekst na srpskom jeziku (latinica)
- Srpski format datuma (date-fns/locale sr)
- Poruke o greskama na srpskom
- Labele formi na srpskom

---

## 17. Ponuda Usluga (ugradjena)

### Paketi usluga
1. Lead Research & Database
2. Outreach & Meeting Scheduling
3. Email Campaigns
4. CRM & Pipeline Management
5. Weekly Reports
6. Partner Consulting

### Cenovni paketi
| Paket | Cena |
|---|---|
| Starter | 400 EUR/mesecno |
| Growth | 700 EUR/mesecno (preporucen) |
| Scale | 1100 EUR/mesecno |

---

## 18. Tehnicki Stack

| Komponenta | Tehnologija |
|---|---|
| Backend | Express.js (Node.js) |
| Frontend | React |
| Build tool | Vite |
| Stilizacija | Tailwind CSS |
| Baza podataka | SQLite (sql.js) - in-memory sa file perzistencijom |
| Grafikoni | Recharts |
| Datumi | date-fns |
| PDF generisanje | jsPDF + html2canvas |
| Excel parsing | XLSX |
| Hashovanje | bcryptjs |
| Upload fajlova | Multer |

---

## 19. API Endpointi

### Autentifikacija
- `POST /api/auth/login` - Prijava
- `POST /api/auth/logout` - Odjava
- `GET /api/auth/me` - Provera sesije

### Lead operacije
- `GET /api/leads` - Lista sa filterima
- `GET /api/leads/:id` - Pojedinacni lead
- `POST /api/leads` - Kreiranje lead-a
- `PUT /api/leads/:id` - Azuriranje lead-a
- `DELETE /api/leads/:id` - Brisanje lead-a

### Aktivnosti
- `GET /api/activity/:leadId` - Istorija aktivnosti
- `POST /api/activity/:leadId` - Dodavanje beleske/aktivnosti

### Analitika
- `GET /api/stats` - Osnovne statistike
- `GET /api/stats/pipeline` - Pipeline funnel podaci
- `GET /api/stats/cities` - Top gradovi
- `GET /api/stats/conversion` - Konverzija po kategoriji
- `GET /api/stats/weekly-activity` - Nedeljna aktivnost
- `GET /api/stats/weekly-summary` - Ova vs prosla nedelja
- `GET /api/stats/weekly-report` - Kompletan nedeljni izvestaj

### Kalendar
- `GET /api/calendar/meetings` - Sastanci za mesec
- `GET /api/calendar/followups` - Lead-ovi kojima treba follow-up

---

## 20. Baza Podataka

### Tabele
| Tabela | Opis |
|---|---|
| **leads** | Glavni podaci o lead-ovima (40+ polja) |
| **activity_log** | Hronoloski log aktivnosti |
| **users** | Korisnicki nalozi |

- SQLite baza (sql.js)
- Perzistencija u fajl: `data/enza_leads.db`
- Podrska za automatske migracije sheme
