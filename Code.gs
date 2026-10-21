const SHEET_ID = 'TODO_FILL_SHEET_ID'
const SECRET = 'TODO_FILL_SECRET'

function doPost(e) {
  const params = (e && e.parameter) || {};
  const raw = (params.text || '').replace(/\s*\n\s*/g, ' ').trim();
  try {
    if (params.key !== SECRET) {
      console.log('Rejected: wrong or missing key');
      if (typeof logCall_ === 'function') logCall_(raw, 'unauthorized');
      return ContentService.createTextOutput('unauthorized');
    }
    if (!raw) {
      console.log('Rejected: empty text');
      if (typeof logCall_ === 'function') logCall_('', 'empty');
      return ContentService.createTextOutput('empty');
    }
    console.log('Raw: ' + raw);
    // Strip the prefix (first boilerplate sentence), then the repeated phrase
    const cleaned = raw
      .replace(/^[\s\S]*?עודכנו עבורך שיעורי-בית\.\s+/, '')
      .replace(/^עודכנו עבורך שיעורי-בית\s+/, '');
    // The text column gets only the quoted part of the cleaned text
    const textToSave = quotedText_(cleaned);
    // Pull the class (subject) and the lesson date out of
    // "...בשיעור <class> ב-<dd/mm/yyyy> בשיעור <n>"
    const classMatch = cleaned.match(/בשיעור\s+(.+?)\s+ב-(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    let className = classMatch ? classMatch[1].trim() : '';
    // The lesson date as a real Date (the stamp column displays it dd/mm);
    // null when unparseable — the insert then falls back to today's date
    const lessonDate = classMatch
      ? new Date(+classMatch[4], +classMatch[3] - 1, +classMatch[2])
      : null;

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheets()[0];
    // Class-name mapping lives in the "Mapping" tab (From | To) — data,
    // not code: adding a row there needs no redeploy
    const mapping = loadClassMapping_(ss);
    if (className && mapping[className]) className = mapping[className];

    // Learn the column order from the header row (row 1),
    // matching the lowercase, trimmed form of each header
    const lastCol = Math.max(sheet.getLastColumn(), 3);
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(h => String(h).trim().toLowerCase());
    const textCol = headers.indexOf('text') + 1;
    const doneCol = headers.indexOf('done') + 1;
    const classCol = headers.indexOf('class') + 1;  // optional column
    // Stamp goes into 'date' if present, else into 'due date'
    const dateCol = headers.indexOf('date') + 1;
    const dueCol = headers.indexOf('due date') + 1;
    const dueDayCol = headers.indexOf('due day') + 1;  // optional column
    const stampCol = dateCol || dueCol;
    if (!textCol || !doneCol || !stampCol) {
      console.log('Error: header row must contain: text, done, and date (or due date)');
      if (typeof logCall_ === 'function') logCall_(raw, 'error: missing header column');
      return ContentService.createTextOutput('error: missing header column');
    }

    // Due date = the next lesson of the same class (from the "Timetable"
    // tab); falls back to the next school day when the class isn't found
    const baseDate = lessonDate || new Date();
    const dueDate = computeDueDate_(ss, baseDate, className);

    sheet.insertRowsBefore(2, 1);  // new row just under the header
    // Real date value, displayed as dd/MM — sorts chronologically.
    // Uses the lesson date pulled from the notification text when found,
    // otherwise today (the arrival date)
    sheet.getRange(2, stampCol).setValue(baseDate).setNumberFormat('dd/mm');
    if (dueCol && dueCol !== stampCol) {
      sheet.getRange(2, dueCol).setValue(dueDate).setNumberFormat('dd/mm');
    }
    if (dueDayCol) {
      const dayNames = ['יום א', 'יום ב', 'יום ג', 'יום ד', 'יום ה', 'יום ו', 'יום שבת'];
      sheet.getRange(2, dueDayCol).setValue(dayNames[dueDate.getDay()]);
    }
    sheet.getRange(2, textCol).setValue(textToSave);
    if (classCol) sheet.getRange(2, classCol).setValue(className);
    sheet.getRange(2, doneCol).insertCheckboxes();
    console.log('Inserted row: ' + textToSave);

    // Sort all data rows: Done (false first, then true), then due date
    sortHomeworkRows_(sheet);
    if (typeof logCall_ === 'function') logCall_(raw, 'ok: ' + cleaned);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    console.log('Error: ' + err.message);
    if (typeof logCall_ === 'function') logCall_(raw, 'error: ' + err.message);
    return ContentService.createTextOutput('error: ' + err.message);
  }
}

function sortHomeworkRows_(sheet) {
  if (sheet.getLastRow() <= 2) return;
  const lastCol = Math.max(sheet.getLastColumn(), 3);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(h => String(h).trim().toLowerCase());
  const doneCol = headers.indexOf('done') + 1;
  const dueCol = headers.indexOf('due date') + 1;
  const dateCol = headers.indexOf('date') + 1;
  const sortDateCol = dueCol || dateCol;
  if (!doneCol || !sortDateCol) return;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).sort([
    { column: doneCol, ascending: true },
    { column: sortDateCol, ascending: true }
  ]);
}

// Reads the "Mapping" tab (row 1 = headers From | To, then one mapping per
// row) into an object. A built-in default covers geometry -> math even
// before the tab exists; rows in the tab override it.
function loadClassMapping_(ss) {
  const mapping = { 'גאומטריה': 'מתמטיקה', 'שבילי מורשת': 'מורשת' };
  const tab = ss.getSheetByName('Mapping');
  if (!tab || tab.getLastRow() < 2) return mapping;
  tab.getRange(2, 1, tab.getLastRow() - 1, 2).getValues().forEach(row => {
    const from = String(row[0]).trim();
    const to = String(row[1]).trim();
    if (from && to) mapping[from] = to;
  });
  return mapping;
}

function classWeekdays_(ss, className) {
  if (!className) return null;
  const tab = ss.getSheetByName('Timetable');
  if (!tab) return null;
  const values = tab.getDataRange().getValues();
  if (values.length < 2) return null;
  const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayNamesHe = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
  const colDay = {};
  values[0].forEach((h, c) => {
    const name = String(h).trim();
    let idx = dayNamesEn.indexOf(name.toLowerCase());
    if (idx === -1) idx = dayNamesHe.indexOf(name);
    if (idx !== -1) colDay[c] = idx;
  });
  const days = [];
  for (let r = 1; r < values.length; r++) {
    for (const c in colDay) {
      if (String(values[r][c] || '').indexOf(className) !== -1 && days.indexOf(colDay[c]) === -1) {
        days.push(colDay[c]);
      }
    }
  }
  return days.length ? days : null;
}


// The first date strictly after fromDate whose weekday has a lesson of
// className in the Timetable; if the class isn't in the timetable, the
// next school day (Saturday is never a school day).
function computeDueDate_(ss, fromDate, className) {
  const classDays = classWeekdays_(ss, className);
  const due = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  for (let i = 0; i < 14; i++) {
    due.setDate(due.getDate() + 1);
    if (due.getDay() === 6) continue;  // Saturday — no school
    if (!classDays || classDays.indexOf(due.getDay()) !== -1) return due;
  }
  return due;
}


function doGet() {
  return ContentService.createTextOutput('WebTop logger is running');
}

function quotedText_(cleaned) {
  const marks = ['"', "''", '״'];
  for (const mark of marks) {
    const first = cleaned.indexOf(mark);
    if (first === -1) continue;
    const last = cleaned.lastIndexOf(mark);
    if (last > first) return cleaned.slice(first + mark.length, last).trim();
  }
  return cleaned;
}


function testDoPost() {
  // const short_msg_text = '"שרטוט מפת העיר הרצליה וסימון 6 מקומות שאני אוהב.ת בעיר. מי שלא השלים בכיתה-מסיים בבית" בשיעור שבילי מורשת ב-19/10/2026 בשיעור 4'
  const short_msg_text = '"עמ 150-151" בשיעור גאומטריה ב-19/10/2026 בשיעור 3';
  const msg_text = short_msg_text;
  const fake = {
    parameter: {
      key: SECRET,
      text: msg_text
    }
  };
  Logger.log(doPost(fake).getContent());
}


