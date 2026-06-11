import { mytToUtc, getMYTInputString, formatInMYT } from './utils/dateUtils';

const inputStr = "2026-06-11T22:00";
const utcDate = mytToUtc(inputStr);
console.log("mytToUtc('2026-06-11T22:00') =", utcDate.toISOString());
console.log("getMYTInputString(utcDate) =", getMYTInputString(utcDate));
