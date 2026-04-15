// Generates "Enza CRM - Vodic za radnike.pdf" using jsPDF (already in client/node_modules)
// Run: node generate-guide-pdf.js
//
// Note: jsPDF's default fonts (Helvetica) don't support Latin Extended diacritics
// (s/c/c/d/z with marks). This guide uses unaccented Latin to match what the
// rest of the codebase already uses in user-facing strings.

const path = require('path')
const fs = require('fs')

const { jsPDF } = require(path.join(__dirname, 'client', 'node_modules', 'jspdf'))

const doc = new jsPDF({ unit: 'mm', format: 'a4' })

// ---------- layout config ----------
const PAGE_W = 210
const PAGE_H = 297
const MARGIN_X = 18
const MARGIN_TOP = 20
const MARGIN_BOTTOM = 20
const CONTENT_W = PAGE_W - MARGIN_X * 2

// brand colors (matching the dark UI: emerald accent on white paper)
const COLOR_BRAND = [16, 122, 87]      // emerald-700
const COLOR_BRAND_LIGHT = [209, 250, 229] // emerald-100
const COLOR_TEXT = [31, 41, 55]        // gray-800
const COLOR_MUTED = [107, 114, 128]    // gray-500
const COLOR_RULE = [229, 231, 235]     // gray-200
const COLOR_BOX_BG = [243, 244, 246]   // gray-100
const COLOR_TIP_BG = [254, 249, 195]   // yellow-100
const COLOR_TIP_BORDER = [202, 138, 4] // yellow-600

let y = MARGIN_TOP

// ---------- helpers ----------
function setText(rgb, size, style = 'normal') {
  doc.setTextColor(rgb[0], rgb[1], rgb[2])
  doc.setFontSize(size)
  doc.setFont('helvetica', style)
}

function ensureSpace(needed) {
  if (y + needed > PAGE_H - MARGIN_BOTTOM) {
    addPage()
  }
}

function addPage() {
  doc.addPage()
  y = MARGIN_TOP
  drawFooter()
}

function drawFooter() {
  const pageNum = doc.internal.getCurrentPageInfo().pageNumber
  doc.setDrawColor(...COLOR_RULE)
  doc.setLineWidth(0.2)
  doc.line(MARGIN_X, PAGE_H - 12, PAGE_W - MARGIN_X, PAGE_H - 12)
  setText(COLOR_MUTED, 8)
  doc.text('Enza Home - Lead Database / Vodic za radnike', MARGIN_X, PAGE_H - 7)
  doc.text(`str. ${pageNum}`, PAGE_W - MARGIN_X, PAGE_H - 7, { align: 'right' })
}

function h1(text) {
  ensureSpace(20)
  doc.setFillColor(...COLOR_BRAND)
  doc.rect(MARGIN_X, y, CONTENT_W, 11, 'F')
  setText([255, 255, 255], 14, 'bold')
  doc.text(text, MARGIN_X + 4, y + 7.5)
  y += 15
}

function h2(text) {
  ensureSpace(14)
  setText(COLOR_BRAND, 13, 'bold')
  doc.text(text, MARGIN_X, y + 5)
  y += 7
  doc.setDrawColor(...COLOR_BRAND)
  doc.setLineWidth(0.4)
  doc.line(MARGIN_X, y, MARGIN_X + 30, y)
  y += 5
}

function h3(text) {
  ensureSpace(10)
  setText(COLOR_TEXT, 11, 'bold')
  doc.text(text, MARGIN_X, y + 4)
  y += 7
}

function paragraph(text) {
  setText(COLOR_TEXT, 10)
  const lines = doc.splitTextToSize(text, CONTENT_W)
  for (const line of lines) {
    ensureSpace(5.5)
    doc.text(line, MARGIN_X, y + 4)
    y += 5
  }
  y += 2
}

function bullet(text, indent = 0) {
  setText(COLOR_TEXT, 10)
  const x = MARGIN_X + 4 + indent
  const lines = doc.splitTextToSize(text, CONTENT_W - 6 - indent)
  ensureSpace(5.5)
  doc.setFillColor(...COLOR_BRAND)
  doc.circle(MARGIN_X + 1.5 + indent, y + 2.5, 0.8, 'F')
  doc.text(lines[0], x, y + 4)
  y += 5
  for (let i = 1; i < lines.length; i++) {
    ensureSpace(5.5)
    doc.text(lines[i], x, y + 4)
    y += 5
  }
}

function numbered(n, text) {
  setText(COLOR_TEXT, 10)
  const x = MARGIN_X + 8
  const lines = doc.splitTextToSize(text, CONTENT_W - 10)
  ensureSpace(5.5)
  setText(COLOR_BRAND, 10, 'bold')
  doc.text(`${n}.`, MARGIN_X + 1, y + 4)
  setText(COLOR_TEXT, 10)
  doc.text(lines[0], x, y + 4)
  y += 5
  for (let i = 1; i < lines.length; i++) {
    ensureSpace(5.5)
    doc.text(lines[i], x, y + 4)
    y += 5
  }
}

function tipBox(title, text) {
  setText(COLOR_TEXT, 10)
  const lines = doc.splitTextToSize(text, CONTENT_W - 10)
  const boxH = 8 + lines.length * 5
  ensureSpace(boxH + 4)
  doc.setFillColor(...COLOR_TIP_BG)
  doc.setDrawColor(...COLOR_TIP_BORDER)
  doc.setLineWidth(0.4)
  doc.rect(MARGIN_X, y, CONTENT_W, boxH, 'FD')
  setText(COLOR_TIP_BORDER, 10, 'bold')
  doc.text(title, MARGIN_X + 4, y + 5.5)
  setText(COLOR_TEXT, 10)
  let ty = y + 11
  for (const line of lines) {
    doc.text(line, MARGIN_X + 4, ty)
    ty += 5
  }
  y += boxH + 4
}

function infoBox(text) {
  setText(COLOR_TEXT, 10)
  const lines = doc.splitTextToSize(text, CONTENT_W - 10)
  const boxH = 6 + lines.length * 5
  ensureSpace(boxH + 4)
  doc.setFillColor(...COLOR_BOX_BG)
  doc.rect(MARGIN_X, y, CONTENT_W, boxH, 'F')
  let ty = y + 5
  for (const line of lines) {
    doc.text(line, MARGIN_X + 4, ty)
    ty += 5
  }
  y += boxH + 4
}

function table(headers, rows, colWidths) {
  const rowH = 7
  const totalW = colWidths.reduce((a, b) => a + b, 0)
  ensureSpace(rowH * (rows.length + 1) + 3)

  // header
  doc.setFillColor(...COLOR_BRAND)
  doc.rect(MARGIN_X, y, totalW, rowH, 'F')
  setText([255, 255, 255], 9, 'bold')
  let x = MARGIN_X
  headers.forEach((h, i) => {
    doc.text(h, x + 2, y + 4.8)
    x += colWidths[i]
  })
  y += rowH

  // rows
  setText(COLOR_TEXT, 9)
  rows.forEach((row, ri) => {
    // Compute max wrapped height for this row
    const wrapped = row.map((cell, i) => doc.splitTextToSize(String(cell), colWidths[i] - 4))
    const lineCount = Math.max(...wrapped.map(w => w.length))
    const thisRowH = Math.max(rowH, 4 + lineCount * 4.2)
    ensureSpace(thisRowH)
    if (ri % 2 === 0) {
      doc.setFillColor(249, 250, 251)
      doc.rect(MARGIN_X, y, totalW, thisRowH, 'F')
    }
    let cx = MARGIN_X
    wrapped.forEach((cellLines, i) => {
      let ty = y + 4.5
      cellLines.forEach(l => {
        doc.text(l, cx + 2, ty)
        ty += 4.2
      })
      cx += colWidths[i]
    })
    y += thisRowH
  })
  // border around table
  doc.setDrawColor(...COLOR_RULE)
  doc.setLineWidth(0.2)
  doc.rect(MARGIN_X, y - (rowH * (rows.length) + rowH), totalW, rowH * (rows.length) + rowH)
  y += 3
}

function spacer(h = 4) { y += h }

// ---------- COVER ----------
function cover() {
  doc.setFillColor(...COLOR_BRAND)
  doc.rect(0, 0, PAGE_W, 90, 'F')

  setText([255, 255, 255], 10, 'normal')
  doc.text('ENZA HOME', MARGIN_X, 25)

  setText([255, 255, 255], 28, 'bold')
  doc.text('Lead Database', MARGIN_X, 50)
  setText([255, 255, 255], 28, 'bold')
  doc.text('Vodic za radnike', MARGIN_X, 65)

  setText(COLOR_BRAND_LIGHT, 11)
  doc.text('Sve sto vam treba da pocnete sa koriscenjem CRM sistema', MARGIN_X, 78)

  // Body of cover
  y = 110
  setText(COLOR_TEXT, 11)
  paragraph(
    'Ovaj dokument je kratak i prakticni vodic za rad sa Enza Home Lead Database CRM sistemom. ' +
    'Sve sto je opisano ovde dovoljno je da samostalno pocnete sa unosom, pracenjem i upravljanjem leadovima.'
  )

  spacer(4)
  h3('Sta cete nauciti')
  bullet('Kako da se prijavite u sistem')
  bullet('Sta sve moze ovaj CRM i koje sve ekrane ima')
  bullet('Kako da dodate i azurirate leadove')
  bullet('Kako da pratite pozive, sastanke i statuse')
  bullet('Kako da koristite kalendar i dnevnu aktivnost')
  bullet('Kako da unosite walk-in kupce iz radnje')
  bullet('Najcesce greske i saveti')

  spacer(8)
  infoBox(
    'Sistem je u potpunosti na srpskom jeziku (latinica). Radi na racunaru i telefonu, ' +
    'ali su strane Dashboard, Kalendar i tabela leadova optimizovane za rad sa racunarom.'
  )

  setText(COLOR_MUTED, 9)
  doc.text(`Generisano: ${new Date().toLocaleDateString('sr-Latn-RS')}`, MARGIN_X, PAGE_H - 20)
  drawFooter()
}

// ---------- CONTENT ----------
cover()
addPage()

// SECTION 1
h1('1. Prijavljivanje u sistem')

paragraph(
  'Sistem se otvara u internet pretrazivacu (Chrome, Edge ili Firefox). Otvorite link koji ste dobili od administratora i ugledacete login ekran sa logom "Enza Home".'
)

h3('Koraci za prijavu')
numbered(1, 'Unesite svoj username (korisnicko ime).')
numbered(2, 'Unesite password (lozinku).')
numbered(3, 'Kliknite zeleno dugme "Prijavi se".')

spacer(2)
tipBox('Vazno',
  'Ako tri puta zaredom unesete pogresnu lozinku, sistem ce vas privremeno blokirati na minut. Ovo je radi sigurnosti. Ako ste zaboravili lozinku, javite se administratoru.'
)

paragraph(
  'Sesija ostaje aktivna 7 dana - ne morate da se prijavljujete svaki dan. Kada zelite da se odjavite, kliknite na "Odjavi se" u dnu levog menija.'
)

// SECTION 2
h1('2. Glavni meni i prikazi')

paragraph(
  'Sa leve strane se nalazi glavni meni (sidebar). Iz njega birate koju stranicu zelite da otvorite. U dnu menija vidite svoje korisnicko ime i dugme za odjavu, kao i ukupan broj leadova u bazi.'
)

h3('Glavni prikazi')

table(
  ['Prikaz', 'Cemu sluzi'],
  [
    ['Dashboard', 'Pregled svih kljucnih brojki, grafikona i nedeljnog rezimea.'],
    ['Kalendar', 'Mesecni kalendar sa svim zakazanim pozivima i sastancima.'],
    ['Dnevna aktivnost', 'Sta se sve desavalo na lead-ovima tokom dana.'],
    ['Kupci', 'Walk-in kupci iz radnje (baza za email kampanje).'],
    ['Hoteli / Klinike / Investitori / Prodavci', 'Brzi pristup svakoj od cetiri kategorije lead-ova.'],
    ['Svi Leadovi', 'Tabela sa svim lead-ovima bez filtera po kategoriji.'],
  ],
  [55, CONTENT_W - 55]
)

h3('Status pregled u sidebaru')
paragraph(
  'Ispod kategorija vidite "Status pregled" - ovo su brojevi koliko leadova trenutno ima u kojem statusu (Nije kontaktiran, Pozvan, Zakazan sastanak, Pregovori, Dogovoren posao, Nije zainteresovan). Ovi brojevi se osvezavaju u realnom vremenu.'
)

// SECTION 3
h1('3. Dashboard - vasa kontrolna tabla')

paragraph(
  'Dashboard je prva stranica koju vidite kada se prijavite. Daje vam celokupan pregled stanja u jednom ekranu.'
)

h3('Sta sve mozete videti na Dashboardu')
bullet('Ukupan broj leadova u bazi')
bullet('Koliko je leadova kontaktirano')
bullet('Koliko sastanaka je zakazano')
bullet('Koliko poslova je zatvoreno')
bullet('Grafikon raspodele po kategorijama (hoteli, klinike, investitori, prodavci)')
bullet('Pipeline funnel - vizualizacija konverzije kroz faze')
bullet('Top 10 gradova po broju lead-ova')
bullet('Konverzija po kategoriji (procenat kontaktiranih)')
bullet('Nedeljni sumarij - poredjenje ove i prosle nedelje')

spacer(2)
tipBox('Savet',
  'Pogledajte Dashboard svaki put kada krenete na posao - dobicete brzu sliku sta vas ceka i gde najvise treba da se fokusirate tog dana.'
)

h3('PDF izvestaj')
paragraph(
  'Sa Dashboarda mozete generisati PDF nedeljnog izvestaja jednim klikom. Fajl se automatski imenuje sa datumom (npr. enza-nedeljni-izvestaj-2026-04-08.pdf) i mozete ga proslediti rukovodstvu.'
)

// SECTION 4
h1('4. Rad sa leadovima (kategorije)')

paragraph(
  'Leadovi su podeljeni u cetiri kategorije. Iz sidebara mozete kliknuti direktno na kategoriju i odmah cete videti samo te leadove.'
)

table(
  ['Kategorija', 'Sta obuhvata'],
  [
    ['Hoteli', 'Hoteli sa zvezdicama, apartmani, hosteli, hoteli u izgradnji.'],
    ['Privatne Klinike', 'Bolnice, klinike sa porodilistem, hirurgijom, palijativnom negom.'],
    ['Investitori', 'Developeri, gradjevinske firme, projekti stambenih zgrada.'],
    ['Prodavci Namestaja', 'Maloprodajni objekti namestaja i osvetljenja.'],
  ],
  [40, CONTENT_W - 40]
)

h3('Tabela leadova')
paragraph(
  'Kada otvorite kategoriju, vidite tabelu sa svim leadovima iz te kategorije. Tabela ima:'
)
bullet('Naziv firme i grad')
bullet('Telefon (klikabilan - poziva direktno)')
bullet('Email (klikabilan - otvara mejl program)')
bullet('Status (mozete ga promeniti direktno iz tabele)')
bullet('Specificne kolone za kategoriju (zvezdice za hotele, povrsina za investitore...)')

spacer(2)
infoBox('Klik na bilo koji red u tabeli otvara detaljni panel lead-a sa desne strane.')

// SECTION 5
h1('5. Filtriranje i pretraga')

paragraph(
  'Iznad tabele leadova nalazi se traka sa filterima. Mozete kombinovati vise filtera istovremeno - svi rade zajedno.'
)

h3('Sta sve mozete da filtrirate')
bullet('Po kategoriji (hoteli, klinike, investitori, prodavci)')
bullet('Po podkategoriji (npr. samo 5* hoteli)')
bullet('Po statusu (npr. samo "Zakazan sastanak")')
bullet('Po gradu')
bullet('Po dostupnosti telefona ili email-a')
bullet('Po velicini investitora (mali / srednji / veliki)')
bullet('Po fazi gradnje')

h3('Pretraga')
paragraph(
  'Polje za pretragu trazi po nazivu firme, kontakt osobi, telefonu, email-u i nazivu projekta. Samo pocnite da kucate i rezultati se filtriraju u realnom vremenu.'
)

tipBox('Resetovanje filtera',
  'Ako ne vidite leadove koje ocekujete, proverite da li imate aktivnih filtera. Kliknite "Ocisti filtere" da vidite sve leadove iz odabrane kategorije.'
)

// SECTION 6
h1('6. Dodavanje novog leada')

h3('Kako dodati lead')
numbered(1, 'Idite na zeljenu kategoriju (Hoteli, Klinike, Investitori ili Prodavci).')
numbered(2, 'Kliknite zeleno dugme "+ Dodaj Lead" u gornjem desnom uglu.')
numbered(3, 'U formi izaberite tacnu kategoriju (vec ce biti popunjena).')
numbered(4, 'Unesite naziv firme - ovo je jedino obavezno polje.')
numbered(5, 'Popunite ostalo sto znate: grad, adresa, telefon, email, kontakt osoba, sajt.')
numbered(6, 'Za hotele unesite zvezdice i broj soba.')
numbered(7, 'Za klinike unesite tip ustanove i cekirajte usluge koje pruzaju.')
numbered(8, 'Za investitore unesite naziv projekta, povrsinu, broj stanova, fazu gradnje i velicinu.')
numbered(9, 'Kliknite "Sacuvaj" - lead je dodat u bazu.')

tipBox('Napomena',
  'Nije neophodno da popunite sva polja odmah. Sve mozete dopuniti kasnije klikom na lead u tabeli i klikom na pojedinacno polje koje zelite da izmenite.'
)

// SECTION 7
h1('7. Detaljni prikaz leada (Lead Modal)')

paragraph(
  'Klikom na bilo koji lead u tabeli, sa desne strane ekrana se otvara panel sa svim detaljima. Sva polja su klikabilna - kliknite na polje da ga izmenite, pa pritisnite Enter ili dugme OK.'
)

h3('Sekcije u panelu')
bullet('Status outreach - jednim klikom menjate trenutni status lead-a')
bullet('Kontakt informacije - telefoni, email-ovi, kontakt osoba, sajt')
bullet('Verifikacija kontakta - prekidaci da oznacite da li su telefon i email proverni')
bullet('Lokacija - grad i adresa')
bullet('Detalji specificni za kategoriju (hotel/klinika/investitor)')
bullet('Pracenje kontakta - datum poziva, datum sastanka, beleske sa sastanka')
bullet('Detalji posla (kada lead udje u Pregovore ili Dogovoren posao)')
bullet('Opste beleske')
bullet('Timeline aktivnosti - hronoloska istorija svih akcija na ovom leadu')

h3('Kako se izmena pamti')
paragraph(
  'Cim kliknete OK ili pritisnete Enter, izmena se odmah pamti u bazi. Nema "Sacuvaj" dugmeta za ceo lead - svaka stavka se cuva pojedinacno. Datumi se cuvaju automatski cim ih izaberete iz kalendara.'
)

tipBox('Savet za beleske',
  'Pisite kratke i jasne beleske posle svakog poziva ili sastanka. Sledeci put kada otvorite ovaj lead (mozda za nedelju dana), zahvalicete se sebi.'
)

// SECTION 8
h1('8. Statusi leadova - pipeline')

paragraph(
  'Svaki lead prolazi kroz faze. Status menjate iz tabele (brzi dropdown) ili iz Lead modala (klikom na status dugmad).'
)

table(
  ['Status', 'Kada se koristi'],
  [
    ['Nije kontaktiran', 'Novi lead - jos nije bilo nikakvog kontakta.'],
    ['Pozvan', 'Obavili ste prvi telefonski poziv (bez obzira na ishod).'],
    ['Zakazan sastanak', 'Dogovoren je termin za sastanak licno ili online.'],
    ['Pregovori', 'Aktivno se razgovara o uslovima saradnje.'],
    ['Dogovoren posao', 'Posao je zatvoren - imate dogovor / ugovor.'],
    ['Nije zainteresovan', 'Lead je odbio saradnju ili nije relevantan.'],
  ],
  [42, CONTENT_W - 42]
)

infoBox(
  'Cim promenite status, sistem automatski belezi tu promenu u Timeline aktivnosti - tako uvek znate kada i ko je sta promenio.'
)

// SECTION 9
h1('9. Kalendar')

paragraph(
  'Klik na "Kalendar" u sidebaru otvara mesecni prikaz sa svim zakazanim pozivima i sastancima.'
)

h3('Sta vidite na kalendaru')
bullet('Sastanci su prikazani u boji kategorije (plavo = hotel, roze = klinika, narandzasto = investitor, ljubicasto = prodavac)')
bullet('Pozivi su prikazani zutim indikatorom')
bullet('Klik na dan otvara desni panel sa svim dogadjajima tog dana')
bullet('Iz kalendara mozete direktno kliknuti na telefon ili email')

h3('Follow-up tracker')
paragraph(
  'U desnom delu ekrana je lista lead-ova kojima treba follow-up - oni koje ste pre nekoliko dana zvali ali jos niste zakazali sledeci korak.'
)
bullet('Crveno = proslo je 7 ili vise dana - HITNO')
bullet('Narandzasto = proslo je 5-6 dana')
bullet('Zuto = proslo je 3-4 dana')

tipBox('Vazno',
  'Pogledajte follow-up listu na pocetku svakog dana. Lead koji se ne prati - propada.'
)

// SECTION 10
h1('10. Dnevna aktivnost')

paragraph(
  'Stranica "Dnevna aktivnost" pokazuje sve sto se desavalo u sistemu na izabrani dan - poziv po poziv, sastanak po sastanak, promenu statusa po promenu.'
)

h3('Cemu sluzi')
bullet('Pregled vaseg rada na kraju dana - sta ste sve uradili')
bullet('Provera sta su druge kolege radile')
bullet('Brza navigacija - klik na bilo koji unos otvara odgovarajuci lead')
bullet('Mozete se kretati po danima koristeci strelice')

paragraph(
  'Mozete filtrirati po tipu aktivnosti: pozivi, sastanci, promene statusa, beleske, ili sve zajedno.'
)

// SECTION 11
h1('11. Kupci (walk-in)')

paragraph(
  'Sekcija "Kupci" sluzi za evidenciju kupaca koji su kupili u radnji. Ovo nije isto kao Leadovi - leadovi su firme koje ciljamo, a kupci su pojedinci koji su vec nesto kupili. Cilj je da imamo bazu za email kampanje.'
)

h3('Sta se belezi za svakog kupca')
bullet('Ime i prezime')
bullet('Telefon i email')
bullet('Grad i adresa')
bullet('Datum kupovine')
bullet('Sta je kupljeno (proizvodi)')
bullet('Iznos kupovine')
bullet('Saglasnost za marketing (obavezno pitati kupca!)')

h3('Kako dodati novog kupca')
numbered(1, 'Idite na "Kupci" iz sidebara.')
numbered(2, 'Na racunaru kliknite zeleno dugme "+ Dodaj kupca" gore desno. Na telefonu kliknite zeleni krug sa "+" u donjem desnom uglu.')
numbered(3, 'Popunite ime (obavezno), telefon, email, grad, sta je kupljeno, iznos.')
numbered(4, 'Ako je kupac dao saglasnost za primanje marketing mail-ova, OBAVEZNO ukljucite "Saglasnost za marketing".')
numbered(5, 'Kliknite "Sacuvaj".')

tipBox('GDPR napomena',
  'NIKADA ne ukljucujte saglasnost ako vam kupac nije eksplicitno rekao da je u redu da mu saljete email-ove. Ovo je zakonska obaveza.'
)

h3('Eksport baze (CSV)')
paragraph(
  'Postoje dva dugmeta za izvoz:'
)
bullet('CSV (sa saglasnosti) - samo kupci koji su dali saglasnost - koristi se za email kampanje')
bullet('CSV (svi) - svi kupci - koristi se za internu analitiku')

// SECTION 12
h1('12. KPI cards i statistike')

paragraph(
  'Iznad liste kupaca (i na Dashboardu) vidite kartice sa kljucnim brojkama:'
)
bullet('Ukupno - koliko ukupno ima zapisa')
bullet('Sa email-om - kolicina i procenat')
bullet('Za kampanje - email + saglasnost')
bullet('Ovog meseca - novi unosi u tekucem mesecu')

// SECTION 13
h1('13. Najcesce greske i saveti')

h3('Greske koje treba izbegavati')
bullet('Brisanje lead-a umesto promene statusa u "Nije zainteresovan" - lead se ne brise, samo se obeleze da nije relevantan')
bullet('Zaboravljanje da se popuni datum poziva ili sastanka - bez datuma ne radi kalendar i follow-up tracker')
bullet('Pisanje beleski kao "ok", "proba", "pozvati" - uvek napisi sta je tacno bilo dogovoreno')
bullet('Nepostavljanje saglasnosti za kupce - bez saglasnosti se taj kupac ne sme slati u email kampanju')
bullet('Vise zaposlenih radi na istom leadu istovremeno - svako vidi izmene drugog tek posle osvezavanja stranice')

h3('Korisni saveti')
bullet('Koristite Dnevnu aktivnost na kraju radnog dana da pregledate sta ste uradili')
bullet('Kalendar otvarajte na pocetku svakog dana - planirajte pozive')
bullet('Posle svakog poziva odmah upisite belesku - ne ostavljajte za kasnije')
bullet('Verifikujte telefone i email-ove (prekidaci u Lead modalu) cim potvrdite da rade')
bullet('Ako trazite lead i ne nalazite ga, koristite pretragu umesto skrolovanja')

// SECTION 14
h1('14. Cesta pitanja (FAQ)')

h3('Da li mogu da koristim sistem na telefonu?')
paragraph(
  'Da. Sekcije Kupci i Dnevna aktivnost rade odlicno na telefonu. Dashboard, Kalendar i tabela leadova su optimizovani za racunar jer prikazuju vise podataka odjednom.'
)

h3('Sta ako pogresno obrisem lead?')
paragraph(
  'Brisanje lead-a je trajno - nema "Vrati nazad" opcije. Pre brisanja sistem trazi potvrdu. Ako greskom obrisete lead, javite se administratoru sto pre - mozda postoji backup.'
)

h3('Mogu li da menjam nesto sto je drugi kolega uneo?')
paragraph(
  'Da, sistem dozvoljava svim korisnicima da menjaju sve leadove. Sve izmene se belezi u Timeline aktivnosti, tako da uvek mozete videti ko je sta menjao.'
)

h3('Sta ako se sistem zaledi?')
paragraph(
  'Osvezite stranicu (F5 ili Ctrl+R). Vasa sesija ostaje aktivna 7 dana, tako da ne morate ponovo da se prijavljujete. Ako i dalje ne radi, javite se administratoru.'
)

h3('Kako da prebacim leadove iz Excel-a?')
paragraph(
  'Excel/CSV import postoji ali ga radi administrator (jednokratna operacija). Ako imate veci spisak leadova, posaljite Excel fajl administratoru.'
)

// CLOSING
h1('15. Kontakt za pomoc')

paragraph(
  'Ako naidjete na problem koji ne mozete sami da resite, javite se administratoru sistema. Pri javljanju, opisite:'
)
bullet('Sta ste pokusavali da uradite')
bullet('Sta se desilo (ili nije desilo)')
bullet('Da li ste videli neku poruku o gresci')
bullet('Da li koristite racunar ili telefon, koji pretrazivac')

spacer(6)
infoBox(
  'Ovaj vodic ce se vremenom dopunjavati. Ako primetite da nesto fali ili nije jasno, javite administratoru i mozemo ga azurirati.'
)

drawFooter()

// ---------- save ----------
const out = path.join(__dirname, 'Enza-CRM-Vodic-za-radnike.pdf')
const buf = Buffer.from(doc.output('arraybuffer'))
fs.writeFileSync(out, buf)
console.log('OK ->', out, '(', buf.length, 'bytes )')
