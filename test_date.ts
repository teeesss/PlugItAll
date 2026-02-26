import { parseDate } from './src/utils/parser.ts';

const d = parseDate("02/28");
console.log("Parsed 02/28 today:", d);

const str = "02/28";
console.log("Regex tests:");
const match = str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(\s+.*)?$/);
console.log("MM/DD/YYYY", match);
const match2 = str.match(/^(\d{1,2})[./](\d{1,2})(\s+.*)?$/);
console.log("MM/DD", match2);
