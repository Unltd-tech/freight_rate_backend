const ExcelJS = require("exceljs");
const path = require("path");

let cachedData = null;

function sheetToJson(worksheet) {
  if (!worksheet) return [];

  const rows = [];
  const headers = [];

  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value;
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const obj = {};
    row.eachCell((cell, colNumber) => {
      const key = headers[colNumber];
      if (key) obj[key] = cell.value;
    });

    if (Object.keys(obj).length > 0) rows.push(obj);
  });

  return rows;
}

async function readSheet(workbook, sheetName) {
  const sheet = workbook.getWorksheet(sheetName);
  return sheetToJson(sheet);
}

async function loadExcel() {
  const filePath = path.join(__dirname, "../data/freight_rates.xlsx");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log(
    "Available sheets:",
    workbook.worksheets.map((sheet) => sheet.name)
  );

  cachedData = {
    zones: await readSheet(workbook, "Zones"),
    local_rates: await readSheet(workbook, "Local_Rates"),
    land: await readSheet(workbook, "Land_Freight"),
    ocean_fcl: await readSheet(workbook, "Ocean_FCL"),
    ocean_lcl: await readSheet(workbook, "Ocean_LCL"),
    air: await readSheet(workbook, "Air_Freight"),
  };

  console.log("Land rows:", cachedData.land.length);
  console.log("First land row:", cachedData.land[0]);

  return cachedData;
}

async function getData() {
  if (!cachedData) {
    return await loadExcel();
  }
  return cachedData;
}

async function getOptions() {
  const data = await getData();

  return {
    local_locations: [...new Set(data.zones.map((z) => z.Location).filter(Boolean))],
    local_vehicles: [...new Set(data.local_rates.map((r) => r.Vehicle_Type).filter(Boolean))],
    land_countries: [...new Set(data.land.flatMap((r) => [r.From_Country, r.To_Country]).filter(Boolean))],
    ports: [...new Set(data.ocean_fcl.flatMap((r) => [r.From_Port, r.To_Port]).filter(Boolean))],
    air_locations: [...new Set(data.air.flatMap((r) => [r.From, r.To]).filter(Boolean))],
    container_types: [...new Set(data.ocean_fcl.map((r) => r.Container_Type).filter(Boolean))],
    container_sizes: [...new Set(data.ocean_fcl.map((r) => r.Container_Size).filter(Boolean))],
  };
}

async function reloadExcel() {
  cachedData = null;
  return await loadExcel();
}

module.exports = { getData, getOptions, reloadExcel };