import { useState, useEffect } from 'react';
import { QrCode, Plus, Download, Printer, Grid3x3 as Grid3X3, RotateCcw } from 'lucide-react';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { subscribeToTables, addTable, updateTable, deleteTable } from '../../firebase/db';
import toast from 'react-hot-toast';
import type { Table } from '../../types';

function generateQRDataURL(url: string): Promise<string> {
  return import('qrcode').then(QRCode =>
    QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
  );
}

function getTableQrToken(table: Table): string {
  return table.qrToken || table.id.substring(0, 4);
}

function generate4CharToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 4; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function Tables() {
  const { restaurantId, restaurant, isDemo } = useAuthContext();
  const { t } = useI18n();
  const [tables, setTables] = useState<Table[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [tableNum, setTableNum] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [qrLoading, setQrLoading] = useState(true);

  // Always use the current origin so QR codes point to the live domain.
  // Never use VITE_APP_BASE_URL — it may contain localhost in development.
  const origin = window.location.origin;

  // Build a QR URL safely — strips any leading slash from slug so we
  // never produce double-slashes like //abhiruchi.
  function buildQrUrl(slug: string, tableNumber: string, token: string): string {
    const cleanSlug = slug.replace(/^\/+/, '');
    return `${origin}/${cleanSlug}?table=${encodeURIComponent(tableNumber)}&p=${encodeURIComponent(token)}`;
  }

  useEffect(() => {
    if (!restaurantId) return;
    return subscribeToTables(restaurantId, setTables);
  }, [restaurantId]);

  // Generate QR data URLs whenever tables or restaurant changes
  useEffect(() => {
    if (!restaurant?.slug || tables.length === 0) {
      setQrImages({});
      setQrLoading(false);
      return;
    }

    setQrLoading(true);
    let cancelled = false;

    async function generateAll() {
      const results: Record<string, string> = {};
      const promises = tables.map(async table => {
        const url = buildQrUrl(restaurant!.slug, table.number, getTableQrToken(table));
        try {
          results[table.id] = await generateQRDataURL(url);
        } catch {
          // Individual card renders a fallback when QR generation fails.
        }
      });
      await Promise.all(promises);
      if (!cancelled) {
        setQrImages(results);
        setQrLoading(false);
      }
    }

    generateAll();
    return () => { cancelled = true; };
  }, [tables, restaurant, restaurant?.slug, baseUrl]);

  async function handleAddTable() {
    const number = tableNum.trim();
    if (!number) {
      toast.error('Table number is required');
      return;
    }
    if (tables.some(table => table.number.toLowerCase() === number.toLowerCase())) {
      toast.error('A table with this number already exists');
      return;
    }
    setSaving(true);
    try {
      if (isDemo) {
        setTables(prev => {
          const list = [...prev, { id: `t-${Date.now()}`, number, status: 'available' as const, currentOrderId: null, qrToken: generate4CharToken() }];
          return list.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' }));
        });
      } else if (restaurantId) {
        await addTable(restaurantId, { number, status: 'available', currentOrderId: null });
      }
      toast.success(t('tables.tableSaved'));
      setAddModal(false);
      setTableNum('');
    } finally { setSaving(false); }
  }

  async function handleStatusChange(table: Table, status: Table['status']) {
    if (isDemo) {
      setTables(prev => prev.map(tb => tb.id === table.id ? { ...tb, status } : tb));
    } else if (restaurantId) {
      await updateTable(restaurantId, table.id, { status });
    }
    setSelectedTable(null);
    toast.success(t('tables.tableSaved'));
  }

  async function handleRotateQrToken(table: Table) {
    if (!confirm(`Regenerate QR code for ${t('generic.table')} ${table.number}? Old printed QR codes for this table will stop working.`)) return;
    const nextToken = generate4CharToken();
    if (isDemo) {
      setTables(prev => prev.map(tb => tb.id === table.id ? { ...tb, qrToken: nextToken } : tb));
    } else if (restaurantId) {
      await updateTable(restaurantId, table.id, { qrToken: nextToken });
    }
    setSelectedTable(null);
    toast.success('QR code regenerated');
  }

  async function handleDelete(table: Table) {
    if (!confirm(`${t('generic.delete')} ${t('generic.table')} ${table.number}?`)) return;
    if (isDemo) {
      setTables(prev => prev.filter(tb => tb.id !== table.id));
    } else if (restaurantId) {
      await deleteTable(restaurantId, table.id);
    }
    setSelectedTable(null);
    toast.success(t('tables.tableDeleted'));
  }

  function handleDownload(table: Table) {
    const dataUrl = qrImages[table.id];
    if (!dataUrl) {
      toast.error('QR code not ready yet');
      return;
    }
    const link = document.createElement('a');
    link.download = `table-${table.number}-qr.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleDownloadAll() {
    for (let i = 0; i < tables.length; i++) {
      handleDownload(tables[i]);
      if (i < tables.length - 1) await new Promise(r => setTimeout(r, 500));
    }
  }

  function handlePrint(table: Table) {
    const dataUrl = qrImages[table.id];
    if (!dataUrl) {
      toast.error('QR code not ready yet');
      return;
    }
    const win = window.open('', '_blank');
    if (!win) return;
    const safeRestaurantName = escapeHtml(restaurant?.name ?? 'Restaurant');
    const safeTableNumber = escapeHtml(table.number);
    win.document.write(`<!DOCTYPE html>
<html><head><title>Table ${safeTableNumber} QR</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @media print { body { margin: 0; } }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 100vh; background: white; text-align: center; padding: 40px 20px;
  }
  .logo { font-size: 24px; font-weight: 700; color: #111; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
  .qr-wrapper { border: 3px solid #22c55e; border-radius: 16px; padding: 16px; background: white; }
  .qr-wrapper img { display: block; border-radius: 8px; }
  .table-label { font-size: 32px; font-weight: 700; color: #111; margin-top: 24px; }
  .scan-text { color: #888; font-size: 13px; margin-top: 8px; }
</style></head>
<body>
  <div class="logo">${safeRestaurantName}</div>
  <div class="subtitle">Scan to view menu &amp; order</div>
  <div class="qr-wrapper">
    <img src="${dataUrl}" width="250" height="250" alt="QR Code" />
  </div>
  <div class="table-label">Table ${safeTableNumber}</div>
  <div class="scan-text">Point your phone camera at the QR code</div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body></html>`);
    win.document.close();
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      <AdminHeader title={t('header.title.tables')} />
      <div className="p-6 space-y-6">
        {/* Table Management */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2"><Grid3X3 className="w-4 h-4 text-[#22c55e]" /> {t('header.title.tables')}</h3>
            <Button size="sm" onClick={() => setAddModal(true)}><Plus className="w-4 h-4" /> {t('tables.addTable')}</Button>
          </div>
          {tables.length === 0 ? (
            <div className="text-center py-8 text-[#52525b] text-sm">{t('tables.noTables')}</div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {tables.map(table => (
                <div
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`w-full aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105 ${
                    table.status === 'available' ? 'border-[#22c55e] bg-[rgba(34,197,94,0.1)] text-[#22c55e]' :
                    table.status === 'occupied' ? 'border-[#f59e0b] bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' :
                    'border-[#2a2a2a] bg-[#1a1a1a] text-[#52525b]'
                  }`}
                >
                  <span className="font-bold text-xl">{table.number}</span>
                  <span className="text-[10px] mt-0.5 opacity-70">{table.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR Codes */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2"><QrCode className="w-4 h-4 text-[#22c55e]" /> {t('dashboard.qrCodes')}</h3>
            {tables.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={qrLoading}>
                <Download className="w-4 h-4" /> {t('tables.downloadQr')}
              </Button>
            )}
          </div>
          {tables.length === 0 ? (
            <div className="text-center py-8 text-[#52525b] text-sm">{t('tables.noTables')}</div>
          ) : qrLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {tables.map(table => (
                <div key={table.id} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 flex flex-col items-center gap-3">
                  <p className="text-white font-semibold text-sm">{t('generic.table')} {table.number}</p>
                  <div className="w-[180px] h-[180px] bg-[#1a1a1a] rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {tables.map(table => {
                const qrSrc = qrImages[table.id];
                const qrUrl = buildQrUrl(restaurant?.slug ?? '', table.number, getTableQrToken(table));
                return (
                  <div key={table.id} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 flex flex-col items-center gap-3">
                    <p className="text-white font-semibold text-sm">{t('generic.table')} {table.number}</p>
                    {qrSrc ? (
                      <img
                        src={qrSrc}
                        alt={`QR code for Table ${table.number}`}
                        className="w-[180px] h-[180px] rounded-lg bg-white p-1"
                      />
                    ) : (
                      <div className="w-[180px] h-[180px] bg-[#1a1a1a] rounded-lg flex items-center justify-center text-[#52525b] text-xs">
                        Failed to generate
                      </div>
                    )}
                    <p className="text-[#52525b] text-[10px] text-center truncate w-full" title={qrUrl}>
                      {qrUrl}
                    </p>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => handleDownload(table)}
                        disabled={!qrSrc}
                        className="flex-1 flex items-center justify-center gap-1 border border-[#2a2a2a] text-[#a1a1aa] hover:text-white hover:border-[#3a3a3a] disabled:opacity-40 disabled:cursor-not-allowed text-xs py-1.5 rounded-lg transition-colors"
                      >
                        <Download className="w-3 h-3" /> PNG
                      </button>
                      <button
                        onClick={() => handlePrint(table)}
                        disabled={!qrSrc}
                        className="flex-1 flex items-center justify-center gap-1 border border-[#2a2a2a] text-[#a1a1aa] hover:text-white hover:border-[#3a3a3a] disabled:opacity-40 disabled:cursor-not-allowed text-xs py-1.5 rounded-lg transition-colors"
                      >
                        <Printer className="w-3 h-3" /> Print
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title={t('tables.addTable')}>
        <Input
          label={t('tables.tableNumber')}
          placeholder='e.g. "1", "VIP", "Terrace"'
          value={tableNum}
          onChange={e => setTableNum(e.target.value)}
        />
        <Button fullWidth className="mt-4" loading={saving} onClick={handleAddTable}>{t('tables.addTable')}</Button>
      </Modal>

      {selectedTable && (
        <Modal open={!!selectedTable} onClose={() => setSelectedTable(null)} title={`${t('generic.table')} ${selectedTable.number}`}>
          <p className="text-[#a1a1aa] text-sm mb-4">Current status: <span className="text-white">{selectedTable.status}</span></p>
          <div className="space-y-2">
            {selectedTable.status !== 'available' && (
              <Button variant="outline" fullWidth onClick={() => handleStatusChange(selectedTable, 'available')}>
                Mark as Available
              </Button>
            )}
            {selectedTable.status !== 'inactive' && (
              <Button variant="outline" fullWidth onClick={() => handleStatusChange(selectedTable, 'inactive')}>
                Mark as Inactive
              </Button>
            )}
            <Button variant="outline" fullWidth onClick={() => handleRotateQrToken(selectedTable)}>
              <RotateCcw className="w-4 h-4" /> Regenerate QR Code
            </Button>
            <Button variant="danger" fullWidth onClick={() => handleDelete(selectedTable)}>
              {t('generic.delete')} {t('generic.table')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
