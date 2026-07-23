const fs = require('fs');
const path = require('path');
const https = require('https');

const SOURCE_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';
const OUTPUT_DIR = path.join(__dirname, '..', 'lib');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'exercises-pruned.json');

console.log('Downloading exercises dataset from source...');

https.get(SOURCE_URL, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to download dataset. Status Code: ${res.statusCode}`);
    process.exit(1);
  }

  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {
      const sourceData = JSON.parse(rawData);
      console.log(`Successfully parsed source data. Found ${sourceData.length} items.`);

      // Prune each record to reduce final JSON size
      const prunedData = sourceData.map((item) => {
        const enSteps = item.instruction_steps?.en || [];
        const enText = item.instructions?.en || '';
        
        return {
          id: item.id,
          name: item.name,
          category: item.category || '',
          target: item.target || '',
          equipment: item.equipment || '',
          image: item.image || '',
          gif: item.gif_url || '',
          steps: enSteps.length > 0 ? enSteps : (enText ? enText.split('\n') : [])
        };
      });

      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(prunedData, null, 2), 'utf-8');
      console.log(`Pruned exercises successfully written to ${OUTPUT_FILE}. Size: ${Math.round(fs.statSync(OUTPUT_FILE).size / 1024)} KB`);
    } catch (e) {
      console.error('Error processing JSON:', e);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('HTTP Request failed:', err);
  process.exit(1);
});
