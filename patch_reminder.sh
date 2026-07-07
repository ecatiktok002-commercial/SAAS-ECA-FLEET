#!/bin/bash
sed -i '/<div className="space-y-4">/a \
                  {existingIcLicense.length === 0 && icLicensePhotos.length === 0 && !isLocked && (\
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start space-x-3">\
                      <div className="flex-shrink-0">\
                        <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">\
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />\
                        </svg>\
                      </div>\
                      <div>\
                        <h3 className="text-sm font-medium text-amber-800">Reminder: Documents Required</h3>\
                        <div className="mt-1 text-sm text-amber-700">\
                          <p>Please upload the IC and Driving License photos. These are required for the agreement but were not uploaded initially.</p>\
                        </div>\
                      </div>\
                    </div>\
                  )}\
' pages/digital-forms/EditAgreement.tsx
