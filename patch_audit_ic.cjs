const fs = require('fs');
let content = fs.readFileSync('pages/AuditPayoutManagement.tsx', 'utf8');

// For the first grid
content = content.replace(
  `                              )}
                                <button
                                  onClick={async () => {
                                    try {
                                      const toastId = toast.loading('Loading IC/License...');`,
  `                              )}
                              {record.ic_license_photos && (
                                <button
                                  onClick={async () => {
                                    try {
                                      const toastId = toast.loading('Loading IC/License...');`
);

content = content.replace(
  `                                >
                                  <ImageIcon className="w-3 h-3" /> IC/Lic
                                </button>
                              </div>
                            </div>
                          </td>`,
  `                                >
                                  <ImageIcon className="w-3 h-3" /> IC/Lic
                                </button>
                              )}
                              </div>
                            </div>
                          </td>`
);

// For the second grid (History)
content = content.replace(
  `                          )}
                            <button
                              onClick={async () => {
                                try {
                                  const toastId = toast.loading('Loading IC/License...');`,
  `                          )}
                          {r.ic_license_photos && (
                            <button
                              onClick={async () => {
                                try {
                                  const toastId = toast.loading('Loading IC/License...');`
);

content = content.replace(
  `                            >
                              <ImageIcon className="w-3 h-3" /> View IC/Lic
                            </button>
                          </div>
                        </td>`,
  `                            >
                              <ImageIcon className="w-3 h-3" /> View IC/Lic
                            </button>
                          )}
                          </div>
                        </td>`
);

fs.writeFileSync('pages/AuditPayoutManagement.tsx', content);
console.log("Patched AuditPayoutManagement.tsx");
