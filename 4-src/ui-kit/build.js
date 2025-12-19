import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sectionsDir = path.join(__dirname, 'sections');
const templatePath = path.join(__dirname, 'template.html');
const outputPath = path.join(__dirname, '..', 'ui-kit.html');
const tailwindConfigPath = path.join(__dirname, '..', 'tailwind.config.js');

// Define section order
const sections = [
  'typography.html',
  'colors.html',
  'full-page-layout.html',
  'task-lifecycle.html',
  'list-lifecycle.html',
  'shared-components.html'
];

try {
  // Import tailwind config
  const tailwindConfigModule = await import(`file://${tailwindConfigPath}`);
  const tailwindConfig = tailwindConfigModule.default;
  const themeExtend = tailwindConfig.theme.extend;
  
  // Convert theme.extend to JavaScript object string for inline script
  // Function to serialize object to JavaScript format
  function serializeToJS(obj, indent = 0) {
    const spaces = ' '.repeat(indent);
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      const items = obj.map(item => {
        const itemStr = serializeToJS(item, indent + 2);
        return ' '.repeat(indent + 2) + itemStr;
      });
      return '[\n' + items.join(',\n') + '\n' + spaces + ']';
    } else if (obj !== null && typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) return '{}';
      const props = entries.map(([key, value]) => {
        const valueStr = serializeToJS(value, indent + 2);
        return ' '.repeat(indent + 2) + `'${key}': ${valueStr}`;
      });
      return '{\n' + props.join(',\n') + '\n' + spaces + '}';
    } else if (typeof obj === 'string') {
      return `'${obj.replace(/'/g, "\\'")}'`;
    }
    return String(obj);
  }
  
  const configString = `{\n  theme: {\n    extend: ${serializeToJS(themeExtend, 4)}\n  }\n}`;
  
  // Read template
  let template = fs.readFileSync(templatePath, 'utf8');
  
  // Replace Tailwind config placeholder
  template = template.replace('{{TAILWIND_CONFIG}}', configString);
  
  // Read and combine sections
  let sectionsContent = '';
  sections.forEach(file => {
    const filePath = path.join(sectionsDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      sectionsContent += content + '\n';
    } else {
      console.warn(`Warning: Section file ${file} not found`);
    }
  });
  
  // Replace placeholder with sections content
  template = template.replace('{{CONTENT}}', sectionsContent.trim());
  
  // Write output
  fs.writeFileSync(outputPath, template, 'utf8');
  console.log(`✓ Built ui-kit.html from ${sections.length} sections`);
  console.log(`✓ Injected Tailwind config from tailwind.config.js`);
} catch (error) {
  console.error('Error building UI kit:', error);
  process.exit(1);
}

