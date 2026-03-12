import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Agreement } from '../../types';
import { ShieldCheck, PenTool, CheckCircle2, Download, Printer } from 'lucide-react';

const SignAgreement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAgreement();
    }
  }, [id]);

  const fetchAgreement = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAgreementById(id!);
      setAgreement(data);
      if (data?.status === 'signed') {
        setSigned(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Signature Logic
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || signed) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSign = async () => {
    if (!id || signed) return;
    
    try {
      setSigning(true);
      await apiService.updateAgreement(id, { status: 'signed' });
      setSigned(true);
    } catch (err) {
      alert('Failed to sign agreement');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Agreement Not Found</h1>
          <p className="text-slate-500">The link you followed may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Document Header */}
        <div className="bg-white rounded-t-3xl border-x border-t border-slate-200 p-8 sm:p-12 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <ShieldCheck className="w-6 h-6" />
                <span className="font-bold tracking-widest uppercase text-sm">Secure Digital Agreement</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900">Rental Agreement</h1>
              <p className="text-slate-500 mt-2">ID: {agreement.id}</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Date Generated</div>
              <div className="text-xl font-bold text-slate-900">{new Date(agreement.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          {/* Document Content */}
          <div className="space-y-8 text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">1. Parties Involved</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">Company / Agent</div>
                  <div className="font-bold text-slate-900">{agreement.agent_name}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">Customer / Renter</div>
                  <div className="font-bold text-slate-900">{agreement.customer_name}</div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">2. Agreement Details</h2>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-slate-500">Total Rental Amount:</span>
                  <span className="text-2xl font-black text-slate-900">RM {agreement.amount.toLocaleString()}</span>
                </div>
                <div className="text-sm text-slate-600 whitespace-pre-wrap">
                  {agreement.details || 'Standard rental terms apply. Vehicle must be returned in the same condition as received. Fuel level must be maintained as per handover record.'}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">3. Terms & Conditions</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-500">
                <li>The renter agrees to abide by all local traffic laws and regulations.</li>
                <li>The renter is responsible for any summons or fines incurred during the rental period.</li>
                <li>Smoking and pets are strictly prohibited inside the vehicle.</li>
                <li>This agreement is legally binding once signed digitally.</li>
              </ul>
            </section>
          </div>
        </div>

        {/* Signature Section */}
        <div className="bg-slate-900 rounded-b-3xl p-8 sm:p-12 shadow-2xl">
          {signed ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Agreement Signed</h2>
              <p className="text-slate-400 mb-8">This document has been legally executed and recorded.</p>
              <div className="flex justify-center gap-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all">
                  <Download className="w-5 h-5" /> Download PDF
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all">
                  <Printer className="w-5 h-5" /> Print
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="flex items-center gap-2 text-indigo-400 mb-4">
                <PenTool className="w-5 h-5" />
                <span className="font-bold uppercase tracking-widest text-xs">Digital Signature Required</span>
              </div>
              <div className="bg-white rounded-2xl p-4 mb-6">
                <canvas 
                  ref={canvasRef}
                  width={400}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseMove={draw}
                  onMouseOut={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                  className="w-full h-[200px] border-2 border-dashed border-slate-200 rounded-xl cursor-crosshair touch-none"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Sign inside the box</span>
                  <button onClick={clearSignature} className="text-[10px] text-red-500 font-bold uppercase hover:underline">Clear</button>
                </div>
              </div>

              <button 
                onClick={handleSign}
                disabled={signing}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-4 rounded-xl font-black text-lg transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
              >
                {signing ? 'Processing...' : 'Execute Agreement'}
              </button>
              <p className="text-center text-slate-500 text-[10px] mt-4 uppercase tracking-widest font-bold">
                By clicking "Execute Agreement", you agree to the terms above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignAgreement;
