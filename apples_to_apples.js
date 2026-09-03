function getApplesToApplesDates(currentDayOfMonth, currentMytYear, currentMytMonth) {
    // Last month calculation
    let prevYearLastMonth = currentMytYear;
    let prevMonthLastMonth = currentMytMonth - 1;
    if (prevMonthLastMonth <= 0) {
        prevMonthLastMonth = 12;
        prevYearLastMonth -= 1;
    }
    const prevMonthLastMonthStr = prevMonthLastMonth.toString().padStart(2, '0');
    const startOfLastMonthStr = `${prevYearLastMonth}-${prevMonthLastMonthStr}-01`;
    const prevMonthDaysApples = new Date(prevYearLastMonth, prevMonthLastMonth, 0).getDate();
    const applesToApplesLastMonthDay = Math.min(currentDayOfMonth, prevMonthDaysApples);
    const endOfLastMonthApplesStr = `${prevYearLastMonth}-${prevMonthLastMonthStr}-${applesToApplesLastMonthDay.toString().padStart(2, '0')}`;

    // Last week apples to apples calculation
    let startDayThisWeek = 1;
    let startOfLastWeekStr = '';
    let endOfLastWeekApplesStr = '';

    if (currentDayOfMonth >= 1 && currentDayOfMonth <= 7) {
      startDayThisWeek = 1;
      
      let prevYear = currentMytYear;
      let prevMonth = currentMytMonth - 1;
      if (prevMonth <= 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevMonthStr = prevMonth.toString().padStart(2, '0');
      startOfLastWeekStr = `${prevYear}-${prevMonthStr}-24`;
      
      const dayOffset = currentDayOfMonth - startDayThisWeek;
      const applesEndDay = 24 + dayOffset;
      endOfLastWeekApplesStr = `${prevYear}-${prevMonthStr}-${applesEndDay.toString().padStart(2, '0')}`;
    } else if (currentDayOfMonth >= 8 && currentDayOfMonth <= 15) {
      startDayThisWeek = 8;
      startOfLastWeekStr = `${currentMytYear}-${currentMytMonth.toString().padStart(2, '0')}-01`;
      const dayOffset = currentDayOfMonth - startDayThisWeek;
      const applesEndDay = 1 + dayOffset;
      endOfLastWeekApplesStr = `${currentMytYear}-${currentMytMonth.toString().padStart(2, '0')}-${applesEndDay.toString().padStart(2, '0')}`;
    } else if (currentDayOfMonth >= 16 && currentDayOfMonth <= 23) {
      startDayThisWeek = 16;
      startOfLastWeekStr = `${currentMytYear}-${currentMytMonth.toString().padStart(2, '0')}-08`;
      const dayOffset = currentDayOfMonth - startDayThisWeek;
      const applesEndDay = 8 + dayOffset;
      endOfLastWeekApplesStr = `${currentMytYear}-${currentMytMonth.toString().padStart(2, '0')}-${applesEndDay.toString().padStart(2, '0')}`;
    } else {
      startDayThisWeek = 24;
      startOfLastWeekStr = `${currentMytYear}-${currentMytMonth.toString().padStart(2, '0')}-16`;
      const dayOffset = currentDayOfMonth - startDayThisWeek;
      const applesEndDay = 16 + dayOffset;
      endOfLastWeekApplesStr = `${currentMytYear}-${currentMytMonth.toString().padStart(2, '0')}-${applesEndDay.toString().padStart(2, '0')}`;
    }

    return {
        startOfLastMonthStr,
        endOfLastMonthApplesStr,
        startOfLastWeekStr,
        endOfLastWeekApplesStr
    };
}

console.log(getApplesToApplesDates(10, 2026, 9));
console.log(getApplesToApplesDates(2, 2026, 9));
console.log(getApplesToApplesDates(30, 2026, 9));
