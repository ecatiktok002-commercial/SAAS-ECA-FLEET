const fs = require('fs');
let code = fs.readFileSync('services/apiService.ts', 'utf8');

code = code.replace(
  'return data[0].ic_license_photos;',
  `const photos = data[0].ic_license_photos;
        if (typeof photos === 'string') {
          try {
            return JSON.parse(photos);
          } catch (e) {
            return [photos];
          }
        }
        return Array.isArray(photos) ? photos : [photos];`
);

fs.writeFileSync('services/apiService.ts', code);
