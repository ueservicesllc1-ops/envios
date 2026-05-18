import React, { useEffect, useMemo, useState } from 'react';
import { exitNoteService } from '../services/exitNoteService';
import { ExitNote, ExitNoteItem } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TrendingUp, DollarSign, Percent, Calendar, RefreshCcw, Package, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CompoundInterest: React.FC = () => {
  const [notes, setNotes] = useState<ExitNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [months, setMonths] = useState<number>(6);
  const [frequency, setFrequency] = useState<1 | 2>(1); // 1 = Mensual, 2 = Quincenal
  const [activeMode, setActiveMode] = useState<'notes' | 'simulator'>('notes');
  
  // States for Simulator
  const [weeklyInvestment, setWeeklyInvestment] = useState<number>(1000);
  const [extraWeeklyInvestment, setExtraWeeklyInvestment] = useState<number>(0);
  const [profitMargin, setProfitMargin] = useState<number>(30);
  const [simulationWeeks, setSimulationWeeks] = useState<number>(12);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const compoundNotes = await exitNoteService.getCompoundInterestNotes();
      setNotes(compoundNotes);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar las notas de interés compuesto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const calculations = useMemo(() => {
    return notes.map(note => {
      // Calcular inversión (costo de productos + envío estimado $26)
      const productCost = note.items.reduce((sum, item) => sum + (item.product.cost * item.quantity), 0);
      const shippingCost = 26; // Costo de envío estándar
      const investment = productCost + shippingCost;
      
      const saleValue = note.totalPrice;
      const immediateProfit = saleValue - investment;
      const monthlyRate = investment > 0 ? immediateProfit / investment : 0;
      
      const periods = months * frequency;
      const compoundedValue = investment * Math.pow(1 + monthlyRate, periods);
      const compoundedProfit = compoundedValue - investment;

      return {
        note,
        investment,
        saleValue,
        immediateProfit,
        monthlyRate,
        compoundedValue,
        compoundedProfit
      };
    });
  }, [notes, months, frequency]);

  const totals = useMemo(() => {
    const totalInvestment = calculations.reduce((acc, curr) => acc + curr.investment, 0);
    const totalCompoundedValue = calculations.reduce((acc, curr) => acc + curr.compoundedValue, 0);
    const totalProfit = totalCompoundedValue - totalInvestment;
    
    const weightedMonthlyRate = totalInvestment > 0 
      ? calculations.reduce((acc, curr) => acc + (curr.monthlyRate * curr.investment), 0) / totalInvestment
      : 0;

    return {
      totalInvestment,
      totalCompoundedValue,
      totalProfit,
      weightedMonthlyRate
    };
  }, [calculations]);

  const monthlyProjection = useMemo(() => {
    const projection = [];
    let currentCapital = totals.totalInvestment;
    const periods = months * frequency;

    for (let i = 1; i <= periods; i++) {
      currentCapital = currentCapital * (1 + totals.weightedMonthlyRate);
      projection.push({
        period: i,
        label: frequency === 1 ? `Mes ${i}` : `Quincena ${i}`,
        value: currentCapital
      });
    }
    return projection;
  }, [totals, months, frequency]);

  const weeklySimulatorProjection = useMemo(() => {
    const projection = [];
    const marginDecimal = profitMargin / 100;
    
    // Suponemos que cada semana se invierte la misma cantidad inicial 
    // hasta que empiezan a llegar los retornos de las semanas anteriores
    const history: any[] = [];
    const weeks = isNaN(simulationWeeks) ? 0 : simulationWeeks;

    for (let w = 1; w <= weeks; w++) {
      let baseInvestment = w <= 2 ? weeklyInvestment : 0;
      let revenueThisWeek = 0;

      // El retorno llega con 2 semanas de retraso
      if (w > 2) {
        const investmentFromTwoWeeksAgo = history[w - 3].totalInvestment;
        revenueThisWeek = investmentFromTwoWeeksAgo * (1 + marginDecimal);
      }

      // La inversión de esta semana es lo que recibimos + la inyección extra semanal
      const totalInvestmentThisWeek = (w > 2 ? revenueThisWeek : weeklyInvestment) + extraWeeklyInvestment;

      history.push({ week: w, totalInvestment: totalInvestmentThisWeek, revenue: revenueThisWeek });
      
      projection.push({
        week: w,
        outflow: (w <= 2 ? weeklyInvestment : 0) + extraWeeklyInvestment, // Capital "fresco" inyectado
        reinvestment: w > 2 ? revenueThisWeek : 0,
        revenue: revenueThisWeek,
        totalInvestment: totalInvestmentThisWeek
      });
    }
    return projection;
  }, [weeklyInvestment, extraWeeklyInvestment, profitMargin, simulationWeeks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="h-8 w-8 mr-3 text-primary-600" />
            Estrategia de Crecimiento
          </h1>
          <p className="text-gray-600 mt-1">
            Analiza y proyecta el crecimiento de tu capital mediante reinversión.
          </p>
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => setActiveMode('notes')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeMode === 'notes' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Interés Compuesto (Notas)
          </button>
          <button
            onClick={() => setActiveMode('simulator')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeMode === 'simulator' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Simulador de Flujo Semanal
          </button>
        </div>
      </div>

      {activeMode === 'notes' ? (
        <>
          {/* Control de Meses */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-primary-500" />
                    Periodo de Capitalización
                  </label>
                  <span className="text-primary-600 font-bold text-lg">{months} meses</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  value={months}
                  onChange={(e) => setMonths(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>1 mes</span>
                  <span>12 meses (1 año)</span>
                  <span>24 meses (2 años)</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-gray-700">Frecuencia de Rotación</label>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setFrequency(1)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${frequency === 1 ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    MENSUAL
                  </button>
                  <button
                    onClick={() => setFrequency(2)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${frequency === 2 ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    QUINCENAL (2x mes)
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="px-6 py-4 bg-primary-50 rounded-xl border border-primary-100">
                  <p className="text-xs font-bold text-primary-600 uppercase tracking-wider">Rendimiento Mensual</p>
                  <p className="text-2xl font-black text-primary-700">{(totals.weightedMonthlyRate * 100).toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Totales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                <DollarSign className="h-16 w-16" />
              </div>
              <p className="text-sm font-medium text-gray-500">Inversión Inicial Total</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totals.totalInvestment)}</p>
              <p className="text-xs text-gray-400 mt-2">Costo productos + Envío ($26/nota)</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-16 w-16" />
              </div>
              <p className="text-sm font-medium text-gray-500">Valor Compuesto ({months} Meses)</p>
              <p className="text-3xl font-bold text-primary-600 mt-1">{formatCurrency(totals.totalCompoundedValue)}</p>
              <p className="text-xs text-green-600 mt-2 font-medium">
                {frequency === 1 ? 'Reinvirtiendo 1 vez al mes' : 'Reinvirtiendo cada 15 días (2 veces al mes)'}
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-16 w-16" />
              </div>
              <p className="text-sm font-medium text-gray-500">Ganancia Neta Proyectada</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(totals.totalProfit)}</p>
              <p className="text-xs text-gray-400 mt-2">Diferencia entre capital inicial y final</p>
            </div>
          </div>

          {/* Proyección Detallada por Periodo */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-primary-600" />
              Proyección de Capital Recibido por {frequency === 1 ? 'Mes' : 'Quincena'}
            </h3>
            <div className="flex flex-wrap gap-3">
              {monthlyProjection.map((step) => (
                <div 
                  key={step.period} 
                  className="flex flex-col items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-primary-300 hover:bg-primary-50 transition-all cursor-default min-w-[140px]"
                >
                  <span className="text-[10px] font-black text-gray-400 uppercase">{step.label}</span>
                  <span className="text-lg font-bold text-primary-700">{formatCurrency(step.value)}</span>
                  <span className="text-[9px] text-green-600 font-bold mt-1">
                    +{formatCurrency(step.value * totals.weightedMonthlyRate / (1 + totals.weightedMonthlyRate))} ganancia
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4 italic">
              * Estos valores representan el capital total (Inversión + Ganancia) que recibirás al finalizar cada {frequency === 1 ? 'mes' : 'quincena'}, listo para ser reinvertido.
            </p>
          </div>

          {/* Detalle por Nota */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Desglose por Nota de Salida</h3>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase">
                {notes.length} Notas Seleccionadas
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nota / Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vendedor</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Envío</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Inversión</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Venta</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ganancia Inicial</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">% Retorno</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Valor Compuesto</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {calculations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Package className="h-12 w-12 text-gray-200 mb-3" />
                          <p className="font-medium">No hay notas seleccionadas para interés compuesto.</p>
                          <p className="text-sm">Ve a Notas de Salida y selecciona las notas que deseas incluir.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    calculations.map((item) => (
                      <tr key={item.note.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{item.note.number}</div>
                          <div className="text-xs text-gray-500">{formatDate(item.note.date)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{item.note.seller}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-medium">
                          {formatCurrency(26)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                          {formatCurrency(item.investment)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium">
                          {formatCurrency(item.saleValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-semibold">
                          {formatCurrency(item.immediateProfit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            {(item.monthlyRate * 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-primary-600 font-bold">
                          {formatCurrency(item.compoundedValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-bold">
                          {formatCurrency(item.compoundedProfit)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Simulator Controls */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-end gap-6">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-bold text-gray-700 mb-2">Inv. Semanal ($)</label>
              <input
                type="number"
                value={weeklyInvestment}
                onChange={(e) => setWeeklyInvestment(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm font-bold text-gray-700 mb-2">Extra Semanal ($)</label>
              <input
                type="number"
                value={extraWeeklyInvestment}
                onChange={(e) => setExtraWeeklyInvestment(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-bold text-gray-700 mb-2">Margen (%)</label>
              <input
                type="number"
                value={profitMargin}
                onChange={(e) => setProfitMargin(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-bold text-gray-700 mb-2">Semanas</label>
              <input
                type="number"
                min="1"
                max="104"
                value={simulationWeeks}
                onChange={(e) => setSimulationWeeks(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-bold">Logística de Flujo Constante:</p>
              <p className="text-sm text-blue-800">
                Esta simulación asume un tiempo de tránsito de <strong>2 semanas</strong>. 
                Las semanas 1 y 2 son de inversión pura. A partir de la <strong>Semana 3</strong>, empiezas a recibir el retorno de la Semana 1, 
                el cual se reinvierte automáticamente para mantener el ciclo sin necesidad de capital externo adicional.
              </p>
            </div>
          </div>

          {/* Weekly Results Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Flujo de Caja Semanal Proyectado</h3>
            </div>
            <div className="p-6 overflow-x-auto">
              <div className="flex gap-4 overflow-x-auto pb-4">
                {weeklySimulatorProjection.map((w) => (
                  <div key={w.week} className={`min-w-[200px] p-4 rounded-xl border ${w.week <= 2 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black text-gray-500 uppercase">Semana {w.week}</span>
                      {w.week > 2 && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Inversión Total</p>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(w.totalInvestment)}</p>
                      </div>
                      {extraWeeklyInvestment > 0 && (
                        <div className="text-[9px] text-blue-600 font-bold">
                          incluye {formatCurrency(extraWeeklyInvestment)} extra
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Ingreso (Venta)</p>
                        <p className={`text-lg font-black ${w.week > 2 ? 'text-green-700' : 'text-gray-400'}`}>
                          {w.week > 2 ? formatCurrency(w.revenue) : '$0.00'}
                        </p>
                      </div>
                      {w.week > 2 && (
                        <div className="pt-2 border-t border-green-200">
                          <p className="text-[10px] text-green-700 uppercase font-bold">Ganancia Neta</p>
                          <p className="text-sm font-bold text-green-800">+{formatCurrency(w.revenue - w.reinvestment)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Simulator Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Capital Externo Acumulado</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {formatCurrency(weeklySimulatorProjection.reduce((acc, curr) => acc + curr.outflow, 0))}
              </p>
              <p className="text-xs text-gray-400 mt-2">Suma de la inversión inicial más todas las inyecciones extra.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-primary-600 mt-1">
                {weeklySimulatorProjection.length > 0 
                  ? formatCurrency(weeklySimulatorProjection[weeklySimulatorProjection.length - 1].revenue) 
                  : formatCurrency(0)}
              </p>
              <p className="text-xs text-green-600 mt-2 font-medium">Flujo constante de dinero cada semana.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompoundInterest;
