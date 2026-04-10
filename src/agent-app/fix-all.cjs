const fs = require('fs');
let content = fs.readFileSync('tests/consistency.spec.js', 'utf-8');

// Fix broken regex patterns where \n was incorrectly split across lines
// The broken pattern looks like: /:::xxx\\s*\<newline>([\s\S]*?)<newline>:::/
// We need to fix these specific broken lines

// Pattern 1: /:::chart\\s*\<newline>([\s\S]*?)<newline>:::/
// Should be: /:::chart\s*\n([\s\S]*?)\n:::/

// Let's use line-by-line processing
const lines = content.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  // Check if this line ends with a backslash followed by newline in regex context
  // These broken patterns look like: /:::xxx\\s*\
  if (line.match(/^\s*const match = content\.match\(\/:{3}(chart|table|toggle)\\[.*\\]?\\s*\\$/) && i + 1 < lines.length) {
    // This is the start of a broken regex - reconstruct it
    const type = line.match(/\/(chart|table|toggle)/)[1];
    const nextLine = lines[i + 1];
    const thirdLine = lines[i + 2];

    // Check if next two lines are the broken continuation
    if (nextLine && nextLine.trim() === '([\\\\s\\\\S]*?)') {
      // This is the middle line with ([\\s\\S]*?)
      if (thirdLine && thirdLine.trim() === ':::/);') {
        // We have all three parts
        if (type === 'chart') {
          const hasType = line.includes('[?]');
          if (hasType) {
            line = `      const match = content.match(/:::chart\\\\[?(\\\\w+)?\\\\]?\\\\s*\\\\n([\\\\s\\\\S]*?)\\\\n:::/);`;
          } else {
            line = `      const match = content.match(/:::chart\\\\s*\\\\n([\\\\s\\\\S]*?)\\\\n:::/);`;
          }
        } else if (type === 'table') {
          line = `      const match = content.match(/:::table\\\\s*\\\\n([\\\\s\\\\S]*?)\\\\n:::/);`;
        } else if (type === 'toggle') {
          line = `      const match = content.match(/:::toggle\\\\[?(\\\\w+)?\\\\]?\\\\s*\\\\n([\\\\s\\\\S]*?)\\\\n:::/);`;
        }
        i += 2; // Skip the next two lines
      }
    }
  }

  // Also fix lines that have \\n followed by ::/); on next line
  if (line.match(/^\s*const match = content\.match\(\/:{3}(chart|table|toggle)\\[.*\\]?\\s*\\\\n\(\[/) && i + 1 < lines.length) {
    const nextLine = lines[i + 1];
    if (nextLine && nextLine.trim() === ':::/);') {
      // The \n at end of line is actually wrong - need to fix
      // This is actually correct pattern, skip
    }
  }

  fixedLines.push(line);
}

content = fixedLines.join('\n');
fs.writeFileSync('tests/consistency.spec.js', content);
console.log('Done');