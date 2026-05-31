/* fix-json-v4.js — Find body by locating closing brace pattern */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'articles');
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));

let fixed = 0, skipped = 0, failed = 0;

for (const file of files) {
  const fp = path.join(DIR, file);
  let raw = fs.readFileSync(fp, 'utf-8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

  try { JSON.parse(raw); skipped++; continue; } catch(e) {}

  let result = raw;

  // Fix en.body: body ends with " before newline+spaces+},
  result = fixBodyByClosePattern(result, '  },\n  "zh"');
  // Fix zh.body: body ends with " before newline+spaces+} at end of file
  result = fixBodyByClosePattern(result, '  }\n}');

  // Also handle case where zh.body ends file
  if (result === raw) {
    result = fixBodyByClosePattern(raw, '\n  }\n}');
  }

  try {
    const data = JSON.parse(result);
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
    console.log('  ✓ ' + file);
    fixed++;
  } catch(e) {
    // Last resort: try manual reconstruction
    console.log('  ✗ ' + file + ': ' + e.message.substring(0, 60));
    failed++;
  }
}

function fixBodyByClosePattern(json, closePattern) {
  // Find the last occurrence of closePattern
  const closeIdx = json.lastIndexOf(closePattern);
  if (closeIdx === -1) return json;

  // Search backward from closeIdx for the closing " of body
  // Body ends at " which is immediately followed by whitespace then closePattern
  // But closePattern is already after the whitespace

  // Find the " that marks the body end
  let searchEnd = closeIdx;
  // Strip leading whitespace/newlines from closePattern to find the actual quote position
  let bodyEndQuote = searchEnd;
  while (bodyEndQuote > 0 && (json[bodyEndQuote-1] === ' ' || json[bodyEndQuote-1] === '\t' || json[bodyEndQuote-1] === '\n' || json[bodyEndQuote-1] === '\r')) {
    bodyEndQuote--;
  }
  if (json[bodyEndQuote-1] !== '"') return json;
  bodyEndQuote--; // point to the closing "

  // Now find "body": " before this position
  const bodyStartMarker = '"body": "';
  const bodyStartIdx = json.lastIndexOf(bodyStartMarker, bodyEndQuote);
  if (bodyStartIdx === -1) return json;

  const contentStart = bodyStartIdx + bodyStartMarker.length;
  const bodyContent = json.slice(contentStart, bodyEndQuote);

  // JSON-escape the body content
  const escaped = JSON.stringify(bodyContent).slice(1, -1);

  return json.slice(0, contentStart) + escaped + json.slice(bodyEndQuote);
}

console.log(`\nSkipped: ${skipped}, Fixed: ${fixed}, Failed: ${failed}`);

// For failed files, try harder
if (failed > 0) {
  console.log('\n--- Retrying failed files with alternate patterns ---');
  for (const file of files) {
    const fp = path.join(DIR, file);
    let raw = fs.readFileSync(fp, 'utf-8');
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    try { JSON.parse(raw); continue; } catch(e) {}

    // Try: find ALL "body": " occurrences and fix them by finding
    // the closing " using a more robust approach
    let result = raw;
    let retries = 0;
    while (retries < 3) {
      try { JSON.parse(result); break; } catch(e2) {
        // Find next "body": " and try to fix it
        const bodyIdx = result.indexOf('"body": "');
        if (bodyIdx === -1) break;

        let contentStart = bodyIdx + '"body": "'.length;

        // To find the end: look for pattern where after body content,
        // we find "\n  } (end of lang object)
        // Search for \n  } after contentStart
        let searchFrom = contentStart;
        let bodyEnd = -1;

        while (searchFrom < result.length) {
          let nextClose = result.indexOf('\n  }', searchFrom);
          if (nextClose === -1) break;

          // Go backward from nextClose to find the closing "
          let q = nextClose - 1;
          while (q > contentStart && (result[q] === ' ' || result[q] === '\t')) q--;
          if (result[q] === '"') {
            // Check if this " is likely the end of body
            // by looking for "body": " between this position and contentStart
            let between = result.slice(contentStart, q);
            // If there are unescaped quotes, they'd be content quotes
            bodyEnd = q;
            break;
          }
          searchFrom = nextClose + 4;
        }

        if (bodyEnd === -1) break;

        let bodyContent = result.slice(contentStart, bodyEnd);
        let escaped = JSON.stringify(bodyContent).slice(1, -1);
        result = result.slice(0, contentStart) + escaped + result.slice(bodyEnd);
        retries++;
      }
    }

    try {
      const data = JSON.parse(result);
      fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
      console.log('  ✓ [retry] ' + file);
      fixed++;
      failed--;
    } catch(e) {
      // truly broken
    }
  }
  console.log(`\nFinal: Skipped: ${skipped}, Fixed: ${fixed}, Failed: ${failed}`);
}
