import { useCallback, useEffect, useRef, useState } from 'react';
import { parseEmlFile } from '../utils/parseEmlFile.js';

const POLL_MS = 10_000;

/**
 * Vigila una carpeta local en busca de archivos .eml nuevos.
 * Requiere File System Access API (Chrome / Edge).
 * onNuevoEmail(cuerpoTexto, meta) se llama por cada archivo nuevo detectado.
 */
export function useFolderWatcher(onNuevoEmail) {
  const [estado, setEstado]                   = useState('idle'); // 'idle' | 'watching' | 'error'
  const [folderName, setFolderName]           = useState('');
  const [ultimaRevision, setUltimaRevision]   = useState(null);
  const [correosProcesados, setCorreosProcesados] = useState([]);
  const [errorMsg, setErrorMsg]               = useState('');

  const dirHandleRef   = useRef(null);
  const procesadosRef  = useRef(new Set());   // "nombre_lastModified"
  const timerRef       = useRef(null);
  const callbackRef    = useRef(onNuevoEmail);
  useEffect(() => { callbackRef.current = onNuevoEmail; }, [onNuevoEmail]);

  const revisarCarpeta = useCallback(async () => {
    const handle = dirHandleRef.current;
    if (!handle) return;
    setUltimaRevision(new Date());
    try {
      const nuevos = [];
      for await (const [nombre, entrada] of handle.entries()) {
        if (entrada.kind !== 'file' || !nombre.toLowerCase().endsWith('.eml')) continue;
        const archivo = await entrada.getFile();
        const clave   = `${nombre}_${archivo.lastModified}`;
        if (procesadosRef.current.has(clave)) continue;
        procesadosRef.current.add(clave);

        const texto  = await archivo.text();
        const parsed = parseEmlFile(texto);
        const meta   = { nombre, de: parsed.de, asunto: parsed.asunto, fecha: parsed.fecha, procesadoEn: new Date() };
        nuevos.push(meta);
        callbackRef.current?.(parsed.texto, meta);
      }
      if (nuevos.length) {
        setCorreosProcesados((prev) => [...nuevos.reverse(), ...prev].slice(0, 100));
      }
    } catch (err) {
      setErrorMsg(`Error leyendo carpeta: ${err.message}`);
      setEstado('error');
      clearInterval(timerRef.current);
    }
  }, []);

  async function seleccionarYVigilar() {
    if (!('showDirectoryPicker' in window)) {
      setErrorMsg('Requiere Chrome o Edge (File System Access API).');
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      dirHandleRef.current = handle;
      procesadosRef.current.clear();
      clearInterval(timerRef.current);
      setFolderName(handle.name);
      setEstado('watching');
      setErrorMsg('');
      setCorreosProcesados([]);

      await revisarCarpeta();
      timerRef.current = setInterval(revisarCarpeta, POLL_MS);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setErrorMsg(err.message);
        setEstado('error');
      }
    }
  }

  function detener() {
    clearInterval(timerRef.current);
    dirHandleRef.current = null;
    setEstado('idle');
    setFolderName('');
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  return {
    estado,
    folderName,
    ultimaRevision,
    correosProcesados,
    errorMsg,
    soportado: typeof window !== 'undefined' && 'showDirectoryPicker' in window,
    seleccionarYVigilar,
    detener,
  };
}
