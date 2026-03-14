import React from 'react';

interface PrintableAgreementTemplateProps {
  agreement: any;
  company: any;
}

const PrintableAgreementTemplate: React.FC<PrintableAgreementTemplateProps> = ({ agreement, company }) => {
  if (!agreement) return null;

  return (
    <div 
      id="printable-agreement-template" 
      className="absolute left-[-9999px] top-0 bg-white text-black p-10 font-sans"
      style={{ width: '794px', minHeight: '1123px' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="Company Logo" className="h-16 w-16 object-contain mr-4" crossOrigin="anonymous" />
          ) : (
            <div className="h-16 w-16 bg-gray-200 flex items-center justify-center mr-4 font-bold text-gray-500">LOGO</div>
          )}
          <div>
            <h1 className="text-2xl font-bold uppercase">{company?.name || 'ECA GROUP TRAVEL & TOURS SDN BHD'}</h1>
            <p className="text-sm text-gray-600">{company?.address || '011-55582106 | NO 21-B, JALAN SUARASA 8/3, BANDAR TUN HUSSEIN ONN, 43200 CHERAS, SELANGOR'}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">RENTAL AGREEMENT</h2>
          <p className="text-sm font-medium text-gray-500">Ref: {agreement.id.split('-')[0].toUpperCase()}</p>
        </div>
      </div>

      {/* Booking Details */}
      <div className="mb-6">
        <h3 className="text-lg font-bold border-b border-gray-300 mb-3 pb-1">Booking Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><span className="font-semibold">Customer Name:</span> {agreement.customer_name}</p>
            <p><span className="font-semibold">IC / Passport:</span> {agreement.identity_number}</p>
            <p><span className="font-semibold">Phone:</span> {agreement.customer_phone}</p>
            <p><span className="font-semibold">Email:</span> {agreement.customer_email || 'N/A'}</p>
            <p><span className="font-semibold">Address:</span> {agreement.billing_address}</p>
          </div>
          <div>
            <p><span className="font-semibold">Car Model:</span> {agreement.car_model}</p>
            <p><span className="font-semibold">Plate Number:</span> {agreement.car_plate_number}</p>
            <p><span className="font-semibold">Start Date:</span> {agreement.start_date ? new Date(agreement.start_date).toLocaleDateString() : 'N/A'}</p>
            <p><span className="font-semibold">End Date:</span> {agreement.end_date ? new Date(agreement.end_date).toLocaleDateString() : 'N/A'}</p>
            <p><span className="font-semibold">Total Price:</span> RM {agreement.total_price}</p>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="mb-6">
        <h3 className="text-lg font-bold border-b border-gray-300 mb-3 pb-1">Terms & Conditions</h3>
        <div className="text-xs text-gray-700 space-y-2 text-justify">
          <p>1. The Renter agrees to rent the vehicle described above for the period specified.</p>
          <p>2. The Renter shall return the vehicle in the same condition as received, ordinary wear and tear excepted.</p>
          <p>3. The Renter is responsible for all traffic violations and fines incurred during the rental period.</p>
          <p>4. The vehicle shall not be used for any illegal purposes or driven by unauthorized persons.</p>
          <p>5. In case of accident or damage, the Renter must notify the Owner immediately and file a police report within 24 hours.</p>
          <p>6. The Owner reserves the right to terminate this agreement and repossess the vehicle without notice if the Renter breaches any terms.</p>
          <p>7. A security deposit may be required and will be refunded upon satisfactory return of the vehicle.</p>
          <p>8. The Renter acknowledges that the vehicle is provided "as is" and the Owner makes no warranties, express or implied.</p>
        </div>
      </div>

      {/* Signatures */}
      <div className="mt-12 pt-8 border-t border-gray-300">
        <div className="flex justify-between">
          <div className="w-1/2 pr-8">
            <p className="text-sm font-semibold mb-2">Signed by Renter:</p>
            {agreement.signature_data ? (
              <img src={agreement.signature_data} alt="Signature" className="h-24 object-contain border-b border-black mb-2" crossOrigin="anonymous" />
            ) : (
              <div className="h-24 border-b border-black mb-2"></div>
            )}
            <p className="text-sm font-bold">{agreement.customer_name}</p>
            <p className="text-xs text-gray-500">IC/Passport: {agreement.identity_number}</p>
            {agreement.signed_at && (
              <p className="text-xs text-gray-500">Date: {new Date(agreement.signed_at).toLocaleString()}</p>
            )}
          </div>
          <div className="w-1/2 pl-8">
            <p className="text-sm font-semibold mb-2">Authorized by Owner:</p>
            <div className="h-24 border-b border-black mb-2 flex items-end pb-2">
              <span className="text-gray-400 italic">ECA Fleet Representative</span>
            </div>
            <p className="text-sm font-bold">{company?.name || 'ECA GROUP TRAVEL & TOURS SDN BHD'}</p>
            <p className="text-xs text-gray-500">Date: {new Date(agreement.created_at).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Appendix: Car Photos */}
      {agreement.photos_url && agreement.photos_url.length > 0 && (
        <div className="mt-12" style={{ pageBreakBefore: 'always' }}>
          <h3 className="text-lg font-bold border-b border-gray-300 mb-4 pb-1">Appendix: Vehicle Condition (Before)</h3>
          <div className="grid grid-cols-2 gap-4">
            {agreement.photos_url.map((url: string, index: number) => (
              <div key={index} className="border border-gray-200 p-2 rounded">
                <img src={url} alt={`Car Photo ${index + 1}`} className="w-full h-48 object-cover rounded" crossOrigin="anonymous" />
                <p className="text-xs text-center mt-2 text-gray-500">Photo {index + 1}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintableAgreementTemplate;
