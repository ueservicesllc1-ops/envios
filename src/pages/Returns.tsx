import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Search, Filter, Plus, RotateCcw, X, User, Package, Undo2, FileText, Download, Eye, Minus, Pencil } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Return, ReturnItem, Seller, SellerInventoryItem } from '../types';
import { returnService } from '../services/returnService';
import { sellerService } from '../services/sellerService';
import { sellerInventoryService } from '../services/sellerInventoryService';
import { soldProductService } from '../services/soldProductService';
import { exitNoteService } from '../services/exitNoteService';
import { ExitNote } from '../types';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const Returns: React.FC = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [viewingReturn, setViewingReturn] = useState<Return | null>(null);
  const [editingReturn, setEditingReturn] = useState<Return | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Estados para crear nota de devolución
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [returnToDelete, setReturnToDelete] = useState<Return | null>(null);

  // Función para convertir imagen URL a Base64 usando un PROXY DE IMÁGENES dedicado (weserv.nl)
  const getBase64ImageFromURL = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Usar weserv.nl que es un proxy especializado en imágenes y optimización de CORS
        // Pedimos la imagen ya redimensionada a 100x100 para que el PDF pese menos y cargue más rápido
        const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=100&h=100&fit=cover&output=jpg&q=80`;
        
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        
        // El timeout para evitar que el PDF se quede bloqueado si una imagen no carga
        const timeout = setTimeout(() => {
          img.src = ""; // Abortar
          reject(new Error('Image load timeout'));
        }, 10000);

        img.onload = () => {
          clearTimeout(timeout);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            reject(new Error('Could not get canvas context'));
          }
        };

        img.onerror = (err) => {
          clearTimeout(timeout);
          console.error('Error loading image via weserv.nl:', url);
          // Fallback a la imagen original por si el proxy falla
          if (img.src !== url) {
            img.src = url;
          } else {
            reject(err);
          }
        };

        img.src = proxiedUrl;
      } catch (error) {
        console.error('Error in getBase64ImageFromURL:', error);
        reject(error);
      }
    });
  };

  const generateReturnPDF = async (returnNote: Return) => {
    try {
      toast.loading('Generando PDF...', { id: 'generating-pdf' });
      const doc = new jsPDF() as any;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('NOTA DE DEVOLUCIÓN', 14, 22);

      doc.setFontSize(10);
      doc.text(`Número: ${returnNote.number}`, 14, 30);
      doc.text(`Fecha: ${new Date(returnNote.createdAt).toLocaleDateString()}`, 14, 35);
      doc.text(`Estado: ${returnNote.status === 'approved' ? 'APROBADA' : 'PENDIENTE'}`, 14, 40);

      doc.text(`Vendedor: ${returnNote.sellerName}`, 140, 30);
      
      // Pre-cargar todas las imágenes antes de generar la tabla usando el índice como clave
      const imageMap = new Map<number, string>();
      await Promise.all(returnNote.items.map(async (item, index) => {
        if (item.product.imageUrl) {
          try {
            const base64 = await getBase64ImageFromURL(item.product.imageUrl);
            imageMap.set(index, base64);
            console.log(`Foto cargada para item ${index}: ${item.product.name}`);
          } catch (e) {
            console.error(`Error cargando imagen para PDF (item ${index}):`, e);
          }
        }
      }));

      // Datos de la tabla
      const tableData = returnNote.items.map((item) => {
        return [
          '', // Espacio para la foto (columna 0)
          `${item.product.name}\nSKU: ${item.product.sku}`,
          item.quantity.toString(),
          `$${item.unitPrice.toLocaleString()}`,
          `$${item.totalPrice.toLocaleString()}`,
          item.reason || ''
        ];
      });

      (doc as any).autoTable({
        startY: 50,
        head: [['Foto', 'Producto', 'Cant.', 'Precio', 'Total', 'Razón']],
        body: tableData,
        styles: { fontSize: 8, valign: 'middle', minCellHeight: 22 },
        columnStyles: {
          0: { cellWidth: 25 }, // Un poco más ancho para la foto
          1: { cellWidth: 55 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 35 }
        },
        didDrawCell: (data: any) => {
          // Si es la columna 0 y es el cuerpo de la tabla
          if (data.column.index === 0 && data.cell.section === 'body') {
            const imgData = imageMap.get(data.row.index);
            if (imgData) {
              try {
                // Centrar la imagen en la celda
                const x = data.cell.x + 2;
                const y = data.cell.y + 2;
                doc.addImage(imgData, 'JPEG', x, y, 18, 18);
              } catch (e) {
                console.error('Error adding image to PDF cell:', e);
              }
            }
          }
        },
        rowPageBreak: 'avoid',
        margin: { top: 50 },
        theme: 'striped'
      });

      // Total
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`VALOR TOTAL: $${returnNote.totalValue.toLocaleString()}`, 140, finalY);

      if (returnNote.notes) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Notas:', 14, finalY + 10);
        doc.text(returnNote.notes, 14, finalY + 15);
      }

      doc.save(`Devolucion_${returnNote.number}.pdf`);
      toast.success('PDF generado correctamente', { id: 'generating-pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF', { id: 'generating-pdf' });
    }
  };
  // Estados para crear nota de devolución
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [exitNotes, setExitNotes] = useState<ExitNote[]>([]);
  const [selectedExitNoteId, setSelectedExitNoteId] = useState('');
  const [selectedExitNote, setSelectedExitNote] = useState<ExitNote | null>(null);
  const [sellerInventory, setSellerInventory] = useState<SellerInventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<SellerInventoryItem[]>([]);
  const [productsFromNote, setProductsFromNote] = useState<Array<{ productId: string; product: any; quantity: number; unitPrice: number; availableQuantity: number }>>([]);
  const [returnItems, setReturnItems] = useState<Array<{ productId: string; product: any; quantity: number; unitPrice: number; reason?: string }>>([]);
  const [returnNotes, setReturnNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductPickerModal, setShowProductPickerModal] = useState(false);
  const [pickerQuantities, setPickerQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (authLoading) {
      return; // Esperar a que termine la carga de autenticación
    }
    if (!isAdmin) {
      toast.error('No tienes permisos para acceder a esta página');
      setLoading(false);
      return;
    }
    loadReturns();
  }, [isAdmin, authLoading]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const returnsData = await returnService.getAll();
      setReturns(returnsData);
    } catch (error) {
      console.error('Error loading returns:', error);
      toast.error('Error al cargar las devoluciones');
    } finally {
      setLoading(false);
    }
  };

  const loadSellers = async () => {
    try {
      const sellersData = await sellerService.getAll();
      setSellers(sellersData.filter(s => s.isActive));
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast.error('Error al cargar vendedores');
    }
  };

  const loadSellerInventory = async (sellerId: string) => {
    try {
      const inventory = await sellerInventoryService.getBySeller(sellerId);
      const availableInventory = inventory.filter(item => item.quantity > 0);
      setSellerInventory(availableInventory);
      setFilteredInventory(availableInventory);
    } catch (error) {
      console.error('Error loading seller inventory:', error);
      toast.error('Error al cargar inventario del vendedor');
    }
  };

  const loadExitNotes = async (sellerId: string) => {
    try {
      const notes = await exitNoteService.getBySeller(sellerId);
      // Solo mostrar notas que estén entregadas o recibidas
      const deliveredNotes = notes.filter(note =>
        note.status === 'delivered' || note.status === 'received'
      );
      setExitNotes(deliveredNotes);
    } catch (error) {
      console.error('Error loading exit notes:', error);
      toast.error('Error al cargar notas de salida');
    }
  };

  const repairInventory = async () => {
    if (!selectedSellerId) return;
    try {
      setLoading(true);
      toast.loading('Reparando inventario del vendedor...', { id: 'repairing-picker' });
      
      const salesData = await soldProductService.getBySeller(selectedSellerId);
      const exitNotesData = await exitNoteService.getAll();
      const sellerExitNotes = exitNotesData.filter(note => note.sellerId === selectedSellerId);
      
      // La función syncSellerInventory de SellerDashboard.tsx está disponible aquí?
      // No, Returns.tsx no tiene syncSellerInventory implementado.
      // Voy a implementarla resumidamente aquí.
      
      const currentInventory = await sellerInventoryService.getBySeller(selectedSellerId);
      const approvedReturns = await returnService.getBySeller(selectedSellerId);
      const approvedReturnsItems = approvedReturns
        .filter(r => r.status === 'approved')
        .flatMap(r => r.items.map(item => ({ ...item, createdAt: r.createdAt })));

      const returnedMap = new Map<string, { quantity: number; date?: Date }>();
      for (const returnItem of approvedReturnsItems) {
        const current = returnedMap.get(returnItem.productId) || { quantity: 0 };
        returnedMap.set(returnItem.productId, {
          quantity: current.quantity + returnItem.quantity,
          date: returnItem.createdAt
        });
      }

      for (const inv of currentInventory) {
        const returnInfo = returnedMap.get(inv.productId);
        const finalReturnedQty = returnInfo ? returnInfo.quantity : 0;
        
        if (inv.returnedQuantity !== finalReturnedQty) {
          await sellerInventoryService.update(inv.id, {
            returnedQuantity: finalReturnedQty,
            returnedDate: returnInfo ? returnInfo.date : undefined
          });
        }
      }
      
      await loadSellerInventory(selectedSellerId);
      toast.success('Inventario reparado y sincronizado correctamente', { id: 'repairing-picker' });
    } catch (error) {
      console.error('Error repairing inventory in picker:', error);
      toast.error('Error al reparar el inventario', { id: 'repairing-picker' });
    } finally {
      setLoading(false);
    }
  };

  const loadProductsFromExitNote = async (exitNoteId: string) => {
    try {
      const note = await exitNoteService.getById(exitNoteId);
      if (!note) {
        toast.error('Nota de salida no encontrada');
        return;
      }

      setSelectedExitNote(note);

      // Obtener inventario actual del vendedor para verificar cantidades disponibles
      const currentInventory = await sellerInventoryService.getBySeller(selectedSellerId);

      // Crear lista de productos de la nota con sus cantidades disponibles
      const productsList = note.items.map(item => {
        // Buscar en el inventario actual cuánto stock hay disponible de este producto
        const inventoryItem = currentInventory.find(inv => inv.productId === item.productId);
        const availableQuantity = inventoryItem?.quantity || 0;

        return {
          productId: item.productId,
          product: item.product,
          quantity: item.quantity, // Cantidad original en la nota
          unitPrice: item.unitPrice,
          availableQuantity: availableQuantity // Cantidad disponible en inventario actual
        };
      });

      setProductsFromNote(productsList);
    } catch (error) {
      console.error('Error loading products from exit note:', error);
      toast.error('Error al cargar productos de la nota de salida');
    }
  };

  useEffect(() => {
    if (selectedSellerId) {
      loadSellerInventory(selectedSellerId);
      loadExitNotes(selectedSellerId);
      // Solo limpiar si no hay items (para no borrar lo recuperado del borrador)
      if (returnItems.length === 0) {
        setSelectedExitNoteId('');
      }
    }
  }, [selectedSellerId]);

  // Resetear cantidades del picker cuando se abre el modal
  useEffect(() => {
    if (showProductPickerModal) {
      setPickerQuantities({});
    }
  }, [showProductPickerModal]);

  // Guardar borrador automáticamente cuando cambian los items
  useEffect(() => {
    if (showCreateModal && (returnItems.length > 0 || returnNotes)) {
      const draft = {
        sellerId: selectedSellerId,
        items: returnItems,
        notes: returnNotes,
        timestamp: Date.now()
      };
      localStorage.setItem('returnNoteDraft', JSON.stringify(draft));
    }
  }, [returnItems, returnNotes, selectedSellerId, showCreateModal]);

  // Cargar borrador si existe
  const loadDraft = () => {
    const savedDraft = localStorage.getItem('returnNoteDraft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) { // Borrador de menos de 24h
          setSelectedSellerId(draft.sellerId);
          setReturnItems(draft.items);
          setReturnNotes(draft.notes);
          toast.success('Borrador recuperado exitosamente');
          return true;
        }
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
    return false;
  };

  const clearDraft = () => {
    localStorage.removeItem('returnNoteDraft');
  };

  useEffect(() => {
    if (selectedExitNoteId && selectedSellerId) {
      // Cargar productos directamente de la nota de salida
      loadProductsFromExitNote(selectedExitNoteId);
      // También mantener el filtro del inventario por si acaso
      const filtered = sellerInventory.filter(item => item.exitNoteId === selectedExitNoteId);
      setFilteredInventory(filtered);
    } else {
      // Mostrar todo el inventario si no hay filtro
      setFilteredInventory(sellerInventory);
      setProductsFromNote([]);
      setSelectedExitNote(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExitNoteId, sellerInventory, selectedSellerId]);

  // Filtrar productos por búsqueda (nombre y SKU)
  const filteredProductsFromNote = productsFromNote.filter(item => {
    if (!productSearchTerm.trim()) return true;
    const searchLower = productSearchTerm.toLowerCase();
    return (
      item.product.name?.toLowerCase().includes(searchLower) ||
      item.product.sku?.toLowerCase().includes(searchLower)
    );
  });

  const filteredInventoryBySearch = filteredInventory.filter(item => {
    if (!productSearchTerm.trim()) return true;
    const searchLower = productSearchTerm.toLowerCase();
    return (
      item.product.name?.toLowerCase().includes(searchLower) ||
      item.product.sku?.toLowerCase().includes(searchLower)
    );
  });

  const handleAddProductToReturn = (item: SellerInventoryItem | { productId: string; product: any; quantity: number; unitPrice: number; availableQuantity?: number }, requestedQty: number = 1) => {
    const existingItem = returnItems.find(ri => ri.productId === item.productId);
    if (existingItem) {
      toast.error('Este producto ya está en la lista de devolución');
      return;
    }

    // Verificar cantidad disponible
    const availableQty = 'availableQuantity' in item ? (item.availableQuantity ?? 0) : item.quantity;
    if (availableQty <= 0) {
      toast.error('No hay stock disponible para este producto');
      return;
    }

    if (requestedQty > availableQty) {
      toast.error(`Solo hay ${availableQty} unidades disponibles`);
      return;
    }

    setReturnItems([...returnItems, {
      productId: item.productId,
      product: item.product,
      quantity: requestedQty,
      unitPrice: item.unitPrice,
      reason: ''
    }]);
  };

  const handleRemoveReturnItem = (productId: string) => {
    setReturnItems(returnItems.filter(item => item.productId !== productId));
  };

  const handleEditReturn = async (returnNote: Return) => {
    setEditingReturn(returnNote);
    setSelectedSellerId(returnNote.sellerId);
    setReturnItems(returnNote.items.map(item => ({
      productId: item.productId,
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      reason: item.reason || ''
    })));
    setReturnNotes(returnNote.notes || '');
    await loadSellers();
    setShowCreateModal(true);
  };

  const handleUpdateReturnItem = (productId: string, field: string, value: any) => {
    setReturnItems(returnItems.map(item =>
      item.productId === productId ? { ...item, [field]: value } : item
    ));
  };

  const handleCreateReturn = async () => {
    if (!selectedSellerId) {
      toast.error('Debes seleccionar un vendedor');
      return;
    }

    if (returnItems.length === 0) {
      toast.error('Debes agregar al menos un producto a la devolución');
      return;
    }

    // Validar cantidades contra el inventario real (restando lo ya devuelto)
    for (const returnItem of returnItems) {
      // Encontrar todos los registros del inventario para este producto
      const productInventoryItems = sellerInventory.filter(item => item.productId === returnItem.productId);
      const currentlyAvailable = productInventoryItems.reduce((sum, item) => sum + (item.quantity - (item.returnedQuantity || 0)), 0);
      
      // Si estamos editando, esa cantidad "ya devuelta" en la nota original en realidad vuelve a estar disponible para el cálculo final
      const quantityInOldNote = editingReturn ? (editingReturn.items.find(i => i.productId === returnItem.productId)?.quantity || 0) : 0;
      const totalAvailableInInventory = currentlyAvailable + quantityInOldNote;
      
      if (totalAvailableInInventory < returnItem.quantity) {
        toast.error(`La cantidad de ${returnItem.product.name} excede el inventario real disponible. Disponible: ${totalAvailableInInventory}, Solicitado: ${returnItem.quantity}`);
        return;
      }
    }

    try {
      setIsCreating(true);
      const selectedSeller = sellers.find(s => s.id === selectedSellerId);
      if (!selectedSeller) {
        throw new Error('Vendedor no encontrado');
      }

      // Generar número de devolución (mantener el anterior si estábamos editando)
      const returnNumber = editingReturn ? editingReturn.number : `DEV-${Date.now()}`;

      // Calcular total
      const totalValue = returnItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

      // Crear items de devolución
      const returnItemsData: ReturnItem[] = returnItems.map(item => ({
        id: item.productId,
        productId: item.productId,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
        reason: item.reason
      }));

      // Crear la nota de devolución
      const returnNote = {
        number: returnNumber,
        sellerId: selectedSellerId,
        sellerName: selectedSeller.name,
        items: returnItemsData,
        totalValue,
        notes: returnNotes,
        createdAt: editingReturn ? editingReturn.createdAt : new Date()
      };

      if (editingReturn) {
        toast.loading('Actualizando nota de devolución...', { id: 'editing-return' });
        // Revertir nota original
        await returnService.restoreReturn(editingReturn.id);
        // Crear nota nueva que tomará su lugar
        await returnService.createAdminReturn(returnNote);
        toast.success(`Nota de devolución #${returnNumber} actualizada exitosamente.`, { id: 'editing-return' });
      } else {
        await returnService.createAdminReturn(returnNote);
        toast.success(`Nota de devolución #${returnNumber} creada. Inventario actualizado y deuda recalculada exitosamente.`);
      }
      
      // Limpiar borrador después de crear exitosamente
      clearDraft();
      
      // Limpiar estado y cerrar modal
      setSelectedSellerId('');
      setSelectedExitNoteId('');
      setSelectedExitNote(null);
      setProductsFromNote([]);
      setReturnItems([]);
      setReturnNotes('');
      setProductSearchTerm('');
      setShowCreateModal(false);
      setEditingReturn(null);

      // Recargar devoluciones
      await loadReturns();
    } catch (error: any) {
      console.error('Error creating return:', error);
      toast.error(error.message || 'Error al crear la nota de devolución');
    } finally {
      setIsCreating(false);
    }
  };

  const handleApprove = async (returnId: string) => {
    if (!isAdmin) {
      toast.error('No tienes permisos para aprobar devoluciones');
      return;
    }

    if (!window.confirm('¿Estás seguro de aprobar esta devolución? Los productos serán movidos a bodega Ecuador.')) {
      return;
    }

    try {
      await returnService.approve(returnId, 'admin');
      toast.success('Devolución aprobada exitosamente');
      await loadReturns();
      setViewingReturn(null);
    } catch (error) {
      console.error('Error approving return:', error);
      toast.error('Error al aprobar la devolución');
    }
  };

  const handleReject = async (returnId: string) => {
    if (!isAdmin) {
      toast.error('No tienes permisos para rechazar devoluciones');
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error('Por favor ingresa una razón para el rechazo');
      return;
    }

    if (!window.confirm('¿Estás seguro de rechazar esta devolución?')) {
      return;
    }

    try {
      await returnService.reject(returnId, 'admin', rejectionReason);
      toast.success('Devolución rechazada');
      await loadReturns();
      setViewingReturn(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting return:', error);
      toast.error('Error al rechazar la devolución');
    }
  };

  const handleRestore = async (returnId: string) => {
    if (!isAdmin) {
      toast.error('No tienes permisos para restaurar devoluciones');
      return;
    }

    if (!window.confirm('¿Estás seguro de restaurar esta devolución? Los productos volverán al inventario del vendedor, se reducirá el stock de Bodega Ecuador y se incrementará la deuda del vendedor.')) {
      return;
    }

    try {
      await returnService.restoreReturn(returnId);
      await loadReturns();
      setViewingReturn(null);
    } catch (error) {
      console.error('Error restoring return:', error);
      toast.error('Error al restaurar la devolución');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return status;
    }
  };

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch =
      returnItem.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.sellerName.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') {
      return matchesSearch;
    }

    return matchesSearch && returnItem.status === statusFilter;
  });

  const pendingCount = returns.filter(r => r.status === 'pending').length;
  const approvedCount = returns.filter(r => r.status === 'approved').length;
  const rejectedCount = returns.filter(r => r.status === 'rejected').length;
  const totalValue = returns.reduce((sum, r) => sum + r.totalValue, 0);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Acceso Denegado</h3>
          <p className="mt-2 text-sm text-gray-500">
            No tienes permisos para acceder a esta página. Solo los administradores pueden gestionar devoluciones.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devoluciones</h1>
          <p className="text-gray-600">Gestiona las devoluciones de productos de vendedores</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingReturn(null);
              setReturnItems([]);
              setReturnNotes('');
              setSelectedSellerId('');
              setShowCreateModal(true);
              loadSellers();
            }}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Nota de Devolución
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <RotateCcw className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Devoluciones</p>
              <p className="text-2xl font-bold text-gray-900">{returns.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <RotateCcw className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Aprobadas</p>
              <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valor Total</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalValue.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar devoluciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input-field"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobadas</option>
              <option value="rejected">Rechazadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">#</th>
                <th className="table-header">Número</th>
                <th className="table-header">Vendedor</th>
                <th className="table-header">Fecha</th>
                <th className="table-header">Productos</th>
                <th className="table-header">Valor Total</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReturns.map((returnItem, index) => (
                <tr key={returnItem.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <span className="text-sm font-medium text-gray-900">
                      {index + 1}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {returnItem.number}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">{returnItem.sellerName}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {new Date(returnItem.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {returnItem.items.length} producto(s)
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm font-medium text-gray-900">
                      ${returnItem.totalValue.toLocaleString()}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                      {getStatusText(returnItem.status)}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setViewingReturn(returnItem)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {isAdmin && (returnItem.status === 'pending' || returnItem.status === 'approved') && (
                        <button
                          onClick={() => handleEditReturn(returnItem)}
                          className="p-1 text-gray-400 hover:text-indigo-600"
                          title="Editar devolución"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {returnItem.status === 'pending' && isAdmin && (
                        <>
                          <button
                            onClick={() => handleApprove(returnItem.id)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="Aprobar devolución"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setViewingReturn(returnItem);
                              setRejectionReason('');
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Rechazar devolución"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {returnItem.status === 'approved' && isAdmin && (
                        <button
                          onClick={() => handleRestore(returnItem.id)}
                          className="p-1 text-gray-400 hover:text-orange-600"
                          title="Restaurar devolución (revertir cambios)"
                        >
                          <Undo2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredReturns.length === 0 && (
        <div className="card text-center py-12">
          <RotateCcw className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay devoluciones</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all'
              ? 'No se encontraron devoluciones con ese criterio.'
              : 'No hay devoluciones registradas.'}
          </p>
        </div>
      )}

      {/* Modal para ver detalles */}
      {viewingReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles de la Devolución
              </h3>
              <div className="flex items-center space-x-2">
                {viewingReturn.status === 'pending' && isAdmin && (
                  <>
                    <button
                      onClick={() => handleApprove(viewingReturn.id)}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => {
                        if (rejectionReason.trim()) {
                          handleReject(viewingReturn.id);
                        } else {
                          toast.error('Por favor ingresa una razón para el rechazo');
                        }
                      }}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors flex items-center"
                      disabled={!rejectionReason.trim()}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rechazar
                    </button>
                  </>
                )}
                {viewingReturn.status === 'approved' && isAdmin && (
                  <button
                    onClick={() => handleRestore(viewingReturn.id)}
                    className="px-3 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors flex items-center"
                  >
                    <Undo2 className="h-4 w-4 mr-1" />
                    Restaurar Devolución
                  </button>
                )}
                <button
                  onClick={() => generateReturnPDF(viewingReturn)}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF con Fotos
                </button>
                <button
                  onClick={() => {
                    setViewingReturn(null);
                    setRejectionReason('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Devolución
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingReturn.number}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {new Date(viewingReturn.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingReturn.status)}`}>
                    {getStatusText(viewingReturn.status)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendedor
                </label>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded flex-1">
                    {viewingReturn.sellerName}
                  </p>
                </div>
              </div>

              {/* Productos */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Productos</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio Unit.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Razón
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {viewingReturn.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              {item.product.imageUrl ? (
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="h-10 w-10 rounded object-cover mr-3 border border-gray-100"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center mr-3">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div className="text-sm font-medium text-gray-900">
                                {item.product.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-900">
                              {item.product.sku}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-medium text-gray-900">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-900">
                              ${item.unitPrice.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-medium text-gray-900">
                              ${item.totalPrice.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-900">
                              {item.reason || '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total de la Devolución:</span>
                  <span className="text-xl font-bold text-gray-900">
                    ${viewingReturn.totalValue.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Notas */}
              {viewingReturn.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingReturn.notes}
                  </p>
                </div>
              )}

              {/* Razón de rechazo si está rechazada */}
              {viewingReturn.status === 'rejected' && viewingReturn.rejectionReason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón de Rechazo
                  </label>
                  <p className="text-sm text-red-900 bg-red-50 p-2 rounded">
                    {viewingReturn.rejectionReason}
                  </p>
                </div>
              )}

              {/* Campo para razón de rechazo si está pendiente */}
              {viewingReturn.status === 'pending' && isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón de Rechazo (si aplica)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ingresa la razón por la cual se rechaza esta devolución..."
                  />
                </div>
              )}

              {/* Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {viewingReturn.approvedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Aprobación
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {new Date(viewingReturn.approvedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {viewingReturn.rejectedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Rechazo
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {new Date(viewingReturn.rejectedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
              <button
                onClick={() => {
                  setViewingReturn(null);
                  setRejectionReason('');
                }}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear nota de devolución */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Nota de Devolución</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedSellerId('');
                  setSelectedExitNoteId('');
                  setSelectedExitNote(null);
                  setProductsFromNote([]);
                  setReturnItems([]);
                  setReturnNotes('');
                  setProductSearchTerm('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Seleccionar vendedor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendedor *
                </label>
                <select
                  value={selectedSellerId}
                  onChange={(e) => setSelectedSellerId(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Seleccionar vendedor</option>
                  {sellers.map(seller => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSellerId && (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-primary-200 rounded-xl py-8 bg-primary-50">
                  <Package className="h-10 w-10 text-primary-400 mb-2" />
                  <p className="text-sm font-medium text-primary-900 mb-4">
                    Inventario de {sellers.find(s => s.id === selectedSellerId)?.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductPickerModal(true);
                      loadExitNotes(selectedSellerId);
                      setProductSearchTerm('');
                    }}
                    className="flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-bold shadow-md transform hover:scale-105"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    AGREGAR PRODUCTOS
                  </button>
                  <p className="text-xs text-primary-600 mt-2">
                    Busca productos en las notas de salida del vendedor
                  </p>
                </div>
              )}

              {/* Lista de productos seleccionados va aquí */}

              {/* Productos seleccionados para devolución */}
              {returnItems.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Productos a Devolver
                  </label>
                  <div className="space-y-3">
                    {returnItems.map((item) => {
                      const productInventoryItems = sellerInventory.filter(inv => inv.productId === item.productId);
                      const maxQuantity = productInventoryItems.reduce((sum, inv) => sum + (inv.quantity - (inv.returnedQuantity || 0)), 0);

                      return (
                        <div key={item.productId} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                              <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                              <p className="text-xs text-gray-500">Precio unitario: ${item.unitPrice.toLocaleString()}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveReturnItem(item.productId)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Cantidad (Max: {maxQuantity})
                              </label>
                              <input
                                type="number"
                                min="1"
                                max={maxQuantity}
                                value={item.quantity}
                                onChange={(e) => handleUpdateReturnItem(item.productId, 'quantity', parseInt(e.target.value) || 1)}
                                className="input-field text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Razón (opcional)
                              </label>
                              <input
                                type="text"
                                value={item.reason || ''}
                                onChange={(e) => handleUpdateReturnItem(item.productId, 'reason', e.target.value)}
                                className="input-field text-sm"
                                placeholder="Razón de la devolución"
                              />
                            </div>
                          </div>
                          <div className="mt-2 text-right">
                            <p className="text-sm font-medium text-gray-900">
                              Subtotal: ${(item.quantity * item.unitPrice).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-900">Total:</span>
                      <span className="text-xl font-bold text-gray-900">
                        ${returnItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="Información adicional sobre la devolución"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedSellerId('');
                  setSelectedExitNoteId('');
                  setSelectedExitNote(null);
                  setProductsFromNote([]);
                  setReturnItems([]);
                  setReturnNotes('');
                  setProductSearchTerm('');
                }}
                className="btn-secondary"
                disabled={isCreating}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateReturn}
                className="btn-primary"
                disabled={isCreating || returnItems.length === 0 || !selectedSellerId}
              >
                {isCreating ? (editingReturn ? 'Actualizando...' : 'Creando...') : (editingReturn ? 'Actualizar Devolución' : 'Crear Nota de Devolución')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal para seleccionar productos (submodal) */}
      {showProductPickerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b bg-primary-600 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xl font-bold text-white uppercase tracking-wider">
                    Inventario de {sellers.find(s => s.id === selectedSellerId)?.name}
                  </h4>
                  {localStorage.getItem('returnNoteDraft') && returnItems.length === 0 && (
                    <button
                      onClick={loadDraft}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200 transition-colors flex items-center"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      RECUPERAR BORRADOR
                    </button>
                  )}
                </div>
                <p className="text-primary-100 text-sm">Selecciona los productos para la nota de devolución</p>
              </div>
              <button
                onClick={() => setShowProductPickerModal(false)}
                className="text-white hover:bg-primary-700 p-2 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Nota de Salida</label>
                  <select
                    value={selectedExitNoteId}
                    onChange={(e) => setSelectedExitNoteId(e.target.value)}
                    className="input-field shadow-sm"
                  >
                    <option value="">Todas las notas de salida</option>
                    {exitNotes.map(note => (
                      <option key={note.id} value={note.id}>
                        {note.number} - {new Date(note.date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Producto</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Nombre o SKU..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="input-field pl-10 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Grid de productos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {(selectedExitNoteId && productsFromNote.length > 0 ? filteredProductsFromNote : filteredInventoryBySearch).map((item: any) => {
                  const isAlreadyAdded = returnItems.some(ri => ri.productId === item.productId || (item.id && ri.productId === item.id));
                  const availableQty = (item.quantity ?? 0) - (item.returnedQuantity ?? 0);
                  
                  return (
                    <div
                      key={item.id || item.productId}
                      className={`relative flex flex-col bg-white border-2 rounded-xl overflow-hidden transition-all ${
                        isAlreadyAdded ? 'border-primary-500 ring-2 ring-primary-500 ring-opacity-50' : 'border-gray-200 hover:border-primary-400 hover:shadow-lg'
                      }`}
                    >
                      {/* Imagen */}
                      <div className="h-40 bg-gray-100 flex items-center justify-center relative">
                        {item.product?.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product?.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-10 w-10 text-gray-300" />
                        )}
                        {isAlreadyAdded && (
                          <div className="absolute top-2 right-2 bg-primary-600 text-white p-1 rounded-full">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 flex flex-col flex-1">
                        <h5 className="text-xs font-bold text-gray-800 line-clamp-2 h-8 mb-1 uppercase">
                          {item.product?.name}
                        </h5>
                          <div className="flex flex-col space-y-2">
                            <div className="flex justify-between items-center text-[10px] text-gray-500 mb-1 font-mono uppercase">
                              <span>{item.product?.sku}</span>
                              <span className="font-bold text-primary-600">Disp: {availableQty}</span>
                            </div>
                            
                            <div className="flex items-center justify-between gap-2">
                              {/* Selector de cantidad */}
                              <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = pickerQuantities[item.productId || item.id] || 1;
                                    if (current > 1) {
                                      setPickerQuantities({ ...pickerQuantities, [item.productId || item.id]: current - 1 });
                                    }
                                  }}
                                  className="p-1 hover:bg-white rounded transition-colors text-gray-500"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={availableQty}
                                  value={pickerQuantities[item.productId || item.id] || 1}
                                  onChange={(e) => {
                                    const val = Math.min(availableQty, Math.max(1, parseInt(e.target.value) || 1));
                                    setPickerQuantities({ ...pickerQuantities, [item.productId || item.id]: val });
                                  }}
                                  className="w-8 text-center bg-transparent border-none text-xs font-bold focus:ring-0 p-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = pickerQuantities[item.productId || item.id] || 1;
                                    if (current < availableQty) {
                                      setPickerQuantities({ ...pickerQuantities, [item.productId || item.id]: current + 1 });
                                    }
                                  }}
                                  className="p-1 hover:bg-white rounded transition-colors text-gray-500"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddProductToReturn(item, pickerQuantities[item.productId || item.id] || 1)}
                                disabled={availableQty <= 0 || isAlreadyAdded}
                                className={`flex-1 p-2 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1 ${
                                  isAlreadyAdded 
                                  ? 'bg-green-100 text-green-600' 
                                  : 'bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300'
                                }`}
                              >
                                {isAlreadyAdded ? (
                                  <>
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Agregado</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4" />
                                    <span>Agregar</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-400 text-right mt-1">${item.unitPrice?.toLocaleString()} c/u</p>
                          </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(selectedExitNoteId ? filteredProductsFromNote.length : filteredInventoryBySearch.length) === 0 && (
                <div className="text-center py-20">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron productos disponibles</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <p className="text-sm font-medium text-gray-600">
                  {filteredInventoryBySearch.length} productos disponibles
                </p>
                {isAdmin && (
                  <button
                    onClick={repairInventory}
                    className="flex items-center text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 transition-colors"
                    title="Si ves productos en gris por error, haz clic aquí para corregirlo"
                  >
                    <RotateCcw className="h-3 w-3 mr-1.5" />
                    REPARAR GRISES
                  </button>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900">
                Productos seleccionados: {returnItems.length}
              </p>
              <button
                onClick={() => setShowProductPickerModal(false)}
                className="btn-primary"
              >
                Listo, ver nota de devolución
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Returns;

