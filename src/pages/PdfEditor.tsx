import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Save, Printer, Trash2, FileText, ChevronLeft, ChevronRight, Type, MousePointer2, Undo2, Redo2, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import toast from 'react-hot-toast';
import Layout from '../components/Layout/Layout';

// Configurar worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js`;

interface TextBlock {
    id: string;
    page: number;
    text: string;
    x: number; // en píxeles del viewport 1.0
    y: number; // en píxeles del viewport 1.0 (baseline)
    width: number;
    height: number;
    fontSize: number;
    fontName: string;
    fontWeight: string;
    fontStyle: string;
    isEdited: boolean;
    originalText: string;
    color: string;
}

const PdfEditor: React.FC = () => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale] = useState(1.5); // Escala de renderizado fija

    const [allBlocks, setAllBlocks] = useState<{ [page: number]: TextBlock[] }>({});
    const [history, setHistory] = useState<{ [page: number]: TextBlock[] }[]>([]);
    const [redoStack, setRedoStack] = useState<{ [page: number]: TextBlock[] }[]>([]);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const renderTaskRef = useRef<any>(null);

    const saveToHistory = useCallback(() => {
        setHistory(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(allBlocks))]);
        setRedoStack([]);
    }, [allBlocks]);

    const undo = useCallback(() => {
        if (history.length === 0) return;
        const last = history[history.length - 1];
        setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(allBlocks))]);
        setAllBlocks(last);
        setHistory(prev => prev.slice(0, -1));
    }, [history, allBlocks]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setHistory(prev => [...prev, JSON.parse(JSON.stringify(allBlocks))]);
        setAllBlocks(next);
        setRedoStack(prev => prev.slice(0, -1));
    }, [redoStack, allBlocks]);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setAllBlocks({});
            setHistory([]);
            setRedoStack([]);
            loadPdf(file);
        }
    };

    const loadPdf = async (file: File) => {
        setLoading(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument(arrayBuffer);
            const doc = await loadingTask.promise;
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setCurrentPage(1);
            await processPage(doc, 1);
        } catch (error) {
            toast.error('Error al cargar PDF');
        } finally {
            setLoading(false);
        }
    };

    const processPage = async (doc: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
        if (allBlocks[pageNum]) return;
        setIsProcessing(true);
        try {
            const page = await doc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            // IMPORTANTE: includeStyles: true es vital para tener métricas de fuente correctas
            const textContent = await page.getTextContent({ includeStyles: true } as any);

            const styles = textContent.styles || {};
            const items = textContent.items as any[];
            const pageBlocks: TextBlock[] = [];

            // 1. Agrupar por LÍNEAS (Y-Coordinate) ignorando la fuente inicialmente
            // Esto evita que "Bold" y "Regular" en la misma línea se rompan
            const lines: { [y: string]: any[] } = {};

            items.forEach(item => {
                // Normalizar Y para agrupar líneas con ligera variación
                const yRaw = item.transform[5];

                let foundY = Object.keys(lines).find(k => Math.abs(parseFloat(k) - yRaw) < 4); // 4px tolerancia
                if (!foundY) {
                    lines[yRaw] = [item];
                } else {
                    lines[foundY].push(item);
                }
            });

            // 2. Procesar cada línea
            Object.keys(lines).forEach(yKey => {
                const yRaw = parseFloat(yKey);
                // Ordenar por X
                const lineItems = lines[yKey].sort((a, b) => a.transform[4] - b.transform[4]);

                const createBlock = (str: string, sX: number, eX: number, fSize: number, fName: string) => {
                    const [vx, vy] = viewport.convertToViewportPoint(sX, yRaw) as any;
                    const [vex] = viewport.convertToViewportPoint(eX, yRaw) as any;

                    const style = styles[fName];
                    const isBold = fName.toLowerCase().includes('bold') || ((style as any)?.fontWeight && parseInt((style as any).fontWeight) > 500);
                    const isItalic = fName.toLowerCase().includes('italic') || fName.toLowerCase().includes('oblique');

                    return {
                        id: `blk-${pageNum}-${Math.random().toString(36).substr(2, 9)}`,
                        page: pageNum,
                        text: str.trim(),
                        originalText: str.trim(),
                        x: vx,
                        y: vy,
                        width: vex - vx,
                        height: fSize,
                        fontSize: fSize,
                        fontName: fName, // Guardamos nombre real para lookup
                        fontWeight: isBold ? 'bold' : 'normal',
                        fontStyle: isItalic ? 'italic' : 'normal',
                        color: typeof (lines[yKey][0] as any).color === 'string' ? (lines[yKey][0] as any).color : '#000000',
                        isEdited: false
                    };
                };

                let currentStr = "";
                let startX = lineItems[0].transform[4];
                let endX = startX + lineItems[0].width;
                // Usamos el tamaño del primer elemento visualmente dominante
                let fontSize = Math.sqrt(lineItems[0].transform[0] ** 2 + lineItems[0].transform[1] ** 2);
                let fontName = lineItems[0].fontName;

                lineItems.forEach((item, idx) => {
                    const charSpace = item.transform[4] - endX;
                    const itemFontSize = Math.sqrt(item.transform[0] ** 2 + item.transform[1] ** 2);

                    // Romper bloque si:
                    // 1. Hay un espacio horizontal grande (> tamaño de letra)
                    // 2. El tamaño de letra cambia drásticamente (> 20%)
                    if (idx > 0 && (charSpace > (fontSize * 1.5) || Math.abs(itemFontSize - fontSize) > 3)) {
                        if (currentStr.trim()) pageBlocks.push(createBlock(currentStr, startX, endX, fontSize, fontName));

                        currentStr = item.str;
                        startX = item.transform[4];
                        fontSize = itemFontSize;
                        fontName = item.fontName;
                    } else {
                        // Unir
                        const spacing = (idx > 0 && charSpace > (fontSize * 0.2)) ? " " : "";
                        currentStr += spacing + item.str;
                    }
                    endX = item.transform[4] + item.width;
                });

                if (currentStr.trim()) pageBlocks.push(createBlock(currentStr, startX, endX, fontSize, fontName));
            });

            setAllBlocks(prev => ({ ...prev, [pageNum]: pageBlocks }));
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const renderCanvas = useCallback(async () => {
        if (!pdfDoc || !canvasRef.current) return;
        const page = await pdfDoc.getPage(currentPage);
        const vp = page.getViewport({ scale });
        const canvas = canvasRef.current;
        canvas.height = vp.height;
        canvas.width = vp.width;
        const context = canvas.getContext('2d');
        if (context) {
            // Cancelar renderizado previo si existe
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }

            const renderTask = page.render({ canvasContext: context, viewport: vp });
            renderTaskRef.current = renderTask;

            try {
                await renderTask.promise;
                renderTaskRef.current = null;
            } catch (error: any) {
                if (error.name === 'RenderingCancelledException') {
                    // Ignorar error de cancelación planeada
                    return;
                }
                console.error("Render error:", error);
            }
        }
        if (!allBlocks[currentPage]) await processPage(pdfDoc, currentPage);
    }, [pdfDoc, currentPage, allBlocks, scale]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { renderCanvas(); }, [renderCanvas]);

    const handleTextChange = (id: string, newText: string) => {
        setAllBlocks(prev => ({
            ...prev,
            [currentPage]: prev[currentPage].map(b => b.id === id ? { ...b, text: newText, isEdited: true } : b)
        }));
    };

    const generatePdf = async () => {
        if (!pdfFile) return null;
        setLoading(true);
        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const exportDoc = await PDFDocument.load(arrayBuffer);
            const helvetica = await exportDoc.embedFont(StandardFonts.Helvetica);
            const helveticaBold = await exportDoc.embedFont(StandardFonts.HelveticaBold);
            const pages = exportDoc.getPages();

            Object.entries(allBlocks).forEach(([pgStr, blocks]) => {
                const page = pages[parseInt(pgStr) - 1];
                const { height } = page.getSize();
                blocks.forEach(blk => {
                    if (blk.isEdited) {
                        // PDF-LIB usa coordenadas desde abajo, origin 1.0 scale
                        page.drawRectangle({
                            x: blk.x - 1,
                            y: height - blk.y - (blk.fontSize * 0.2),
                            width: blk.width + 4,
                            height: blk.height + 4,
                            color: rgb(1, 1, 1),
                        });
                        page.drawText(blk.text, {
                            x: blk.x,
                            y: height - blk.y,
                            size: blk.fontSize,
                            font: blk.fontWeight === 'bold' ? helveticaBold : helvetica,
                            color: rgb(0, 0, 0)
                        });
                    }
                });
            });
            return await exportDoc.save();
        } catch (e) {
            toast.error("Error al exportar");
            return null;
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="flex flex-col h-[calc(100vh-100px)] bg-gray-500 overflow-hidden">
                {/* TOOLBAR */}
                <div className="bg-slate-800 text-white px-6 py-2 flex items-center justify-between shadow-2xl z-50">
                    <div className="flex items-center space-x-6 font-sans">
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 bg-slate-700 px-4 py-2 rounded-lg hover:bg-slate-600 transition-all border border-slate-600">
                            <Upload className="w-4 h-4" />
                            <span className="font-bold text-sm">SUBIR PDF</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={onFileChange} accept=".pdf" className="hidden" />

                        {pdfFile && (
                            <div className="flex items-center space-x-1 bg-slate-900 rounded-lg p-1 border border-slate-700">
                                <button onClick={undo} disabled={history.length === 0} className="p-2 hover:bg-slate-700 rounded disabled:opacity-20"><Undo2 className="w-4 h-4" /></button>
                                <button onClick={redo} disabled={redoStack.length === 0} className="p-2 hover:bg-slate-700 rounded disabled:opacity-20"><Redo2 className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-4">
                        {pdfFile && (
                            <button onClick={async () => {
                                const b = await generatePdf();
                                if (b) window.open(URL.createObjectURL(new Blob([b as any], { type: 'application/pdf' })));
                            }} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-bold shadow-lg transition-all flex items-center space-x-2 transform active:scale-95">
                                <Save className="w-4 h-4" />
                                <span>GUARDAR PDF</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* EDITOR CANVAS */}
                <div className="flex-1 overflow-auto p-12 flex justify-center custom-scrollbar bg-slate-400">
                    {!pdfFile ? (
                        <div className="self-center text-center text-slate-200">
                            <FileText className="w-24 h-24 mx-auto mb-6 opacity-20" />
                            <h2 className="text-3xl font-black mb-2 font-sans">SEJDA CLONE EDITOR</h2>
                            <p className="opacity-60 font-sans">Sube un documento para empezar a editar</p>
                        </div>
                    ) : (
                        <div
                            className="relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-white cursor-text"
                            onClick={(e) => {
                                // Crear nuevo bloque de texto al hacer click en espacio vacío
                                const rect = e.currentTarget.getBoundingClientRect();
                                const xDisplay = e.clientX - rect.left;
                                const yDisplay = e.clientY - rect.top;

                                // Convertir a escala 1.0 (PDF original 72DPI vs pantalla)
                                // Usamos coordenadas relativas al canvas renderizado
                                const x = xDisplay / scale;
                                const y = yDisplay / scale;

                                const newBlock: TextBlock = {
                                    id: `manual-${Date.now()}`,
                                    page: currentPage,
                                    text: "Texto",
                                    originalText: "",
                                    x: x,
                                    y: y + 10, // Ajuste visual para que el baseline del nuevo texto coincida aprox donde clickeaste
                                    width: 80, // Ancho default
                                    height: 14,
                                    fontSize: 14,
                                    fontName: 'Helvetica',
                                    fontWeight: 'normal',
                                    fontStyle: 'normal',
                                    isEdited: true, // Nace editado para mostrar fondo blanco
                                    color: '#000000'
                                };

                                setAllBlocks(prev => {
                                    const current = prev[currentPage] || [];
                                    return { ...prev, [currentPage]: [...current, newBlock] };
                                });

                                // Seleccionar tras render (pequeño delay necesario)
                                setTimeout(() => setSelectedId(newBlock.id), 50);
                                saveToHistory();
                            }}
                        >
                            <canvas ref={canvasRef} className="block" />

                            {/* LAYER DE EDICIÓN MILIMÉTRICA */}
                            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                                {allBlocks[currentPage]?.map(blk => (
                                    <div
                                        key={blk.id}
                                        onClick={(e) => e.stopPropagation()} // Stop propagation para no crear uno nuevo debajo
                                        className={`absolute pointer-events-auto transition-colors duration-75 ${selectedId === blk.id ? 'z-[100]' : 'z-10 hover:bg-blue-600/10'}`}
                                        style={{
                                            left: `${blk.x * scale}px`,
                                            top: `${(blk.y - (blk.fontSize * 1.1)) * scale}px`,
                                            width: `${blk.width * scale}px`,
                                            height: `${blk.fontSize * scale * 2.1}px`, // HITBOX GIGANTE
                                            backgroundColor: (blk.isEdited || selectedId === blk.id) ? '#FFFFFF' : 'transparent',
                                            boxShadow: (blk.isEdited || selectedId === blk.id) ? '0 0 0 5px #FFFFFF' : 'none',
                                            padding: '0 4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            // Borde MUY sutil, casi invisible
                                            border: blk.isEdited || selectedId === blk.id ? 'none' : '1px solid rgba(59, 130, 246, 0.1)'
                                        }}
                                        title={blk.originalText ? "Editar detectado" : "Texto añadido"}
                                    >
                                        <div
                                            contentEditable
                                            suppressContentEditableWarning
                                            onInput={(e) => handleTextChange(blk.id, e.currentTarget.textContent || "")}
                                            onFocus={() => { setSelectedId(blk.id); saveToHistory(); }}
                                            onBlur={(e) => {
                                                setSelectedId(null);
                                                // Limpiar manuales vacíos
                                                if (!e.currentTarget.textContent?.trim() && blk.id.startsWith('manual')) {
                                                    setAllBlocks(prev => ({
                                                        ...prev,
                                                        [currentPage]: prev[currentPage].filter(b => b.id !== blk.id)
                                                    }));
                                                }
                                            }}
                                            className="w-full h-full bg-transparent border-none outline-none p-0 m-0 overflow-hidden whitespace-nowrap flex items-center"
                                            style={{
                                                fontSize: `${blk.fontSize * scale}px`,
                                                fontFamily: blk.fontName?.toLowerCase().includes('times') ? 'serif' : 'sans-serif',
                                                fontWeight: blk.fontWeight,
                                                fontStyle: blk.fontStyle,
                                                color: (blk.isEdited || selectedId === blk.id) ? '#000000' : 'transparent',
                                                caretColor: '#000000',
                                                lineHeight: '100%',
                                                cursor: 'text'
                                            }}
                                        >
                                            {blk.text}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {isProcessing && (
                                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
                                    <div className="bg-white text-slate-900 px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-4">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                        <span className="font-black font-sans uppercase tracking-widest text-sm">PROCESANDO TIPOGRAFÍA...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* PAGINACIÓN */}
                {pdfFile && (
                    <div className="bg-slate-800 text-white border-t border-slate-700 px-8 py-3 flex items-center justify-center space-x-12 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] font-sans">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="hover:text-blue-400 disabled:opacity-10 transition-colors"><ChevronLeft className="w-8 h-8" /></button>
                        <div className="flex items-center space-x-4">
                            <span className="text-xs font-black uppercase opacity-40">Página</span>
                            <span className="text-xl font-black">{currentPage} / {numPages}</span>
                        </div>
                        <button disabled={currentPage === numPages} onClick={() => setCurrentPage(p => p + 1)} className="hover:text-blue-400 disabled:opacity-10 transition-colors"><ChevronRight className="w-8 h-8" /></button>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #334155; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 5px; border: 2px solid #334155; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
            `}</style>
        </Layout>
    );
};

export default PdfEditor;
