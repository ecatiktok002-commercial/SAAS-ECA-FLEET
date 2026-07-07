#!/bin/bash
sed -i '/const \[existingReceipts, setExistingReceipts\] = useState<string\[\]>(\[\]);/a \
  const [icLicensePhotos, setIcLicensePhotos] = useState<File[]>([]);\
  const [existingIcLicense, setExistingIcLicense] = useState<string[]>([]);\
  const [removedExistingIcLicense, setRemovedExistingIcLicense] = useState<string[]>([]);' pages/digital-forms/EditAgreement.tsx

sed -i '/\/\/ Parse existing receipts/i \
        // Parse existing IC & License photos\
        if (data.ic_license_photos) {\
          try {\
            const parsed = typeof data.ic_license_photos === '"'"'string'"'"' ? JSON.parse(data.ic_license_photos) : data.ic_license_photos;\
            if (Array.isArray(parsed)) {\
              setExistingIcLicense(parsed);\
            } else {\
              setExistingIcLicense([data.ic_license_photos]);\
            }\
          } catch (e) {\
            setExistingIcLicense([data.ic_license_photos]);\
          }\
        } else {\
          setExistingIcLicense([]);\
        }\
' pages/digital-forms/EditAgreement.tsx
