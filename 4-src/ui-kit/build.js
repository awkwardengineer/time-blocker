import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sectionsDir = path.join(__dirname, 'sections');
const templatePath = path.join(__dirname, 'template.html');
const outputPath = path.join(__dirname, '..', 'ui-kit.html');

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
  // Read template
  let template = fs.readFileSync(templatePath, 'utf8');
  
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
} catch (error) {
  console.error('Error building UI kit:', error);
  process.exit(1);
}

