import React, { useEffect, useState } from 'react';
import type { Order, Customer, OrderItem } from '../../types';
import logoUrl from '../../assets/logo.png';

// NOTE: You'll need to export buildItemConfigRows, fmtDate, PageHeader, and PageFooter
// from OrderContract.tsx. If you prefer not to, just copy them into this file.
const KITCHEN_BEDROOM_FIELDS = [
  { key: 'upper_cabinet_door_color_ku', label: 'ڕەنگی دەرگای  سەرەوە' },
  { key: 'lower_cabinet_door_color_ku', label: 'ڕەنگی دەرگای  خوارەوە' },
  { key: 'cabinet_body_color_ku', label: 'ڕەنگی هەیکەل' },
  { key: 'naxsh_ku', label: 'نەخش' },
  { key: 'crown_ku', label: 'تاج' },
  { key: 'kiler_ku', label: 'کیلەر' },
  { key: 'cabinet_top_ku', label: 'سەری کەوانتەر' },
  { key: 'stove_ku', label: 'تەباخ ' },
  { key: 'countertop_ku', label: 'سەر کەوانتەر(بەرد)' },
  { key: 'liner_led_ku', label: 'لید LED' },
  { key: 'suction_device_ku', label: ' مورەشەح' },
  { key: 'microwave_ku', label: 'مایکرۆوێڤ' },
  { key: 'mujameda_ku', label: 'موجەمیدە' },
  { key: 'handle_type_ku', label: 'جۆری دەسک' },
  { key: 'oven_ku', label: 'فڕن' },
  { key: 'fridge_ku', label: 'سەلاجە' },
  { key: 'washer_ku', label: 'جلشۆر ' },
  { key: 'baza_ku', label: 'بازە' },
  { key: 'glass_color_ku', label: 'ڕەنگی شووشە' },
];

const CONSOLE_FIELDS = [
  { key: 'measurement_ku', label: 'قیاس' },
  { key: 'color_ku', label: 'ڕەنگ' },
  { key: 'material', label: 'مادە' },
];
function fmtDate(d?: string) {
  if (!d) return '—';
  return d.split('T')[0].split('-').reverse().join(' / ');
}
function buildItemConfigRows(item: OrderItem): { label: string; value: string }[] {
  const cfg = item.config as Record<string, string | undefined>;
  if (!cfg) return [];

  const isKitchenOrBedroom =
    item.product_type === 'kitchen_cabinet' || item.product_type === 'bedroom_cabinet';
  const isConsole =
    item.product_type === 'tv_console' ||
    item.product_type === 'shoe_cabinet' ||
    item.product_type === 'understairs_cabinet' ||
    item.product_type === 'custom_console';

  const rows: { label: string; value: string }[] = [];

  if (item.quantity > 1) rows.push({ label: 'دانە', value: String(item.quantity) });

  if (isKitchenOrBedroom) {
    for (const f of KITCHEN_BEDROOM_FIELDS) {
      const val = cfg[f.key];
      if (val) rows.push({ label: f.label, value: val });
    }
  } else if (isConsole) {
    for (const f of CONSOLE_FIELDS) {
      const val = cfg[f.key];
      if (val) rows.push({ label: f.label, value: val });
    }
  } else {
    for (const [k, v] of Object.entries(cfg)) {
      if (v && k !== 'project_design_url') {
        rows.push({ label: k.replace(/_/g, ' '), value: String(v) });
      }
    }
  }
  return rows;
}
interface ManufacturingReceiptProps {
  order: Order & { customer?: Customer; items?: OrderItem[] };
  onClose: () => void;
}

export function ManufacturingReceipt({ order, onClose }: ManufacturingReceiptProps) {
  const customer = order.customer as Customer | undefined;
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

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')} / ${String(today.getMonth() + 1).padStart(2, '0')} / ${today.getFullYear()}`;
  const items = order.items || [];

  const buildHtml = () => {
    const logoSrc = logoBase64 || `${window.location.origin}${logoUrl}`;

    const headerHtml = `
      <div class="page-header">
        <table style="width:100%;border-collapse:collapse;padding-bottom:4mm;border-bottom:3px solid #1e6356">
          <tr>
            <td style="width:22%"><img src="${logoSrc}" alt="ALVIC HOME" style="height:16mm;width:auto;display:block"/></td>
            <td style="text-align:center">
              <div style="font-size:15pt;font-weight:900;color:#0f3d33;line-height:1.1">ALVIC HOME</div>
              <div style="font-size:8pt;color:#666;margin-top:1mm">Home Interior &amp; Custom Furniture</div>
              <div style="font-size:13pt;font-weight:900;color:#0f3d33;margin-top:2mm">فۆڕمی دروستکردن</div>
            </td>
            <td style="text-align:left;width:26%;font-size:9pt;line-height:1.8">
              <div><strong>ژمارە:</strong> ${order.order_number}</div>
              <div><strong>بەروار:</strong> ${dateStr}</div>
            </td>
          </tr>
        </table>
      </div>`;

    const footerHtml = `
      <div class="page-footer">
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #cfcfcf;padding-top:2mm">
          <tr style="font-size:7.5pt;color:#666">
            <td>سلێمانی - ئاشتی - فلکەی خاڵە حاجی</td>
            <td style="text-align:center">Facebook: Alvic Home</td>
            <td style="text-align:left;direction:ltr">0750 218 1800 | 0770 770 7065</td>
          </tr>
        </table>
      </div>`;

    const row = (label: string, value: string) => `
      <tr>
        <td style="padding:2.5mm 4mm;background:#f0f4e8;font-weight:700;font-size:10pt;border-bottom:1px solid #dde8c8;width:45%">${label}</td>
        <td style="padding:2.5mm 4mm;font-weight:700;font-size:10pt;color:#0f3d33;border-bottom:1px solid #dde8c8">${value}</td>
      </tr>`;

    const itemDetailPages = items.map((item, idx) => {
  const cfgRows = buildItemConfigRows(item);
  const cfgHtml = cfgRows.length > 0
    ? cfgRows.map(r => row(r.label, r.value)).join('')
    : `<tr><td colspan="2" style="padding:3mm 4mm;color:#888;font-size:9pt">زانیاری تەواو تۆمار نەکراوە</td></tr>`;

  const itemNotesHtml = item.notes_ku
    ? `<div style="margin-top:3mm;padding:3mm 4mm;background:#fffbea;border:1px solid #f0d080;font-size:9pt;color:#555">${item.notes_ku}</div>`
    : '';

  const customerSection = idx === 0 ? `
    <div style="background:#1e6356;color:#fff;padding:2mm 4mm;font-weight:700;font-size:10pt;margin-bottom:0">زانیاری کڕیار</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #dde8c8;margin-bottom:4mm">
      ${row('ناوی کڕیار', customer?.full_name_ku || customer?.full_name_en || '—')}
      ${row('ناونیشان', customer?.address_ku || customer?.address_en || '—')}
      ${row('ژمارەی سەرەکی', customer?.phone || '—')}
      ${row('ژمارەی لاوەکی', customer?.phone_secondary || '—')}
      ${order.start_date ? row('بەرواری دەستپێک', fmtDate(order.start_date)) : ''}
      ${order.end_date ? row('بەرواری کۆتایی', fmtDate(order.end_date)) : ''}
    </table>` : '';

  return `
  <div ${idx > 0 ? 'class="page-break"' : ''}>
    ${headerHtml}
    <div style="margin:4mm 0 3mm;padding:3mm 4mm;background:#0f3d33;color:#fff;font-weight:900;font-size:11pt;display:flex;justify-content:space-between;align-items:center">
      <span>${item.item_name_ku || item.product_type_name_ku || item.item_name_en}</span>
      <span style="font-size:9pt;opacity:0.8">${idx + 1} / ${items.length}</span>
    </div>
    ${customerSection}
    <div style="background:#1e6356;color:#fff;padding:2mm 4mm;font-weight:700;font-size:10pt;margin-bottom:0">وردەکاری بەرهەم</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #dde8c8;margin-bottom:3mm">
      ${row('جۆری بەرهەم', item.product_type_name_ku || item.product_type_name_en || '—')}
      ${cfgHtml}
    </table>
    ${itemNotesHtml}
    ${footerHtml}
  </div>`;
}).join('');

    return `<!DOCTYPE html>
<html dir="rtl" lang="ckb">
<head>
<meta charset="UTF-8"/>
<title>فۆڕمی دروستکردن — ${order.order_number}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 14mm 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, "Noto Sans Arabic", Tahoma, sans-serif; background: #fff; color: #111; font-size: 10pt; }
  table { width: 100%; border-collapse: collapse; }
  .page-break { page-break-before: always; }
  .page-header { margin-bottom: 5mm; }
  .page-footer { margin-top: 5mm; }
</style>
</head>
<body>
${itemDetailPages}
</body>
</html>`;
  };

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) { document.body.removeChild(iframe); return; }

    iframeDoc.open();
    iframeDoc.write(buildHtml());
    iframeDoc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <h2 className="text-base font-bold text-gray-900">فۆڕمی دروستکردن — Manufacturing Form</h2>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors">
            چاپکردن / Print
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
            داخستن / Close
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-gray-100 min-h-[calc(100vh-56px)]" dir="rtl">
        {items.map((item, idx) => {
  const cfgRows = buildItemConfigRows(item);
  return (
    <div
      key={item.id || idx}
      className="bg-white shadow-lg mx-auto mb-6 flex flex-col"
      style={{ width: 'min(210mm, 100%)', minHeight: '297mm', padding: 'clamp(8mm, 3vw, 12mm) clamp(8mm, 3vw, 14mm)', fontFamily: 'Arial, "Noto Sans Arabic", Tahoma, sans-serif', fontSize: 'clamp(9pt, 1.5vw, 10pt)' }}
    >
      <div className="flex-1">
        <MfgPageHeader logoBase64={logoBase64} orderNumber={order.order_number} dateStr={dateStr} />

        

        {/* Customer Info Section */}
        {idx === 0 && (
  <>
        <div style={{ background: '#1e6356', color: '#fff', padding: '2mm 4mm', fontWeight: 700, fontSize: '10pt' }}>زانیاری کڕیار</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #dde8c8', marginBottom: '4mm' }}>
          <tbody>
            <TableRow label="ناوی کڕیار" value={customer?.full_name_ku || customer?.full_name_en || '—'} />
            <TableRow label="ناونیشان" value={customer?.address_ku || customer?.address_en || '—'} />
            <TableRow label="ژمارەی سەرەکی" value={customer?.phone || '-'} />
            <TableRow label="ژمارەی لاوەکی" value={customer?.phone_secondary || '-'} />
            {order.start_date && <TableRow label="بەرواری دەستپێک" value={fmtDate(order.start_date)} />}
            {order.end_date && <TableRow label="بەرواری کۆتایی" value={fmtDate(order.end_date)} />}
          </tbody>
        </table>
</>
)}
<div style={{ margin: '4mm 0 3mm', padding: '3mm 4mm', background: '#0f3d33', color: '#fff', fontWeight: 900, fontSize: '11pt', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{item.item_name_ku || item.product_type_name_ku || item.item_name_en}</span>
          <span style={{ fontSize: '9pt', opacity: 0.75 }}>{idx + 1} / {items.length}</span>
        </div>
        {/* Item Details Section */}
        <div style={{ background: '#1e6356', color: '#fff', padding: '2mm 4mm', fontWeight: 700, fontSize: '10pt' }}>وردەکاری بەرهەم</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #dde8c8', marginBottom: '3mm' }}>
          <tbody>
            <TableRow label="جۆری بەرهەم" value={item.product_type_name_ku || item.product_type_name_en || '—'} />
            {cfgRows.length > 0
              ? cfgRows.map((r, i) => <TableRow key={i} label={r.label} value={r.value} />)
              : <tr><td colSpan={2} style={{ padding: '3mm 4mm', color: '#888', fontSize: '9pt' }}>زانیاری تەواو تۆمار نەکراوە</td></tr>
            }
          </tbody>
        </table>

        {item.notes_ku && (
          <div style={{ padding: '3mm 4mm', background: '#fffbea', border: '1px solid #f0d080', fontSize: '9pt', color: '#555' }}>
            {item.notes_ku}
          </div>
        )}
      </div>
      <MfgPageFooter />
    </div>
  );
})}
      </div>
    </div>
  );
}

function MfgPageHeader({ logoBase64, orderNumber, dateStr }: { logoBase64: string; orderNumber: string; dateStr: string }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5mm', borderBottom: '3px solid #1e6356', paddingBottom: '4mm' }}>
      <tbody>
        <tr>
          <td style={{ width: '22%' }}>
            {logoBase64 && <img src={logoBase64} alt="ALVIC HOME" style={{ height: '16mm', width: 'auto', display: 'block' }} />}
          </td>
          <td style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15pt', fontWeight: 900, color: '#0f3d33', lineHeight: 1.1 }}>ALVIC HOME</div>
            <div style={{ fontSize: '8pt', color: '#666', marginTop: '1mm' }}>Home Interior & Custom Furniture</div>
            <div style={{ fontSize: '13pt', fontWeight: 900, color: '#0f3d33', marginTop: '2mm' }}>فۆڕمی دروستکردن</div>
          </td>
          <td style={{ textAlign: 'left', width: '26%', fontSize: '9pt', lineHeight: 1.8 }}>
            <div><strong>ژمارە:</strong> {orderNumber}</div>
            <div><strong>بەروار:</strong> {dateStr}</div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function MfgPageFooter() {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '5mm', borderTop: '1px solid #cfcfcf', paddingTop: '2mm' }}>
      <tbody>
        <tr style={{ fontSize: '8pt', color: '#666' }}>
          <td>سلێمانی - ئاشتی - فلکەی خاڵە حاجی</td>
          <td style={{ textAlign: 'center' }}>Facebook: Alvic Home</td>
          <td style={{ textAlign: 'left', direction: 'ltr' }}>0750 218 1800 | 0770 770 7065</td>
        </tr>
      </tbody>
    </table>
  );
}

function TableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: '2.5mm 4mm', background: '#f0f4e8', fontWeight: 700, fontSize: '10pt', borderBottom: '1px solid #dde8c8', width: '45%' }}>{label}</td>
      <td style={{ padding: '2.5mm 4mm', fontWeight: 700, fontSize: '10pt', color: '#0f3d33', borderBottom: '1px solid #dde8c8' }}>{value}</td>
    </tr>
  );
}