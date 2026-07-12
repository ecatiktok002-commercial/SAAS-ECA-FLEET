const fs = require('fs');
let content = fs.readFileSync('pages/AuditPayoutManagement.tsx', 'utf8');

const search = `                          {r.payment_receipt ? (
                            <button
                              onClick={async () => {
                                try {
                                  const toastId = toast.loading('Loading receipt...');
                                  const fullAgreement = await apiService.getAgreementById(r.form_id, subscriberId!);
                                  toast.dismiss(toastId);
                                  
                                  if (!fullAgreement || !fullAgreement.payment_receipt || fullAgreement.payment_receipt === '[]' || fullAgreement.payment_receipt === 'null') {
                                    toast.error('No receipt found.');
                                    return;
                                  }

                                  let allUrls: string[] = [];
                                  try {
                                    const parsed = JSON.parse(fullAgreement.payment_receipt);
                                    allUrls = Array.isArray(parsed) ? parsed : [fullAgreement.payment_receipt];
                                  } catch (e) {
                                    allUrls = [fullAgreement.payment_receipt];
                                  }
                                  
                                  if (fullAgreement.has_pending_changes && fullAgreement.pending_changes?.payment_receipt) {
                                    try {
                                      const pendingParsed = typeof fullAgreement.pending_changes.payment_receipt === 'string' 
                                          ? JSON.parse(fullAgreement.pending_changes.payment_receipt)
                                          : fullAgreement.pending_changes.payment_receipt;
                                          
                                      const pendingUrls = Array.isArray(pendingParsed) ? pendingParsed : [fullAgreement.pending_changes.payment_receipt];
                                      allUrls = Array.from(new Set([...allUrls, ...pendingUrls])); // Use Set to deduplicate
                                    } catch (e) {
                                      if (typeof fullAgreement.pending_changes.payment_receipt === 'string') {
                                         allUrls = Array.from(new Set([...allUrls, fullAgreement.pending_changes.payment_receipt]));
                                      }
                                    }
                                  }
                                  
                                  setPreviewUrls(allUrls);
                                  setCurrentPreviewIndex(0);
                                  setIsPreviewOpen(true);
                                } catch (err) {
                                  toast.dismiss();
                                  toast.error('Failed to load receipt.');
                                }
                              }}
                              className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 whitespace-nowrap"
                            >
                              <FileText className="w-3 h-3" /> View Receipt
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">No Receipt</span>
                          )}`;

const replace = `                          <div className="flex flex-col gap-1">
                          {r.payment_receipt ? (
                            <button
                              onClick={async () => {
                                try {
                                  const toastId = toast.loading('Loading receipt...');
                                  const fullAgreement = await apiService.getAgreementById(r.form_id, subscriberId!);
                                  toast.dismiss(toastId);
                                  
                                  if (!fullAgreement || !fullAgreement.payment_receipt || fullAgreement.payment_receipt === '[]' || fullAgreement.payment_receipt === 'null') {
                                    toast.error('No receipt found.');
                                    return;
                                  }

                                  let allUrls: string[] = [];
                                  try {
                                    const parsed = JSON.parse(fullAgreement.payment_receipt);
                                    allUrls = Array.isArray(parsed) ? parsed : [fullAgreement.payment_receipt];
                                  } catch (e) {
                                    allUrls = [fullAgreement.payment_receipt];
                                  }
                                  
                                  if (fullAgreement.has_pending_changes && fullAgreement.pending_changes?.payment_receipt) {
                                    try {
                                      const pendingParsed = typeof fullAgreement.pending_changes.payment_receipt === 'string' 
                                          ? JSON.parse(fullAgreement.pending_changes.payment_receipt)
                                          : fullAgreement.pending_changes.payment_receipt;
                                          
                                      const pendingUrls = Array.isArray(pendingParsed) ? pendingParsed : [fullAgreement.pending_changes.payment_receipt];
                                      allUrls = Array.from(new Set([...allUrls, ...pendingUrls])); // Use Set to deduplicate
                                    } catch (e) {
                                      if (typeof fullAgreement.pending_changes.payment_receipt === 'string') {
                                         allUrls = Array.from(new Set([...allUrls, fullAgreement.pending_changes.payment_receipt]));
                                      }
                                    }
                                  }
                                  
                                  setPreviewUrls(allUrls);
                                  setCurrentPreviewIndex(0);
                                  setIsPreviewOpen(true);
                                } catch (err) {
                                  toast.dismiss();
                                  toast.error('Failed to load receipt.');
                                }
                              }}
                              className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 whitespace-nowrap"
                            >
                              <FileText className="w-3 h-3" /> View Receipt
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">No Receipt</span>
                          )}
                            <button
                              onClick={async () => {
                                try {
                                  const toastId = toast.loading('Loading IC/License...');
                                  const fullAgreement = await apiService.getAgreementById(r.form_id, subscriberId!);
                                  toast.dismiss(toastId);
                                  if (!fullAgreement || !fullAgreement.ic_license_photos || fullAgreement.ic_license_photos === '[]' || fullAgreement.ic_license_photos === 'null') {
                                    toast.error('No IC/License found.');
                                    return;
                                  }
                                  let allUrls: string[] = [];
                                  try {
                                    const parsed = typeof fullAgreement.ic_license_photos === 'string' ? JSON.parse(fullAgreement.ic_license_photos) : fullAgreement.ic_license_photos;
                                    allUrls = Array.isArray(parsed) ? parsed : [fullAgreement.ic_license_photos];
                                  } catch (e) {
                                    allUrls = [fullAgreement.ic_license_photos as string];
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
                          </div>`;

if (content.indexOf(search) !== -1) {
    content = content.replace(search, replace);
    fs.writeFileSync('pages/AuditPayoutManagement.tsx', content);
    console.log("Patched history successfully");
} else {
    console.log("Could not find history search string 2");
}
