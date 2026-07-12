const fs = require('fs');
let content = fs.readFileSync('pages/VehicleRevenueReport.tsx', 'utf8');

const importSearch = `import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';`;
const importReplace = `import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, getDaysInMonth } from 'date-fns';`;
content = content.replace(importSearch, importReplace);

const hookSearch = `  const { vehicleData, totalRevenue, totalBookings } = useMemo(() => {
    if (!data) return { vehicleData: [], totalRevenue: 0, totalBookings: 0 };

    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);

    const completedAgreements = data.agreements.filter(a => {
      const status = a.status?.toLowerCase().trim();
      const payoutStatus = a.payout_status?.toLowerCase().trim();
      
      // Only recognize sales if the agreement is completed AND it has been audited (approved or paid)
      if (status !== 'completed' || (payoutStatus !== 'approved' && payoutStatus !== 'paid')) {
        return false;
      }
      
      const pickupDateObj = getAgreementPickupDateTime(a);
      return isWithinInterval(pickupDateObj, { start, end });
    });

    const revenueByCar: Record<string, { total: number; count: number }> = {};
    let totalRev = 0;
    
    completedAgreements.forEach(a => {
      const plate = a.car_plate_number || 'Unknown';
      const price = a.total_price || 0;
      
      if (!revenueByCar[plate]) {
        revenueByCar[plate] = { total: 0, count: 0 };
      }
      revenueByCar[plate].total += price;
      revenueByCar[plate].count += 1;
      totalRev += price;
    });

    const formattedData = Object.entries(revenueByCar)
      .map(([plate, stats]) => {
        // Try to find the car model
        const carInfo = data.cars.find(c => c.plate === plate);
        const name = carInfo ? \`\${carInfo.make || ''} \${carInfo.model || carInfo.name}\`.trim() : 'Unknown Model';
        
        return {
          plate,
          name,
          revenue: stats.total,
          bookings: stats.count
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return { 
      vehicleData: formattedData, 
      totalRevenue: totalRev,
      totalBookings: completedAgreements.length
    };
  }, [data, selectedMonth]);`;

const hookReplace = `  const { vehicleData, totalRevenue, totalBookings, daysInMonth } = useMemo(() => {
    if (!data) return { vehicleData: [], totalRevenue: 0, totalBookings: 0, daysInMonth: 30 };

    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const monthDays = getDaysInMonth(selectedMonth);

    const completedAgreements = data.agreements.filter(a => {
      const status = a.status?.toLowerCase().trim();
      const payoutStatus = a.payout_status?.toLowerCase().trim();
      
      if (status !== 'completed' || (payoutStatus !== 'approved' && payoutStatus !== 'paid')) {
        return false;
      }
      
      const pickupDateObj = getAgreementPickupDateTime(a);
      return isWithinInterval(pickupDateObj, { start, end });
    });

    const getAgreementReturnDateTime = (agreement: any, pickup: Date): Date => {
      if (agreement.actual_end_time) return new Date(agreement.actual_end_time);
      if (agreement.duration_days) {
        return new Date(pickup.getTime() + agreement.duration_days * 24 * 60 * 60 * 1000);
      }
      if (agreement.end_date) {
        let dateStr = agreement.end_date;
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            dateStr = \`\${parts[2]}-\${parts[1].padStart(2, '0')}-\${parts[0].padStart(2, '0')}\`;
          }
        }
        const timeStr = agreement.return_time || '12:00';
        let formattedTime = timeStr;
        const timeMatch = timeStr.match(/(\\d+):(\\d+)\\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = timeMatch[2];
          const modifier = timeMatch[3];
          if (modifier) {
            if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
          }
          formattedTime = \`\${hours.toString().padStart(2, '0')}:\${minutes}:00\`;
        }
        return new Date(\`\${dateStr}T\${formattedTime}+08:00\`);
      }
      return pickup;
    };

    const carStats: Record<string, { total: number; count: number; rentedDays: number; name: string }> = {};
    
    data.cars.forEach(c => {
      if (c.plate) {
        carStats[c.plate] = { 
          total: 0, 
          count: 0, 
          rentedDays: 0,
          name: \`\${c.make || ''} \${c.model || c.name}\`.trim()
        };
      }
    });

    let totalRev = 0;
    
    completedAgreements.forEach(a => {
      const plate = a.car_plate_number || 'Unknown';
      const price = a.total_price || 0;
      
      if (!carStats[plate]) {
        carStats[plate] = { total: 0, count: 0, rentedDays: 0, name: 'Unknown Model' };
      }
      carStats[plate].total += price;
      carStats[plate].count += 1;
      totalRev += price;
    });

    const validStatuses = ['signed', 'completed', 'reconciled'];
    const validAgreements = data.agreements.filter(a => validStatuses.includes(a.status?.toLowerCase().trim() || ''));

    validAgreements.forEach(a => {
      const plate = a.car_plate_number || 'Unknown';
      if (!carStats[plate]) {
        carStats[plate] = { total: 0, count: 0, rentedDays: 0, name: 'Unknown Model' };
      }

      const pickup = getAgreementPickupDateTime(a);
      const ret = getAgreementReturnDateTime(a, pickup);

      const overlapStart = Math.max(start.getTime(), pickup.getTime());
      const overlapEnd = Math.min(end.getTime(), ret.getTime());

      if (overlapStart < overlapEnd) {
        const msInDay = 24 * 60 * 60 * 1000;
        const days = (overlapEnd - overlapStart) / msInDay;
        carStats[plate].rentedDays += days;
      }
    });

    const formattedData = Object.entries(carStats)
      .filter(([plate, stats]) => stats.total > 0 || stats.rentedDays > 0)
      .map(([plate, stats]) => {
        return {
          plate,
          name: stats.name,
          revenue: stats.total,
          bookings: stats.count,
          rentedDays: Math.min(Math.round(stats.rentedDays), monthDays)
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return { 
      vehicleData: formattedData, 
      totalRevenue: totalRev,
      totalBookings: completedAgreements.length,
      daysInMonth: monthDays
    };
  }, [data, selectedMonth]);`;
content = content.replace(hookSearch, hookReplace);

fs.writeFileSync('pages/VehicleRevenueReport.tsx', content);
console.log("Patched hook successfully");
