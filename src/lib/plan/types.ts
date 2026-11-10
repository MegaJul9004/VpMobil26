export interface Lesson {
  /** Stundennummer */
  st: number;
  beginn: string;
  ende: string;
  /** aktuelles Fach ("---" = Ausfall) */
  fa: string;
  faChanged: boolean;
  le: string;
  leChanged: boolean;
  ra: string;
  raChanged: boolean;
  /** Unterrichtsnummer (Verweis auf Unterricht/UeNr) */
  nr: string;
  info: string;
  /** Kursgruppe, z. B. "re1" (aus Unterricht/UeGr), leer = Klassenunterricht */
  group: string;
  /** ursprüngliches Fach/Lehrer laut Stundenplan (aus Unterricht) */
  origFa: string;
  origLe: string;
  /** true bei Ausfall (Fach "---" oder Info "fällt aus"/"entfällt") */
  cancelled: boolean;
}

export interface ClassDay {
  className: string;
  lessons: Lesson[];
  /** Kursliste der Klasse: Gruppe → Fach/Lehrer */
  courses: CourseInfo[];
}

export interface CourseInfo {
  /** eindeutiger Schlüssel (Gruppe oder Fach) für den Kursfilter */
  key: string;
  fach: string;
  lehrer: string;
}

export interface DayPlan {
  /** YYYYMMDD */
  date: string;
  datumPlan: string;
  zeitstempel: string;
  /** Wochen-Typ aus <woche> im XML-Kopf ("1" = A-Woche, "2" = B-Woche, oder direkt "A"/"B") */
  woche?: string;
  /** alle Klassen des Plans */
  classes: string[];
  zusatzInfo: string[];
  plans: Record<string, ClassDay>;
}

export interface WeekPlan {
  /** Montag der Woche als YYYYMMDD */
  monday: string;
  /** ISO-Kalenderwoche */
  kw: number;
  /** Ermittelte A- oder B-Woche ("A" | "B") */
  weekType: "A" | "B";
  /** Mo–Fr; null = Tag nicht verfügbar (404) */
  days: { date: string; plan: DayPlan | null }[];
}
