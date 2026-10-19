// GYM BUDDY – Trainings- und Ernährungsdaten.
// Übungen, Wiederholungen oder Gerichte hier anpassen. Fortschritt bleibt erhalten,
// solange die "id" einer Übung gleich bleibt.

const ONE_ARM_HINT = 'Links beginnen. Rechts nur so viele Wdh. wie links.';

const yt = (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);

const WARMUP = { id: 'warmup', name: 'Aufwärmen am Kabelzug', detail: '5 Min. locker: Rudern, Face Pulls, Seitheben mit wenig Gewicht' };

// Tag 1 = Montag … 0 = Sonntag (wie JavaScript getDay())
const PLAN = {
  1: {
    title: 'Push', focus: 'Brust, Schultern, Trizeps',
    exercises: [
      { id: 'bench', name: 'Bankdrücken (Langhantel)', reps: '6–8', rest: '90 s',
        tips: ['Schulterblätter zusammen und nach unten ziehen, Füsse fest am Boden.', 'Stange kontrolliert zur unteren Brust senken, Ellbogen ca. 45–60° vom Körper.', 'Ohne Spotter: Sicherheitsablagen im Rack knapp unter Brusthöhe einstellen.'],
        demo: yt('Bankdrücken Langhantel richtige Ausführung') },
      { id: 'incline-db', name: 'Schrägbankdrücken (Kurzhanteln)', reps: '8–10', rest: '90 s',
        tips: ['Bank auf ca. 30° stellen.', 'Hanteln bis auf Brusthöhe senken, Ellbogen leicht unter den Händen.', 'Oben nicht zusammenschlagen, Spannung halten.'],
        demo: yt('Schrägbankdrücken Kurzhantel Ausführung') },
      { id: 'db-press', name: 'Schulterdrücken sitzend (Kurzhanteln)', reps: '8–10', rest: '90 s',
        tips: ['Rücken an der Lehne, Bauch fest, kein starkes Hohlkreuz.', 'Hanteln bis etwa Ohrhöhe senken, gerade nach oben drücken.', 'Kopf neutral lassen, nicht nach vorne schieben.'],
        demo: yt('Schulterdrücken Kurzhantel sitzend Ausführung') },
      { id: 'cable-lateral-1', name: 'Seitheben am Kabel, einarmig', reps: '12–15', rest: '60 s', oneArm: true,
        tips: ['Kabel auf unterster Stufe, seitlich zum Turm, Griff in der äusseren Hand.', 'Arm leicht gebeugt bis Schulterhöhe heben, nicht höher.', 'Langsam ablassen (2–3 Sek.), kein Schwung aus dem Oberkörper.'],
        demo: yt('single arm cable lateral raise form') },
      { id: 'tri-pushdown-1', name: 'Trizepsdrücken am Kabel, einarmig', reps: '12–15', rest: '60 s', oneArm: true,
        tips: ['Oberarm bleibt eng am Körper und bewegt sich nicht.', 'Unten ganz durchstrecken und kurz halten.', 'Kontrolliert zurück bis ca. 90° im Ellbogen.'],
        demo: yt('single arm cable tricep pushdown form') },
      { id: 'cable-fly', name: 'Kabel-Flys', reps: '12–15', rest: '60 s',
        tips: ['Kabel auf Brusthöhe, ein Schritt nach vorn, leichte Vorlage.', 'Arme leicht gebeugt in einem Bogen vor der Brust zusammenführen.', 'Dehnung kontrolliert, nicht in die Schulter fallen lassen.'],
        demo: yt('Kabel Flys Brust richtige Ausführung') },
    ],
  },
  2: {
    title: 'Pull', focus: 'Rücken, hintere Schultern, Bizeps',
    exercises: [
      { id: 'lat-pulldown', name: 'Latzug', reps: '8–10', rest: '90 s',
        tips: ['Griff etwas breiter als schulterbreit, Brust raus.', 'Stange zur oberen Brust ziehen, Ellbogen nach unten und hinten.', 'Nicht zurückschaukeln, oben kontrolliert strecken.'],
        demo: yt('Latzug richtige Ausführung') },
      { id: 'db-row-1', name: 'Kurzhantelrudern, einarmig', reps: '8–10', rest: '60 s', oneArm: true,
        tips: ['Knie und Hand derselben Seite auf der Bank, Rücken gerade.', 'Hantel Richtung Hüfte ziehen, nicht zur Schulter.', 'Unten ganz strecken, Oberkörper nicht aufdrehen.'],
        demo: yt('Kurzhantelrudern einarmig Ausführung') },
      { id: 'seated-row', name: 'Kabelrudern sitzend', reps: '10–12', rest: '90 s',
        tips: ['Aufrecht sitzen, Brust raus, Knie leicht gebeugt.', 'Griff zum Bauch ziehen, Schulterblätter zusammen.', 'Oberkörper ruhig, kein Schwung nach hinten.'],
        demo: yt('Kabelrudern sitzend richtige Ausführung') },
      { id: 'face-pull', name: 'Face Pulls (Seil)', reps: '12–15', rest: '60 s',
        tips: ['Seil auf Kopfhöhe, Daumen zeigen nach hinten.', 'Seil Richtung Stirn ziehen und die Hände auseinander nehmen.', 'Leichtes Gewicht, sauber und kontrolliert.'],
        demo: yt('face pull richtige Ausführung') },
      { id: 'db-curl-1', name: 'Kurzhantel-Curl, einarmig', reps: '10–12', rest: '60 s', oneArm: true,
        tips: ['Ellbogen bleibt seitlich am Körper.', 'Handfläche nach oben drehen, oben kurz anspannen.', 'Langsam ablassen, kein Schwung aus dem Rücken.'],
        demo: yt('Bizeps Curl Kurzhantel einarmig Ausführung') },
      { id: 'rope-hammer', name: 'Hammer-Curls am Kabel (Seil)', reps: '12', rest: '60 s',
        tips: ['Daumen zeigen nach oben, Ellbogen fix.', 'Seil bis knapp vor die Schultern ziehen.', 'Kontrolliert ablassen.'],
        demo: yt('cable rope hammer curl form') },
    ],
  },
  3: {
    title: 'Legs', focus: 'Beine, Fokus Kniebeuge und Beinpresse',
    exercises: [
      { id: 'squat', name: 'Kniebeuge (Langhantel)', reps: '6–8', rest: '90 s',
        tips: ['Stange auf dem oberen Rücken, Füsse schulterbreit, Zehen leicht nach aussen.', 'Tief einatmen, Bauch fest, Knie folgen den Zehen.', 'So tief wie mit geradem Rücken möglich, über die ganze Fusssohle hochdrücken. Sicherheitsablagen einstellen.'],
        demo: yt('Kniebeuge Langhantel richtige Ausführung') },
      { id: 'leg-press', name: 'Beinpresse', reps: '10–12', rest: '90 s',
        tips: ['Füsse schulterbreit in der Mitte der Platte.', 'Senken bis ca. 90° im Knie, unterer Rücken bleibt am Polster.', 'Oben die Knie nicht ganz durchdrücken.'],
        demo: yt('Beinpresse richtige Ausführung') },
      { id: 'walking-lunge', name: 'Ausfallschritte gehend (Kurzhanteln)', reps: '10 pro Bein', rest: '90 s',
        tips: ['Grosser Schritt, hinteres Knie Richtung Boden.', 'Oberkörper aufrecht, vorderes Knie über dem Fuss.', 'Über die vordere Ferse hochdrücken.'],
        demo: yt('Ausfallschritte gehend Kurzhantel Ausführung') },
      { id: 'leg-curl', name: 'Beinbeuger (Maschine)', reps: '10–12', rest: '60 s',
        tips: ['Drehachse der Maschine auf Höhe der Knie einstellen.', 'Fersen kontrolliert Richtung Gesäss ziehen.', 'Langsam zurück, Hüfte bleibt am Polster.'],
        demo: yt('Beinbeuger Maschine Ausführung') },
      { id: 'calf-raise', name: 'Wadenheben', reps: '12–15', rest: '60 s',
        tips: ['Ganz nach oben auf die Zehen, oben 1 Sek. halten.', 'Unten tief dehnen.', 'Langsames Tempo statt Wippen.'],
        demo: yt('Wadenheben richtige Ausführung') },
      { id: 'suitcase-carry-1', name: 'Suitcase Carry, einarmig', reps: '30 m pro Seite', rest: '60 s', oneArm: true,
        tips: ['Schwere Kurzhantel in einer Hand, aufrecht stehen.', 'Nicht zur Seite kippen, Bauch fest, Schulter unten.', 'Ruhige, kurze Schritte.'],
        demo: yt('suitcase carry form') },
    ],
  },
  4: {
    title: 'Upper', focus: 'Oberkörper komplett, etwas leichter, mehr Wdh.', flexible: true,
    exercises: [
      { id: 'db-bench', name: 'Bankdrücken (Kurzhanteln)', reps: '10–12', rest: '60 s',
        tips: ['Schulterblätter zusammen, Füsse fest am Boden.', 'Hanteln bis auf Brusthöhe senken.', 'Gleichmässig hochdrücken, oben nicht zusammenschlagen.'],
        demo: yt('Bankdrücken Kurzhantel richtige Ausführung') },
      { id: 'cable-row-1', name: 'Kabelrudern stehend, einarmig', reps: '12', rest: '60 s', oneArm: true,
        tips: ['Kabel auf Brusthöhe, versetzte Schrittstellung.', 'Griff zur Hüfte ziehen, Schulterblatt nach hinten.', 'Oberkörper dreht nicht mit.'],
        demo: yt('single arm cable row standing form') },
      { id: 'machine-press', name: 'Schulterdrücken (Maschine)', reps: '10–12', rest: '60 s',
        tips: ['Sitz so einstellen, dass die Griffe auf Schulterhöhe starten.', 'Gerade nach oben drücken, Rücken an der Lehne.', 'Kontrolliert zurück, nicht abprallen lassen.'],
        demo: yt('Schulterdrücken Maschine Ausführung') },
      { id: 'close-pulldown', name: 'Latzug enger Griff', reps: '10–12', rest: '60 s',
        tips: ['Enger Griff (V-Griff oder Untergriff), Brust raus.', 'Zur oberen Brust ziehen, Ellbogen eng am Körper.', 'Oben ganz strecken.'],
        demo: yt('Latzug enger Griff Ausführung') },
      { id: 'cable-curl-1', name: 'Kabel-Curl, einarmig', reps: '12–15', rest: '60 s', oneArm: true,
        tips: ['Kabel auf unterster Stufe, Ellbogen fix an der Seite.', 'Hoch bis zur Schulter, oben anspannen.', 'Langsam ablassen.'],
        demo: yt('single arm cable curl form') },
      { id: 'rope-pushdown', name: 'Trizepsdrücken am Seil', reps: '12–15', rest: '60 s',
        tips: ['Oberarme eng am Körper.', 'Unten das Seil leicht auseinander ziehen.', 'Kontrolliert zurück bis ca. 90°.'],
        demo: yt('Trizepsdrücken Seil Kabelzug Ausführung') },
    ],
  },
  5: {
    title: 'Lower', focus: 'Hüfte, hintere Kette (RDL, Hip Thrust) und Rumpf',
    exercises: [
      { id: 'rdl', name: 'Rumänisches Kreuzheben (RDL)', reps: '8–10', rest: '90 s',
        tips: ['Stange nah am Körper, Knie leicht gebeugt.', 'Hüfte nach hinten schieben, Rücken bleibt gerade.', 'Runter bis zur Dehnung hinten im Oberschenkel, dann Hüfte nach vorne.'],
        demo: yt('Rumänisches Kreuzheben richtige Ausführung') },
      { id: 'hip-thrust', name: 'Hip Thrust (Langhantel)', reps: '8–10', rest: '90 s',
        tips: ['Oberer Rücken an der Bank, Stange mit Polster auf der Hüfte.', 'Kinn leicht zur Brust, Hüfte hoch bis Oberkörper und Oberschenkel eine Linie bilden.', 'Oben Gesäss anspannen, nicht ins Hohlkreuz.'],
        demo: yt('Hip Thrust Langhantel richtige Ausführung') },
      { id: 'bss', name: 'Bulgarian Split Squat (Kurzhanteln)', reps: '8–10 pro Bein', rest: '90 s',
        tips: ['Hinterer Fuss auf der Bank, vorderer Fuss weit genug vorne.', 'Gerade nach unten senken.', 'Über die vordere Ferse hochdrücken.'],
        demo: yt('Bulgarian Split Squat richtige Ausführung') },
      { id: 'back-ext', name: 'Rückenstrecker (Hyperextension)', reps: '12–15', rest: '60 s',
        tips: ['Hüfte an der Polsterkante, Rücken neutral.', 'Aus der Hüfte runter und hoch, bis der Körper eine Linie bildet.', 'Oben nicht überstrecken.'],
        demo: yt('Hyperextension Rückenstrecker Ausführung') },
      { id: 'pallof-1', name: 'Pallof Press, einseitig', reps: '10 pro Seite', rest: '60 s', oneArm: true,
        tips: ['Kabel auf Brusthöhe, seitlich zum Turm stehen.', 'Griff vor der Brust, Arme gerade nach vorne drücken, 2 Sek. halten.', 'Der Körper darf sich nicht zum Kabel drehen.'],
        demo: yt('pallof press form') },
      { id: 'cable-crunch', name: 'Kabel-Crunch', reps: '12–15', rest: '60 s',
        tips: ['Kniend, Seil neben dem Kopf.', 'Rumpf einrollen, Ellbogen Richtung Knie.', 'Hüfte bleibt ruhig, die Bewegung kommt aus dem Bauch.'],
        demo: yt('Kabel Crunch richtige Ausführung') },
    ],
  },
  6: { title: 'Schwimmen / Cardio', focus: 'Locker, Erholung', cardio: true },
  0: { title: 'Schwimmen / Cardio', focus: 'Locker, Erholung', cardio: true },
};

// Mittag: Sonntag vorgekocht für Mo–Mi, Mittwochabend für Do–Fr.
// Abend: für zwei gekocht. Mengen sind Gesamtmengen, deine Portion ist die Hälfte
// (bei Vorkoch-Gerichten steht, wie viele Portionen entstehen).
// Eiweiss = grober Richtwert für DEINE Portion.

const RECIPES = {
  shake: {
    protein: 25,
    ingredients: ['1 Portion Isoclear laut Packung', '300–400 ml kaltes Wasser'],
    steps: ['Pulver und Wasser in den Shaker, 20 Sek. kräftig schütteln.', 'Direkt nach dem Training trinken.'],
    note: 'Eiweiss pro Portion steht auf der Packung, meist 20–25 g.',
  },
  quark: {
    protein: 30,
    ingredients: ['250 g Magerquark', '100 g Beeren (frisch oder tiefgekühlt)', 'höchstens 1 TL Honig'],
    steps: ['Quark glatt rühren, Beeren darüber, Honig nach Bedarf.', 'Tiefgekühlte Beeren am Morgen in die Box legen, bis Nachmittag sind sie aufgetaut.'],
  },
  'poulet-reis': {
    protein: 50, serves: '5 Portionen: 2 fürs Abendessen, 3 Boxen fürs Mittag Mo–Mi',
    ingredients: ['1 kg Pouletbrust', '375 g Reis (roh)', '1 kg Gemüse: Brokkoli, Peperoni, Zucchetti', '2 EL Olivenöl', 'Salz, Pfeffer, Paprika, Knoblauchpulver'],
    steps: ['Reis nach Packung kochen (ca. 15–18 Min.).', 'Ofen auf 200 °C. Gemüse klein schneiden, mit 1 EL Öl und Salz aufs Blech, 20 Min. backen.', 'Poulet in Würfel schneiden, würzen, in der Pfanne mit 1 EL Öl 6–8 Min. braten, bis es innen nicht mehr rosa ist.', 'Pro Box: ca. 200 g Poulet, 1 Schöpfer Reis, 1/5 vom Gemüse. Auskühlen lassen, dann in den Kühlschrank.'],
    note: 'Pro Portion: 200 g Poulet (roh gewogen), 75 g Reis (roh), 200 g Gemüse.',
  },
  'poulet-reis-box': {
    protein: 50,
    ingredients: ['1 Box Poulet, Reis und Gemüse vom Sonntag'],
    steps: ['Deckel leicht offen, 2–3 Min. in die Mikrowelle.', 'Umrühren, nochmals 1 Min., bis alles heiss ist.'],
  },
  chili: {
    protein: 45, serves: '4 Portionen: 2 fürs Abendessen, 2 Boxen fürs Mittag Do–Fr',
    ingredients: ['800 g Rindshackfleisch (mager)', '1 Dose Kidneybohnen (400 g, abgetropft)', '2 Dosen gehackte Tomaten (800 g)', '2 Peperoni', '1 Zwiebel, 2 Knoblauchzehen', '1 EL Olivenöl', '2 TL Paprika, 1 TL Kreuzkümmel, Chili nach Geschmack, Salz, Pfeffer', '300 g Reis (roh)'],
    steps: ['Zwiebel, Knoblauch und Peperoni klein schneiden.', 'Hack im grossen Topf mit Öl krümelig anbraten (ca. 6 Min.), Zwiebel und Knoblauch 2 Min. mitbraten.', 'Peperoni, Tomaten und Gewürze dazu, 20 Min. leise köcheln lassen.', 'Bohnen dazu, nochmals 5 Min. Abschmecken.', 'Reis nach Packung kochen. 2 Boxen abfüllen, auskühlen, Kühlschrank.'],
    note: 'Pro Portion: 200 g Hack (roh), 75 g Reis (roh).',
  },
  'chili-box': {
    protein: 45,
    ingredients: ['1 Box Chili con Carne vom Mittwoch'],
    steps: ['Deckel leicht offen, 2–3 Min. in die Mikrowelle.', 'Umrühren, nochmals 1 Min., bis alles heiss ist.'],
  },
  lachs: {
    protein: 38,
    ingredients: ['2 Lachsfilets à ca. 180 g', '800 g Kartoffeln', '500 g Brokkoli', '1 EL Olivenöl', '1 Zitrone, Salz, Pfeffer'],
    steps: ['Ofen auf 200 °C. Kartoffeln in Spalten schneiden, mit Öl und Salz aufs Blech, 20 Min. backen.', 'Lachs würzen, aufs Blech dazulegen, weitere 12–15 Min.', 'Brokkoli in Röschen 6 Min. im Dampf oder in Salzwasser garen.', 'Mit Zitrone servieren.'],
  },
  wraps: {
    protein: 60,
    ingredients: ['500 g Pouletbrust', '4 Wraps (Vollkorn)', '2 Peperoni', '1 Salat (Romana oder Eisberg)', '50 g geriebener Käse', 'Sauce: 200 g Joghurt nature, 1 Knoblauchzehe, Salz, Kräuter'],
    steps: ['Joghurt mit gepresstem Knoblauch, Salz und Kräutern verrühren.', 'Poulet in Streifen, würzen, 6–8 Min. in der Pfanne braten.', 'Peperoni in Streifen, Salat schneiden.', 'Wraps 20 Sek. in der trockenen Pfanne wärmen, füllen, rollen.'],
  },
  'crevetten-pasta': {
    protein: 55,
    ingredients: ['400 g Crevetten (geschält)', '200 g Pasta (roh)', '2 Zucchetti', '100 g frischer Spinat', '2 Knoblauchzehen', '1 EL Olivenöl', '50 g Parmesan', '1/2 Zitrone, Salz, Pfeffer, Chili nach Wunsch'],
    steps: ['Pasta in Salzwasser nach Packung kochen.', 'Zucchetti in Würfel, mit Öl 4 Min. anbraten, Knoblauch dazu.', 'Crevetten dazu, 3–4 Min. braten, bis sie rosa sind.', 'Spinat und Pasta untermischen, mit Zitrone, Salz und Parmesan abschmecken.'],
  },
  'hack-bowl': {
    protein: 60,
    ingredients: ['500 g Rindshackfleisch (mager)', '600 g Süsskartoffeln', '1 Salat', '1 Peperoni', '200 g Hüttenkäse', '1 EL Olivenöl', 'Paprika, Salz, Pfeffer'],
    steps: ['Ofen auf 200 °C. Süsskartoffeln in Würfel, mit Öl und Salz 25 Min. backen.', 'Hack krümelig anbraten (ca. 6 Min.), mit Paprika, Salz, Pfeffer würzen.', 'Salat und Peperoni schneiden.', 'In 2 Schalen anrichten, Hüttenkäse obendrauf.'],
  },
  schweinsfilet: {
    protein: 55,
    ingredients: ['500 g Schweinsfilet', '150 g Reis (roh)', '250 g Champignons', '1 Zwiebel', '1 EL Olivenöl', '100 ml Bouillon, 2 EL Halbrahm', 'Salz, Pfeffer'],
    steps: ['Reis nach Packung kochen.', 'Filet in 2 cm dicke Medaillons, würzen, pro Seite 3 Min. braten, warm stellen.', 'Zwiebel und Pilze in der gleichen Pfanne 5 Min. braten.', 'Bouillon und Rahm dazu, 2 Min. einkochen, Medaillons zurück in die Sauce.'],
  },
  ruehrei: {
    protein: 40,
    ingredients: ['4 Eier', '150 g Hüttenkäse', '1 Peperoni', '1 Scheibe Brot', 'Salz, Pfeffer'],
    steps: ['Peperoni klein schneiden, 2 Min. anbraten.', 'Eier verquirlen, in die Pfanne, bei mittlerer Hitze rühren, bis sie fest sind.', 'Mit Hüttenkäse und Brot essen.'],
    note: 'Nur für dich gerechnet (1 Portion).',
  },
  omelette: {
    protein: 35,
    ingredients: ['4 Eier', '100 g frischer Spinat', '30 g geriebener Käse', '1 Scheibe Brot', 'Salz, Pfeffer'],
    steps: ['Spinat in der Pfanne 1 Min. zusammenfallen lassen.', 'Verquirlte Eier darüber, 3–4 Min. bei mittlerer Hitze stocken lassen.', 'Käse drauf, zusammenklappen.'],
    note: 'Nur für dich gerechnet (1 Portion).',
  },
};

const MEALS = {
  1: { lunch: 'Poulet mit Reis und Gemüse (vom Sonntag)', lunchR: 'poulet-reis-box', dinner: 'Lachs mit Kartoffeln und Brokkoli', dinnerR: 'lachs' },
  2: { lunch: 'Poulet mit Reis und Gemüse (vom Sonntag)', lunchR: 'poulet-reis-box', dinner: 'Poulet-Wraps mit Peperoni, Salat und Joghurtsauce', dinnerR: 'wraps' },
  3: { lunch: 'Poulet mit Reis und Gemüse (vom Sonntag)', lunchR: 'poulet-reis-box', dinner: 'Chili con Carne mit Reis, doppelte Menge (Rest fürs Mittag Do–Fr)', dinnerR: 'chili' },
  4: { lunch: 'Chili con Carne (vom Mittwoch)', lunchR: 'chili-box', dinner: 'Crevetten-Pasta mit Zucchetti und Spinat', dinnerR: 'crevetten-pasta' },
  5: { lunch: 'Chili con Carne (vom Mittwoch)', lunchR: 'chili-box', dinner: 'Hackfleisch-Bowl mit Süsskartoffeln und Salat', dinnerR: 'hack-bowl' },
  6: { lunch: 'Rührei mit Hüttenkäse', lunchR: 'ruehrei', dinner: 'Schweinsfilet mit Reis und Pilzen', dinnerR: 'schweinsfilet' },
  0: { lunch: 'Omelette mit Spinat und Käse', lunchR: 'omelette', dinner: 'Poulet mit Reis und Gemüse, grosse Menge (3 Boxen fürs Mittag Mo–Mi)', dinnerR: 'poulet-reis' },
};

const PREP = {
  0: 'Heute vorkochen: Mittagessen für Montag bis Mittwoch.',
  3: 'Heute Abend vorkochen: Mittagessen für Donnerstag und Freitag.',
};
