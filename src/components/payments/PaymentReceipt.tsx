import React, { useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';
import logoUrl from '../../assets/logo.png';
import type { Payment, Order, Customer, UserProfile } from '../../types';

interface PaymentReceiptProps {
  payment: Payment & {
    order?: Order & { customer?: Customer };
    created_by_profile?: UserProfile;
  };
  balanceDue: number;
  onClose: () => void;
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return d.split('T')[0].split('-').reverse().join(' / ');
}

function fmtUSD(n: number) {
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtIQD(n: number) {
  return `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })} IQD`;
}

export function PaymentReceipt({ payment, balanceDue, onClose }: PaymentReceiptProps) {
  const [logoBase64, setLogoBase64] = useState<string>('');

  useEffect(() => {
    fetch(logoUrl)
      .then(r => r.blob())
      .then(blob => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }))
      .then(setLogoBase64)
      .catch(() => setLogoBase64(`${window.location.origin}${logoUrl}`));
  }, []);

  const customer = payment.order?.customer;
  const employee = payment.created_by_profile;
  const customerName = customer?.full_name_ku || customer?.full_name_en || '—';
  const employeeName = employee?.full_name_ku || employee?.full_name_en || '—';

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')} / ${String(today.getMonth() + 1).padStart(2, '0')} / ${today.getFullYear()}`;

  const amountDisplay = payment.currency === 'IQD'
    ? `${fmtIQD(payment.amount_in_currency)} (${fmtUSD(payment.amount_usd)})`
    : fmtUSD(payment.amount_usd);

  const handlePrint = () => {
    const logoSrc = logoBase64 || `${window.location.origin}${logoUrl}`;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ckb">
<head>
<meta charset="UTF-8"/>
<title>پسوڵەی پارە وەرگرتن - ${payment.payment_number}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, "Noto Sans Arabic", Tahoma, sans-serif; font-size: 10pt; direction: rtl; background: #fff; }
  @page { size: A4; margin: 12mm 14mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div style="width:100%;min-height:250mm;display:flex;flex-direction:column">
  <table style="width:100%;border-collapse:collapse;padding-bottom:4mm;border-bottom:3px solid #1e6356;margin-bottom:5mm">
    <tr>
      <td style="width:22%"><img src="${logoSrc}" alt="ALVIC HOME" style="height:16mm;width:auto;display:block"/></td>
      <td style="text-align:center">
        <div style="font-size:15pt;font-weight:900;color:#0f3d33;line-height:1.1">ALVIC HOME</div>
        <div style="font-size:8pt;color:#666;margin-top:1mm">Home Interior &amp; Custom Furniture</div>
        <div style="font-size:14pt;font-weight:900;color:#0f3d33;margin-top:2mm">پسوڵەی پارە وەرگرتن</div>
      </td>
      <td style="text-align:left;width:26%;font-size:9pt;line-height:1.8">
        <div><strong>ژمارە:</strong> ${payment.payment_number}</div>
        <div><strong>بەروار:</strong> ${fmtDate(payment.payment_date)}</div>
      </td>
    </tr>
  </table>

  <div style="flex:1">
    <table style="width:100%;border-collapse:collapse;border:1px solid #dde8c8;margin-bottom:4mm">
      <tr>
        <td style="padding:3mm 4mm;background:#f0f4e8;font-weight:700;font-size:10pt;border-bottom:1px solid #dde8c8;width:45%">بڕی پارەی وەرگیراو</td>
        <td style="padding:3mm 4mm;font-weight:900;font-size:11pt;color:#0f3d33;border-bottom:1px solid #dde8c8">${amountDisplay}</td>
      </tr>
      <tr>
        <td style="padding:3mm 4mm;background:#f0f4e8;font-weight:700;font-size:10pt;border-bottom:1px solid #dde8c8">وەرگیرا لە بەڕێز</td>
        <td style="padding:3mm 4mm;font-weight:700;font-size:10pt;color:#0f3d33;border-bottom:1px solid #dde8c8">${customerName}</td>
      </tr>
      <tr>
        <td style="padding:3mm 4mm;background:#f0f4e8;font-weight:700;font-size:10pt;border-bottom:1px solid #dde8c8">ناوی ژمێریار</td>
        <td style="padding:3mm 4mm;font-weight:700;font-size:10pt;color:#0f3d33;border-bottom:1px solid #dde8c8">${employeeName}</td>
      </tr>
      <tr>
        <td style="padding:3mm 4mm;background:#f0f4e8;font-weight:700;font-size:10pt;border-bottom:1px solid #dde8c8">جۆری پارەدان</td>
        <td style="padding:3mm 4mm;font-weight:700;font-size:10pt;color:#0f3d33;border-bottom:1px solid #dde8c8">${
          payment.payment_type === 'deposit' ? 'پێشەکی' :
          payment.payment_type === 'installment' ? 'قیست' :
          payment.payment_type === 'final' ? 'پارەی کۆتایی' :
          payment.payment_type === 'partial' ? 'بەشێک' :
          payment.payment_type === 'reversal' ? 'گەڕاندنەوە' :
          payment.payment_type
        }</td>
      </tr>
      <tr>
        <td style="padding:3mm 4mm;background:#f0f4e8;font-weight:700;font-size:10pt;border-bottom:1px solid #dde8c8">ژمارەی ئۆردەر</td>
        <td style="padding:3mm 4mm;font-weight:700;font-size:10pt;color:#0f3d33;border-bottom:1px solid #dde8c8">${(payment.order as Record<string, unknown>)?.order_number || '—'}</td>
      </tr>
      ${payment.notes_ku ? `<tr>
        <td style="padding:3mm 4mm;background:#f0f4e8;font-weight:700;font-size:10pt;border-bottom:1px solid #dde8c8">تێبینی</td>
        <td style="padding:3mm 4mm;font-weight:700;font-size:10pt;color:#555;border-bottom:1px solid #dde8c8">${payment.notes_ku}</td>
      </tr>` : ''}
    </table>

    <div style="padding:4mm 5mm;background:#fff3cd;border:1.5px solid #f0c040;border-radius:3mm">
      <span style="font-weight:900;font-size:11pt;color:#7a4f00">بڕی پارەی ماوە: </span>
      <span style="font-weight:900;font-size:12pt;color:#b03a00">${fmtUSD(balanceDue)}</span>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-top:12mm">
    <tr>
      <td style="width:40%;padding-top:10mm;border-top:1.5px solid #555;text-align:center;font-weight:700;font-size:10pt">واژۆی ژمێریار</td>
      <td style="width:60%"></td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-top:6mm;border-top:1px solid #cfcfcf;padding-top:2mm">
    <tr style="font-size:7.5pt;color:#666">
      <td>سلێمانی - ئاشتی - فلکەی خاڵە حاجی</td>
      <td style="text-align:center">Facebook: Alvic Home</td>
      <td style="text-align:left;direction:ltr">0750 218 1800 | 0770 770 7065</td>
    </tr>
  </table>
</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
  };

  const rowStyle: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '45% 55%', borderBottom: '1px solid #dde8c8',
  };
  const labelStyle: React.CSSProperties = {
    padding: '3mm 4mm', background: '#f0f4e8', fontWeight: 700, fontSize: '10pt',
  };
  const valueStyle: React.CSSProperties = {
    padding: '3mm 4mm', fontWeight: 700, fontSize: '10pt', color: '#0f3d33',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-6">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-800" style={{ direction: 'rtl' }}>پسوڵەی پارە وەرگرتن</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white text-sm font-semibold rounded-xl hover:bg-emerald-800 transition-colors"
            >
              <Printer size={15} />
              چاپکردن
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div
            className="bg-white shadow-lg mx-auto flex flex-col"
            style={{ width: 'min(210mm, 100%)', minHeight: '200mm', padding: 'clamp(8mm,3vw,12mm) clamp(8mm,3vw,14mm)', fontFamily: 'Arial, "Noto Sans Arabic", Tahoma, sans-serif', fontSize: 'clamp(9pt,1.5vw,10pt)', direction: 'rtl' }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5mm', borderBottom: '3px solid #1e6356', paddingBottom: '4mm' }}>
              <tbody>
                <tr>
                  <td style={{ width: '22%' }}>
                    {logoBase64 && <img src={logoBase64} alt="ALVIC HOME" style={{ height: '16mm', width: 'auto', display: 'block' }} />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '15pt', fontWeight: 900, color: '#0f3d33', lineHeight: 1.1 }}>ALVIC HOME</div>
                    <div style={{ fontSize: '8pt', color: '#666', marginTop: '1mm' }}>Home Interior & Custom Furniture</div>
                    <div style={{ fontSize: '14pt', fontWeight: 900, color: '#0f3d33', marginTop: '2mm' }}>پسوڵەی پارە وەرگرتن</div>
                  </td>
                  <td style={{ textAlign: 'left', width: '26%', fontSize: '9pt', lineHeight: 1.8 }}>
                    <div><strong>ژمارە:</strong> {payment.payment_number}</div>
                    <div><strong>بەروار:</strong> {fmtDate(payment.payment_date)}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #dde8c8', marginBottom: '4mm' }}>
                <tbody>
                  <tr>
                    <td style={{ ...labelStyle, borderBottom: '1px solid #dde8c8', width: '45%' }}>بڕی پارەی وەرگیراو</td>
                    <td style={{ ...valueStyle, borderBottom: '1px solid #dde8c8', fontWeight: 900, fontSize: '11pt' }}>{amountDisplay}</td>
                  </tr>
                  <tr>
                    <td style={{ ...labelStyle, borderBottom: '1px solid #dde8c8', width: '45%' }}>وەرگیرا لە بەڕێز</td>
                    <td style={{ ...valueStyle, borderBottom: '1px solid #dde8c8' }}>{customerName}</td>
                  </tr>
                  <tr>
                    <td style={{ ...labelStyle, borderBottom: '1px solid #dde8c8', width: '45%' }}>ناوی ژمێریار</td>
                    <td style={{ ...valueStyle, borderBottom: '1px solid #dde8c8' }}>{employeeName}</td>
                  </tr>
                  <tr>
                    <td style={{ ...labelStyle, borderBottom: '1px solid #dde8c8', width: '45%' }}>جۆری پارەدان</td>
                    <td style={{ ...valueStyle, borderBottom: '1px solid #dde8c8' }}>
                      {payment.payment_type === 'deposit' ? 'پێشەکی' :
                       payment.payment_type === 'installment' ? 'قیست' :
                       payment.payment_type === 'final' ? 'پارەی کۆتایی' :
                       payment.payment_type === 'partial' ? 'بەشێک' :
                       payment.payment_type === 'reversal' ? 'گەڕاندنەوە' :
                       payment.payment_type}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ ...labelStyle, borderBottom: '1px solid #dde8c8', width: '45%' }}>ژمارەی ئۆردەر</td>
                    <td style={{ ...valueStyle, borderBottom: '1px solid #dde8c8' }}>{(payment.order as Record<string, unknown>)?.order_number as string || '—'}</td>
                  </tr>
                  {payment.notes_ku ? (
                    <tr>
                      <td style={{ ...labelStyle, width: '45%' }}>تێبینی</td>
                      <td style={{ ...valueStyle, color: '#555' }}>{payment.notes_ku}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              <div style={{ padding: '4mm 5mm', background: '#fff3cd', border: '1.5px solid #f0c040', borderRadius: '3mm' }}>
                <span style={{ fontWeight: 900, fontSize: '11pt', color: '#7a4f00' }}>بڕی پارەی ماوە: </span>
                <span style={{ fontWeight: 900, fontSize: '12pt', color: '#b03a00' }}>{fmtUSD(balanceDue)}</span>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12mm' }}>
              <tbody>
                <tr>
                  <td style={{ width: '40%', paddingTop: '10mm', borderTop: '1.5px solid #555', textAlign: 'center', fontWeight: 700, fontSize: '10pt' }}>واژۆی ژمێریار</td>
                  <td style={{ width: '60%' }}></td>
                </tr>
              </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6mm', borderTop: '1px solid #cfcfcf', paddingTop: '2mm' }}>
              <tbody>
                <tr style={{ fontSize: '8pt', color: '#666' }}>
                  <td>سلێمانی - ئاشتی - فلکەی خاڵە حاجی</td>
                  <td style={{ textAlign: 'center' }}>Facebook: Alvic Home</td>
                  <td style={{ textAlign: 'left', direction: 'ltr' }}>0750 218 1800 | 0770 770 7065</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
