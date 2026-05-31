/* fix-json-v3.js — Extract body content, re-stringify, rebuild */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'articles');
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));

let fixed = 0, skipped = 0, failed = 0;

for (const file of files) {
  const fp = path.join(DIR, file);
  let raw = fs.readFileSync(fp, 'utf-8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

  // Try direct parse
  try { JSON.parse(raw); skipped++; continue; } catch(e) {}

  // Strategy: find body strings and fix them
  // body is always the LAST field in each lang object {en, zh}
  // So after body's closing ", we see } (closing the lang object)

  let result = fixLangBody(raw, '"en"');
  if (result) {
    result = fixLangBody(result, '"zh"');
  } else {
    // en might not exist as separate key? try different order
    result = raw;
  }

  // Also need to fix summary field which might have the same issue
  result = fixStringField(result, '"summary"');

  try {
    const data = JSON.parse(result);
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
    console.log('  ✓ ' + file);
    fixed++;
  } catch(e) {
    console.log('  ✗ ' + file + ': ' + e.message.substring(0, 80));
    failed++;
  }
}

function fixLangBody(json, langKey) {
  // Find langKey block start
  const langIdx = json.indexOf(langKey + '": {');
  if (langIdx === -1) return json;

  // Find the body marker within this block
  const bodySearch = json.indexOf('"body": "', langIdx);
  if (bodySearch === -1) return json;

  let contentStart = bodySearch + '"body": "'.length;

  // Now scan to find the matching closing quote
  // body is the last field, so after its closing " we get } (closing lang object)
  let i = contentStart;
  let depth = 0;
  let bodyEnd = -1;

  while (i < json.length) {
    const ch = json[i];

    if (ch === '\\') {
      i += 2; // skip escape sequence
      continue;
    }

    if (ch === '"') {
      // Potential end of body string
      // Check what follows after whitespace
      let j = i + 1;
      while (j < json.length && (json[j] === ' ' || json[j] === '\t' || json[j] === '\n' || json[j] === '\r')) {
        j++;
      }
      if (j < json.length && json[j] === '}') {
        bodyEnd = i;
        break;
      }
    }

    i++;
  }

  if (bodyEnd === -1) {
    // Try alternative: body ends at " followed by newline and spaces and }
    // The body string might have newlines within it (which are already broken JSON)
    // So instead, look for "\n  } pattern
    let searchFrom = contentStart;
    let found = false;
    while (!found && searchFrom < json.length) {
      let candidate = json.indexOf('"\n  }', searchFrom);
      if (candidate === -1) {
        candidate = json.indexOf('"\r\n  }', searchFrom);
      }
      if (candidate === -1) {
        candidate = json.indexOf('"\n}', searchFrom);
      }
      if (candidate === -1) break;

      // Make sure this is actually the end of the body within this lang block
      // Check that we haven't crossed into the next lang block
      const nextLang = json.indexOf('"zh":', candidate);
      const afterCandidate = candidate + 1;
      // Count how many unescaped quotes between contentStart and candidate
      // If too many, this might not be the right one
      bodyEnd = candidate;
      found = true;
    }
    if (!found) return json;
  }

  // Extract body content
  let bodyContent = json.slice(contentStart, bodyEnd);

  // Properly JSON-escape it
  let escaped = JSON.stringify(bodyContent);
  escaped = escaped.slice(1, -1); // remove surrounding quotes

  return json.slice(0, contentStart) + escaped + json.slice(bodyEnd);
}

function fixStringField(json, fieldName) {
  // Fix summary and title fields that might also have unescaped quotes
  let result = json;
  let pos = 0;

  while (true) {
    let idx = result.indexOf('"' + fieldName + '": "', pos);
    if (idx === -1) break;

    let contentStart = idx + fieldName.length + 4; // "summary": " or "title": "
    let i = contentStart;
    let end = -1;

    while (i < result.length) {
      if (result[i] === '\\') { i += 2; continue; }
      if (result[i] === '"') {
        end = i;
        break;
      }
      i++;
    }

    if (end === -1) break;

    let content = result.slice(contentStart, end);
    let escaped = JSON.stringify(content).slice(1, -1);
    result = result.slice(0, contentStart) + escaped + result.slice(end);
    pos = contentStart + escaped.length + 1;
  }

  return result;
}

console.log(`\nSkipped: ${skipped}, Fixed: ${fixed}, Failed: ${failed}`);
