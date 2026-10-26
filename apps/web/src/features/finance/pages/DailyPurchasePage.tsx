import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { masterDataService } from "@/features/transfers/services/master-data.service";
import type { LocationOption } from "@/features/transfers/types/transfer.types";
import { Button } from "@/shared/ui/button/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card/card";
import { Input } from "@/shared/ui/input/input";
import { Select } from "@/shared/ui/select";
import { toast } from "@/shared/ui/toast";
import { getApiErrorMessage } from "@/shared/lib/api/error";
import { DailyPurchase, DailyPurchaseItem, financeService } from "../services/finance.service";

type DraftItem = { item_name: string; qty: string; unit: string; unit_price: string; category: string };
const blankItem = (): DraftItem => ({ item_name: "", qty: "1", unit: "", unit_price: "", category: "Operasional" });
const today = new Date().toISOString().slice(0, 10);

function formatRupiah(value: number | string) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

export function DailyPurchasePage() {
  const [outlets, setOutlets] = useState<LocationOption[]>([]);
  const [outletId, setOutletId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [vendor, setVendor] = useState("");
  const [items, setItems] = useState<DraftItem[]>([blankItem()]);
  const [reports, setReports] = useState<DailyPurchase[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [locations, rows] = await Promise.all([
        masterDataService.getLocations(),
        financeService.getDailyPurchases({ limit: 100 }),
      ]);
      const outletLocations = locations.filter((location) => location.level?.toUpperCase() === "OUTLET");
      setOutlets(outletLocations);
      setOutletId((current) => current || outletLocations[0]?.id || "");
      setReports(rows);
    } catch (error) {
      toast.error("Gagal memuat laporan belanja", getApiErrorMessage(error));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const total = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unit_price) || 0), 0);

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!outletId) {
      toast.error("Pilih outlet", "Laporan belanja harus terhubung ke outlet.");
      return;
    }
    const invalid = items.some((item) => !item.item_name.trim() || !item.category.trim() || Number(item.qty) <= 0 || Number(item.unit_price) <= 0);
    if (invalid) {
      toast.error("Data belanja belum lengkap", "Isi nama, jumlah, harga, dan kategori tiap barang.");
      return;
    }
    setSaving(true);
    try {
      const purchaseItems: DailyPurchaseItem[] = items.map((item) => ({
        item_name: item.item_name.trim(),
        qty: Number(item.qty),
        unit: item.unit.trim() || null,
        unit_price: Number(item.unit_price),
        subtotal: Number(item.qty) * Number(item.unit_price),
        category: item.category.trim(),
        is_edited: true,
      }));
      await financeService.createDailyPurchase({
        purchase_date: purchaseDate,
        outlet_id: outletId || null,
        vendor_name: vendor.trim() || null,
        status: "NEEDS_REVIEW",
        total_amount: total,
        items: purchaseItems,
      });
      toast.success("Laporan terkirim ke finance", "Finance dapat meninjau dan mencatat pengeluaran.");
      setPurchaseDate(today);
      setVendor("");
      setItems([blankItem()]);
      await load();
    } catch (error) {
      toast.error("Laporan gagal dikirim", getApiErrorMessage(error));
    } finally { setSaving(false); }
  }

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold text-slate-950">Laporan Belanja Harian</h1><p className="mt-1 text-sm text-slate-500">Catat pembelian outlet dan kirim ke finance untuk ditinjau.</p></div>
    <Card>
      <CardHeader><CardTitle>Input Pembelanjaan</CardTitle><CardDescription>Semua pengajuan masuk ke daftar tinjauan finance.</CardDescription></CardHeader>
      <CardContent><form onSubmit={(event) => void submit(event)} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm font-medium">Tanggal<Input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} required /></label>
          <label className="space-y-1 text-sm font-medium">Outlet<Select value={outletId} onChange={(event) => setOutletId(event.target.value)}><option value="">Pilih outlet</option>{outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.code} — {outlet.name}</option>)}</Select></label>
          <label className="space-y-1 text-sm font-medium">Toko / Vendor<Input value={vendor} onChange={(event) => setVendor(event.target.value)} placeholder="Nama toko atau vendor" /></label>
        </div>
        <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Nama belanja</th><th className="p-2">Kategori</th><th className="p-2">Qty</th><th className="p-2">Satuan</th><th className="p-2">Harga satuan</th><th className="p-2">Subtotal</th><th /></tr></thead><tbody>
          {items.map((item, index) => <tr key={index} className="border-b align-top"><td className="p-2"><Input value={item.item_name} onChange={(event) => updateItem(index, { item_name: event.target.value })} required /></td><td className="p-2"><Input value={item.category} onChange={(event) => updateItem(index, { category: event.target.value })} required /></td><td className="p-2"><Input type="number" min="0.001" step="0.001" value={item.qty} onChange={(event) => updateItem(index, { qty: event.target.value })} required /></td><td className="p-2"><Input value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value })} placeholder="pcs" /></td><td className="p-2"><Input type="number" min="1" value={item.unit_price} onChange={(event) => updateItem(index, { unit_price: event.target.value })} required /></td><td className="whitespace-nowrap p-2 text-right">{formatRupiah(Number(item.qty) * Number(item.unit_price))}</td><td className="p-2"><button type="button" aria-label="Hapus baris" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, row) => row !== index))} className="rounded p-2 text-red-600 disabled:opacity-30"><Trash2 size={16} /></button></td></tr>)}
        </tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => setItems((current) => [...current, blankItem()])} className="inline-flex items-center gap-2 text-sm font-bold text-teal-700"><Plus size={16} /> Tambah barang</button><div className="flex items-center gap-4"><strong>Total {formatRupiah(total)}</strong><Button type="submit" disabled={saving}>{saving ? "Mengirim…" : "Kirim ke Finance"}</Button></div></div>
      </form></CardContent>
    </Card>
    <Card><CardHeader><CardTitle>Pengajuan Saya</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Tanggal</th><th className="p-2">Vendor</th><th className="p-2">Status</th><th className="p-2 text-right">Total</th></tr></thead><tbody>{reports.map((row) => <tr key={row.id} className="border-b"><td className="p-2">{row.purchase_date}</td><td className="p-2">{row.vendor_name || "—"}</td><td className="p-2">{row.status}</td><td className="p-2 text-right">{formatRupiah(row.total_amount)}</td></tr>)}{reports.length === 0 ? <tr><td className="p-3 text-slate-500" colSpan={4}>Belum ada pengajuan.</td></tr> : null}</tbody></table></CardContent></Card>
  </div>;
}
