import React, { useEffect, useMemo, useState } from 'react';
import { entryNoteService } from '../services/entryNoteService';
import { EntryNote } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface CalculatedEntryNote {
  note: EntryNote;
  investment: number;
  saleValue: number;
  monthlyRate: number;
  compoundedValue: number;
  compoundedProfit: number;
}

const CompoundInterest: React.FC = () => {
  const [entryNotes, setEntryNotes] = useState<EntryNote[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState<number>(6);

  const loadEntryNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const notes = await entryNoteService.getAll();
      setEntryNotes(notes);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las notas de entrada.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntryNotes();
  }, []);

  const calculations = useMemo<CalculatedEntryNote[]>(() => {
    const effectiveMonths = Math.max(0, months);

    return entryNotes.map((note) => {
      const investment = note.totalCost || 0;
      const saleValue = note.totalPrice || 0;
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
  }, [entryNotes, months]);

  const totals = useMemo(() => {
    const totalInvestment = calculations.reduce(
      (acc, item) => acc + item.investment,
      0
    );
    const totalCompoundedValue = calculations.reduce(
      (acc, item) => acc + item.compoundedValue,
      0
    );
    const totalProfit = totalCompoundedValue - totalInvestment;

    const weightedMonthlyRate =
      totalInvestment > 0
        ? calculations.reduce(
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
  }, [calculations]);

  const handleMonthsChange = (value: number) => {
    if (Number.isNaN(value)) {
      setMonths(0);
      return;
    }
    setMonths(Math.max(0, value));
  };

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
                    colSpan={8}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    Cargando notas de entrada...
                  </td>
                </tr>
              )}

              {!loading && calculations.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    No hay notas de entrada registradas.
                  </td>
                </tr>
              )}

              {!loading &&
                calculations.map((item) => {
                  const monthlyProfit = item.investment * item.monthlyRate;
                  return (
                    <tr key={item.note.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {item.note.number || item.note.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(item.note.date)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(item.investment)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(item.saleValue)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {(item.monthlyRate * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(monthlyProfit)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {formatCurrency(item.compoundedValue)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-primary-600">
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
    </div>
  );
};

export default CompoundInterest;

