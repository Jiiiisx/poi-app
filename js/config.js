// Konfigurasi Google Sheets API
const CONFIG = {
  // Ganti dengan ID spreadsheet
  SPREADSHEET_ID: '15Yu8_PcUFvrQFIL3qy7TfvDJNg4XPSbqPJOU6Wh8Q1A',
  
  // Range data yang ingin diambil
  DATA_RANGE: "'REKAP CALON PELANGGAN BY SPARTA'!A1:I1000",

  // Range untuk kolom semua sales
  SEMUA_SALES_RANGE: "'REKAP CALON PELANGGAN BY SPARTA'!J2:J1000",
  
  // Google Sheets API endpoint
  API_BASE: 'https://sheets.googleapis.com/v4/spreadsheets',
  
  // API Key 
  API_KEY: 'AIzaSyDiLgnSz4yrRr1AW-dHgvEDSyZS6aGFiZY',

  // Client ID
  CLIENT_ID: '167078370634-de0ou8c3hikdba9pq6evimmfekbkk9o6.apps.googleusercontent.com',

  // Scope yang dibutuhkan untuk akses Google Sheets
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
  
  // Kolom mapping sesuai dengan struktur tabel
  COLUMN_MAPPING: {
    0: 'odp_terdekat',
    1: 'nama',
    2: 'alamat',
    3: 'no_telepon',
    4: 'nama_sales',
    5: 'visit',
    6: 'keterangan',
    7: 'status',
    8: 'actions'
  }
};

// Fungsi untuk mendapatkan URL API
function getSheetDataUrl(spreadsheetId, range, apiKey) {
  return `${CONFIG.API_BASE}/${spreadsheetId}/values/${range}?key=${apiKey}`;
}
