const fs = require('fs');
let content = fs.readFileSync('pages/AuditPayoutManagement.tsx', 'utf8');

const search1 = `                              {record.ic_license_photos && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const toastId = toast.loading('Loading IC/License...');
                                      const fullAgreement = await apiService.getAgreementById(record.form_id, subscriberId!);
                                      toast.dismiss(toastId);
                                      if (!fullAgreement || !fullAgreement.ic_license_photos || (fullAgreement.ic_license_photos as any) === '[]' || (fullAgreement.ic_license_photos as any) === 'null') {
                                        toast.error('No IC/License found.');
                                        return;
                                      }
                                      let allUrls: string[] = [];
                                      try {
                                        const parsed = typeof fullAgreement.ic_license_photos === 'string' ? JSON.parse(fullAgreement.ic_license_photos) : fullAgreement.ic_license_photos;
                                        allUrls = Array.isArray(parsed) ? parsed : [fullAgreement.ic_license_photos];
                                      } catch (e) {
                                        allUrls = [fullAgreement.ic_license_photos as unknown as string];
                                      }
                                      if (allUrls.length > 0) {
                                        setPreviewUrls(allUrls);
                                        setCurrentPreviewIndex(0);
                                        setIsPreviewOpen(true);
                                      } else {
                                        toast.error('No IC/License found.');
                                      }
                                    } catch (err) {
                                      toast.dismiss();
                                      toast.error('Failed to load IC/License image.');
                                    }
                                  }}
                                  className="text-[10px] text-amber-600 font-bold hover:underline flex items-center gap-0.5"
                                >
                                  <ImageIcon className="w-3 h-3" /> IC/Lic
                                </button>
                              )}`;

const search2 = `                          {r.ic_license_photos && (
                            <button
                              onClick={async () => {
                                try {
                                  const toastId = toast.loading('Loading IC/License...');
                                  const fullAgreement = await apiService.getAgreementById(r.form_id, subscriberId!);
                                  toast.dismiss(toastId);
                                  if (!fullAgreement || !fullAgreement.ic_license_photos || (fullAgreement.ic_license_photos as any) === '[]' || (fullAgreement.ic_license_photos as any) === 'null') {
                                    toast.error('No IC/License found.');
                                    return;
                                  }
                                  let allUrls: string[] = [];
                                  try {
                                    const parsed = typeof fullAgreement.ic_license_photos === 'string' ? JSON.parse(fullAgreement.ic_license_photos) : fullAgreement.ic_license_photos;
                                    allUrls = Array.isArray(parsed) ? parsed : [fullAgreement.ic_license_photos];
                                  } catch (e) {
                                    allUrls = [fullAgreement.ic_license_photos as unknown as string];
                                  }
                                  if (allUrls.length > 0) {
                                    setPreviewUrls(allUrls);
                                    setCurrentPreviewIndex(0);
                                    setIsPreviewOpen(true);
                                  } else {
                                    toast.error('No IC/License found.');
                                  }
                                } catch (err) {
                                  toast.dismiss();
                                  toast.error('Failed to load IC/License image.');
                                }
                              }}
                              className="text-[10px] text-amber-600 font-bold hover:underline flex items-center gap-0.5 whitespace-nowrap"
                            >
                              <ImageIcon className="w-3 h-3" /> View IC/Lic
                            </button>
                          )}`;

if (content.indexOf(search1) !== -1) {
    content = content.replace(search1, '');
    console.log("Removed first instance");
} else {
    console.log("Could not find first instance");
}

if (content.indexOf(search2) !== -1) {
    content = content.replace(search2, '');
    console.log("Removed second instance");
} else {
    console.log("Could not find second instance");
}

fs.writeFileSync('pages/AuditPayoutManagement.tsx', content);
