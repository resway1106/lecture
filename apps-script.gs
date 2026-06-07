/**
 * 奇美醫院 全院演講 — Google Sheet API
 * 部署：開啟 Sheet → 擴充功能 → Apps Script → 貼上此程式碼 → 部署為網頁應用程式
 * 詳細步驟請見 SETUP.md
 *
 * ▼ 首次設定：請在 Apps Script 編輯器選單 [執行 → setup] 跑一次，
 *   會自動建立 Years / Courses / Auth 三個工作表與標題列，
 *   並寫入一筆預設管理者 (admin / chimei2026)。
 */

const SHEET_NAMES = { YEARS: "Years", COURSES: "Courses", AUTH: "Auth" };

const SCHEMAS = {
  [SHEET_NAMES.YEARS]: {
    headers: ["year","adYear","updated","location","timeStart","timeEnd"],
    defaultRows: [
      [115, 2026, "115.06.04", "第五醫療大樓五樓國際會議廳", "07:30", "08:30"],
      [114, 2025, "114.12.15", "第五醫療大樓五樓國際會議廳", "07:30", "08:30"],
      [116, 2027, "尚未公告", "第五醫療大樓五樓國際會議廳", "07:30", "08:30"],
      [117, 2028, "尚未公告", "第五醫療大樓五樓國際會議廳", "07:30", "08:30"],
      [118, 2029, "尚未公告", "第五醫療大樓五樓國際會議廳", "07:30", "08:30"],
      [119, 2030, "尚未公告", "第五醫療大樓五樓國際會議廳", "07:30", "08:30"],
      [120, 2031, "尚未公告", "第五醫療大樓五樓國際會議廳", "07:30", "08:30"]
    ]
  },
  [SHEET_NAMES.COURSES]: {
    headers: ["id","year","date","weekday","status","topic","speaker","host","timeStart","timeEnd","poster","tags","details","note","special","skeleton"],
    defaultRows: []
  },
  [SHEET_NAMES.AUTH]: {
    headers: ["username","passwordHash","displayName"],
    defaultRows: [
      // 預設密碼 chimei2026 的 SHA-256 雜湊 — 強烈建議首次登入後立即更換
      ["admin", "da4c31ae5a3b30d9774a2c2eafac5d725d25abe4e18f6e35bc452d428ea3618c", "管理者"]
    ]
  }
};

// ============ 首次設定 (請在 Apps Script 編輯器手動執行一次) ============

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const name in SCHEMAS) ensureSheet_(ss, name);
  // 刪掉初始預設的「工作表1」(若存在且非我們建立的三張)
  const sheet1 = ss.getSheetByName("工作表1") || ss.getSheetByName("Sheet1");
  if (sheet1 && !SCHEMAS[sheet1.getName()] && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet1);
  }
  SpreadsheetApp.getUi().alert(
    "✅ 已建立 3 個工作表並寫入預設資料：\n\n" +
    "• Years：7 個年度 (114–120)\n" +
    "• Courses：空，等待新增\n" +
    "• Auth：預設管理者 admin / chimei2026\n\n" +
    "強烈建議首次登入後立即從網頁變更密碼。"
  );
}

function ensureSheet_(ss, name) {
  const schema = SCHEMAS[name];
  if (!schema) return null;
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  // 若沒有標題列 → 寫入標題列 + 預設資料
  const data = sheet.getDataRange().getValues();
  const isEmpty = data.length === 0 || data[0].every(c => c === "" || c === null);
  if (isEmpty) {
    sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
    // 標題列樣式
    const headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
    headerRange.setFontWeight("bold")
               .setBackground("#0a6b7c")
               .setFontColor("#ffffff")
               .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    // 寫入預設資料
    if (schema.defaultRows.length > 0) {
      sheet.getRange(2, 1, schema.defaultRows.length, schema.headers.length)
           .setValues(schema.defaultRows);
    }
    // 自動調整欄寬
    sheet.autoResizeColumns(1, schema.headers.length);
  } else {
    // 若已有資料但缺欄位 → 補齊缺漏的欄
    const existingHeaders = data[0].map(h => String(h).trim());
    for (let i = 0; i < schema.headers.length; i++) {
      if (existingHeaders[i] !== schema.headers[i]) {
        // 若整行標題不符 → 強制覆蓋第一列
        sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
        const headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
        headerRange.setFontWeight("bold")
                   .setBackground("#0a6b7c")
                   .setFontColor("#ffffff")
                   .setHorizontalAlignment("center");
        sheet.setFrozenRows(1);
        break;
      }
    }
  }
  return sheet;
}

// ============ 一鍵修復：把日期欄位強制改成純文字 ============
// 如果你曾經把資料匯入 Sheet 後發現日期顯示異常，請在 Apps Script 編輯器
// 選單 [執行 → fixDates] 跑一次。

function fixDates() {
  const startTime = Date.now();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tasks = [
    { sheetName: SHEET_NAMES.COURSES, cols: ["date", "timeStart", "timeEnd"] },
    { sheetName: SHEET_NAMES.YEARS,   cols: ["updated", "timeStart", "timeEnd"] }
  ];
  let fixedCount = 0;

  for (const t of tasks) {
    const sheet = ss.getSheetByName(t.sheetName);
    if (!sheet) continue;
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol === 0) continue;

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
    const targetCols = t.cols
      .map(name => ({ name, idx: headers.indexOf(name) }))
      .filter(c => c.idx !== -1);
    if (targetCols.length === 0) continue;

    // 一次讀取整張表的資料區 (大幅減少 API 呼叫)
    const range = sheet.getRange(2, 1, lastRow - 1, lastCol);
    const values = range.getValues();

    // 記憶體內轉換
    let touched = false;
    for (let r = 0; r < values.length; r++) {
      for (const { name, idx } of targetCols) {
        const v = values[r][idx];
        if (v instanceof Date) {
          values[r][idx] = formatDateCell_(name, v);
          fixedCount++;
          touched = true;
        }
      }
    }

    // 一次寫回整張表的資料區
    if (touched) range.setValues(values);

    // 一次性把目標欄位格式設為純文字 (整個工作表的最大列數)
    for (const { idx } of targetCols) {
      sheet.getRange(2, idx + 1, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat("@");
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  SpreadsheetApp.getUi().alert(
    "✅ 完成！\n\n共修復 " + fixedCount + " 個被誤判為日期的儲存格。\n" +
    "已將相關欄位強制設為純文字格式。\n\n耗時 " + elapsed + " 秒。"
  );
}

// ============ 入口 ============

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "read";
    if (action === "read") return jsonResp({ ok: true, data: readAll() });
    return jsonResp({ ok: false, error: "Unknown GET action: " + action });
  } catch (err) {
    return jsonResp({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "login") return jsonResp({ ok: true, data: login(data.passwordHash) });
    if (action === "read")  return jsonResp({ ok: true, data: readAll() });

    if (!checkAuth(data.passwordHash)) return jsonResp({ ok: false, error: "未授權" });

    switch (action) {
      case "saveCourse":   return jsonResp({ ok: true, data: saveCourse(data.course) });
      case "deleteCourse": return jsonResp({ ok: true, data: deleteCourse(data.id) });
      case "autogen":      return jsonResp({ ok: true, data: autogenYear(data.year) });
      case "saveYearMeta": return jsonResp({ ok: true, data: saveYearMeta(data.year, data.meta) });
      default: throw new Error("未知動作: " + action);
    }
  } catch (err) {
    return jsonResp({ ok: false, error: String(err.message || err) });
  }
}

function jsonResp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============ 讀取 ============

function readAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // 自動修復：若工作表或標題列缺失，自動補上
  for (const name in SCHEMAS) ensureSheet_(ss, name);

  const years   = sheetToObjects(ss.getSheetByName(SHEET_NAMES.YEARS));
  const courses = sheetToObjects(ss.getSheetByName(SHEET_NAMES.COURSES));
  const auth    = sheetToObjects(ss.getSheetByName(SHEET_NAMES.AUTH))
                    .map(r => ({ username: r.username, displayName: r.displayName || "" }));
  return { years, courses, auth };
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange().getValues();
  if (range.length < 2) return [];
  const headers = range[0].map(h => String(h).trim());
  return range.slice(1)
    .filter(row => row.some(c => c !== "" && c !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (val === null || val === undefined) val = "";
        // 修正：Google Sheet 會把 "1/16" 自動辨識為 Date 物件，這裡轉回字串
        if (val instanceof Date) val = formatDateCell_(h, val);
        if (h) obj[h] = val;
      });
      return obj;
    });
}

function formatDateCell_(headerName, d) {
  if (headerName === "date") {
    return (d.getMonth() + 1) + "/" + String(d.getDate()).padStart(2, "0");
  }
  if (headerName === "timeStart" || headerName === "timeEnd") {
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  if (headerName === "updated") {
    // 民國年.月.日 (例如 115.06.04)
    const y = d.getFullYear() - 1911;
    return y + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0");
  }
  return Utilities.formatDate(d, Session.getScriptTimeZone() || "Asia/Taipei", "yyyy-MM-dd");
}

// ============ 驗證 ============

// 把 stored 值正規化成 SHA-256 雜湊：
// - 若已是 64 字元 hex → 直接回傳
// - 否則視為明文密碼，計算其雜湊後回傳
function normalizeAuthValue_(stored) {
  const s = String(stored).trim().toLowerCase();
  if (/^[a-f0-9]{64}$/.test(s)) return s;
  return sha256Hex_(String(stored).trim());
}

function sha256Hex_(input) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  return bytes.map(b => {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? "0" + v : v;
  }).join("");
}

function login(passwordHash) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_NAMES.AUTH);
  const auth = sheetToObjects(ss.getSheetByName(SHEET_NAMES.AUTH));
  const input = String(passwordHash).toLowerCase();
  const found = auth.find(a => normalizeAuthValue_(a.passwordHash) === input);
  if (!found) throw new Error("帳號或密碼錯誤");
  return { username: found.username, displayName: found.displayName || "" };
}

function checkAuth(passwordHash) {
  if (!passwordHash) return false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const auth = sheetToObjects(ss.getSheetByName(SHEET_NAMES.AUTH));
  const input = String(passwordHash).toLowerCase();
  return auth.some(a => normalizeAuthValue_(a.passwordHash) === input);
}

// ============ 寫入：課程 ============

function saveCourse(course) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_NAMES.COURSES);
  const sheet = ss.getSheetByName(SHEET_NAMES.COURSES);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const row = headers.map(h => toCellValue(course[h]));

  const lastRow = sheet.getLastRow();
  if (course.id) {
    const ids = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat() : [];
    const idx = ids.findIndex(v => String(v) === String(course.id));
    if (idx === -1) throw new Error("找不到 id: " + course.id);
    sheet.getRange(idx + 2, 1, 1, headers.length).setValues([row]);
    return course;
  } else {
    const ids = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat() : [];
    const numericIds = ids.map(v => Number(v)).filter(v => !isNaN(v));
    const newId = (numericIds.length ? Math.max.apply(null, numericIds) : 0) + 1;
    course.id = newId;
    row[headers.indexOf("id")] = newId;
    sheet.appendRow(row);
    return course;
  }
}

function toCellValue(v) {
  if (v === undefined || v === null) return "";
  if (Array.isArray(v)) return v.join("\n");
  if (typeof v === "boolean") return v ? "yes" : "";
  return v;
}

function deleteCourse(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.COURSES);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error("沒有資料可刪除");
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const idx = ids.findIndex(v => String(v) === String(id));
  if (idx === -1) throw new Error("找不到 id: " + id);
  sheet.deleteRow(idx + 2);
  return { id };
}

// ============ 自動產出年度排程 ============

function autogenYear(year) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_NAMES.YEARS);
  ensureSheet_(ss, SHEET_NAMES.COURSES);
  const yearsData = sheetToObjects(ss.getSheetByName(SHEET_NAMES.YEARS));
  const yr = yearsData.find(y => String(y.year) === String(year));
  if (!yr) throw new Error("年度不存在: " + year);
  const adYear = Number(yr.adYear);

  const rules = [
    { weekday: 5, nth: 1, label: "五" }, // 第一個星期五
    { weekday: 3, nth: 2, label: "三" }, // 第二個星期三
    { weekday: 2, nth: 3, label: "二" }  // 第三個星期二
  ];
  const courses = [];
  for (let m = 1; m <= 12; m++) {
    for (const r of rules) {
      const d = nthWeekday(adYear, m, r.weekday, r.nth);
      courses.push({ year: year, date: m + "/" + pad2(d), weekday: r.label, status: "tba", skeleton: "yes" });
    }
  }

  const sheet = ss.getSheetByName(SHEET_NAMES.COURSES);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  const lastRow = sheet.getLastRow();
  const existingIds = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(Number).filter(v => !isNaN(v)) : [];
  let nextId = (existingIds.length ? Math.max.apply(null, existingIds) : 0) + 1;

  const rows = courses.map(c => {
    c.id = nextId++;
    return headers.map(h => toCellValue(c[h]));
  });
  if (rows.length) sheet.getRange(lastRow + 1, 1, rows.length, headers.length).setValues(rows);
  return { count: rows.length };
}

function nthWeekday(year, month, weekday, n) {
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}
function pad2(n) { return String(n).padStart(2, "0"); }

// ============ 寫入：年度設定 ============

function saveYearMeta(year, meta) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, SHEET_NAMES.YEARS);
  const sheet = ss.getSheetByName(SHEET_NAMES.YEARS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(year)) {
      headers.forEach((h, j) => {
        if (h in meta) sheet.getRange(i + 1, j + 1).setValue(meta[h]);
      });
      return { year };
    }
  }
  throw new Error("年度不存在: " + year);
}
