import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "@/shared/lib/api/error";
import { Button } from "@/shared/ui/button/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card/card";
import { Input } from "@/shared/ui/input/input";
import { Select } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "@/shared/ui/toast";

import { masterDataService } from "../services/master-data.service";
import { useTransferStore } from "../stores/transfer.store";
import type {
  ItemOption,
  LocationOption,
  WarehouseOption,
} from "../types/transfer.types";

type FormItem = {
  item_id: string;
  qty_requested: number;
};

function warehouseLabel(warehouse: WarehouseOption) {
  return `${warehouse.code} - ${warehouse.name}`;
}

function locationLabel(location: LocationOption) {
  return `${location.code} - ${location.name}`;
}

function itemLabel(item: ItemOption) {
  const unit = item.unit_code || item.unit_name;

  return `${item.item_code} - ${item.item_name}${
    unit ? ` (${unit})` : ""
  }`;
}

export function CreateTransferPage() {
  const navigate = useNavigate();
  const { createTransfer, creating } = useTransferStore();

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterDataError, setMasterDataError] = useState<string | null>(
    null,
  );

  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [
    destinationWarehouseId,
    setDestinationWarehouseId,
  ] = useState("");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [
    destinationLocationId,
    setDestinationLocationId,
  ] = useState("");
  const [remarks, setRemarks] = useState("");

  const [formItems, setFormItems] = useState<FormItem[]>([
    {
      item_id: "",
      qty_requested: 1,
    },
  ]);

  useEffect(() => {
    async function loadMasterData() {
      try {
        setLoadingMaster(true);
        setMasterDataError(null);

        const [
          warehouseResult,
          locationResult,
          itemResult,
        ] = await Promise.all([
          masterDataService.getWarehouses(),
          masterDataService.getLocations(),
          masterDataService.getItems(),
        ]);

        setWarehouses(warehouseResult);
        setLocations(locationResult);
        setItems(itemResult);

        const firstWarehouse = warehouseResult[0];
        const secondWarehouse =
          warehouseResult[1] || firstWarehouse;

        if (firstWarehouse) {
          setSourceWarehouseId(firstWarehouse.id);
        }

        if (secondWarehouse) {
          setDestinationWarehouseId(secondWarehouse.id);
        }

        if (itemResult[0]) {
          setFormItems([
            {
              item_id: itemResult[0].id,
              qty_requested: 1,
            },
          ]);
        }
      } catch (error) {
        const message = getApiErrorMessage(error);

        setMasterDataError(message);
        toast.error("Failed to load master data", message);
      } finally {
        setLoadingMaster(false);
      }
    }

    loadMasterData();
  }, []);

  const sourceLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.warehouse_id === sourceWarehouseId,
      ),
    [locations, sourceWarehouseId],
  );

  const destinationLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.warehouse_id === destinationWarehouseId,
      ),
    [destinationWarehouseId, locations],
  );

  useEffect(() => {
    if (
      !sourceLocations.some(
        (location) => location.id === sourceLocationId,
      )
    ) {
      setSourceLocationId(sourceLocations[0]?.id || "");
    }
  }, [sourceLocationId, sourceLocations]);

  useEffect(() => {
    if (
      !destinationLocations.some(
        (location) => location.id === destinationLocationId,
      )
    ) {
      const differentLocation = destinationLocations.find(
        (location) => location.id !== sourceLocationId,
      );

      setDestinationLocationId(
        differentLocation?.id ||
          destinationLocations[0]?.id ||
          "",
      );
    }
  }, [
    destinationLocationId,
    destinationLocations,
    sourceLocationId,
  ]);

  const hasSameLocation =
    Boolean(sourceLocationId) &&
    sourceLocationId === destinationLocationId;

  const hasDuplicateItems =
    new Set(formItems.map((item) => item.item_id)).size !==
    formItems.length;

  const hasValidItems = formItems.every(
    (item) =>
      Boolean(item.item_id) &&
      Number.isFinite(item.qty_requested) &&
      item.qty_requested > 0,
  );

  const hasMasterData =
    warehouses.length > 0 &&
    locations.length > 0 &&
    items.length > 0;

  const canSubmit =
    Boolean(sourceWarehouseId) &&
    Boolean(destinationWarehouseId) &&
    Boolean(sourceLocationId) &&
    Boolean(destinationLocationId) &&
    !hasSameLocation &&
    !hasDuplicateItems &&
    hasValidItems &&
    hasMasterData &&
    !creating &&
    !loadingMaster &&
    !masterDataError;

  function updateItem(
    index: number,
    nextValue: Partial<FormItem>,
  ) {
    setFormItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...nextValue,
            }
          : item,
      ),
    );
  }

  function addItemRow() {
    const selectedItemIds = new Set(
      formItems.map((item) => item.item_id),
    );
    const nextItem = items.find(
      (item) => !selectedItemIds.has(item.id),
    );

    setFormItems((current) => [
      ...current,
      {
        item_id: nextItem?.id || "",
        qty_requested: 1,
      },
    ]);
  }

  function removeItemRow(index: number) {
    setFormItems((current) =>
      current.length === 1
        ? current
        : current.filter(
            (_, itemIndex) => itemIndex !== index,
          ),
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canSubmit) {
      if (hasSameLocation) {
        toast.error(
          "Invalid transfer",
          "Source and destination location cannot be the same.",
        );
      } else if (hasDuplicateItems) {
        toast.error(
          "Duplicate item",
          "Each item can only be added once per transfer.",
        );
      }

      return;
    }

    try {
      const transfer = await createTransfer({
        source_warehouse_id: sourceWarehouseId,
        destination_warehouse_id: destinationWarehouseId,
        source_location_id: sourceLocationId,
        destination_location_id: destinationLocationId,
        remarks: remarks.trim() || undefined,
        items: formItems.map((item) => ({
          item_id: item.item_id,
          qty_requested: Number(item.qty_requested),
        })),
      });

      toast.success(
        "Transfer created",
        "Draft transfer has been created successfully.",
      );

      navigate(
        transfer?.id
          ? `/dashboard/transfers/${transfer.id}`
          : "/dashboard/transfers",
      );
    } catch (error) {
      toast.error(
        "Failed to create transfer",
        getApiErrorMessage(error),
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Link
            to="/dashboard/transfers"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Back to transfers
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Create Transfer
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a draft transfer document before request,
            pick, dispatch, and receive.
          </p>
        </div>

        <Button type="submit" disabled={!canSubmit}>
          {creating ? "Creating..." : "Create Draft"}
        </Button>
      </div>

      {masterDataError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Master data could not be loaded: {masterDataError}
        </div>
      ) : null}

      {!loadingMaster && !masterDataError && !hasMasterData ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Warehouse, location, or item master data is empty.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Route</CardTitle>
              <CardDescription>
                Select source and destination warehouse location.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Source Warehouse
                </label>
                <Select
                  value={sourceWarehouseId}
                  disabled={loadingMaster}
                  onChange={(event) =>
                    setSourceWarehouseId(event.target.value)
                  }
                >
                  <option value="">Select source warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option
                      key={warehouse.id}
                      value={warehouse.id}
                    >
                      {warehouseLabel(warehouse)}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Destination Warehouse
                </label>
                <Select
                  value={destinationWarehouseId}
                  disabled={loadingMaster}
                  onChange={(event) =>
                    setDestinationWarehouseId(event.target.value)
                  }
                >
                  <option value="">
                    Select destination warehouse
                  </option>
                  {warehouses.map((warehouse) => (
                    <option
                      key={warehouse.id}
                      value={warehouse.id}
                    >
                      {warehouseLabel(warehouse)}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Source Location
                </label>
                <Select
                  value={sourceLocationId}
                  disabled={
                    loadingMaster || !sourceWarehouseId
                  }
                  onChange={(event) =>
                    setSourceLocationId(event.target.value)
                  }
                >
                  <option value="">Select source location</option>
                  {sourceLocations.map((location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {locationLabel(location)}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Destination Location
                </label>
                <Select
                  value={destinationLocationId}
                  disabled={
                    loadingMaster || !destinationWarehouseId
                  }
                  onChange={(event) =>
                    setDestinationLocationId(event.target.value)
                  }
                >
                  <option value="">
                    Select destination location
                  </option>
                  {destinationLocations.map((location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {locationLabel(location)}
                    </option>
                  ))}
                </Select>

                {hasSameLocation ? (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    Source and destination location cannot be the
                    same.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                Add items and requested quantity.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {formItems.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_160px_44px]"
                >
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Item
                    </label>
                    <Select
                      value={item.item_id}
                      disabled={loadingMaster}
                      onChange={(event) =>
                        updateItem(index, {
                          item_id: event.target.value,
                        })
                      }
                    >
                      <option value="">Select item</option>
                      {items.map((option) => (
                        <option
                          key={option.id}
                          value={option.id}
                        >
                          {itemLabel(option)}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Qty Requested
                    </label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={item.qty_requested}
                      onChange={(event) =>
                        updateItem(index, {
                          qty_requested: Number(
                            event.target.value,
                          ),
                        })
                      }
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-10 px-0"
                      disabled={formItems.length === 1}
                      onClick={() => removeItemRow(index)}
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}

              {hasDuplicateItems ? (
                <p className="text-xs font-medium text-red-600">
                  Duplicate items are not allowed.
                </p>
              ) : null}

              <Button
                type="button"
                variant="outline"
                disabled={
                  loadingMaster ||
                  formItems.length >= items.length
                }
                onClick={addItemRow}
              >
                <Plus size={16} />
                Add Item
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
            <CardDescription>
              Optional internal note for this transfer.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Textarea
              value={remarks}
              placeholder="Example: Transfer Ayam Fillet from BIN-01 to BIN-02"
              onChange={(event) =>
                setRemarks(event.target.value)
              }
            />

            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">
                Flow Preview
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>DRAFT → REQUESTED</p>
                <p>REQUESTED → PICKED</p>
                <p>PICKED → IN_TRANSIT</p>
                <p>IN_TRANSIT → RECEIVED</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
