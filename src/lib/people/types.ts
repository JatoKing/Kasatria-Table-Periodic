/** One row of the sheet, i.e. one tile in the visualisation. */
export interface Person {
  /** Stable id derived from the sheet row, e.g. "row-2". */
  id: string;
  name: string;
  photoUrl: string | null;
  age: number | null;
  /** Country code as written in the sheet, e.g. "MY". */
  country: string;
  interest: string;
  /** In US dollars. */
  netWorth: number;
}

export interface PeopleData {
  people: Person[];
  /** Sheet row numbers that were left out because the name or net worth was missing or invalid. */
  skippedRows: number[];
}
