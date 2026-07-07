import re
with open('services/apiService.ts', 'r') as f:
    code = f.read()

code = code.replace(
    'return data[0].ic_license_photos;',
    '''const photos = data[0].ic_license_photos;
        if (typeof photos === 'string') {
          try {
            return JSON.parse(photos);
          } catch (e) {
            return [photos];
          }
        }
        return Array.isArray(photos) ? photos : [photos];'''
)

with open('services/apiService.ts', 'w') as f:
    f.write(code)
