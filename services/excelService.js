const XLSX = require("xlsx");
const path = require("path");

let cachedData = null;

function readSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet);
}

function loadExcel() {
  const filePath = path.join(__dirname, "../data/freight_rates.xlsx");
  const workbook = XLSX.readFile(filePath);
  console.log("Available sheets:", workbook.SheetNames);

  cachedData = {
    zones: readSheet(workbook, "Zones"),
    local_rates: readSheet(workbook, "Local_Rates"),
    land: readSheet(workbook, "Land_Freight"),
    ocean_fcl: readSheet(workbook, "Ocean_FCL"),
    ocean_lcl: readSheet(workbook, "Ocean_LCL"),
    air: readSheet(workbook, "Air_Freight"),
  };
  console.log("Land rows:", cachedData.land.length);
  console.log("First land row:", cachedData.land[0]);

  return cachedData;
}

function getData() {
  if (!cachedData) {
    return loadExcel();
  }
  return cachedData;
}

function getOptions() {
  const data = getData();

  return {
    local_locations: [...new Set(data.zones.map((z) => z.Location).filter(Boolean))],

    local_vehicles: [...new Set(data.local_rates.map((r) => r.Vehicle_Type).filter(Boolean))],

    land_countries: [
      ...new Set(data.land.flatMap((r) => [r.From_Country, r.To_Country]).filter(Boolean)),
    ],

    ports: [
      ...new Set(data.ocean_fcl.flatMap((r) => [r.From_Port, r.To_Port]).filter(Boolean)),
    ],

    air_locations: [
      ...new Set(data.air.flatMap((r) => [r.From, r.To]).filter(Boolean)),
    ],

    container_types: [
      ...new Set(data.ocean_fcl.map((r) => r.Container_Type).filter(Boolean)),
    ],

    container_sizes: [
      ...new Set(data.ocean_fcl.map((r) => r.Container_Size).filter(Boolean)),
    ],
  };
}

function reloadExcel() {
  cachedData = null;
  return loadExcel();
}

module.exports = { getData, getOptions, reloadExcel };