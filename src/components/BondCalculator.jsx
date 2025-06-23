import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, FileText, DollarSign, Percent, Clock, BarChart3, Download } from 'lucide-react';

export default function CompactBondCalculator() {
  const [inputs, setInputs] = useState({
    precioVenta: '',
    cuotaInicial: '',
    diasAno: 360,
    diasPeriodo: 180,
    numAnos: '',
    tea: 9.0
  });

  const [results, setResults] = useState({
    cuotaInicialMonto: 0,
    prestamos: 0,
    cuotasPorAno: 0,
    numCuotas: 0,
    intereses: 0,
    amortizacion: 0,
    tir: 0,
    tcea: 0
  });

  const [amortizationTable, setAmortizationTable] = useState([]);

  useEffect(() => {
    if (hasValidInputs()) {
      calculateResults();
    } else {
      setResults({
        cuotaInicialMonto: 0,
        prestamos: 0,
        cuotasPorAno: 0,
        numCuotas: 0,
        intereses: 0,
        amortizacion: 0,
        tir: 0,
        tcea: 0
      });
      setAmortizationTable([]);
    }
  }, [inputs]);

  const hasValidInputs = () => {
    return inputs.precioVenta && inputs.cuotaInicial && inputs.numAnos && inputs.tea;
  };

  const calculateResults = () => {
    const { precioVenta, cuotaInicial, diasAno, diasPeriodo, numAnos, tea } = inputs;
    
    const precio = parseFloat(precioVenta) || 0;
    const cuota = parseFloat(cuotaInicial) || 0;
    const diasX = parseFloat(diasAno) || 360;
    const diasP = parseFloat(diasPeriodo) || 180;
    const anos = parseFloat(numAnos) || 0;
    const teaRate = parseFloat(tea) || 0;
    
    if (precio <= 0 || cuota <= 0 || anos <= 0 || teaRate <= 0) return;
    
    const cuotaInicialMonto = precio * (cuota / 100);
    const prestamos = precio - cuotaInicialMonto;
    const cuotasPorAno = diasX / diasP;
    const numCuotas = anos * cuotasPorAno;

    const tep = Math.pow(1 + (teaRate / 100), 1/cuotasPorAno) - 1;

    const flujos = [];
    flujos.push(prestamos);
    
    const table = [];
    let saldo = prestamos;
    let totalIntereses = 0;
    let totalAmortizacion = 0;
    
    for (let i = 1; i <= numCuotas; i++) {
      const interes = saldo * (teaRate / 100);
      const amortizacion = i === numCuotas ? saldo : 0;
      const cuotaPago = interes + amortizacion;
      const saldoFinal = i === numCuotas ? 0 : saldo;
      const flujo = cuotaPago;
      
      totalIntereses += interes;
      totalAmortizacion += amortizacion;
      
      flujos.push(-flujo);
      
      table.push({
        periodo: i,
        tea: teaRate,
        tep: tep * 100,
        saldoInicial: saldo,
        interes: interes,
        amortizacion: amortizacion,
        cuota: cuotaPago,
        saldoFinal: saldoFinal,
        flujo: flujo
      });
    }

    const tirCalculado = calculateTIR(flujos);
    const tcea = Math.pow(1 + tirCalculado, cuotasPorAno) - 1;

    setResults({
      cuotaInicialMonto,
      prestamos,
      cuotasPorAno,
      numCuotas,
      intereses: totalIntereses,
      amortizacion: totalAmortizacion,
      tir: tirCalculado * 100,
      tcea: tcea * 100
    });
    
    setAmortizationTable(table);
  };

  const calculateTIR = (flujos) => {
    let tir = 0.09;
    const tolerancia = 0.0001;
    const maxIteraciones = 100;
    
    for (let i = 0; i < maxIteraciones; i++) {
      let van = 0;
      let vanDerivada = 0;
      
      for (let j = 0; j < flujos.length; j++) {
        const factor = Math.pow(1 + tir, j);
        van += flujos[j] / factor;
        if (j > 0) {
          vanDerivada -= j * flujos[j] / Math.pow(1 + tir, j + 1);
        }
      }
      
      if (Math.abs(van) < tolerancia) {
        break;
      }
      
      if (vanDerivada !== 0) {
        tir = tir - van / vanDerivada;
      }
    }
    
    return tir;
  };

  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const exportToExcel = () => {
    if (amortizationTable.length === 0) {
      alert('No hay datos para exportar. Por favor, complete los campos requeridos.');
      return;
    }

    const headers = [
      'Período', 'TEA (%)', 'TEP (%)', 'Saldo Inicial (PEN)',
      'Interés (PEN)', 'Amortización (PEN)', 'Cuota (PEN)',
      'Saldo Final (PEN)', 'Flujo (PEN)'
    ];

    const csvContent = [
      ['SISTEMA DE AMORTIZACIÓN AMERICANO'],
      [''],
      ['Datos del Préstamo:'],
      [`Precio de Venta: ${formatCurrency(parseFloat(inputs.precioVenta) || 0)}`],
      [`Cuota Inicial: ${inputs.cuotaInicial}% (${formatCurrency(results.cuotaInicialMonto)})`],
      [`Monto Financiado: ${formatCurrency(results.prestamos)}`],
      [`TEA: ${inputs.tea}%`],
      [`TIR: ${results.tir.toFixed(7)}%`],
      [`TCEA: ${results.tcea.toFixed(7)}%`],
      [''],
      ['TABLA DE AMORTIZACIÓN:'],
      headers,
      ...amortizationTable.map(row => [
        row.periodo, row.tea.toFixed(7), row.tep.toFixed(7),
        row.saldoInicial.toFixed(2), row.interes.toFixed(2),
        row.amortizacion.toFixed(2), row.cuota.toFixed(2),
        row.saldoFinal.toFixed(2), row.flujo.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `tabla_amortizacion_americana_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (rate) => {
    return `${rate.toFixed(7)}%`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Compacto */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Sistema Financiero</h1>
              <p className="text-sm text-slate-500">Calculadora de Bonos - Método Americano</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Layout Compacto - 3 columnas lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          
          {/* Datos Principales - Columna 1 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-800 text-sm">Datos del Préstamo</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Precio de Venta *
                  </label>
                  <input
                    type="number"
                    placeholder="1800000"
                    value={inputs.precioVenta}
                    onChange={(e) => handleInputChange('precioVenta', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    % Cuota Inicial *
                  </label>
                  <input
                    type="number"
                    placeholder="20"
                    step="0.01"
                    value={inputs.cuotaInicial}
                    onChange={(e) => handleInputChange('cuotaInicial', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      N° Años *
                    </label>
                    <input
                      type="number"
                      placeholder="4"
                      value={inputs.numAnos}
                      onChange={(e) => handleInputChange('numAnos', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      TEA (%) *
                    </label>
                    <input
                      type="number"
                      placeholder="9.0"
                      step="0.01"
                      value={inputs.tea}
                      onChange={(e) => handleInputChange('tea', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Configuración Técnica - Columna 2 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-800 text-sm">Configuración</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Días x Año
                  </label>
                  <input
                    type="number"
                    value={inputs.diasAno}
                    onChange={(e) => handleInputChange('diasAno', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Días x Período
                  </label>
                  <input
                    type="number"
                    value={inputs.diasPeriodo}
                    onChange={(e) => handleInputChange('diasPeriodo', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                {/* Cálculos Automáticos Integrados */}
                {hasValidInputs() && (
                  <div className="pt-3 border-t border-slate-200">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Cuotas/Año:</span>
                        <span className="font-semibold">{results.cuotasPorAno}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Cuotas:</span>
                        <span className="font-semibold">{results.numCuotas}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">TEP:</span>
                        <span className="font-semibold text-green-600">
                          {((Math.pow(1 + (parseFloat(inputs.tea) || 0) / 100, 1/results.cuotasPorAno) - 1) * 100).toFixed(7)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">TIR:</span>
                        <span className="font-semibold text-purple-600">{results.tir.toFixed(7)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resultados Compactos - Columna 3 */}
          <div className="lg:col-span-1 xl:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-orange-600" />
                <h3 className="font-semibold text-slate-800 text-sm">Resultados Financieros</h3>
              </div>
              
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="bg-emerald-50 rounded-lg p-3">
                  <div className="text-xs text-emerald-700 mb-1">Cuota Inicial</div>
                  <div className="text-base font-bold text-emerald-800">{formatCurrency(results.cuotaInicialMonto)}</div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-700 mb-1">Préstamos</div>
                  <div className="text-base font-bold text-blue-800">{formatCurrency(results.prestamos)}</div>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="text-xs text-orange-700 mb-1">Total Intereses</div>
                  <div className="text-base font-bold text-orange-800">{formatCurrency(results.intereses)}</div>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-xs text-purple-700 mb-1">Amortización Final</div>
                  <div className="text-base font-bold text-purple-800">{formatCurrency(results.amortizacion)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla - Ancho completo */}
          <div className="lg:col-span-3 xl:col-span-4">
            {amortizationTable.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-slate-600" />
                      <h3 className="font-semibold text-slate-800">Tabla de Amortización - Método Americano</h3>
                    </div>
                    <button
                      onClick={exportToExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all duration-200 font-medium text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Exportar Excel
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">
                    TEA: {inputs.tea}% | TEP: {amortizationTable[0]?.tep.toFixed(7)}% | TIR: {results.tir.toFixed(7)}%
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-slate-600">Período</th>
                        <th className="px-3 py-3 text-center font-semibold text-slate-600">TEA</th>
                        <th className="px-3 py-3 text-center font-semibold text-slate-600">TEP</th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-600">Saldo Inicial</th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-600">Interés</th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-600">Amortización</th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-600">Cuota</th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-600">Saldo Final</th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-600">Flujo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {amortizationTable.map((row, index) => (
                        <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'} hover:bg-blue-50 transition-colors`}>
                          <td className="px-3 py-3 text-center font-semibold text-slate-800">{row.periodo}</td>
                          <td className="px-3 py-3 text-center text-slate-600">{formatPercentage(row.tea)}</td>
                          <td className="px-3 py-3 text-center text-slate-600">{formatPercentage(row.tep)}</td>
                          <td className="px-3 py-3 text-right text-slate-800">{formatCurrency(row.saldoInicial)}</td>
                          <td className="px-3 py-3 text-right text-orange-600 font-medium">
                            {formatCurrency(row.interes)}
                          </td>
                          <td className="px-3 py-3 text-right text-purple-600 font-medium">
                            {formatCurrency(row.amortizacion)}
                          </td>
                          <td className="px-3 py-3 text-right text-blue-600 font-semibold">
                            {formatCurrency(row.cuota)}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-800 font-medium">
                            {formatCurrency(row.saldoFinal)}
                          </td>
                          <td className="px-3 py-3 text-right text-red-600 font-medium">
                            {formatCurrency(row.flujo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!hasValidInputs() && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calculator className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Completa los datos requeridos</h3>
                <p className="text-slate-500">
                  Ingresa todos los campos marcados con * para ver los resultados
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Sistema de Información Corporativo - Método Americano</span>
            <span>TEP = (1+TEA)^(1/CuotasAño) - 1 | TIR = IRR(flujos)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}