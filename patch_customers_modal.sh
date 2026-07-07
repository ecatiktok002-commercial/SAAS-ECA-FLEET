#!/bin/bash
sed -i '11a \
import Lightbox from "yet-another-react-lightbox";\
import "yet-another-react-lightbox/styles.css";\
import Zoom from "yet-another-react-lightbox/plugins/zoom";\
' pages/CustomersPage.tsx

sed -i '/<\/div>/,/  );/ s/    <\/div>\n  );/      {isDocsModalOpen && (\n        <Lightbox\n          open={isDocsModalOpen}\n          close={() => setIsDocsModalOpen(false)}\n          index={currentDocIndex}\n          slides={selectedDocs.map(url => ({ src: url }))}\n          plugins={[Zoom]}\n          controller={{ closeOnBackdropClick: true }}\n        />\n      )}\n    <\/div>\n  );/' pages/CustomersPage.tsx
