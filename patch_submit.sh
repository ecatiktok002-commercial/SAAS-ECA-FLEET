#!/bin/bash
sed -i '/if (receiptData !== undefined) {/i \
      let icLicenseDataArray = undefined;\
      if (icLicensePhotos.length > 0 || removedExistingIcLicense.length > 0) {\
        const newIcLicenseDataArray = await Promise.all(icLicensePhotos.map(file => {\
          return new Promise<string>((resolve) => {\
            const reader = new FileReader();\
            reader.onloadend = () => resolve(reader.result as string);\
            reader.readAsDataURL(file);\
          });\
        }));\
        const finalIcLicense = [...existingIcLicense, ...newIcLicenseDataArray];\
        if (finalIcLicense.length > 0) {\
          icLicenseDataArray = finalIcLicense;\
        } else {\
          icLicenseDataArray = null;\
        }\
      }\
\
      if (icLicenseDataArray !== undefined) {\
        updates.ic_license_photos = icLicenseDataArray;\
      }\
' pages/digital-forms/EditAgreement.tsx
