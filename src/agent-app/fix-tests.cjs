const fs = require('fs');
let content = fs.readFileSync('tests/consistency.spec.js', 'utf-8');
const lines = content.split('\n');

// Fix line 568 (0-indexed: 567)
// The regex should be on ONE line with \\n representing newline in regex
// In the source string, \\\\n becomes \\n (backslash + n characters)
const newLine = '      const match = content.match(/:::chart\\\\[?(\\\\w+)?\\\\]?\\\\s*\\\\n([\\\\s\\\\S]*?)\\\\n:::/);';

lines[567] = newLine;
// Remove the orphaned lines 569 and 570 (indices 568, 569) if they exist
if (lines[568] && lines[568].includes('\\n:::/)')) {
  lines.splice(568, 2);
}

content = lines.join('\n');
fs.writeFileSync('tests/consistency.spec.js', content);
console.log('Fixed');
console.log('Line 568 now:', lines[567].substring(0, 80));