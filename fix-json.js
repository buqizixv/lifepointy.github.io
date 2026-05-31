/* ========================================
   fix-json.js — Repair JSON files with unescaped characters
   ======================================== */
const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, 'articles');
const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.json'));

function fixJSON(raw) {
  // Strip BOM
  let str = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;

  // Strategy: find string boundaries and escape control chars inside strings
  let result = '';
  let inString = false;
  let stringChar = '';
  let i = 0;

  while (i < str.length) {
    const ch = str[i];
    const code = str.charCodeAt(i);

    if (!inString) {
      result += ch;
      if (ch === '"' && (i === 0 || str[i-1] !== '\\')) {
        inString = true;
        stringChar = '"';
      }
      i++;
    } else {
      // Inside a string
      if (ch === '\\' && i + 1 < str.length) {
        // Keep escape sequences as-is
        result += ch + str[i+1];
        i += 2;
      } else if (ch === stringChar) {
        result += ch;
        inString = false;
        i++;
      } else if (code < 0x20) {
        // Control character — escape it
        if (code === 0x0A) result += '\\n';      // \n
        else if (code === 0x0D) { /* skip \r */ }
        else if (code === 0x09) result += '\\t'; // \t
        else result += '\\u' + ('000' + code.toString(16)).slice(-4);
        i++;
      } else {
        result += ch;
        i++;
      }
    }
  }

  return result;
}

function tryParse(str) {
  try {
    return { success: true, data: JSON.parse(str) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

let fixed = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  const filePath = path.join(ARTICLES_DIR, file);
  let raw = fs.readFileSync(filePath, 'utf-8');

  let result = tryParse(raw);
  if (result.success) {
    skipped++;
    continue;
  }

  // Try fixing
  let fixedRaw = fixJSON(raw);
  let result2 = tryParse(fixedRaw);

  if (result2.success) {
    fs.writeFileSync(filePath, JSON.stringify(result2.data, null, 2), 'utf-8');
    console.log('  ✓ Fixed: ' + file);
    fixed++;
  } else {
    // Try more aggressive fix — replace all problematic chars
    // Sometimes the issue is unescaped double quotes inside strings
    // or other structural problems
    console.log('  ✗ Still broken: ' + file + ' — ' + result2.error);

    // Try one more time with double-quote escaping
    let aggressiveFix = fixJSONAggressive(raw);
    let result3 = tryParse(aggressiveFix);
    if (result3.success) {
      fs.writeFileSync(filePath, JSON.stringify(result3.data, null, 2), 'utf-8');
      console.log('    → Fixed with aggressive method!');
      fixed++;
    } else {
      console.log('    → Could not fix: ' + result3.error);
      // Show context around error
      failed++;
    }
  }
}

function fixJSONAggressive(raw) {
  // Strip BOM
  let str = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;

  // More aggressive: also handle unescaped double quotes inside values
  // by looking for patterns like: "key": "value with "unescaped" quotes",
  let result = '';
  let inString = false;
  let inKey = false;
  let depth = 0;
  let i = 0;

  while (i < str.length) {
    const ch = str[i];
    const code = str.charCodeAt(i);

    if (ch === '{' || ch === '[') {
      result += ch;
      if (!inString) depth++;
      i++;
    } else if (ch === '}' || ch === ']') {
      result += ch;
      if (!inString) depth--;
      i++;
    } else if (!inString) {
      result += ch;
      if (ch === '"') inString = true;
      i++;
    } else {
      // Inside a string
      if (ch === '\\' && i + 1 < str.length) {
        result += ch + str[i+1];
        i += 2;
      } else if (ch === '"') {
        // Could be end of string, or unescaped quote inside string
        // Heuristic: if followed by optional whitespace and then , or } or :, it's end of string
        let peek = i + 1;
        while (peek < str.length && (str[peek] === ' ' || str[peek] === '\t' || str[peek] === '\n' || str[peek] === '\r')) {
          peek++;
        }
        if (peek < str.length && (str[peek] === ',' || str[peek] === '}' || str[peek] === ':')) {
          result += ch;
          inString = false;
        } else {
          // Unescaped quote inside string
          result += '\\"';
        }
        i++;
      } else if (code < 0x20) {
        if (code === 0x0A) result += '\\n';
        else if (code === 0x0D) { /* skip */ }
        else if (code === 0x09) result += '\\t';
        else result += '\\u' + ('000' + code.toString(16)).slice(-4);
        i++;
      } else {
        result += ch;
        i++;
      }
    }
  }

  return result;
}

console.log(`\n=== JSON Fix Summary ===`);
console.log(`  Skipped (already valid): ${skipped}`);
console.log(`  Fixed: ${fixed}`);
console.log(`  Failed: ${failed}`);
