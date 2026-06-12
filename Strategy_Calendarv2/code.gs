// ============================================================
// Code.gs - ระบบจองห้องประชุม กยผ.
// Backend Google Apps Script
// ============================================================

// ฟังก์ชันสำหรับแสดงหน้าเว็บ
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ระบบจองห้องประชุม กยผ.')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// ฟังก์ชันสำหรับบันทึกการจอง
// ============================================================
function saveReservation(data) {
  try {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reservations');

    // ถ้าไม่มีชีท Reservations ให้สร้างใหม่
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Reservations');
      // เพิ่มหัวคอลัมน์ (มี ID + หัวข้อการประชุม)
      sheet.getRange(1, 1, 1, 8).setValues([
        ['ID', 'วันที่', 'ชื่อห้องที่ต้องการจอง', 'เวลาเริ่มจอง', 'เวลาจบ', 'ชื่อผู้จอง', 'กลุ่ม', 'หัวข้อการประชุม']
      ]);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
      sheet.setColumnWidth(1, 150);
      sheet.setColumnWidth(8, 200);
    }

    // ถ้ามี ID แสดงว่าเป็นการแก้ไข - ลบอันเดิมแล้วสร้างใหม่
    if (data.id) {
      const allData = sheet.getDataRange().getValues();
      for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] === data.id) {
          // ลบแถวเดิม
          sheet.deleteRow(i + 1);
          break;
        }
      }
      // สร้างใหม่ด้วย ID ใหม่
      const newReservationId = 'RES-' + new Date().getTime();
      const lastRow = sheet.getLastRow();
      const nextRow = lastRow + 1;

      sheet.getRange(nextRow, 1, 1, 8).setValues([[
        newReservationId,
        data.date,
        data.room,
        data.startTime,
        data.endTime,
        data.name,
        data.group,
        data.topic || ''
      ]]);

      return {
        success: true,
        message: 'แก้ไขการจองเรียบร้อยแล้ว'
      };
    }

    // สร้างใหม่
    const reservationId = 'RES-' + new Date().getTime();
    const lastRow = sheet.getLastRow();
    const nextRow = lastRow + 1;

    sheet.getRange(nextRow, 1, 1, 8).setValues([[
      reservationId,
      data.date,
      data.room,
      data.startTime,
      data.endTime,
      data.name,
      data.group,
      data.topic || ''
    ]]);

    return {
      success: true,
      message: 'บันทึกการจองเรียบร้อยแล้ว',
      id: reservationId
    };

  } catch (error) {
    return {
      success: false,
      message: 'เกิดข้อผิดพลาด: ' + error.toString()
    };
  }
}

// ============================================================
// ฟังก์ชันยกเลิกการจอง
// ============================================================
function cancelReservation(reservationId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reservations');
    if (!sheet) {
      return { success: false, message: 'ไม่พบข้อมูลการจอง' };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: false, message: 'ไม่พบข้อมูลการจอง' };
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();

    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(reservationId).trim()) {
        sheet.deleteRow(i + 2);
        return { success: true, message: 'ยกเลิกการจองเรียบร้อยแล้ว' };
      }
    }

    return { success: false, message: 'ไม่พบรายการจองที่ต้องการยกเลิก' };

  } catch (error) {
    return {
      success: false,
      message: 'เกิดข้อผิดพลาด: ' + error.toString()
    };
  }
}

// ============================================================
// ฟังก์ชันดึงการจองทั้งหมดในเดือนที่กำหนด (สำหรับ Calendar)
// ============================================================
function getReservationsByMonth(year, month) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reservations');
    if (!sheet) return [];

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const reservations = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row[0] || !row[1]) continue;

      const rowDate = new Date(row[1]);
      if (isNaN(rowDate.getTime())) continue;

      if (rowDate.getFullYear() === year && (rowDate.getMonth() + 1) === month) {
        reservations.push({
          id: String(row[0]),
          date: formatDate(rowDate),
          room: String(row[2]).trim(),
          startTime: formatTimeValue(row[3]),
          endTime: formatTimeValue(row[4]),
          name: String(row[5]),
          group: String(row[6]),
          topic: String(row[7] || '')
        });
      }
    }

    return reservations;

  } catch (error) {
    console.error('Error getReservationsByMonth:', error);
    return [];
  }
}

// ============================================================
// ฟังก์ชันดึงข้อมูลการจองตามวันที่และห้อง
// ============================================================
function getReservationsByDateAndRoom(date, room) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reservations');
    if (!sheet) return [];

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return [];

    const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const reservations = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row[1] || !row[2] || row[3] === '' || row[4] === '') continue;

      const rowDate = formatDate(new Date(row[1]));
      const roomName = String(row[2]).trim();

      if (rowDate === date && roomName === room) {
        reservations.push({
          id: String(row[0]),
          date: rowDate,
          room: roomName,
          startTime: formatTimeValue(row[3]),
          endTime: formatTimeValue(row[4]),
          name: String(row[5]),
          group: String(row[6]),
          topic: String(row[7] || '')
        });
      }
    }

    return reservations;

  } catch (error) {
    console.error('Error getReservationsByDateAndRoom:', error);
    return [];
  }
}

// ============================================================
// ฟังก์ชันดึง time slots ทั้งหมด (เริ่ม 8:00 ถึง 17:00 ทุก 30 นาที)
// ไม่กรองช่วงที่จองแล้ว เพื่อให้จองซ้ำได้
// ============================================================
function getAvailableTimeSlots(date, room) {
  try {
    const allSlots = [];
    for (let hour = 8; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 17 && minute > 0) break;
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        allSlots.push(time);
      }
    }
    return allSlots;
  } catch (error) {
    console.error('Error getAvailableTimeSlots:', error);
    return [];
  }
}

// ============================================================
// ฟังก์ชันดึงเวลาสิ้นสุดที่เป็นไปได้ (หลังจาก startTime จนถึง 17:30)
// ไม่จำกัดตามการจองที่มีอยู่ เพื่อให้จองซ้ำได้
// ============================================================
function getAvailableEndTimes(date, room, startTime) {
  try {
    if (!startTime || typeof startTime !== 'string') return [];

    const startMinutes = timeToMinutes(startTime);
    const allSlots = [];

    for (let hour = 8; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 8 && minute === 0) continue;
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        if (timeToMinutes(time) > startMinutes) {
          allSlots.push(time);
        }
      }
    }

    return allSlots;

  } catch (error) {
    console.error('Error getAvailableEndTimes:', error);
    return [];
  }
}

// ============================================================
// ฟังก์ชันตรวจสอบการจองซ้ำ
// ============================================================
function checkDuplicateBooking(date, room, startTime, endTime) {
  const reservations = getReservationsByDateAndRoom(date, room);
  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  for (const r of reservations) {
    const existStart = timeToMinutes(String(r.startTime));
    const existEnd = timeToMinutes(String(r.endTime));

    if (
      (newStart >= existStart && newStart < existEnd) ||
      (newEnd > existStart && newEnd <= existEnd) ||
      (newStart <= existStart && newEnd >= existEnd)
    ) {
      return true;
    }
  }
  return false;
}

// ============================================================
// Helper Functions
// ============================================================
function timeToMinutes(time) {
  if (time instanceof Date) return time.getHours() * 60 + time.getMinutes();
  if (typeof time !== 'string') return 0;

  if (time.indexOf(':') > -1) {
    const parts = time.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
  }
  return 0;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeValue(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'HH:mm');
  }
  const str = String(value).trim();
  if (str.indexOf(':') === -1) return str + ':00';
  return str;
}