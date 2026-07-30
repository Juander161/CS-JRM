import React, { useMemo, useState } from 'react';

function calcularStats(filas, columna) {
  if (!columna || !filas.length) return null;

  const total = filas.length;
  const vacios = filas.filter((f) => {
    const v = f[columna];
    return v === '' || v === null || v === undefined;
  }).length;
  const noVacios = total - vacios;

  const contador = {};
  filas.forEach((f) => {
    const k = String(f[columna] ?? '');
    contador[k] = (contador[k] || 0) + 1;
  });
  const unicos = Object.keys(contador).length;

  const numericos = filas
    .map((f) => f[columna])
    .filter((v) => v !== '' && v != null && !isNaN(parseFloat(v)))
    .map(Number);
  const esNumerico = numericos.length > 0 && noVacios > 0 && numericos.length / noVacios >= 0.7;

  let statsNum = null;
  if (esNumerico && numericos.length > 0) {
    const sorted = [...numericos].sort((a, b) => a - b);
    const suma = numericos.reduce((a, b) => a + b, 0);
    const mid = Math.floor(sorted.length / 2);
    statsNum = {
      suma,
      promedio: suma / numericos.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mediana: sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid],
    };
  }

  const top = Object.entries(contador)
    .filter(([k]) => k !== '')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([valor, count]) => ({ valor, count, pct: ((count / total) * 100).toFixed(1) }));

  return { total, vacios, noVacios, unicos, esNumerico, statsNum, top };
}

function fmt(n, dec = 2) {
  if (n == null) return '—';
  return Number(n).toLocaleString('es-MX', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
}

function Tile({ label, value, color }) {
  return (
    <div className="stat-tile">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

export default function PanelEstadisticas({ columnas, filas }) {
  const [columna, setColumna] = useState('');
  const stats = useMemo(() => calcularStats(filas, columna), [filas, columna]);
  const maxCount = stats?.top?.[0]?.count || 1;

  return (
    <div className="panel-stats">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13 }}>Estadísticas de columna</strong>
        <select
          value={columna}
          onChange={(e) => setColumna(e.target.value)}
          style={{ fontSize: 13 }}
        >
          <option value="">Selecciona una columna…</option>
          {columnas.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {columna && (
          <span className="hint" style={{ fontSize: 11 }}>
            Calculado sobre {filas.length.toLocaleString('es-MX')} fila(s) visibles
          </span>
        )}
      </div>

      {stats && (
        <>
          <div className="stats-grid">
            <Tile label="Total filas" value={fmt(stats.total, 0)} />
            <Tile label="No vacíos" value={fmt(stats.noVacios, 0)} />
            <Tile
              label="Vacíos"
              value={`${fmt(stats.vacios, 0)} (${fmt(stats.vacios / stats.total * 100, 1)}%)`}
              color={stats.vacios > 0 ? '#92400e' : undefined}
            />
            <Tile label="Valores únicos" value={fmt(stats.unicos, 0)} />
            {stats.statsNum && (
              <>
                <Tile label="Suma" value={fmt(stats.statsNum.suma)} />
                <Tile label="Promedio" value={fmt(stats.statsNum.promedio)} />
                <Tile label="Mediana" value={fmt(stats.statsNum.mediana)} />
                <Tile label="Mín" value={fmt(stats.statsNum.min)} />
                <Tile label="Máx" value={fmt(stats.statsNum.max)} />
              </>
            )}
          </div>

          {stats.top.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                {stats.unicos <= 12 ? 'Distribución completa' : `Top ${stats.top.length} valores más frecuentes`}
              </p>
              <div className="freq-list">
                {stats.top.map(({ valor, count, pct }) => (
                  <div key={valor} className="freq-row">
                    <span className="freq-label" title={valor}>{valor || '(vacío)'}</span>
                    <div className="freq-track">
                      <div className="freq-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                    <span className="freq-count">{count.toLocaleString('es-MX')} ({pct}%)</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
