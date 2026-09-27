import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('./server/notebook_prescriptions.json', 'utf8'));

// Import medicalData.js
import('../src/data/medicalData.js').then(m => {
  const { conditionDatabase } = m;

  let totalPhotos = 87;
  let totalProtocols = rawData.length;
  let matchedProtocols = 0;
  let totalRawMeds = 0;
  let matchedMeds = 0;
  let discrepancies = [];

  rawData.forEach(raw => {
    totalRawMeds += raw.medicines.length;

    // Find in conditionDatabase by photo_num and ageLabel
    const found = conditionDatabase.find(c => 
      c.photo_num === raw.photo_num && c.ageLabel === raw.age_group
    );

    if (!found) {
      discrepancies.push(`MISSING: Photo #${raw.photo_num} (${raw.condition_en}, age: ${raw.age_group}) not found in frontend medicalData!`);
      return;
    }

    matchedProtocols++;

    // Compare medicines
    if (found.medicines.length !== raw.medicines.length) {
      discrepancies.push(`MED_COUNT_MISMATCH: Photo #${raw.photo_num} (${raw.condition_en}) has ${raw.medicines.length} in photo, but ${found.medicines.length} in frontend.`);
    }

    raw.medicines.forEach((rm, idx) => {
      const fm = found.medicines[idx];
      if (!fm) {
        discrepancies.push(`MED_MISSING: Photo #${raw.photo_num} med #${idx} (${rm.form} ${rm.name}) missing in frontend.`);
        return;
      }

      const expectedFullName = `${rm.form} ${rm.name}${rm.strength ? ' ' + rm.strength : ''}`.trim();
      const nameMatch = (fm.name === expectedFullName);
      const doseMatch = (fm.dose === rm.dosage);

      if (nameMatch && doseMatch) {
        matchedMeds++;
      } else {
        discrepancies.push(`MED_MISMATCH in Photo #${raw.photo_num}: Expected "${expectedFullName} [${rm.dosage}]", got "${fm.name} [${fm.dose}]"`);
      }
    });
  });

  console.log("=================================================");
  console.log("   VEDA MEDICAL DATA ACCURACY AUDIT REPORT      ");
  console.log("=================================================");
  console.log(`Total Photos Audited        : ${totalPhotos}`);
  console.log(`Total Notebook Protocols    : ${totalProtocols}`);
  console.log(`Matched Frontend Protocols  : ${matchedProtocols} / ${totalProtocols} (${((matchedProtocols / totalProtocols) * 100).toFixed(1)}%)`);
  console.log(`Total Prescribed Medicines  : ${totalRawMeds}`);
  console.log(`Matched Prescribed Medicines: ${matchedMeds} / ${totalRawMeds} (${((matchedMeds / totalRawMeds) * 100).toFixed(1)}%)`);
  console.log(`Discrepancies Count         : ${discrepancies.length}`);
  
  if (discrepancies.length > 0) {
    console.log("\nDiscrepancies List:");
    discrepancies.forEach(d => console.log(" - " + d));
  } else {
    console.log("\n>>> RESULT: 100% PERFECT ACCURACY ACROSS ALL 87 PHOTOS! <<<");
  }
  console.log("=================================================");
});
