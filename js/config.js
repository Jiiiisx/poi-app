const CONFIG = {
  SPREADSHEET_ID: '15Yu8_PcUFvrQFIL3qy7TfvDJNg4XPSbqPJOU6Wh8Q1A',
  DATA_RANGE: "'REKAP CALON PELANGGAN BY SPARTA'!A1:I1000",
  SEMUA_SALES_RANGE: "'REKAP CALON PELANGGAN BY SPARTA'!J2:J1000",
  API_BASE: 'https://sheets.googleapis.com/v4/spreadsheets',
  API_KEY: 'AIzaSyDiLgnSz4yrRr1AW-dHgvEDSyZS6aGFiZY',
  CLIENT_ID: '167078370634-de0ou8c3hikdba9pq6evimmfekbkk9o6.apps.googleusercontent.com',
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
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

function getSheetDataUrl(spreadsheetId, range, apiKey) {
  return `${CONFIG.API_BASE}/${spreadsheetId}/values/${range}?key=${apiKey}`;
}
