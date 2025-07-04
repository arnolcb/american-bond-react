import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, TrendingUp, FileText, Building, AlertCircle } from 'lucide-react';

export default function BondCalculator() {
  const [inputs, setInputs] = useState({
    // Datos básicos
    empresaEmisora: 'Corporación ABC S.A.',
    moneda: 'PEN',
    valorNominal: 200000, // Cambiado de precioVenta
    cuotaInicial: 0, // Para bonos, generalmente no hay cuota inicial
    diasAno: 360,
    diasPeriodo: 180,
    numAnos: 8,
    cuotasAno: 2,
    numCuotas: 16,
    tasaCupon: 2.6, // Cambiado de tea a tasaCupon
    
    // Nuevos campos
    cavali: 0.0375, // % del valor nominal
    costoColocacion: 2, // % del valor nominal (1-10%)
    costoEstructuracion: 1.5, // % del valor nominal (1-10%)
    tipoGracia: 'S', // S:Sin período, P:Parcial, T:Total
    periodosGracia: 0,
    precioColocacion: 200000 // Precio al que se emite el bono
  });

  const [results, setResults] = useState({
    valorNominal: 0,
    cavaliMonto: 0,
    costoColocacionMonto: 0,
    costoEstructuracionMonto: 0,
    flujoEmisorInicial: 0,
    flujoInversionistaInicial: 0,
    cuponPeriodico: 0,
    tep: 0,
    precioBono: 0,
    duracion: 0,
    convexidad: 0,
    tcea: 0,
    tcrea: 0
  });

  const [amortizationTable, setAmortizationTable] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    validateInputs();
    calculateResults();
  }, [inputs]);

  const validateInputs = () => {
    const newErrors = {};
    
    if (inputs.tasaCupon < 0 || inputs.tasaCupon > 12) {
      newErrors.tasaCupon = 'Tasa cupón debe estar entre 0% y 12%';
    }
    
    if (inputs.diasPeriodo < 10) {
      newErrors.diasPeriodo = 'Días por período no pueden ser menores a 10';
    }
    
    if (inputs.costoColocacion < 1 || inputs.costoColocacion > 10) {
      newErrors.costoColocacion = 'Costo de colocación debe estar entre 1% y 10%';
    }
    
    if (inputs.costoEstructuracion < 1 || inputs.costoEstructuracion > 10) {
      newErrors.costoEstructuracion = 'Costo de estructuración debe estar entre 1% y 10%';
    }
    
    if (inputs.periodosGracia < 0 || inputs.periodosGracia >= inputs.numCuotas) {
      newErrors.periodosGracia = 'Períodos de gracia inválidos';
    }
    
    setErrors(newErrors);
  };

  const calculateResults = () => {
    if (Object.keys(errors).length > 0) return;
    
    const { valorNominal, tasaCupon, cuotasAno, numCuotas, cavali, costoColocacion, costoEstructuracion, tipoGracia, periodosGracia, precioColocacion } = inputs;
    
    // Cálculos básicos
    // TEP (Tasa Efectiva por Período) - convertir tasa anual a periódica
    const tep = Math.pow(1 + (tasaCupon / 100), 1 / cuotasAno) - 1;
    
    // Cupón periódico = Valor Nominal × TEP
    const cuponPeriodico = valorNominal * tep;
    
    // Costos (sobre valor nominal)
    const cavaliMonto = valorNominal * (cavali / 100);
    const costoColocacionMonto = valorNominal * (costoColocacion / 100);
    const costoEstructuracionMonto = valorNominal * (costoEstructuracion / 100);
    
    // Flujos iniciales (Período 0)
    // Emisor: RECIBE el precio de colocación y PAGA los costos
    const flujoEmisorInicial = precioColocacion - cavaliMonto - costoColocacionMonto - costoEstructuracionMonto;
    // Inversionista: PAGA el precio de colocación
    const flujoInversionistaInicial = -precioColocacion;
    
    setResults({
      valorNominal,
      cavaliMonto,
      costoColocacionMonto,
      costoEstructuracionMonto,
      flujoEmisorInicial,
      flujoInversionistaInicial,
      cuponPeriodico,
      tep: tep * 100
    });

    // Generar tabla de amortización y calcular métricas
    generateAmortizationTable(valorNominal, cuponPeriodico, tep, numCuotas, tipoGracia, periodosGracia, flujoEmisorInicial, flujoInversionistaInicial, precioColocacion);
  };

  const generateAmortizationTable = (valorNominal, cuponPeriodico, tep, numCuotas, tipoGracia, periodosGracia, flujoEmisorInicial, flujoInversionistaInicial, precioColocacion) => {
    const table = [];
    const flujosEmisor = [flujoEmisorInicial];
    const flujosInversionista = [flujoInversionistaInicial];
    
    let saldo = valorNominal;
    
    for (let i = 1; i <= numCuotas; i++) {
      let tipoGraciaActual = 'S';
      let interes = 0;
      let amortizacion = 0;
      let cuota = 0;
      let flujoEmisor = 0;
      let flujoInversionista = 0;
      
      // Determinar si hay período de gracia
      if (i <= periodosGracia) {
        tipoGraciaActual = tipoGracia;
        
        if (tipoGracia === 'T') { // Total - no se paga nada
          interes = 0;
          amortizacion = 0;
          cuota = 0;
          flujoEmisor = 0; // Emisor no paga nada
          flujoInversionista = 0; // Inversionista no recibe nada
        } else if (tipoGracia === 'P') { // Parcial - solo intereses
          interes = cuponPeriodico;
          amortizacion = 0;
          cuota = interes;
          flujoEmisor = -cuota; // Emisor PAGA el cupón (negativo)
          flujoInversionista = cuota; // Inversionista RECIBE el cupón (positivo)
        }
      } else {
        // Períodos normales
        interes = cuponPeriodico;
        // En método americano: amortización solo en el último período
        amortizacion = i === numCuotas ? saldo : 0;
        cuota = interes + amortizacion;
        flujoEmisor = -cuota; // Emisor PAGA la cuota (negativo)
        flujoInversionista = cuota; // Inversionista RECIBE la cuota (positivo)
      }
      
      const saldoFinal = i === numCuotas ? 0 : saldo;
      
      table.push({
        periodo: i,
        tasaCupon: inputs.tasaCupon,
        tep: tep * 100,
        saldoInicial: saldo,
        interes: interes,
        amortizacion: amortizacion,
        cuota: cuota,
        saldoFinal: saldoFinal,
        flujoEmisor: flujoEmisor,
        flujoInversionista: flujoInversionista,
        tipoGracia: tipoGraciaActual
      });
      
      flujosEmisor.push(flujoEmisor);
      flujosInversionista.push(flujoInversionista);
    }
    
    setAmortizationTable(table);
    
    // Calcular métricas financieras
    calculateFinancialMetrics(flujosEmisor, flujosInversionista, tep, valorNominal, cuponPeriodico, numCuotas, inputs.cuotasAno, precioColocacion);
  };

  const calculateFinancialMetrics = (flujosEmisor, flujosInversionista, tep, valorNominal, cuponPeriodico, numCuotas, cuotasAno, precioColocacion) => {
    // Cálculo de TCEA (TIR del emisor)
    const tceaPeriodica = calculateIRR(flujosEmisor);
    const tcea = tceaPeriodica ? ((Math.pow(1 + tceaPeriodica, cuotasAno) - 1) * 100) : 0;
    
    // Cálculo de TCREA (TIR del inversionista)
    const tcreaPeriodica = calculateIRR(flujosInversionista);
    const tcrea = tcreaPeriodica ? ((Math.pow(1 + tcreaPeriodica, cuotasAno) - 1) * 100) : 0;
    
    // Cálculo del precio del bono (Valor presente de flujos futuros)
    let precioBono = 0;
    for (let i = 1; i <= numCuotas; i++) {
      const flujo = i === numCuotas ? cuponPeriodico + valorNominal : cuponPeriodico;
      precioBono += flujo / Math.pow(1 + tep, i);
    }
    
    // Cálculo de duración de Macaulay
    let duracion = 0;
    for (let i = 1; i <= numCuotas; i++) {
      const flujo = i === numCuotas ? cuponPeriodico + valorNominal : cuponPeriodico;
      const valorPresente = flujo / Math.pow(1 + tep, i);
      duracion += (i * valorPresente) / precioBono;
    }
    duracion = duracion / cuotasAno; // Convertir a años
    
    // Cálculo de convexidad
    let convexidad = 0;
    for (let i = 1; i <= numCuotas; i++) {
      const flujo = i === numCuotas ? cuponPeriodico + valorNominal : cuponPeriodico;
      const valorPresente = flujo / Math.pow(1 + tep, i);
      convexidad += (i * (i + 1) * valorPresente) / (Math.pow(1 + tep, 2) * precioBono);
    }
    
    setResults(prev => ({
      ...prev,
      precioBono,
      duracion,
      convexidad,
      tcea,
      tcrea
    }));
  };

  // Algoritmo de Newton-Raphson para calcular TIR
  const calculateIRR = (flujos) => {
    let rate = 0.1; // Estimación inicial
    const maxIterations = 100;
    const tolerance = 1e-6;
    
    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let dnpv = 0;
      
      for (let j = 0; j < flujos.length; j++) {
        npv += flujos[j] / Math.pow(1 + rate, j);
        if (j > 0) {
          dnpv -= j * flujos[j] / Math.pow(1 + rate, j + 1);
        }
      }
      
      if (Math.abs(npv) < tolerance) return rate;
      if (Math.abs(dnpv) < tolerance) break;
      
      rate = rate - npv / dnpv;
    }
    
    return rate;
  };

  const handleInputChange = (field, value) => {
    setInputs(prev => {
      const newInputs = {
        ...prev,
        [field]: parseFloat(value) || (field === 'empresaEmisora' || field === 'moneda' || field === 'tipoGracia' ? value : 0)
      };
      
      // Auto-actualizar campos relacionados
      if (field === 'numAnos' || field === 'cuotasAno') {
        newInputs.numCuotas = newInputs.numAnos * newInputs.cuotasAno;
      }
      if (field === 'valorNominal') {
        newInputs.precioColocacion = newInputs.valorNominal; // Por defecto, precio = valor nominal
      }
      
      return newInputs;
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: inputs.moneda || 'PEN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (rate) => {
    return `${rate.toFixed(4)}%`;
  };

  const getTipoGraciaText = (tipo) => {
    switch (tipo) {
      case 'S': return 'Sin período';
      case 'P': return 'Parcial';
      case 'T': return 'Total';
      default: return 'Sin período';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Calculator className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-800">Sistema de Información Corporativo</h1>
          </div>
          <p className="text-gray-600">Cálculo de Bonos - Método Americano</p>
          <div className="mt-2 text-sm text-gray-500">
            <Building className="w-4 h-4 inline mr-1" />
            {inputs.empresaEmisora} | Moneda: {inputs.moneda}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Datos Básicos del Bono */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Datos del Bono
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Empresa Emisora
                  </label>
                  <input
                    type="text"
                    value={inputs.empresaEmisora}
                    onChange={(e) => handleInputChange('empresaEmisora', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Moneda
                    </label>
                    <select
                      value={inputs.moneda}
                      onChange={(e) => handleInputChange('moneda', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="PEN">PEN</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor Nominal
                    </label>
                    <input
                      type="number"
                      value={inputs.valorNominal}
                      onChange={(e) => handleInputChange('valorNominal', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de Colocación
                  </label>
                  <input
                    type="number"
                    value={inputs.precioColocacion}
                    onChange={(e) => handleInputChange('precioColocacion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Días x Año
                    </label>
                    <input
                      type="number"
                      value={inputs.diasAno}
                      onChange={(e) => handleInputChange('diasAno', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Días x Período {errors.diasPeriodo && <span className="text-red-500 text-xs">*</span>}
                    </label>
                    <input
                      type="number"
                      value={inputs.diasPeriodo}
                      onChange={(e) => handleInputChange('diasPeriodo', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.diasPeriodo ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.diasPeriodo && <p className="text-red-500 text-xs mt-1">{errors.diasPeriodo}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      N° Años
                    </label>
                    <input
                      type="number"
                      value={inputs.numAnos}
                      onChange={(e) => handleInputChange('numAnos', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cupones/Año
                    </label>
                    <input
                      type="number"
                      value={inputs.cuotasAno}
                      onChange={(e) => handleInputChange('cuotasAno', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      N° Cupones
                    </label>
                    <input
                      type="number"
                      value={inputs.numCuotas}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tasa Cupón Anual (%) {errors.tasaCupon && <span className="text-red-500 text-xs">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inputs.tasaCupon}
                    onChange={(e) => handleInputChange('tasaCupon', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.tasaCupon ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.tasaCupon && <p className="text-red-500 text-xs mt-1">{errors.tasaCupon}</p>}
                </div>
              </div>
            </div>

            {/* Costos y Período de Gracia */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Costos y Período de Gracia
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CAVALI (% del VN)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={inputs.cavali}
                    onChange={(e) => handleInputChange('cavali', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo Colocación (%) {errors.costoColocacion && <span className="text-red-500 text-xs">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.costoColocacion}
                    onChange={(e) => handleInputChange('costoColocacion', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.costoColocacion ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.costoColocacion && <p className="text-red-500 text-xs mt-1">{errors.costoColocacion}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo Estructuración (%) {errors.costoEstructuracion && <span className="text-red-500 text-xs">*</span>}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputs.costoEstructuracion}
                    onChange={(e) => handleInputChange('costoEstructuracion', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.costoEstructuracion ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.costoEstructuracion && <p className="text-red-500 text-xs mt-1">{errors.costoEstructuracion}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Período de Gracia
                  </label>
                  <select
                    value={inputs.tipoGracia}
                    onChange={(e) => handleInputChange('tipoGracia', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="S">Sin período</option>
                    <option value="P">Parcial (solo intereses)</option>
                    <option value="T">Total (sin pagos)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Períodos de Gracia {errors.periodosGracia && <span className="text-red-500 text-xs">*</span>}
                  </label>
                  <input
                    type="number"
                    value={inputs.periodosGracia}
                    onChange={(e) => handleInputChange('periodosGracia', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${errors.periodosGracia ? 'border-red-500' : 'border-gray-300'}`}
                    disabled={inputs.tipoGracia === 'S'}
                  />
                  {errors.periodosGracia && <p className="text-red-500 text-xs mt-1">{errors.periodosGracia}</p>}
                </div>
              </div>
            </div>

            {/* Resultados */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Resultados Financieros
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-orange-50 rounded">
                    <span className="font-medium text-gray-700">CAVALI:</span>
                    <br />
                    <span className="font-bold text-orange-600">{formatCurrency(results.cavaliMonto)}</span>
                  </div>
                  <div className="p-2 bg-purple-50 rounded">
                    <span className="font-medium text-gray-700">Costo Colocación:</span>
                    <br />
                    <span className="font-bold text-purple-600">{formatCurrency(results.costoColocacionMonto)}</span>
                  </div>
                  <div className="p-2 bg-red-50 rounded">
                    <span className="font-medium text-gray-700">Costo Estructuración:</span>
                    <br />
                    <span className="font-bold text-red-600">{formatCurrency(results.costoEstructuracionMonto)}</span>
                  </div>
                  <div className="p-2 bg-indigo-50 rounded">
                    <span className="font-medium text-gray-700">TEP:</span>
                    <br />
                    <span className="font-bold text-indigo-600">{formatPercentage(results.tep)}</span>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <span className="font-medium text-gray-700">Cupón Periódico:</span>
                    <br />
                    <span className="font-bold text-green-600">{formatCurrency(results.cuponPeriodico)}</span>
                  </div>
                  <div className="p-2 bg-blue-50 rounded">
                    <span className="font-medium text-gray-700">Flujo Emisor (T=0):</span>
                    <br />
                    <span className="font-bold text-blue-600">{formatCurrency(results.flujoEmisorInicial)}</span>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-gray-800">Métricas del Bono:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-emerald-50 rounded">
                      <span className="font-medium text-gray-700">Precio del Bono:</span>
                      <br />
                      <span className="font-bold text-emerald-600">{formatCurrency(results.precioBono)}</span>
                    </div>
                    <div className="p-2 bg-cyan-50 rounded">
                      <span className="font-medium text-gray-700">Duración (años):</span>
                      <br />
                      <span className="font-bold text-cyan-600">{results.duracion.toFixed(4)}</span>
                    </div>
                    <div className="p-2 bg-teal-50 rounded">
                      <span className="font-medium text-gray-700">Convexidad:</span>
                      <br />
                      <span className="font-bold text-teal-600">{results.convexidad.toFixed(4)}</span>
                    </div>
                    <div className="p-2 bg-amber-50 rounded">
                      <span className="font-medium text-gray-700">TCEA:</span>
                      <br />
                      <span className="font-bold text-amber-600">{results.tcea.toFixed(4)}%</span>
                    </div>
                  </div>
                  <div className="p-2 bg-rose-50 rounded">
                    <span className="font-medium text-gray-700">TCREA:</span>
                    <br />
                    <span className="font-bold text-rose-600">{results.tcrea.toFixed(4)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Amortización */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Tabla de Cupones - Método Americano
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-green-600 text-white">
                      <th className="px-2 py-3 text-center font-semibold">Período</th>
                      <th className="px-2 py-3 text-center font-semibold">Tasa Cupón</th>
                      <th className="px-2 py-3 text-center font-semibold">TEP</th>
                      <th className="px-2 py-3 text-center font-semibold">Tipo Gracia</th>
                      <th className="px-2 py-3 text-right font-semibold">Saldo Inicial</th>
                      <th className="px-2 py-3 text-right font-semibold">Interés/Cupón</th>
                      <th className="px-2 py-3 text-right font-semibold">Amortización</th>
                      <th className="px-2 py-3 text-right font-semibold">Pago Total</th>
                      <th className="px-2 py-3 text-right font-semibold">Saldo Final</th>
                      <th className="px-2 py-3 text-right font-semibold">Flujo Emisor</th>
                      <th className="px-2 py-3 text-right font-semibold">Flujo Inversionista</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amortizationTable.map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-2 py-2 text-center font-medium">{row.periodo}</td>
                        <td className="px-2 py-2 text-center">{formatPercentage(row.tasaCupon)}</td>
                        <td className="px-2 py-2 text-center">{formatPercentage(row.tep)}</td>
                        <td className="px-2 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            row.tipoGracia === 'T' ? 'bg-red-100 text-red-800' :
                            row.tipoGracia === 'P' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {getTipoGraciaText(row.tipoGracia)}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">{formatCurrency(row.saldoInicial)}</td>
                        <td className="px-2 py-2 text-right text-blue-600">
                          {formatCurrency(row.interes)}
                        </td>
                        <td className="px-2 py-2 text-right text-purple-600">
                          {formatCurrency(row.amortizacion)}
                        </td>
                        <td className="px-2 py-2 text-right text-green-600 font-medium">
                          {formatCurrency(row.cuota)}
                        </td>
                        <td className="px-2 py-2 text-right font-medium">
                          {formatCurrency(row.saldoFinal)}
                        </td>
                        <td className="px-2 py-2 text-right text-red-600">
                          {row.flujoEmisor < 0 ? 
                            `(${formatCurrency(Math.abs(row.flujoEmisor))})` : 
                            row.flujoEmisor > 0 ? formatCurrency(row.flujoEmisor) : '-'}
                        </td>
                        <td className="px-2 py-2 text-right text-green-600">
                          {row.flujoInversionista > 0 ? formatCurrency(row.flujoInversionista) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Resumen de Flujos */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Perspectiva del Emisor</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Flujo Inicial (T=0):</span>
                      <span className="font-bold text-green-600">{formatCurrency(results.flujoEmisorInicial)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TCEA (Costo):</span>
                      <span className="font-bold text-red-600">{results.tcea.toFixed(4)}%</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      El emisor RECIBE dinero al inicio y PAGA cupones e intereses
                    </p>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Perspectiva del Inversionista</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Inversión Inicial (T=0):</span>
                      <span className="font-bold text-red-600">{formatCurrency(Math.abs(results.flujoInversionistaInicial))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TCREA (Rendimiento):</span>
                      <span className="font-bold text-green-600">{results.tcrea.toFixed(4)}%</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      El inversionista PAGA al inicio y RECIBE cupones e intereses
                    </p>
                  </div>
                </div>
              </div>

              {/* Explicación del Método Americano */}
              <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Características del Método Americano:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Solo se pagan intereses durante los períodos intermedios</p>
                  <p>• El capital (valor nominal) se paga completo en el último período</p>
                  <p>• Las cuotas son constantes (solo intereses) hasta el vencimiento</p>
                  <p>• En la última cuota se paga: cupón + valor nominal completo</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center bg-white rounded-xl shadow-lg p-4">
          <p className="text-sm text-gray-600">
            Sistema de Información Corporativo - Método Americano | 
            Pago Total = Cupón + Amortización | 
            TCEA: Tasa de Costo Efectiva Anual | TCREA: Tasa de Rendimiento Efectiva Anual
          </p>
          <div className="mt-2 text-xs text-gray-500">
            <span className="inline-block mx-2">S: Sin período de gracia</span>
            <span className="inline-block mx-2">P: Período de gracia parcial (solo cupones)</span>
            <span className="inline-block mx-2">T: Período de gracia total (sin pagos)</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Cupón = Valor Nominal × TEP | TEP = (1 + Tasa Cupón Anual)^(1/Cupones por Año) - 1
          </div>
        </div>
      </div>
    </div>
  );
}