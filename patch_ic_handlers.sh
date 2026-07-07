#!/bin/bash
sed -i '/const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {/i \
  const handleICFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {\
    if (e.target.files) {\
      const newFiles = Array.from(e.target.files);\
      const totalCount = existingIcLicense.length + icLicensePhotos.length + newFiles.length;\
      if (totalCount > 4) {\
        toast.error('"'"'Total IC/License photos (existing + new) cannot exceed 4.'"'"');\
        const allowedNewCount = 4 - (existingIcLicense.length + icLicensePhotos.length);\
        if (allowedNewCount <= 0) {\
          e.target.value = '"'"''"'"';\
          return;\
        }\
        setIcLicensePhotos(prev => [...prev, ...newFiles.slice(0, allowedNewCount)]);\
      } else {\
        setIcLicensePhotos(prev => [...prev, ...newFiles]);\
      }\
      e.target.value = '"'"''"'"';\
    }\
  };\
\
  const removeNewICFile = (index: number) => {\
    setIcLicensePhotos(prev => prev.filter((_, i) => i !== index));\
  };\
\
  const removeExistingICFile = (index: number) => {\
    const removedFile = existingIcLicense[index];\
    setRemovedExistingIcLicense(prev => [...prev, removedFile]);\
    setExistingIcLicense(prev => prev.filter((_, i) => i !== index));\
  };\
' pages/digital-forms/EditAgreement.tsx
