const fs = require('fs');
let content = fs.readFileSync('pages/VehicleRevenueReport.tsx', 'utf8');

const tableHeaderSearch = `<th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Bookings
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Revenue Generated
                    </th>`;

const tableHeaderReplace = `<th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Bookings
                    </th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Utilization
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Revenue Generated
                    </th>`;

const tableRowSearch = `<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center font-medium">
                        {row.bookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-bold">
                        {currencyFormatter.format(row.revenue)}
                      </td>`;

const tableRowReplace = `<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center font-medium">
                        {row.bookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex flex-col items-center justify-center">
                          <span className="text-sm font-bold text-slate-700">{row.rentedDays} / {daysInMonth}</span>
                          <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Days</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-bold">
                        {currencyFormatter.format(row.revenue)}
                      </td>`;

content = content.replace(tableHeaderSearch, tableHeaderReplace);
content = content.replace(tableRowSearch, tableRowReplace);

fs.writeFileSync('pages/VehicleRevenueReport.tsx', content);
console.log("Patched table successfully");
