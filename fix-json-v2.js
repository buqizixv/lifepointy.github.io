/* ========================================
   fix-json-v2.js — Escape body strings properly
   ======================================== */
const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, 'articles');
const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.json'));

let fixed = 0, skipped = 0;

for (const file of files) {
  const filePath = path.join(ARTICLES_DIR, file);
  let raw = fs.readFileSync(filePath, 'utf-8');
  // Strip BOM
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

  // Try parsing directly
  try { JSON.parse(raw); skipped++; continue; } catch (e) {}

  // Manually extract and fix the body fields
  // The issue: body HTML contains unescaped double quotes (class="tip-box" etc.)
  // We need to find the body string values and re-stringify them

  let fixed_raw = raw;

  // Fix en.body
  fixed_raw = fixBodyField(fixed_raw, '"en"');
  // Fix zh.body
  fixed_raw = fixBodyField(fixed_raw, '"zh"');

  try {
    const data = JSON.parse(fixed_raw);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('  ✓ ' + file);
    fixed++;
  } catch (e) {
    console.log('  ✗ ' + file + ': ' + e.message);
  }
}

function fixBodyField(json, langKey) {
  // Find '"body": "' and extract the body content
  // The body is a very long string — find its start and end

  // Pattern: after langKey, find "body": "
  const bodyStartMarker = langKey + '": {';
  let pos = json.indexOf(bodyStartMarker);
  if (pos === -1) return json;

  // Find "body": " within the lang object
  const bodyLabel = '"body": "';
  let bodyStart = json.indexOf(bodyLabel, pos);
  if (bodyStart === -1) return json;

  let contentStart = bodyStart + bodyLabel.length;

  // Now scan forward to find the closing unescaped quote
  // that precedes the end of the string followed by newline + spaces + }
  // The body string ends with '"' followed by \n and spaces and then '}'
  // We need to find the matching quote

  // Strategy: scan character by character from end of file backwards
  // to find the pattern: "\n  } (end of zh object)
  // The quote before that is the end of the body string

  let bodyEnd = -1;
  let i = contentStart;
  while (i < json.length) {
    if (json[i] === '"' && json[i-1] !== '\\') {
      // Potential end of body — check what follows
      let after = json.slice(i + 1).trimStart();
      if (after.startsWith('\n') || after.startsWith('\r')) {
        // Check if the next non-whitespace line starts with }
        let rest = after.trimStart();
        if (rest.startsWith('}') || rest.startsWith('\n}')) {
          bodyEnd = i;
          break;
        }
      }
    }
    // Skip escaped chars
    if (json[i] === '\\' && i + 1 < json.length) {
      i += 2;
    } else {
      i++;
    }
  }

  if (bodyEnd === -1) {
    console.log('    Could not find body end for ' + langKey);
    return json;
  }

  let bodyContent = json.slice(contentStart, bodyEnd);
  // Unescape what was already escaped
  bodyContent = bodyContent.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');

  // Now properly JSON-stringify it
  let escaped = JSON.stringify(bodyContent);
  // JSON.stringify adds surrounding quotes, strip them
  escaped = escaped.slice(1, -1);

  return json.slice(0, contentStart) + escaped + json.slice(bodyEnd);
}

console.log(`\nSkipped: ${skipped}, Fixed: ${fixed}`);
