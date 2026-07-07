#!/bin/bash
sed -i 's/setExistingIcLicense(\[data.ic_license_photos\]);/setExistingIcLicense(Array.isArray(data.ic_license_photos) ? data.ic_license_photos : [data.ic_license_photos as unknown as string]);/g' pages/digital-forms/EditAgreement.tsx
