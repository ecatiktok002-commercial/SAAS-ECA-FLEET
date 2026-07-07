const fs = require('fs');
let content = fs.readFileSync('pages/digital-forms/SignAgreement.tsx', 'utf8');

const search = `      // Helper to convert URL to Base64
      const getBase64FromUrl = async (url: string): Promise<string | null> => {
        if (!url) return null;
        if (url.startsWith('data:')) return url;
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error('Error fetching image for PDF:', e);
          return null;
        }
      };

      // Pre-load logos
      const logoUrls = [company?.logo_url, company?.ssm_logo_url, company?.spdp_logo_url].filter(Boolean);
      const logoBase64s = await Promise.all(logoUrls.map(url => getBase64FromUrl(url)));
      const validLogos = logoBase64s.filter(Boolean) as string[];

      // Generate PDF with repeated footer
      const worker = (html2pdf() as any).set(opt).from(element).toPdf().get('pdf').then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          
          // 1. Add Footer Line
          pdf.setDrawColor(226, 232, 240); // slate-200
          pdf.setLineWidth(1);
          pdf.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50);
          
          // 2. Add Logos (Centered)
          if (validLogos.length > 0) {
            const logoWidth = 40;
            const logoHeight = 25;
            const gap = 20;
            const totalLogosWidth = (validLogos.length * logoWidth) + ((validLogos.length - 1) * gap);
            let currentX = (pageWidth - totalLogosWidth) / 2;
            
            validLogos.forEach((logo) => {
              try {
                pdf.addImage(logo, 'PNG', currentX, pageHeight - 45, logoWidth, logoHeight, undefined, 'FAST');
                currentX += logoWidth + gap;
              } catch (e) {
                console.error('Error adding logo to page', i, e);
              }
            });
          }`;

const replace = `      // Helper to convert URL to Base64 and get Image data
      const getBase64FromUrl = async (url: string): Promise<{ dataUrl: string, width: number, height: number } | null> => {
        if (!url) return null;
        let dataUrl = url;
        if (!url.startsWith('data:')) {
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            dataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.error('Error fetching image for PDF:', e);
            return null;
          }
        }
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ dataUrl, width: img.width, height: img.height });
          img.onerror = () => resolve(null);
          img.src = dataUrl;
        });
      };

      // Pre-load logos
      const logoUrls = [company?.logo_url, company?.ssm_logo_url, company?.spdp_logo_url].filter(Boolean);
      const logoData = await Promise.all(logoUrls.map(url => getBase64FromUrl(url)));
      const validLogos = logoData.filter(Boolean) as { dataUrl: string, width: number, height: number }[];

      // Generate PDF with repeated footer
      const worker = (html2pdf() as any).set(opt).from(element).toPdf().get('pdf').then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          
          // 1. Add Footer Line
          pdf.setDrawColor(226, 232, 240); // slate-200
          pdf.setLineWidth(1);
          pdf.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50);
          
          // 2. Add Logos (Centered)
          if (validLogos.length > 0) {
            const targetHeight = 35; // Better max height to prevent blurring
            const gap = 20;
            const logoDrawData = validLogos.map(logo => {
                const ratio = logo.width / logo.height;
                const drawWidth = targetHeight * ratio;
                return { ...logo, drawWidth, drawHeight: targetHeight };
            });
            const totalLogosWidth = logoDrawData.reduce((sum, logo) => sum + logo.drawWidth, 0) + ((validLogos.length - 1) * gap);
            let currentX = (pageWidth - totalLogosWidth) / 2;
            
            logoDrawData.forEach((logo) => {
              try {
                let imgFormat = 'PNG';
                if (logo.dataUrl.indexOf('image/jpeg') !== -1 || logo.dataUrl.indexOf('image/jpg') !== -1) {
                    imgFormat = 'JPEG';
                }
                pdf.addImage(logo.dataUrl, imgFormat, currentX, pageHeight - 45, logo.drawWidth, logo.drawHeight, undefined, 'FAST');
                currentX += logo.drawWidth + gap;
              } catch (e) {
                console.error('Error adding logo to page', i, e);
              }
            });
          }`;

if (content.indexOf(search) === -1) {
    console.log("Could not find search string!");
} else {
    content = content.replace(search, replace);
    fs.writeFileSync('pages/digital-forms/SignAgreement.tsx', content);
    console.log("Replaced successfully!");
}
