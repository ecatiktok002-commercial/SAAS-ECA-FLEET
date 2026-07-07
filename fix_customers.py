import re

with open('pages/CustomersPage.tsx', 'r') as f:
    code = f.read()

if 'Lightbox from' not in code:
    imports = """
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
"""
    last_import = code.rfind('import ')
    end_of_line = code.find('\\n', last_import)
    code = code[:end_of_line + 1] + imports + code[end_of_line + 1:]

target = """
    </div>
  );
};"""

replacement = """
      {isDocsLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg shadow-xl flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-700">Loading documents...</p>
          </div>
        </div>
      )}
      {isDocsModalOpen && selectedDocs.length === 0 && !isDocsLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setIsDocsModalOpen(false)}>
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Documents Found</h3>
            <p className="text-sm text-slate-500 mb-6">This customer doesn't have any IC or License photos uploaded yet.</p>
            <button
              onClick={() => setIsDocsModalOpen(false)}
              className="w-full py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {isDocsModalOpen && selectedDocs.length > 0 && !isDocsLoading && (
        <Lightbox
          open={isDocsModalOpen}
          close={() => setIsDocsModalOpen(false)}
          index={currentDocIndex}
          slides={selectedDocs.map(url => ({ src: url }))}
          plugins={[Zoom]}
          controller={{ closeOnBackdropClick: true }}
        />
      )}
    </div>
  );
};"""

code = code.replace(target, replacement)

with open('pages/CustomersPage.tsx', 'w') as f:
    f.write(code)
