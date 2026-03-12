import * as XLSX from 'xlsx';
import { Car } from '../types';

export const exportData = (cars: Car[]) => {
  const worksheet = XLSX.utils.json_to_sheet(cars.map(car => ({
    'Plate Number': car.plateNumber,
    'Make': car.make,
    'Model': car.model,
    'Road Tax Expiry': car.roadtaxExpiry,
    'Insurance Expiry': car.insuranceExpiry,
    'Inspection Expiry': car.inspectionExpiry,
    'Type': car.type,
    'Status': car.status
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fleet');
  XLSX.writeFile(workbook, `Fleet_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const parseExcel = (file: File): Promise<Car[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];
        
        const cars: Car[] = json.map((row, index) => ({
          id: `imported-${Date.now()}-${index}`,
          plateNumber: row['Plate Number'] || row['plateNumber'] || '',
          make: row['Make'] || row['make'] || '',
          model: row['Model'] || row['model'] || '',
          roadtaxExpiry: row['Road Tax Expiry'] || row['roadtaxExpiry'] || '',
          insuranceExpiry: row['Insurance Expiry'] || row['insuranceExpiry'] || '',
          inspectionExpiry: row['Inspection Expiry'] || row['inspectionExpiry'] || '',
          type: (row['Type'] || row['type'] || 'Economy') as any,
          status: (row['Status'] || row['status'] || 'active') as any,
          name: `${row['Make'] || ''} ${row['Model'] || ''}`.trim(),
          plate: row['Plate Number'] || row['plateNumber'] || ''
        }));
        
        resolve(cars);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
