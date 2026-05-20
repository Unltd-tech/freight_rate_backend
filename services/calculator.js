function calculateEstimate(type, params, data) {
  switch (type) {
    case "Local": {
      const clean = (value) => String(value || "").trim();

      const fromZone = data.zones.find(
        (z) => clean(z.Location) === clean(params.from)
      )?.Zone;

      const toZone = data.zones.find(
        (z) => clean(z.Location) === clean(params.to)
      )?.Zone;

      const rate = data.local_rates.find((r) => {
        const excelFromZone = clean(r.From_Zone);
        const excelToZone = clean(r.To_Zone);
        const excelVehicle = clean(r.Vehicle_Type);

        return (
          ((excelFromZone === clean(fromZone) && excelToZone === clean(toZone)) ||
            (excelFromZone === clean(toZone) && excelToZone === clean(fromZone))) &&
          excelVehicle === clean(params.vehicle)
        );
      });

      console.log("DEBUG LOCAL:", {
        from: params.from,
        to: params.to,
        vehicle: params.vehicle,
        fromZone,
        toZone,
        matchedRate: rate,
        sampleRate: data.local_rates[0],
      });

      return rate ? Number(rate.Rate) : null;
    }

    case "Land": {
      const clean = (value) => String(value || "").trim();

      const rate = data.land.find((r) => {
        return (
          clean(r.From_Country) === clean(params.from) &&
          clean(r.To_Country) === clean(params.to) &&
          clean(r.Vehicle_Type) === clean(params.vehicle)
        );
      });

      console.log("DEBUG LAND:", {
        params,
        matchedRate: rate,
        sampleLand: data.land[0],
        keys: Object.keys(data.land[0] || {}),
      });

      return rate ? Number(rate.Rate) : null;
    }

    case "Ocean_FCL": {
      const rate = data.ocean_fcl.find(
        (r) =>
          r.From_Port === params.from &&
          r.To_Port === params.to &&
          r.Container_Type === params.containerType &&
          r.Container_Size === params.containerSize
      );

      return rate ? Number(rate.Rate) : null;
    }
    case "Air": {
      const clean = (value) => String(value || "").trim();

      // Volumetric Weight
      const volWeight =
        (Number(params.length) *
          Number(params.width) *
          Number(params.height)) / 6000;

      // Compare actual vs volumetric
      const chargeableWeight = Math.max(
        Number(params.weight),
        volWeight
      );

      // Find matching air rate
      const airRate = data.air.find(
        (r) =>
          clean(r.From) === clean(params.from) &&
          clean(r.To) === clean(params.to)
      );

      console.log("DEBUG AIR:", {
        params,
        volWeight,
        chargeableWeight,
        matchedRate: airRate,
        sampleAir: data.air[0],
      });

      if (!airRate) return null;

      // Calculate final air freight
      const totalAir =
        chargeableWeight * Number(airRate.Rate_per_kg);

      return Math.max(
        totalAir,
        Number(airRate.Min_Charge || 0)
      );
    }
    case "Ocean_LCL": {
      const clean = (value) => String(value || "").trim();

      const cbm =
        (Number(params.length) * Number(params.width) * Number(params.height)) / 1000000;

      const weight = Number(params.weight);

      const lclRate = data.ocean_lcl.find((r) => {
        return (
          clean(r.From_Port) === clean(params.from) &&
          clean(r.To_Port) === clean(params.to)
        );
      });

      console.log("DEBUG OCEAN LCL:", {
        params,
        cbm,
        weight,
        matchedRate: lclRate,
        sampleLCL: data.ocean_lcl[0],
      });

      if (!lclRate) return null;

      const cbmCost = cbm * Number(lclRate.Rate_per_cbm);
      const weightCost = weight * Number(lclRate.Rate_per_kg);
      const minCharge = Number(lclRate.Min_Charge || 0);

      return Math.max(cbmCost, weightCost, minCharge);
    }

    default:
      return null;
  }
}

module.exports = { calculateEstimate };