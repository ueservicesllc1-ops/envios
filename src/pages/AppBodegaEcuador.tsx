import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Search, Flag, Plus, Trash2, X, Check, Edit, Truck } from 'lucide-react';
import { InventoryItem, Product, Seller } from '../types';
import { inventoryService } from '../services/inventoryService';
import { productService } from '../services/productService';
import { sellerService } from '../services/sellerService';
import { exitNoteService } from '../services/exitNoteService';
import { vilmaInventoryService } from '../services/vilmaInventoryService';
import toast from 'react-hot-toast';
import { useAnonymousAuth } from '../hooks/useAnonymousAuth';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const AppBodegaEcuador: React.FC = () => {
    const navigate = useNavigate();

    // Autenticación anónima
    const { user, loading: authLoading, error: authError } = useAnonymousAuth();

    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Add Logic
    const [productSearch, setProductSearch] = useState('');
    const [selectedProductToAdd, setSelectedProductToAdd] = useState<Product | null>(null);
    const [addQuantity, setAddQuantity] = useState<string>('1');

    // Delete Logic
    const [selectedItemToDelete, setSelectedItemToDelete] = useState<InventoryItem | null>(null);
    const [deleteReason, setDeleteReason] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Logic
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItemToEdit, setSelectedItemToEdit] = useState<InventoryItem | null>(null);
    const [editQuantity, setEditQuantity] = useState('');
    const [editReason, setEditReason] = useState('');

    // Transfer Logic
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedItemToTransfer, setSelectedItemToTransfer] = useState<InventoryItem | null>(null);
    const [transferSellers, setTransferSellers] = useState<Seller[]>([]);
    const [transferSellerId, setTransferSellerId] = useState('');
    const [transferQuantity, setTransferQuantity] = useState('1');
    const [transferNotes, setTransferNotes] = useState('');

    useEffect(() => {
        if (!authLoading && user) {
            loadInventory();
            loadSellers();
        }

        if (authError) {
            toast.error('Error de autenticación. Por favor, recarga la página.');
        }
    }, [authLoading, user, authError]);

    const loadSellers = async () => {
        try {
            const sellers = await sellerService.getAll();
            setTransferSellers(sellers);
        } catch (error) {
            console.error('Error loading sellers', error);
        }
    };

    const loadInventory = async () => {
        try {
            setLoading(true);
            const [productsData, inventoryData, exitNotesData] = await Promise.all([
                productService.getAll(),
                inventoryService.getAll(),
                exitNoteService.getAll()
            ]);

            setAllProducts(productsData);

            // Calcular stock comprometido (pending/in-transit)
            const committedStock: Record<string, number> = {};
            exitNotesData.forEach(note => {
                const s = (note.status || '').toLowerCase();
                if (s === 'pending' || s === 'in-transit') {
                    note.items.forEach(item => {
                        const pid = item.productId;
                        committedStock[pid] = (committedStock[pid] || 0) + (item.quantity || 0);
                    });
                }
            });

            const stockItems: InventoryItem[] = [];

            inventoryData.forEach(item => {
                const location = (item.location || '').toLowerCase().trim();
                const isEcuador = location.includes('ecuador') || location === 'ecuador';

                if (isEcuador) {
                    const product = productsData.find(p => p.id === item.productId);

                    if (product) {
                        // Solo mostrar si ya llegó (excluir in-transit y pending en el inventario físico)
                        const status = (item.status || '').toLowerCase();
                        const isArrived = status !== 'in-transit' && status !== 'pending';

                        // Calcular stock real disponible restando COMPROMISOS
                        const committed = committedStock[product.id] || 0;
                        const realQuantity = Math.max(0, item.quantity - committed);

                        // Mostrar si corresponde a Ecuador, ya llegó y tiene stock FÍSICO > 0
                        // (Aunque esté comprometido, queremos verlo en la lista)
                        if (item.quantity > 0 && isArrived) {
                            stockItems.push({
                                ...item,
                                quantity: item.quantity,
                                product: product
                            });
                        }
                    }
                }
            });

            // Ordenar por nombre
            stockItems.sort((a, b) => {
                const nameA = a.product?.name || '';
                const nameB = b.product?.name || '';
                return nameA.localeCompare(nameB);
            });

            setInventory(stockItems);
        } catch (error) {
            console.error('Error loading inventory:', error);
            toast.error('Error al cargar inventario Ecuador');
        } finally {
            setLoading(false);
        }
    };

    const handleAddProduct = async () => {
        if (!selectedProductToAdd || !addQuantity || parseInt(addQuantity) <= 0) {
            toast.error('Selecciona un producto y cantidad válida');
            return;
        }

        setIsSubmitting(true);
        try {
            const qty = parseInt(addQuantity);

            // 1. Agregar Stock
            await inventoryService.addStock(
                selectedProductToAdd.id,
                qty,
                selectedProductToAdd.cost,
                selectedProductToAdd.salePrice1,
                'Bodega Ecuador'
            );

            // 2. Registrar en Log (Firestore)
            await addDoc(collection(db, 'inventory_logs'), {
                type: 'add',
                productId: selectedProductToAdd.id,
                productName: selectedProductToAdd.name,
                quantity: qty,
                reason: 'Agregado manualmente desde App Bodega Ecuador',
                location: 'Bodega Ecuador',
                createdAt: Timestamp.now(),
                user: user?.uid || 'App User'
            });

            toast.success('Producto agregado a Bodega Ecuador');
            setShowAddModal(false);
            setSelectedProductToAdd(null);
            setAddQuantity('1');
            setProductSearch('');
            loadInventory(); // Recargar
        } catch (error) {
            console.error(error);
            toast.error('Error al agregar producto');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProduct = async () => {
        if (!selectedItemToDelete || !deleteReason.trim()) {
            toast.error('Ingresa una razón para eliminar');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Remover TODO el stock disponible
            const qtyToRemove = selectedItemToDelete.quantity;

            await inventoryService.removeStock(
                selectedItemToDelete.productId,
                qtyToRemove,
                'Bodega Ecuador'
            );

            // 2. Registrar razón en Firestore
            await addDoc(collection(db, 'inventory_logs'), {
                type: 'remove',
                productId: selectedItemToDelete.productId,
                productName: selectedItemToDelete.product?.name || 'Desconocido',
                quantity: qtyToRemove,
                reason: deleteReason,
                location: 'Bodega Ecuador',
                createdAt: Timestamp.now(),
                user: user?.uid || 'App User'
            });

            toast.success('Producto eliminado de Bodega Ecuador');
            setShowDeleteModal(false);
            setSelectedItemToDelete(null);
            setDeleteReason('');
            loadInventory(); // Recargar
        } catch (error) {
            console.error(error);
            toast.error('Error al eliminar producto');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (item: InventoryItem) => {
        setSelectedItemToEdit(item);
        setEditQuantity(item.quantity.toString());
        setEditReason('');
        setShowEditModal(true);
    };

    const handleUpdateProduct = async () => {
        if (!selectedItemToEdit || !editQuantity || parseInt(editQuantity) < 0 || !editReason.trim()) {
            toast.error('Verifique la cantidad y la razón del cambio');
            return;
        }

        setIsSubmitting(true);
        try {
            const newQuantity = parseInt(editQuantity);
            const oldQuantity = selectedItemToEdit.quantity;
            const diff = newQuantity - oldQuantity;

            // Calcular nuevos totales
            const cost = selectedItemToEdit.cost || 0;
            const unitPrice = selectedItemToEdit.unitPrice || 0;

            const newTotalCost = cost * newQuantity;
            const newTotalPrice = unitPrice * newQuantity;
            const newTotalValue = newTotalCost;

            // Actualizar inventario
            await inventoryService.update(selectedItemToEdit.id, {
                quantity: newQuantity,
                totalCost: newTotalCost,
                totalPrice: newTotalPrice,
                totalValue: newTotalValue
            });

            // Registrar en Log (Firestore)
            await addDoc(collection(db, 'inventory_logs'), {
                type: 'modify',
                productId: selectedItemToEdit.productId,
                productName: selectedItemToEdit.product?.name || 'Desconocido',
                quantity: Math.abs(diff),
                action: diff >= 0 ? 'increase' : 'decrease',
                oldQuantity: oldQuantity,
                newQuantity: newQuantity,
                reason: editReason,
                location: 'Bodega Ecuador',
                createdAt: Timestamp.now(),
                user: user?.uid || 'App User'
            });

            toast.success('Cantidad actualizada correctamente');
            setShowEditModal(false);
            setSelectedItemToEdit(null);
            setEditQuantity('');
            setEditReason('');
            loadInventory(); // Recargar
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar producto');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTransferClick = (item: InventoryItem) => {
        setSelectedItemToTransfer(item);
        setTransferSellerId('');
        setTransferQuantity('1');
        setTransferNotes('');
        setShowTransferModal(true);
    };

    const handleProcessTransfer = async () => {
        if (!selectedItemToTransfer || !transferSellerId || !transferQuantity || parseInt(transferQuantity) <= 0) {
            toast.error('Seleccione vendedor y cantidad válida');
            return;
        }

        const qty = parseInt(transferQuantity);
        if (qty > selectedItemToTransfer.quantity) {
            toast.error(`Stock insuficiente. Disponible: ${selectedItemToTransfer.quantity}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const selectedSeller = transferSellers.find(s => s.id === transferSellerId);
            const product = selectedItemToTransfer.product;

            // Determine price based on seller type
            const unitPrice = selectedSeller?.priceType === 'price2' ? product.salePrice2 : product.salePrice1;

            const exitNoteItem = {
                id: `${Date.now()}`,
                productId: product.id,
                product: product,
                quantity: qty,
                unitPrice: unitPrice,
                totalPrice: unitPrice * qty,
                size: product.size || '',
                weight: product.weight || 0
            };

            await exitNoteService.createTransferFromBodegaEcuador(
                transferSellerId,
                [exitNoteItem],
                `Transferencia desde App Bodega Ecuador${transferNotes ? ` - ${transferNotes}` : ''}`
            );

            // Si es Vilma, agregar a su inventario dedicado
            if (selectedSeller?.name?.toLowerCase().includes('vilma')) {
                await vilmaInventoryService.addProduct(product, qty, unitPrice);
            }

            // Log entry
            await addDoc(collection(db, 'inventory_logs'), {
                type: 'transfer',
                productId: product.id,
                productName: product.name,
                quantity: qty,
                reason: `Transferencia a ${selectedSeller?.name}`,
                location: 'Bodega Ecuador',
                createdAt: Timestamp.now(),
                user: user?.uid || 'App User'
            });

            toast.success('Transferencia realizada correctamente');
            setShowTransferModal(false);
            setSelectedItemToTransfer(null);
            loadInventory();
        } catch (error) {
            console.error(error);
            toast.error('Error al procesar transferencia');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredItems = inventory.filter(item => {
        const name = item.product?.name || '';
        const sku = item.product?.sku || '';
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sku.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Filtro para el modal de agregar
    const filteredAddProducts = allProducts.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
    );

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Azul */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0 z-40 shadow-lg px-4 py-4">
                <div className="flex items-center space-x-3 mb-4">
                    <button
                        onClick={() => navigate('/app')}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center space-x-2">
                            <h1 className="text-xl font-bold">Bodega Ecuador</h1>
                            <Flag className="w-5 h-5 text-yellow-400" />
                        </div>
                        <p className="text-xs text-blue-100">
                            {filteredItems.length} productos disponibles
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-200" />
                    <input
                        type="text"
                        placeholder="Buscar producto o SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                </div>

                {/* Agregar Botón */}
                <div className="flex space-x-2">
                    <button
                        onClick={async () => {
                            if (!window.confirm("¿Seguro que desea revertir la ULTIMA nota PENDIENTE de Bodega Ecuador? Esto eliminará del stock de Bodega Ecuador los items que se sumaron erróneamente.")) return;

                            const tId = toast.loading("Procesando corrección...");
                            try {
                                const notes = await exitNoteService.getAll();
                                const pendingNotes = notes.filter(n =>
                                    (n.sellerId === 'bodega-ecuador' || n.number.includes('ECU')) &&
                                    n.status === 'pending'
                                ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

                                if (pendingNotes.length === 0) {
                                    toast.error("No se encontraron notas pendientes", { id: tId });
                                    return;
                                }

                                const noteToRevert = pendingNotes[0];
                                const allInventory = await inventoryService.getAll();

                                for (const item of noteToRevert.items) {
                                    // Buscar en inventario de Bodega Ecuador
                                    const targetItem = allInventory.find(inv =>
                                        inv.productId === item.productId &&
                                        inv.location === 'Bodega Ecuador'
                                    );

                                    if (targetItem) {
                                        const newQty = Math.max(0, targetItem.quantity - item.quantity);
                                        await inventoryService.update(targetItem.id, { quantity: newQty });

                                        // Loguear
                                        await addDoc(collection(db, 'inventory_logs'), {
                                            type: 'correction',
                                            productId: item.productId,
                                            productName: item.product.name,
                                            quantity: item.quantity,
                                            reason: `Corrección automática: Reversión nota ${noteToRevert.number}`,
                                            location: 'Bodega Ecuador',
                                            createdAt: Timestamp.now(),
                                            user: user?.uid || 'Admin Correction'
                                        });
                                    }
                                }
                                toast.success(`Correcto. Nota ${noteToRevert.number} revertida.`, { id: tId });
                                loadInventory(); // Recargar

                            } catch (error: any) {
                                console.error(error);
                                toast.error("Error: " + error.message, { id: tId });
                            }
                        }}
                        className="bg-red-500 text-white p-2 rounded-lg"
                    >
                        <Flag className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex-1 bg-white/10 hover:bg-white/20 flex items-center justify-center space-x-2 py-2 rounded-lg transition-colors border border-white/30 active:scale-95"
                    >
                        <Plus className="w-5 h-5 text-green-300" />
                        <span className="font-bold text-sm">Agregar Producto</span>
                    </button>
                </div>
            </div>

            {/* Grid de Productos */}
            <div className="p-4">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No hay productos en Bodega Ecuador</p>
                        <p className="text-xs text-gray-400 mt-2">(Los productos reservados o en tránsito no se muestran)</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col h-auto relative"
                            >


                                {/* Imagen */}
                                <div
                                    className="relative w-full pt-[100%] cursor-pointer group bg-gray-100"
                                    onClick={() => item.product.imageUrl && setSelectedImage(item.product.imageUrl)}
                                >
                                    <div className="absolute inset-0">
                                        {item.product.imageUrl ? (
                                            <img
                                                src={item.product.imageUrl}
                                                alt={item.product.name}
                                                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <Package className="w-12 h-12" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Badge Stock */}
                                    <div className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-10 ${item.quantity < 5 ? 'bg-red-500' : 'bg-green-600'
                                        }`}>
                                        Stock: {item.quantity}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-2 flex flex-col flex-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedItemToDelete(item);
                                            setShowDeleteModal(true);
                                        }}
                                        className="mb-2 w-full bg-red-50 text-red-600 px-2 py-1 rounded-md text-[10px] font-bold shadow-sm border border-red-100 flex items-center justify-center space-x-1 hover:bg-red-100 active:scale-95"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Eliminar</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditClick(item);
                                        }}
                                        className="mb-2 w-full bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[10px] font-bold shadow-sm border border-blue-100 flex items-center justify-center space-x-1 hover:bg-blue-100 active:scale-95"
                                    >
                                        <Edit className="w-3 h-3" />
                                        <span>Modificar</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTransferClick(item);
                                        }}
                                        className="mb-2 w-full bg-green-50 text-green-600 px-2 py-1 rounded-md text-[10px] font-bold shadow-sm border border-green-100 flex items-center justify-center space-x-1 hover:bg-green-100 active:scale-95"
                                    >
                                        <Truck className="w-3 h-3" />
                                        <span>Transferir</span>
                                    </button>
                                    <div className="h-10 mb-1">
                                        <h3 className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">
                                            {item.product.name}
                                        </h3>
                                    </div>
                                    <div className="mb-2">
                                        <p className="text-[10px] text-gray-500 truncate">
                                            {item.product.sku}
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-2 border-t border-gray-50">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500">Precio</span>
                                            <span className="text-sm font-bold text-blue-600">
                                                ${item.unitPrice.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Agregar Producto */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
                    <div className="bg-white w-full sm:max-w-md h-[80vh] sm:max-h-[90vh] sm:h-auto rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-slide-up sm:animate-fade-in">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-gray-800">Agregar a Bodega Ecuador</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto">
                            {!selectedProductToAdd ? (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Buscar producto a agregar..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        className="w-full p-3 bg-gray-100 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                                        autoFocus
                                    />
                                    <div className="space-y-2">
                                        {filteredAddProducts.map(prod => (
                                            <div
                                                key={prod.id}
                                                onClick={() => setSelectedProductToAdd(prod)}
                                                className="flex items-center space-x-3 p-2 hover:bg-blue-50 rounded-lg cursor-pointer border border-transparent hover:border-blue-100 transition-all"
                                            >
                                                <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                                    {prod.imageUrl ? (
                                                        <img src={prod.imageUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : <Package className="w-6 h-6 m-auto text-gray-400" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-800 line-clamp-1">{prod.name}</p>
                                                    <p className="text-xs text-gray-500">{prod.sku}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredAddProducts.length === 0 && (
                                            <p className="text-center text-gray-400 py-4">No se encontraron productos</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center py-6 animate-fade-in">
                                    <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden mb-4 shadow-md">
                                        {selectedProductToAdd.imageUrl ? (
                                            <img src={selectedProductToAdd.imageUrl} alt={selectedProductToAdd.name} className="w-full h-full object-cover" />
                                        ) : <Package className="w-10 h-10 m-auto mt-7 text-gray-400" />}
                                    </div>
                                    <h3 className="font-bold text-center text-gray-900 mb-1">{selectedProductToAdd.name}</h3>
                                    <p className="text-sm text-gray-500 mb-6">{selectedProductToAdd.sku}</p>

                                    <div className="w-full bg-gray-50 p-6 rounded-2xl mb-6">
                                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Cantidad a Agregar</label>
                                        <div className="flex items-center justify-center space-x-6">
                                            <button onClick={() => setAddQuantity(prev => Math.max(1, parseInt(prev) - 1).toString())} className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold hover:bg-gray-300">-</button>
                                            <input
                                                type="number"
                                                value={addQuantity}
                                                onChange={(e) => setAddQuantity(e.target.value)}
                                                className="w-24 text-center text-3xl font-bold bg-transparent outline-none border-b-2 border-blue-500 pb-1"
                                                min="1"
                                            />
                                            <button onClick={() => setAddQuantity(prev => (parseInt(prev) + 1).toString())} className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold hover:bg-blue-700">+</button>
                                        </div>
                                    </div>

                                    <button onClick={() => setSelectedProductToAdd(null)} className="text-sm text-gray-400 hover:text-gray-600 underline mb-2">Cambiar Producto</button>
                                </div>
                            )}
                        </div>

                        {selectedProductToAdd && (
                            <div className="p-4 border-t border-gray-100">
                                <button
                                    onClick={handleAddProduct}
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center"
                                >
                                    {isSubmitting ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : 'Confirmar Ingreso'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Eliminar */}
            {showDeleteModal && selectedItemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-up">
                        <div className="flex items-center space-x-3 text-red-600 mb-4">
                            <div className="p-3 bg-red-100 rounded-full">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold">Eliminar Producto</h2>
                        </div>

                        <p className="text-gray-600 mb-4">
                            Estás a punto de eliminar <span className="font-bold text-gray-900">{selectedItemToDelete.product?.name}</span> de Bodega Ecuador.
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Razón de la eliminación <span className="text-red-500">*</span></label>
                            <textarea
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder="Escribe el motivo (ej: Producto dañado, Inventario incorrecto...)"
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none h-24 resize-none bg-gray-50"
                                autoFocus
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeleteReason(''); }}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteProduct}
                                disabled={!deleteReason.trim() || isSubmitting}
                                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar */}
            {showEditModal && selectedItemToEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-up">
                        <div className="flex items-center space-x-3 text-blue-600 mb-4">
                            <div className="p-3 bg-blue-100 rounded-full">
                                <Edit className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold">Modificar Stock</h2>
                        </div>

                        <p className="text-gray-600 mb-4">
                            Modificando stock de <span className="font-bold text-gray-900">{selectedItemToEdit.product?.name}</span>.
                        </p>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Nueva Cantidad</label>
                            <div className="flex items-center justify-center space-x-6 bg-gray-50 p-4 rounded-xl">
                                <button
                                    onClick={() => setEditQuantity(prev => Math.max(0, (parseInt(prev) || 0) - 1).toString())}
                                    className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold hover:bg-gray-300"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(e.target.value)}
                                    className="w-20 text-center text-2xl font-bold bg-transparent outline-none border-b-2 border-blue-500 pb-1"
                                    min="0"
                                />
                                <button
                                    onClick={() => setEditQuantity(prev => ((parseInt(prev) || 0) + 1).toString())}
                                    className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold hover:bg-blue-700"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Razón del cambio <span className="text-blue-500">*</span></label>
                            <textarea
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                placeholder="Escribe el motivo (ej: Ajuste de inventario, Conteo físico...)"
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-20 resize-none bg-gray-50"
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => { setShowEditModal(false); setEditReason(''); }}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdateProduct}
                                disabled={!editReason.trim() || isSubmitting || editQuantity === ''}
                                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Transferir */}
            {showTransferModal && selectedItemToTransfer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-up">
                        <div className="flex items-center space-x-3 text-green-600 mb-4">
                            <div className="p-3 bg-green-100 rounded-full">
                                <Truck className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold">Transferir a Vendedor</h2>
                        </div>

                        <p className="text-gray-600 mb-4">
                            Transfiriendo <span className="font-bold text-gray-900">{selectedItemToTransfer.product?.name}</span>.
                            <br />
                            <span className="text-xs text-gray-500">Stock disponible: {selectedItemToTransfer.quantity}</span>
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Vendedor <span className="text-green-500">*</span></label>
                            <select
                                value={transferSellerId}
                                onChange={(e) => setTransferSellerId(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-gray-50"
                            >
                                <option value="">Seleccionar Vendedor</option>
                                {transferSellers.map(seller => (
                                    <option key={seller.id} value={seller.id}>{seller.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Cantidad a Transferir</label>
                            <div className="flex items-center justify-center space-x-6 bg-gray-50 p-4 rounded-xl">
                                <button
                                    onClick={() => setTransferQuantity(prev => Math.max(1, (parseInt(prev) || 0) - 1).toString())}
                                    className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold hover:bg-gray-300"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    value={transferQuantity}
                                    onChange={(e) => setTransferQuantity(e.target.value)}
                                    className="w-20 text-center text-2xl font-bold bg-transparent outline-none border-b-2 border-green-500 pb-1"
                                    min="1"
                                    max={selectedItemToTransfer.quantity}
                                />
                                <button
                                    onClick={() => setTransferQuantity(prev => Math.min((parseInt(prev) || 0) + 1, selectedItemToTransfer.quantity).toString())}
                                    className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-lg font-bold hover:bg-green-700"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Notas (Opcional)</label>
                            <textarea
                                value={transferNotes}
                                onChange={(e) => setTransferNotes(e.target.value)}
                                placeholder="Notas adicionales..."
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none h-20 resize-none bg-gray-50"
                            />
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => { setShowTransferModal(false); setTransferNotes(''); setTransferSellerId(''); }}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleProcessTransfer}
                                disabled={!transferSellerId || isSubmitting || parseInt(transferQuantity) <= 0}
                                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Transferir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Zoom */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={selectedImage}
                        alt="Zoom"
                        className="max-w-full max-h-full object-contain rounded-lg animate-fade-in"
                    />
                    <button
                        className="absolute top-4 right-4 text-white p-2 bg-black bg-opacity-50 rounded-full"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AppBodegaEcuador;
