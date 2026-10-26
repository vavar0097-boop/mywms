import { Download, Printer, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { masterDataService } from "@/features/transfers/services/master-data.service";
import type { LocationOption } from "@/features/transfers/types/transfer.types";
import { Button } from "@/shared/ui/button/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card/card";
import { Select } from "@/shared/ui/select";
import { toast } from "@/shared/ui/toast";
import { getApiErrorMessage } from "@/shared/lib/api/error";
import { Stocktake, stocktakeService } from "../services/stocktake.service";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportCsv(stocktake: Stocktake) {
  const rows = stocktake.stocktake_items ?? [];
  const contents = [
    ["Nomor Opname", stocktake.stocktake_no],
    ["Lokasi", `${stocktake.locations?.code ?? ""} ${stocktake.locations?.name ?? ""}`],
    ["Status", stocktake.status],
    ["Waktu", stocktake.completed_at ?? stocktake.created_at],
    [],
    ["Kode Barang", "Nama Barang", "Stok Sistem", "Stok Fisik", "Selisih"],
    ...rows.map((item) => [
      item.item_code_snapshot,
      item.item_name_snapshot,
      item.expected_quantity,
      item.counted_quantity,
      Number(item.counted_quantity ?? 0) - Number(item.expected_quantity),
    ]),
  ].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${stocktake.stocktake_no}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function StocktakePage() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [rows, setRows] = useState<Stocktake[]>([]);
  const [selected, setSelected] = useState<Stocktake | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [locationsResult, stocktakes] = await Promise.all([
        masterDataService.getLocations(),
        stocktakeService.list(),
      ]);
      const warehouseLocations = locationsResult.filter((location) =>
        location.warehouse_id && location.level?.toUpperCase() !== "OUTLET",
      );
      setLocations(warehouseLocations);
      setSelectedLocation((current) => current || warehouseLocations[0]?.id || "");
      setRows(stocktakes);
    } catch (error) {
      toast.error("Gagal memuat data opname", getApiErrorMessage(error));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const items = selected?.stocktake_items ?? [];
  const differences = useMemo(() => items.filter((item) =>
    item.counted_quantity !== null && Number(item.counted_quantity) !== Number(item.expected_quantity),
  ).length, [items]);

  async function startOpname() {
    if (!selectedLocation) return;
    setBusy(true);
    try {
      const created = await stocktakeService.create(selectedLocation);
      setSelected(created);
      setCounts({});
      await load();
    } catch (error) {
      toast.error("Opname gagal dimulai", getApiErrorMessage(error));
    } finally { setBusy(false); }
  }

  async function openOpname(id: string) {
    try {
      const detail = await stocktakeService.get(id);
      setSelected(detail);
      setCounts(Object.fromEntries((detail.stocktake_items ?? []).map((item) => [
        item.item_id,
        item.counted_quantity === null ? "" : String(item.counted_quantity),
      ])));
    } catch (error) {
      toast.error("Gagal membuka opname", getApiErrorMessage(error));
    }
  }

  async function completeOpname() {
    if (!selected) return;
    const missing = items.find((item) => counts[item.item_id] === undefined || counts[item.item_id].trim() === "" || !Number.isFinite(Number(counts[item.item_id])) || Number(counts[item.item_id]) < 0);
    if (missing) {
      toast.error("Hitung semua barang", `Jumlah fisik ${missing.item_name_snapshot} belum diisi.`);
      return;
    }
    setBusy(true);
    try {
      const completed = await stocktakeService.complete(selected.id, items.map((item) => ({
        item_id: item.item_id,
        counted_quantity: Number(counts[item.item_id]),
      })));
      setSelected(completed);
      await load();
      toast.success("Opname selesai", "Selisih telah dicatat ke ledger stok.");
    } catch (error) {
      toast.error("Gagal menyelesaikan opname", getApiErrorMessage(error));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <style>{`@media print { body * { visibility: hidden !important; } #stocktake-print-area, #stocktake-print-area * { visibility: visible !important; } #stocktake-print-area { position: absolute; inset: 0; width: 100%; } .print-hide { display: none !important; } }`}</style>
      <div className="flex flex-wrap items-center justify-between gap-3 print-hide">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Stock Opname Mingguan</h1>
          <p className="mt-1 text-sm text-slate-500">Bandingkan stok sistem dengan hitungan fisik per lokasi gudang.</p>
        </div>
        <Button variant="outline" onClick={() => void load()}><RefreshCw size={16} /> Muat ulang</Button>
      </div>

      <Card className="print-hide">
        <CardHeader><CardTitle>Mulai Opname</CardTitle><CardDescription>Sistem menyimpan snapshot stok saat opname dibuat. Tunda perpindahan barang di lokasi ini sampai hitungan diselesaikan.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Select value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)}>
            <option value="">Pilih lokasi gudang</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.code} — {location.name}</option>)}
          </Select>
          <Button disabled={!selectedLocation || busy} onClick={() => void startOpname()}>{busy ? "Memproses…" : "Mulai opname"}</Button>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <Card className="print-hide">
          <CardHeader><CardTitle>Riwayat Opname</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {rows.length ? rows.map((row) => <button key={row.id} onClick={() => void openOpname(row.id)} className={`w-full rounded-xl border p-3 text-left ${selected?.id === row.id ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}>
              <span className="block text-sm font-bold">{row.stocktake_no}</span>
              <span className="mt-1 block text-xs text-slate-500">{row.locations?.code} — {row.locations?.name}</span>
              <span className="mt-1 block text-xs font-semibold">{row.status} · {new Date(row.created_at).toLocaleDateString("id-ID")}</span>
            </button>) : <p className="text-sm text-slate-500">Belum ada opname.</p>}
          </CardContent>
        </Card>

        <Card id="stocktake-print-area">
          <CardHeader>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <CardTitle>{selected?.stocktake_no ?? "Pilih opname"}</CardTitle>
                <CardDescription>{selected ? `${selected.locations?.code ?? ""} — ${selected.locations?.name ?? ""} · ${selected.status}` : "Buat atau pilih opname dari riwayat."}</CardDescription>
              </div>
              {selected ? <div className="flex gap-2 print-hide">
                <Button variant="outline" onClick={() => exportCsv(selected)}><Download size={16} /> Excel (CSV)</Button>
                <Button variant="outline" onClick={() => window.print()}><Printer size={16} /> Cetak</Button>
              </div> : null}
            </div>
          </CardHeader>
          {selected ? <CardContent>
            <div className="mb-3 flex gap-4 text-sm"><span>Barang: <b>{items.length}</b></span><span>Selisih: <b>{differences}</b></span></div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="border-b text-left"><th className="p-2">Kode</th><th className="p-2">Barang</th><th className="p-2 text-right">Stok Sistem</th><th className="p-2 text-right">Stok Fisik</th><th className="p-2 text-right">Selisih</th></tr></thead>
                <tbody>{items.map((item) => {
                  const counted = counts[item.item_id] === undefined || counts[item.item_id] === "" ? null : Number(counts[item.item_id]);
                  return <tr key={item.item_id} className="border-b"><td className="p-2">{item.item_code_snapshot}</td><td className="p-2">{item.item_name_snapshot}</td><td className="p-2 text-right">{Number(item.expected_quantity)}</td><td className="p-2 text-right">{selected.status === "OPEN" ? <input className="w-24 rounded border px-2 py-1 text-right print-hide" type="number" min="0" step="0.0001" value={counts[item.item_id] ?? ""} onChange={(event) => setCounts((current) => ({ ...current, [item.item_id]: event.target.value }))} /> : Number(item.counted_quantity)}</td><td className="p-2 text-right">{counted === null ? "—" : counted - Number(item.expected_quantity)}</td></tr>;
                })}</tbody>
              </table>
            </div>
            {selected.status === "OPEN" ? <div className="mt-4 flex justify-end print-hide"><Button disabled={busy} onClick={() => void completeOpname()}>{busy ? "Menyimpan…" : "Simpan hitungan & sesuaikan stok"}</Button></div> : null}
          </CardContent> : null}
        </Card>
      </div>
    </div>
  );
}
