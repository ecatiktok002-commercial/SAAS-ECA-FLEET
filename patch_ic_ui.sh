#!/bin/bash
sed -i '/<div className="pt-6 border-t border-slate-100 hidden sm:flex justify-end space-x-3">/i \
              <div className="sm:col-span-2">\
                <div className="flex items-center justify-between mb-1">\
                  <label className="block text-sm font-medium text-slate-700">IC / License Photos (Max 4)</label>\
                  {existingIcLicense.length === 0 && icLicensePhotos.length === 0 && (\
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">\
                      Pending Upload\
                    </span>\
                  )}\
                </div>\
                \
                <div className="space-y-4">\
                  {existingIcLicense.length > 0 && (\
                    <div className="grid grid-cols-1 gap-4">\
                      {existingIcLicense.map((photo, index) => (\
                        <div key={`existing-ic-${index}`} className="bg-slate-50 rounded-xl border border-slate-200 p-4">\
                          <div className="flex items-center justify-between">\
                            <div className="flex items-center space-x-3">\
                              <div className="bg-emerald-100 p-2 rounded-lg">\
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />\
                              </div>\
                              <div>\
                                <p className="text-sm font-semibold text-slate-900">IC/License #{index + 1}</p>\
                                <p className="text-xs text-slate-500">Existing file</p>\
                              </div>\
                            </div>\
                            <div className="flex items-center space-x-2">\
                              <button\
                                type="button"\
                                onClick={() => openDataURL(photo)}\
                                className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"\
                              >\
                                <Eye className="w-3.5 h-3.5 mr-1.5" />\
                                View\
                              </button>\
                              {!isLocked && (\
                                <button\
                                  type="button"\
                                  onClick={() => removeExistingICFile(index)}\
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors"\
                                >\
                                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />\
                                  Remove\
                                </button>\
                              )}\
                            </div>\
                          </div>\
                        </div>\
                      ))}\
                    </div>\
                  )}\
\
                  {icLicensePhotos.length > 0 && (\
                    <div className="grid grid-cols-1 gap-4">\
                      {icLicensePhotos.map((file, index) => (\
                        <div key={`new-ic-${index}`} className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">\
                          <div className="flex items-center justify-between">\
                            <div className="flex items-center space-x-3">\
                              <div className="bg-emerald-100 p-2 rounded-lg">\
                                <Upload className="w-5 h-5 text-emerald-600" />\
                              </div>\
                              <div>\
                                <p className="text-sm font-semibold text-emerald-900 truncate max-w-[200px]">{file.name}</p>\
                                <p className="text-xs text-emerald-600">New file to upload</p>\
                              </div>\
                            </div>\
                            <button\
                              type="button"\
                              onClick={() => removeNewICFile(index)}\
                              className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 transition-colors"\
                            >\
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" />\
                              Remove\
                            </button>\
                          </div>\
                        </div>\
                      ))}\
                    </div>\
                  )}\
\
                  {(existingIcLicense.length + icLicensePhotos.length) < 4 && !isLocked && (\
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:bg-slate-50 transition-colors">\
                      <div className="space-y-1 text-center">\
                        <Upload className="mx-auto h-12 w-12 text-slate-400" />\
                        <div className="flex text-sm text-slate-600 justify-center">\
                          <label\
                            htmlFor="ic-file-upload"\
                            className={`relative cursor-pointer bg-white rounded-lg font-medium text-slate-900 hover:text-slate-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-slate-900 ${isLocked ? '"'"'pointer-events-none opacity-50'"'"' : '"'"''"'"'}`}\
                          >\
                            <span>Upload IC/License files</span>\
                            <input id="ic-file-upload" name="ic-file-upload" type="file" className="sr-only" onChange={handleICFileChange} accept="image/*,.pdf" disabled={isLocked} multiple />\
                          </label>\
                          <p className="pl-1">or drag and drop</p>\
                        </div>\
                        <p className="text-xs text-slate-500">PNG, JPG, PDF up to 10MB (Max 4 total)</p>\
                      </div>\
                    </div>\
                  )}\
                </div>\
              </div>\
' pages/digital-forms/EditAgreement.tsx
