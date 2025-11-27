import React, { useEffect, useMemo, useState } from 'react';
import { entryNoteService } from '../services/entryNoteService';
import { productService } from '../services/productService';
import { EntryNote, EntryNoteItem, Product } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { calculateCostPlusShipping } from '../utils/shippingCost';

interface CalculatedEntryNote {
  note: EntryNote;
  investment: number;
  saleValue: number;
  monthlyRate: number;
  compoundedValue: number;
  compoundedProfit: number;
}

interface ProductGainMetric {
  productId: string;
  name: string;
  sku?: string;
  salePrice1?: number;
  totalCost: number;
  totalSale: number;
  quantity: number;
  margin: number;
}

const CompoundInterest: React.FC = () => {
  const [entryNotes, setEntryNotes] = useState<EntryNote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<number>(6);
  const [products, setProducts] = useState<Product[]>([]);
  const [excludedNoteIds, setExcludedNoteIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  const loadEntryNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const notes = await entryNoteService.getAll();
      setEntryNotes(notes);
      setExcludedNoteIds((prev) =>
        prev.filter((id) => notes.some((note) => note.id === id))
      );
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las notas de entrada.');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadEntryNotes();
    loadProducts();
  }, []);

  const handleMonthsChange = (value: number) => {
    if (Number.isNaN(value)) {
      setMonths(0);
      return;
    }
    setMonths(Math.max(0, value));
  };

  const productsById = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  const productsBySku = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((product) => {
      if (product.sku) {
        map.set(product.sku, product);
      }
    });
    return map;
  }, [products]);

  const findCatalogProduct = (item: EntryNoteItem): Product | undefined => {
    if (item.productId) {
      const byId = productsById.get(item.productId);
      if (byId) {
        return byId;
      }
    }

    if (item.product?.id) {
      const byId = productsById.get(item.product.id);
      if (byId) {
        return byId;
      }
    }

    if (item.product?.sku) {
      const bySku = productsBySku.get(item.product.sku);
      if (bySku) {
        return bySku;
      }
    }

    return undefined;
  };

  const computeCostData = (item: EntryNoteItem) => {
    const catalogProduct = findCatalogProduct(item);
    const quantity = item.quantity ?? 0;
    const safeQuantity = quantity > 0 ? quantity : 1;

    const baseCostPerUnit =
      item.cost !== undefined
        ? item.cost
        : item.totalCost !== undefined
        ? item.totalCost / safeQuantity
        : catalogProduct?.cost ?? item.product?.cost ?? 0;

    const weightPerUnit =
      item.weight ?? catalogProduct?.weight ?? item.product?.weight ?? 0;

    const costPlusShippingPerUnit = calculateCostPlusShipping(
      baseCostPerUnit,
      weightPerUnit
    );

    const baseCostTotal =
      item.totalCost !== undefined
        ? item.totalCost
        : baseCostPerUnit * safeQuantity;

    const shippingPerUnit = costPlusShippingPerUnit - baseCostPerUnit;
    const totalShipping = shippingPerUnit * safeQuantity;
    const totalCostWithShipping = baseCostTotal + totalShipping;

    return {
      catalogProduct,
      quantity,
      safeQuantity,
      baseCostPerUnit,
      costPlusShippingPerUnit,
      baseCostTotal,
      shippingPerUnit,
      totalShipping,
      totalCostWithShipping,
    };
  };

  const excludedNoteIdsSet = useMemo(
    () => new Set(excludedNoteIds),
    [excludedNoteIds]
  );

  const activeEntryNotes = useMemo(
    () => entryNotes.filter((note) => !excludedNoteIdsSet.has(note.id)),
    [entryNotes, excludedNoteIdsSet]
  );

  const toggleNoteExclusion = (noteId: string) => {
    setExcludedNoteIds((prev) =>
      prev.includes(noteId)
        ? prev.filter((id) => id !== noteId)
        : [...prev, noteId]
    );
  };

  const calculations = useMemo<CalculatedEntryNote[]>(() => {
    const effectiveMonths = Math.max(0, months);

    return entryNotes.map((note) => {
      const investment =
        note.items && note.items.length > 0
          ? note.items.reduce(
              (sum, item) => sum + computeCostData(item).totalCostWithShipping,
              0
            )
          : note.totalCost ?? 0;

      const saleValue =
        note.items?.reduce((sum, item) => {
          const quantity = item.quantity || 0;

          const catalogProduct = findCatalogProduct(item);

          const price1 =
            catalogProduct?.salePrice1 ??
            item.product?.salePrice1 ??
            item.unitPrice ??
            (item.totalPrice && quantity > 0
              ? item.totalPrice / quantity
              : undefined) ??
            0;

          return sum + price1 * quantity;
        }, 0) ??
        note.totalPrice ??
        0;

      const monthlyRate =
        investment > 0 ? (saleValue - investment) / investment : 0;
      const compoundedValue =
        investment > 0
          ? investment * Math.pow(1 + monthlyRate, effectiveMonths)
          : 0;
      const compoundedProfit = compoundedValue - investment;

      return {
        note,
        investment,
        saleValue,
        monthlyRate,
        compoundedValue,
        compoundedProfit,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryNotes, months, productsById, productsBySku]);

  const activeCalculations = useMemo(
    () =>
      calculations.filter(
        (item) => !excludedNoteIdsSet.has(item.note.id)
      ),
    [calculations, excludedNoteIdsSet]
  );

  const totals = useMemo(() => {
    const totalInvestment = activeCalculations.reduce(
      (acc, item) => acc + item.investment,
      0
    );
    const totalCompoundedValue = activeCalculations.reduce(
      (acc, item) => acc + item.compoundedValue,
      0
    );
    const totalProfit = totalCompoundedValue - totalInvestment;

    const weightedMonthlyRate =
      totalInvestment > 0
        ? activeCalculations.reduce(
            (acc, item) => acc + item.monthlyRate * item.investment,
            0
          ) / totalInvestment
        : 0;

    return {
      totalInvestment,
      totalCompoundedValue,
      totalProfit,
      weightedMonthlyRate,
    };
  }, [activeCalculations]);

  const productMetrics = useMemo<ProductGainMetric[]>(() => {
    // Calcular margen por producto individual usando costo + envío vs precio 1
    return products
      .filter((product) => {
        // Solo incluir productos que tengan costo y precio 1
        const hasCost = product.cost !== undefined && product.cost > 0;
        const hasPrice1 = product.salePrice1 !== undefined && product.salePrice1 > 0;
        return hasCost && hasPrice1;
      })
      .map((product) => {
        const cost = product.cost ?? 0;
        const weight = product.weight ?? 0;
        const costPlusShipping = calculateCostPlusShipping(cost, weight);
        const salePrice1 = product.salePrice1 ?? 0;
        const margin = costPlusShipping > 0 ? (salePrice1 - costPlusShipping) / costPlusShipping : 0;

        return {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          salePrice1: salePrice1,
          totalCost: costPlusShipping,
          totalSale: salePrice1,
          quantity: 1, // Siempre 1 porque es por producto individual
          margin: margin,
        };
      });
  }, [products]);

  const filteredProductMetrics = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase();

    const result = normalizedSearch
      ? productMetrics.filter(
          (metric) =>
            metric.name.toLowerCase().includes(normalizedSearch) ||
            (metric.sku && metric.sku.toLowerCase().includes(normalizedSearch))
        )
      : [...productMetrics];

    return result.sort((a, b) => {
      const diff = (a.margin || 0) - (b.margin || 0);
      return sortDirection === 'desc' ? diff * -1 : diff;
    });
  }, [productMetrics, productSearch, sortDirection]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Interés Compuesto
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Calcula el rendimiento proyectado de tus notas de entrada asumiendo
            un retorno cada 30 días. El porcentaje mensual se obtiene al comparar
            el costo total con el valor de venta 1. Ajusta el periodo en meses
            para simular la capitalización compuesta.
          </p>
        </div>
        <button
          type="button"
          onClick={loadEntryNotes}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          Recargar datos
        </button>
      </div>

      {excludedNoteIds.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {excludedNoteIds.length === 1
            ? '1 nota está excluida del cálculo actual de interés compuesto.'
            : `${excludedNoteIds.length} notas están excluidas del cálculo actual de interés compuesto.`}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Inversión total</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(totals.totalInvestment)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Valor compuesto proyectado
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatCurrency(totals.totalCompoundedValue)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Ganancia estimada
          </p>
          <p className="mt-2 text-2xl font-semibold text-primary-600">
            {formatCurrency(totals.totalProfit)}
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">
              Periodo de capitalización (meses)
            </p>
            <p className="text-xs text-gray-500">
              Cada mes representa un ciclo de 30 días con el retorno calculado
              entre costo y venta 1.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={36}
              value={months}
              onChange={(event) =>
                handleMonthsChange(Number(event.target.value))
              }
              className="h-1 w-40 cursor-pointer rounded-full bg-primary-100 accent-primary-500"
            />
            <input
              type="number"
              min={0}
              max={120}
              value={months}
              onChange={(event) =>
                handleMonthsChange(Number(event.target.value))
              }
              className="w-20 rounded-md border border-gray-300 px-3 py-2 text-right text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-500">meses</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md bg-primary-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-primary-600">
              Rendimiento mensual promedio
            </p>
            <p className="mt-2 text-lg font-semibold text-primary-700">
              {(totals.weightedMonthlyRate * 100).toFixed(2)}%
            </p>
          </div>
          <div className="rounded-md bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Ganancia mensual promedio
            </p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {formatCurrency(
                totals.totalInvestment * totals.weightedMonthlyRate
              )}
            </p>
          </div>
          <div className="rounded-md bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Valor al final del periodo
            </p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {formatCurrency(totals.totalCompoundedValue)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Incluir
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Nota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Inversión (Costo)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Venta 1
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  % retorno mensual
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ganancia mensual
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Valor compuesto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Ganancia total periodo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    Cargando notas de entrada...
                  </td>
                </tr>
              )}

              {!loading && calculations.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    No hay notas de entrada registradas.
                  </td>
                </tr>
              )}

              {!loading &&
                calculations.map((item) => {
                  const isExcluded = excludedNoteIdsSet.has(item.note.id);
                  const monthlyProfit = item.investment * item.monthlyRate;
                  const valueTextClass = isExcluded
                    ? 'text-gray-400'
                    : 'text-gray-900';
                  const highlightTextClass = isExcluded
                    ? 'text-gray-400'
                    : 'text-primary-600';
                  return (
                    <tr
                      key={item.note.id}
                      className={isExcluded ? 'bg-gray-50 text-gray-500' : ''}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            checked={!isExcluded}
                            onChange={() => toggleNoteExclusion(item.note.id)}
                          />
                          <span className="text-xs text-gray-500">
                            {isExcluded ? 'Excluida' : 'Incluida'}
                          </span>
                        </label>
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-medium ${valueTextClass}`}
                      >
                        {item.note.number || item.note.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(item.note.date)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right text-sm ${valueTextClass}`}
                      >
                        {formatCurrency(item.investment)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right text-sm ${valueTextClass}`}
                      >
                        {formatCurrency(item.saleValue)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right text-sm ${valueTextClass}`}
                      >
                        {(item.monthlyRate * 100).toFixed(2)}%
                      </td>
                      <td
                        className={`px-6 py-4 text-right text-sm ${valueTextClass}`}
                      >
                        {formatCurrency(monthlyProfit)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right text-sm ${valueTextClass}`}
                      >
                        {formatCurrency(item.compoundedValue)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right text-sm ${highlightTextClass}`}
                      >
                        {formatCurrency(item.compoundedProfit)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {error && (
          <div className="border-t border-gray-200 bg-red-50 px-6 py-4 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Productos con mayor porcentaje de ganancia
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Compara el margen de ganancia de cada producto usando su costo + envío vs precio de venta 1.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative">
              <input
                type="search"
                placeholder="Filtrar por nombre o SKU"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                className="w-60 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
              }
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Ordenar por % {sortDirection === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  SKU
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Costo + Envío
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Precio Venta 1
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  % Ganancia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredProductMetrics.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    {productMetrics.length === 0
                      ? 'No hay productos con costo y precio de venta 1 registrados.'
                      : 'No se encontraron productos que coincidan con el filtro.'}
                  </td>
                </tr>
              ) : (
                filteredProductMetrics.map((metric) => (
                  <tr key={metric.productId}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {metric.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {metric.sku || 'Sin SKU'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {formatCurrency(metric.totalCost)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {formatCurrency(metric.salePrice1 ?? 0)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-primary-600 font-semibold">
                      {(metric.margin * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompoundInterest;

