import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, Search, Eye, Edit, Trash2, MapPin, Clock, CheckCircle, XCircle, X, User, Phone, Package, DollarSign, Store, ExternalLink } from 'lucide-react';
import { Seller } from '../types';
import { sellerService } from '../services/sellerService';
import { shippingService, ShippingPackage } from '../services/shippingService';
import { syncService } from '../services/syncService';
import { inventoryService } from '../services/inventoryService';
import { productService } from '../services/productService';
import { exitNoteService } from '../services/exitNoteService';
import toast from 'react-hot-toast';


const Shipping: React.FC = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<ShippingPackage[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [exitNotes, setExitNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ShippingPackage | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<ShippingPackage | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [showAutoPackageModal, setShowAutoPackageModal] = useState(false);
  const [autoPackageItems, setAutoPackageItems] = useState<any[]>([]);
  const [autoPackageWeight, setAutoPackageWeight] = useState(0);
  const [packageHistory, setPackageHistory] = useState<any[]>([]);
  const [currentPackageIndex, setCurrentPackageIndex] = useState(0);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [viewingPackage, setViewingPackage] = useState<ShippingPackage | null>(null);
  const [packageProducts, setPackageProducts] = useState<any[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [formData, setFormData] = useState({
    sellerId: '',
    address: '',
    city: '',
    phone: '',
    weight: 0,
    dimensions: 'Funda',
    notes: '',
    cost: 0
  });

  useEffect(() => {
    loadPackages();
    loadSellers();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const [packagesData, exitNotesData] = await Promise.all([
        shippingService.getAll(),
        exitNoteService.getAll()
      ]);
      setPackages(packagesData);
      setExitNotes(exitNotesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast.error('Error al cargar paquetes');
      setLoading(false);
    }
  };

  const loadSellers = async () => {
    try {
      const sellersData = await sellerService.getAll();
      setSellers(sellersData);
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast.error('Error al cargar vendedores');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-transit':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'returned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in-transit':
        return 'En Tránsito';
      case 'delivered':
        return 'En Camino';
      case 'returned':
        return 'Devuelto';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'in-transit':
        return Truck;
      case 'delivered':
        return CheckCircle;
      case 'returned':
        return XCircle;
      default:
        return Clock;
    }
  };

  const generateTrackingNumber = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `EC-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedSeller = sellers.find(s => s.id === formData.sellerId);
      if (!selectedSeller) {
        toast.error('Por favor selecciona un vendedor');
        return;
      }

      const packageData = {
        recipient: selectedSeller.name,
        address: formData.address,
        city: formData.city,
        phone: selectedSeller.phone,
        weight: formData.weight,
        dimensions: formData.dimensions,
        notes: formData.notes,
        cost: formData.cost,
        sellerId: selectedSeller.id
      };

      if (editingPackage) {
        // Editar envío existente
        await shippingService.update(editingPackage.id, packageData);
        setPackages(packages.map(p =>
          p.id === editingPackage.id
            ? { ...p, ...packageData }
            : p
        ));
        toast.success('Envío actualizado correctamente');
      } else {
        // Crear nuevo envío
        const newPackageData = {
          ...packageData,
          status: 'pending' as const,
          shippingDate: new Date()
        };

        const packageId = await shippingService.create(newPackageData);
        const newPackage: ShippingPackage = {
          id: packageId,
          ...newPackageData
        };

        setPackages([newPackage, ...packages]);
        toast.success('Envío creado correctamente');
      }
      setShowModal(false);
      setEditingPackage(null);
      setFormData({
        sellerId: '',
        address: '',
        city: '',
        phone: '',
        weight: 0,
        dimensions: 'Funda',
        notes: '',
        cost: 0
      });
    } catch (error) {
      console.error('Error creating package:', error);
      toast.error('Error al crear el envío');
    }
  };

  const openModal = () => {
    setEditingPackage(null);
    setFormData({
      sellerId: '',
      address: '',
      city: '',
      phone: '',
      weight: 0,
      dimensions: 'Funda',
      notes: '',
      cost: 0
    });
    setShowModal(true);
  };

  const handleAutoPackage = async () => {
    try {
      setLoading(true);

      // Cargar inventario y productos
      const [inventoryData, productsData] = await Promise.all([
        inventoryService.getAll(),
        productService.getAll()
      ]);

      // Filtrar solo productos con stock disponible
      const availableInventory = inventoryData.filter(item => item.quantity > 0);

      if (availableInventory.length === 0) {
        toast.error('No hay productos disponibles en inventario');
        setLoading(false);
        return;
      }

      // Convertir libras a gramos (8 libras = 3628.74 gramos)
      const targetWeight = 3628.74; // 8 libras en gramos
      const tolerance = 5; // ±5 gramos
      const minWeight = targetWeight - tolerance;
      const maxWeight = targetWeight + tolerance;

      // Algoritmo inteligente de llenado
      const selectedItems = await fillPackageIntelligently(availableInventory, productsData, targetWeight, tolerance);

      if (selectedItems.length === 0) {
        toast.error('No se pudo crear un paquete con los productos disponibles');
        setLoading(false);
        return;
      }

      // Calcular peso total
      const totalWeight = selectedItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);

      // Agregar al historial
      const newPackage = {
        items: selectedItems,
        weight: totalWeight,
        timestamp: new Date(),
        index: packageHistory.length + 1
      };

      setPackageHistory(prev => [...prev, newPackage]);
      setCurrentPackageIndex(packageHistory.length);
      setAutoPackageItems(selectedItems);
      setAutoPackageWeight(totalWeight);
      setShowAutoPackageModal(true);

      toast.success(`Paquete automático creado con ${selectedItems.length} productos (${totalWeight.toFixed(2)}g)`);

    } catch (error) {
      console.error('Error creating auto package:', error);
      toast.error('Error al crear paquete automático');
    } finally {
      setLoading(false);
    }
  };

  const fillPackageIntelligently = async (inventory: any[], products: any[], targetWeight: number, tolerance: number, excludeProducts: string[] = []) => {
    const selectedItems: any[] = [];
    let currentWeight = 0;
    const minWeight = targetWeight - tolerance;
    const maxWeight = targetWeight + tolerance;

    // Contadores para las reglas
    const skuCount: { [key: string]: number } = {};
    const categoryCount: { [key: string]: number } = {};

    // Reglas específicas
    const maxSkuCount = 3; // Máximo 3 productos del mismo SKU
    const maxShoes = 3; // Máximo 3 pares de zapatos
    const minShoes = 2; // Mínimo 2 pares de zapatos
    const maxVitamins = 4; // Máximo 4 vitaminas
    const maxSocks = 5; // Máximo 5 medias

    // Crear mapa de productos para acceso rápido
    const productMap = new Map(products.map(p => [p.id, p]));

    // Primero, verificar si hay suficientes zapatos disponibles
    const availableShoes = inventory.filter(item => {
      const product = productMap.get(item.productId);
      return product && product.category.toLowerCase().includes('zapato') && item.quantity > 0;
    });

    if (availableShoes.length === 0) {
      // No hay zapatos en stock, no crear paquete
      return [];
    }

    // Filtrar productos ya usados en paquetes anteriores
    const filteredInventory = inventory.filter(item => !excludeProducts.includes(item.productId));

    // Mezclar inventario aleatoriamente para obtener diferentes combinaciones
    const shuffledInventory = [...filteredInventory].sort(() => Math.random() - 0.5);

    // Primera pasada: agregar zapatos primero (mínimo 2)
    let shoesAdded = 0;
    for (const inventoryItem of shuffledInventory) {
      const product = productMap.get(inventoryItem.productId);
      if (!product || !product.weight) continue;

      const sku = product.sku;
      const category = product.category.toLowerCase();
      const itemWeight = product.weight;

      // Solo procesar zapatos en la primera pasada
      if (!category.includes('zapato')) continue;

      // Verificar reglas antes de agregar
      if (skuCount[sku] >= maxSkuCount) continue;
      if (shoesAdded >= maxShoes) break;

      // Calcular cuántas unidades podemos agregar sin exceder el peso
      const maxQuantity = Math.min(
        inventoryItem.quantity,
        Math.floor((maxWeight - currentWeight) / itemWeight)
      );

      if (maxQuantity <= 0) continue;

      // Agregar el producto
      const quantity = Math.min(maxQuantity, 1); // Empezar con 1 unidad
      const newWeight = currentWeight + (itemWeight * quantity);

      if (newWeight <= maxWeight) {
        selectedItems.push({
          productId: product.id,
          product: product,
          quantity: quantity,
          weight: itemWeight,
          totalWeight: itemWeight * quantity,
          sku: sku,
          category: category
        });

        currentWeight = newWeight;
        skuCount[sku] = (skuCount[sku] || 0) + quantity;
        categoryCount[category] = (categoryCount[category] || 0) + quantity;
        shoesAdded += quantity;
      }
    }

    // Verificar si tenemos al menos 2 zapatos (o 1 si solo hay 1 disponible)
    if (shoesAdded < minShoes && shoesAdded < availableShoes.length) {
      // No se puede cumplir la regla mínima, no crear paquete
      return [];
    }

    // Segunda pasada: agregar otros productos
    for (const inventoryItem of shuffledInventory) {
      const product = productMap.get(inventoryItem.productId);
      if (!product || !product.weight) continue;

      const sku = product.sku;
      const category = product.category.toLowerCase();
      const itemWeight = product.weight;

      // Verificar reglas antes de agregar
      if (skuCount[sku] >= maxSkuCount) continue;

      // Verificar reglas por categoría
      if (category.includes('zapato') && categoryCount['zapatos'] >= maxShoes) continue;
      if (category.includes('vitamina') && categoryCount['vitaminas'] >= maxVitamins) continue;
      if (category.includes('media') && categoryCount['medias'] >= maxSocks) continue;

      // Calcular cuántas unidades podemos agregar sin exceder el peso
      const maxQuantity = Math.min(
        inventoryItem.quantity,
        Math.floor((maxWeight - currentWeight) / itemWeight)
      );

      if (maxQuantity <= 0) continue;

      // Agregar el producto
      const quantity = Math.min(maxQuantity, 1); // Empezar con 1 unidad
      const newWeight = currentWeight + (itemWeight * quantity);

      if (newWeight <= maxWeight) {
        selectedItems.push({
          productId: product.id,
          product: product,
          quantity: quantity,
          weight: itemWeight,
          totalWeight: itemWeight * quantity,
          sku: sku,
          category: category
        });

        currentWeight = newWeight;
        skuCount[sku] = (skuCount[sku] || 0) + quantity;
        categoryCount[category] = (categoryCount[category] || 0) + quantity;

        // Si ya alcanzamos el peso objetivo, parar
        if (currentWeight >= minWeight) {
          break;
        }
      }
    }

    return selectedItems;
  };

  const handleRegeneratePackage = async () => {
    try {
      setLoading(true);

      // Cargar inventario y productos
      const [inventoryData, productsData] = await Promise.all([
        inventoryService.getAll(),
        productService.getAll()
      ]);

      // Filtrar solo productos con stock disponible
      const availableInventory = inventoryData.filter(item => item.quantity > 0);

      if (availableInventory.length === 0) {
        toast.error('No hay productos disponibles en inventario');
        setLoading(false);
        return;
      }

      // Convertir libras a gramos (8 libras = 3628.74 gramos)
      const targetWeight = 3628.74; // 8 libras en gramos
      const tolerance = 5; // ±5 gramos

      // Obtener productos ya usados en paquetes anteriores
      const usedProducts = packageHistory.flatMap(pkg => pkg.items.map((item: any) => item.productId));

      // Algoritmo inteligente de llenado
      const selectedItems = await fillPackageIntelligently(availableInventory, productsData, targetWeight, tolerance, usedProducts);

      if (selectedItems.length === 0) {
        toast.error('No se pudo crear un paquete con los productos disponibles');
        setLoading(false);
        return;
      }

      // Calcular peso total
      const totalWeight = selectedItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);

      // Agregar al historial
      const newPackage = {
        items: selectedItems,
        weight: totalWeight,
        timestamp: new Date(),
        index: packageHistory.length + 1
      };

      setPackageHistory(prev => [...prev, newPackage]);
      setCurrentPackageIndex(packageHistory.length);
      setAutoPackageItems(selectedItems);
      setAutoPackageWeight(totalWeight);

      toast.success(`Paquete regenerado con ${selectedItems.length} productos (${totalWeight.toFixed(2)}g)`);

    } catch (error) {
      console.error('Error regenerating package:', error);
      toast.error('Error al regenerar paquete');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = (index: number) => {
    if (index >= 0 && index < packageHistory.length) {
      const selectedPackage = packageHistory[index];
      setCurrentPackageIndex(index);
      setAutoPackageItems(selectedPackage.items);
      setAutoPackageWeight(selectedPackage.weight);
    }
  };

  const handleCreateExitNote = () => {
    if (autoPackageItems.length === 0) {
      toast.error('No hay productos para crear la nota de salida');
      return;
    }

    // Abrir modal para seleccionar vendedor
    setShowSellerModal(true);
  };

  const handleConfirmExitNote = async () => {
    try {
      if (!selectedSellerId) {
        toast.error('Por favor selecciona un vendedor');
        return;
      }

      const selectedSeller = sellers.find(s => s.id === selectedSellerId);
      if (!selectedSeller) {
        toast.error('Vendedor no encontrado');
        return;
      }

      // Crear la nota de salida automáticamente
      const exitNoteData = {
        number: `NS-AUTO-${Date.now()}`,
        date: new Date(),
        sellerId: selectedSellerId,
        seller: selectedSeller.name,
        customer: selectedSeller.name,
        items: autoPackageItems.map(item => {
          if (!item.product) {
            throw new Error(`Producto no encontrado para el item: ${item.productId}`);
          }

          return {
            id: Date.now().toString() + Math.random(),
            productId: item.productId,
            product: item.product,
            quantity: item.quantity,
            size: item.product.size || '',
            weight: item.weight || 0,
            unitPrice: item.product.salePrice1 || 0,
            totalPrice: item.quantity * (item.product.salePrice1 || 0)
          };
        }),
        totalPrice: autoPackageItems.reduce((sum, item) => {
          const price = item.product?.salePrice1 || 0;
          return sum + (item.quantity * price);
        }, 0),
        status: 'pending' as const,
        notes: `Paquete automático generado - Peso: ${autoPackageWeight.toFixed(2)}g`,
        shippingId: '', // Se asignará después de crear el paquete
        createdAt: new Date(),
        createdBy: 'Sistema Automático'
      };

      // Crear el paquete de envío automáticamente
      const shippingPackageData = {
        trackingNumber: '', // Sin tracking hasta que se asigne manualmente
        recipient: selectedSeller.name,
        address: selectedSeller.address || 'Dirección no especificada',
        city: selectedSeller.city || 'Ciudad no especificada',
        phone: selectedSeller.phone || 'Teléfono no especificado',
        weight: autoPackageWeight,
        dimensions: 'Auto-generado',
        status: 'pending' as const,
        shippingDate: new Date(),
        cost: 28, // Costo fijo de $28 para paquetes automáticos
        notes: `Paquete automático generado - Peso: ${autoPackageWeight.toFixed(2)}g`,
        sellerId: selectedSeller.id
      };

      // Crear el paquete de envío primero
      console.log('Creando paquete de envío:', shippingPackageData);
      const shippingId = await shippingService.create(shippingPackageData);
      console.log('Paquete de envío creado con ID:', shippingId);

      // Agregar el shippingId a la nota de salida
      exitNoteData.shippingId = shippingId;
      exitNoteData.notes = `Paquete automático generado - Peso: ${autoPackageWeight.toFixed(2)}g - Envío: ${shippingId}`;

      // Crear la nota de salida con el shippingId
      const createdExitNote = await exitNoteService.create(exitNoteData);
      toast.success('Paquete de envío creado exitosamente');

      // Actualizar inventario principal (remover stock)
      for (const item of autoPackageItems) {
        await inventoryService.removeStock(item.productId, item.quantity);
      }

      // Agregar productos al inventario del vendedor con estado "in-transit"
      const { sellerInventoryService } = await import('../services/sellerInventoryService');
      for (const item of autoPackageItems) {
        await sellerInventoryService.addToSellerInventory(
          selectedSellerId,
          item.productId,
          item.product,
          item.quantity
        );
      }

      toast.success('Nota de salida creada exitosamente');
      setShowAutoPackageModal(false);
      setShowSellerModal(false);
      setAutoPackageItems([]);
      setAutoPackageWeight(0);
      setPackageHistory([]);
      setCurrentPackageIndex(0);
      setSelectedSellerId('');

      // Recargar datos
      console.log('Recargando paquetes...');
      await loadPackages();
      console.log('Paquetes recargados');

    } catch (error) {
      console.error('Error creating exit note:', error);
      toast.error('Error al crear la nota de salida');
    }
  };

  const handleCancelSellerSelection = () => {
    setShowSellerModal(false);
    setSelectedSellerId('');
  };

  const handleImageClick = (imageUrl: string, productName: string) => {
    setSelectedImage(imageUrl);
    setSelectedProductName(productName);
    setShowImageModal(true);
  };

  const handleViewPackage = async (pkg: ShippingPackage) => {
    try {
      setViewingPackage(pkg);

      // Buscar la nota de salida asociada
      const associatedNote = exitNotes.find(note => note.shippingId === pkg.id);

      if (associatedNote && associatedNote.items) {
        // Si hay nota asociada, usar sus productos
        setPackageProducts(associatedNote.items);
      } else {
        // Si no hay nota asociada, intentar obtener productos del inventario del vendedor
        if (pkg.sellerId) {
          try {
            const { sellerInventoryService } = await import('../services/sellerInventoryService');
            const sellerInventory = await sellerInventoryService.getBySeller(pkg.sellerId);
            setPackageProducts(sellerInventory);
          } catch (error) {
            console.warn('No se pudieron cargar productos del paquete:', error);
            setPackageProducts([]);
          }
        } else {
          console.warn('No hay sellerId en el paquete');
          setPackageProducts([]);
        }
      }
    } catch (error) {
      console.error('Error loading package details:', error);
      toast.error('Error al cargar detalles del paquete');
    }
  };

  const handleCleanOrphanedPackages = async () => {
    try {
      await shippingService.cleanOrphanedPackages();
      toast.success('Paquetes huérfanos eliminados exitosamente');
      await loadPackages();
    } catch (error) {
      console.error('Error cleaning orphaned packages:', error);
      toast.error('Error al limpiar paquetes huérfanos');
    }
  };

  const openTrackingModal = (pkg: ShippingPackage) => {
    setSelectedPackage(pkg);
    setTrackingNumber(pkg.trackingNumber || '');
    setShowTrackingModal(true);
  };

  const handleAddTracking = async () => {
    if (!trackingNumber.trim()) {
      toast.error('Por favor ingresa un número de seguimiento');
      return;
    }

    if (selectedPackage) {
      try {
        // Actualizar el paquete con tracking y estado
        await shippingService.update(selectedPackage.id, {
          trackingNumber: trackingNumber.trim(),
          status: 'in-transit'
        });

        // Actualizar la nota de salida asociada si existe
        try {
          const exitNotes = await exitNoteService.getAll();
          console.log(`🔍 Buscando nota de salida con shippingId: ${selectedPackage.id}`);
          console.log(`📋 Total notas de salida: ${exitNotes.length}`);

          const associatedExitNote = exitNotes.find(note => note.shippingId === selectedPackage.id);

          if (associatedExitNote) {
            console.log(`✅ Nota de salida encontrada: ${associatedExitNote.number} - Estado actual: ${associatedExitNote.status}`);
            if (associatedExitNote.status === 'pending') {
              await exitNoteService.update(associatedExitNote.id, {
                status: 'in-transit'
              });
              console.log(`✅ Nota de salida ${associatedExitNote.number} actualizada a 'in-transit'`);
            } else {
              console.log(`ℹ️ Nota de salida ${associatedExitNote.number} ya tiene estado: ${associatedExitNote.status}`);
            }
          } else {
            console.log(`⚠️ No se encontró nota de salida con shippingId: ${selectedPackage.id}`);
            // Buscar por destinatario y fecha como alternativa
            const alternativeNote = exitNotes.find(note =>
              note.seller === selectedPackage.recipient &&
              !note.shippingId &&
              Math.abs(new Date(note.date).getTime() - new Date(selectedPackage.shippingDate).getTime()) < 24 * 60 * 60 * 1000
            );

            if (alternativeNote) {
              console.log(`🔗 Asociando nota alternativa: ${alternativeNote.number}`);
              await exitNoteService.update(alternativeNote.id, {
                shippingId: selectedPackage.id,
                status: 'in-transit'
              });
              console.log(`✅ Nota de salida ${alternativeNote.number} asociada y actualizada a 'in-transit'`);
            }
          }
        } catch (exitNoteError) {
          console.warn('No se pudo actualizar la nota de salida asociada:', exitNoteError);
        }

        setPackages(packages.map(p =>
          p.id === selectedPackage.id
            ? { ...p, trackingNumber: trackingNumber.trim(), status: 'in-transit' as const }
            : p
        ));
        toast.success(selectedPackage.trackingNumber
          ? 'Número de seguimiento actualizado y nota de salida actualizada'
          : 'Número de seguimiento agregado y nota de salida actualizada');
        setShowTrackingModal(false);
        setSelectedPackage(null);
        setTrackingNumber('');
      } catch (error) {
        console.error('Error updating tracking:', error);
        toast.error('Error al agregar número de seguimiento');
      }
    }
  };

  const handleEdit = (pkg: ShippingPackage) => {
    setEditingPackage(pkg);
    setFormData({
      sellerId: sellers.find(s => s.name === pkg.recipient)?.id || '',
      address: pkg.address,
      city: pkg.city,
      phone: pkg.phone,
      weight: pkg.weight,
      dimensions: pkg.dimensions,
      notes: pkg.notes || '',
      cost: pkg.cost
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este envío?')) {
      try {
        await shippingService.delete(id);
        setPackages(packages.filter(p => p.id !== id));
        toast.success('Envío eliminado correctamente');
      } catch (error) {
        console.error('Error deleting package:', error);
        toast.error('Error al eliminar el envío');
      }
    }
  };

  const handleMarkAsDelivered = async (id: string) => {
    try {
      // Actualizar estado del paquete
      await shippingService.update(id, {
        status: 'delivered',
        deliveredAt: new Date()
      });

      // Sincronizar con notas de salida y actualizar deuda del vendedor
      await syncService.syncShippingWithExitNotes(id, 'delivered');

      setPackages(packages.map(p =>
        p.id === id
          ? { ...p, status: 'delivered' as const, deliveredAt: new Date() }
          : p
      ));

      toast.success('Paquete marcado como entregado y datos sincronizados');
    } catch (error) {
      console.error('Error marking as delivered:', error);
      toast.error('Error al marcar como entregado');
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = (pkg.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      pkg.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterBy === 'all' || pkg.status === filterBy;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Paquetería</h1>
          <p className="text-gray-600">Gestión de envíos y paquetes</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={openModal}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Envío
          </button>
          <button
            onClick={handleAutoPackage}
            className="btn-secondary flex items-center"
          >
            <Package className="h-4 w-4 mr-2" />
            Crear Paquete Automático
          </button>
          <button
            onClick={handleCleanOrphanedPackages}
            className="btn-danger flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar Paquetes Huérfanos
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Envíos</p>
              <p className="text-2xl font-bold text-gray-900">{packages.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">
                {packages.filter(p => p.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Entregados</p>
              <p className="text-2xl font-bold text-gray-900">
                {packages.filter(p => p.status === 'delivered').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <MapPin className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En Tránsito</p>
              <p className="text-2xl font-bold text-gray-900">
                {packages.filter(p => p.status === 'in-transit').length}
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
                placeholder="Buscar paquetes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="input-field"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="in-transit">En Tránsito</option>
              <option value="delivered">Entregados</option>
              <option value="returned">Devueltos</option>
            </select>
            <span className="text-sm text-gray-600">
              {filteredPackages.length} paquetes
            </span>
            <button
              onClick={async () => {
                try {
                  await syncService.updatePackagesWithoutSellerId();
                  await loadPackages(); // Recargar paquetes después de la actualización
                } catch (error) {
                  console.error('Error updating packages:', error);
                }
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Actualizar Paquetes
            </button>
            <button
              onClick={async () => {
                try {
                  await syncService.associateExitNotesWithPackages();
                  await loadPackages(); // Recargar paquetes después de la asociación
                } catch (error) {
                  console.error('Error associating notes:', error);
                }
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
            >
              Asociar Notas
            </button>
          </div>
        </div>
      </div>

      {/* Packages Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Tracking</th>
                <th className="table-header">Nota de Salida</th>
                <th className="table-header">Destinatario</th>
                <th className="table-header">Ciudad</th>
                <th className="table-header">Peso</th>
                <th className="table-header">Tipo</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Fecha Envío</th>
                <th className="table-header">Costo</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPackages.map((pkg) => {
                const StatusIcon = getStatusIcon(pkg.status);
                return (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        {pkg.trackingNumber ? (
                          <>
                            <span className="text-sm font-medium text-gray-900">
                              {pkg.trackingNumber}
                            </span>
                            <button
                              onClick={() => openTrackingModal(pkg)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                              title="Editar número de tracking"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm text-gray-500 italic">Pendiente</span>
                            <button
                              onClick={() => openTrackingModal(pkg)}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                            >
                              Agregar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {(() => {
                          const associatedNote = exitNotes.find(note => note.shippingId === pkg.id);
                          return associatedNote ? associatedNote.number : 'Sin asociar';
                        })()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{pkg.recipient}</div>
                        <div className="text-sm text-gray-500">{pkg.phone}</div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{pkg.city}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{pkg.weight} kg</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">{pkg.dimensions}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pkg.status)}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {getStatusText(pkg.status)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-900">
                        {new Date(pkg.shippingDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        ${pkg.cost.toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewPackage(pkg)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {pkg.status !== 'delivered' && (
                          <button
                            onClick={() => handleMarkAsDelivered(pkg.id)}
                            className="p-1 text-gray-400 hover:text-green-600"
                            title="Marcar como entregado"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(pkg)}
                          className="p-1 text-gray-400 hover:text-yellow-600"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredPackages.length === 0 && (
        <div className="card text-center py-12">
          <Truck className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay paquetes</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'No se encontraron paquetes con ese criterio.' : 'Comienza creando tu primer envío.'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={openModal}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Envío
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal para crear/editar envío */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPackage ? 'Editar Envío' : 'Nuevo Envío'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información del destinatario */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Información del Destinatario
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendedor *
                    </label>
                    <select
                      required
                      value={formData.sellerId}
                      onChange={(e) => {
                        const selectedSeller = sellers.find(s => s.id === e.target.value);
                        setFormData({
                          ...formData,
                          sellerId: e.target.value,
                          phone: selectedSeller?.phone || '',
                          city: selectedSeller?.city || '',
                          address: selectedSeller?.address || ''
                        });
                      }}
                      className="input-field"
                    >
                      <option value="">Seleccionar vendedor</option>
                      {sellers.map(seller => (
                        <option key={seller.id} value={seller.id}>
                          {seller.name} - {seller.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      className="input-field bg-gray-100"
                      disabled
                      placeholder="Se llena automáticamente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      className="input-field bg-gray-100"
                      disabled
                      placeholder="Se llena automáticamente"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      className="input-field bg-gray-100"
                      disabled
                      placeholder="Se llena automáticamente"
                    />
                  </div>
                </div>
              </div>

              {/* Información del paquete */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Información del Paquete
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Peso (kg) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                      className="input-field"
                      placeholder="1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Paquete
                    </label>
                    <select
                      value={formData.dimensions}
                      onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                      className="input-field"
                    >
                      <option value="Funda">Funda</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo de Envío *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                      className="input-field"
                      placeholder="5.00"
                    />
                  </div>
                </div>
              </div>

              {/* Notas adicionales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas Adicionales
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Instrucciones especiales, horarios de entrega, etc."
                />
              </div>

              {/* Resumen del tracking */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-md font-medium text-gray-900 mb-2 flex items-center">
                  <Truck className="h-4 w-4 mr-2" />
                  Número de Seguimiento
                </h4>
                <p className="text-sm text-gray-600">
                  Se agregará cuando la empresa de envíos lo proporcione por correo
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  El envío aparecerá como "Pendiente" hasta que se agregue el número
                </p>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingPackage ? 'Actualizar Envío' : 'Crear Envío'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal pequeño para agregar número de seguimiento */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                {selectedPackage?.trackingNumber ? 'Editar' : 'Agregar'} Número de Seguimiento
              </h3>
              <button
                onClick={() => setShowTrackingModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedPackage && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Destinatario:</strong> {selectedPackage.recipient}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Ciudad:</strong> {selectedPackage.city}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Peso:</strong> {selectedPackage.weight} kg
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Seguimiento *
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="input-field"
                placeholder="Ej: EC123456789PE"
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTrackingModal(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTracking}
                className="btn-primary"
              >
                {selectedPackage?.trackingNumber ? 'Actualizar' : 'Agregar'} Seguimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para paquete automático */}
      {showAutoPackageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Paquete Automático Generado
              </h3>
              <button
                onClick={() => {
                  setShowAutoPackageModal(false);
                  setPackageHistory([]);
                  setCurrentPackageIndex(0);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">Resumen del Paquete</h4>
                  <p className="text-sm text-blue-700">
                    Peso total: {autoPackageWeight.toFixed(2)}g ({(autoPackageWeight / 453.592).toFixed(2)} libras)
                  </p>
                  <p className="text-sm text-blue-700">
                    Productos: {autoPackageItems.length} | Objetivo: 8 libras ±5g
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${Math.abs(autoPackageWeight - 3628.74) <= 5 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {Math.abs(autoPackageWeight - 3628.74) <= 5 ? '✓ Peso Óptimo' : '⚠ Peso Aproximado'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Productos Seleccionados</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Cantidad</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Peso Unit.</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Peso Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {autoPackageItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                          <div className="text-sm text-gray-500">{item.product.category}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.sku}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.weight}g</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.totalWeight}g</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Historial de paquetes */}
            {packageHistory.length > 1 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Historial de Paquetes</h4>
                <div className="flex flex-wrap gap-2">
                  {packageHistory.map((pkg, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectPackage(index)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPackageIndex === index
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      Paquete {index + 1}
                      <div className="text-xs">
                        {pkg.weight.toFixed(2)}g ({(pkg.weight / 453.592).toFixed(2)} lbs)
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <div className="flex space-x-3">
                <button
                  onClick={handleRegeneratePackage}
                  className="btn-secondary flex items-center"
                  disabled={loading}
                >
                  <Package className="h-4 w-4 mr-2" />
                  {loading ? 'Regenerando...' : 'Regenerar Paquete'}
                </button>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowAutoPackageModal(false);
                    setPackageHistory([]);
                    setCurrentPackageIndex(0);
                  }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateExitNote}
                  className="btn-primary"
                >
                  Crear Nota de Salida
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Selección de Vendedor */}
      {showSellerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Seleccionar Vendedor
              </h3>
              <button
                onClick={handleCancelSellerSelection}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vendedor para la Nota de Salida
              </label>
              <select
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar vendedor...</option>
                {sellers.map(seller => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name} - {seller.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelSellerSelection}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmExitNote}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={!selectedSellerId}
              >
                Crear Nota de Salida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver detalles del paquete */}
      {viewingPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-7xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Detalles del Paquete
              </h3>
              <button
                onClick={() => setViewingPackage(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Información básica del paquete */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Tracking
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingPackage.trackingNumber || 'Sin tracking'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingPackage.status)}`}>
                    {getStatusText(viewingPackage.status)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Envío
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {new Date(viewingPackage.shippingDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destinatario
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded flex-1">
                      {viewingPackage.recipient}
                    </p>
                    {viewingPackage.sellerId && (
                      <button
                        onClick={async () => {
                          if (!viewingPackage.sellerId) return;

                          try {
                            // Obtener el vendedor para conseguir su slug
                            const seller = await sellerService.getById(viewingPackage.sellerId);
                            if (seller) {
                              const slug = seller.slug || viewingPackage.sellerId;
                              navigate(`/store/${slug}`);
                              setViewingPackage(null);
                            }
                          } catch (error) {
                            console.error('Error obteniendo vendedor:', error);
                            // Si hay error, usar el ID como fallback
                            navigate(`/store/${viewingPackage.sellerId}`);
                            setViewingPackage(null);
                          }
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm font-medium"
                        title="Ver tienda del vendedor"
                      >
                        <Store className="h-4 w-4" />
                        <span>Ver Tienda</span>
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingPackage.phone}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingPackage.city}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingPackage.address}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingPackage.weight} kg
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Paquete
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingPackage.dimensions}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    ${viewingPackage.cost.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Productos del paquete */}
              {packageProducts.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Productos del Paquete</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Imagen
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Producto
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Color
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Talla
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cantidad
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Peso (g)
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Precio Unit.
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {packageProducts.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="flex-shrink-0">
                                {item.product?.imageUrl ? (
                                  <img
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    className="h-16 w-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleImageClick(item.product.imageUrl, item.product.name)}
                                    title="Hacer clic para ver imagen completa"
                                  />
                                ) : (
                                  <div className="h-16 w-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                    <Package className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {item.product?.name || 'Producto no encontrado'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  SKU: {item.product?.sku || 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center space-x-2">
                                {item.product?.color && (
                                  <>
                                    <div
                                      className="w-4 h-4 rounded-full border border-gray-300"
                                      style={{ backgroundColor: item.product.color }}
                                      title={item.product.color}
                                    ></div>
                                    <span className="text-sm text-gray-900">
                                      {item.product.color}
                                    </span>
                                  </>
                                )}
                                {!item.product?.color && (
                                  <span className="text-sm text-gray-500">Sin color</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-gray-900">
                                {item.size || item.product?.size || 'Sin talla'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm font-medium text-gray-900">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-gray-900">
                                {item.weight ? `${item.weight}g` : item.product?.weight ? `${item.product.weight}g` : 'Sin peso'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-gray-900">
                                ${item.unitPrice ? item.unitPrice.toLocaleString() : item.product?.salePrice1?.toLocaleString() || '0'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm font-medium text-gray-900">
                                ${item.totalPrice ? item.totalPrice.toLocaleString() : (item.quantity * (item.unitPrice || item.product?.salePrice1 || 0)).toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Resumen del paquete */}
              {packageProducts.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total del Paquete:</span>
                    <span className="text-xl font-bold text-gray-900">
                      ${packageProducts.reduce((sum, item) => {
                        const total = item.totalPrice || (item.quantity * (item.unitPrice || item.product?.salePrice1 || 0));
                        return sum + total;
                      }, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {packageProducts.length} productos • Peso total: {packageProducts.reduce((sum, item) => {
                      const weight = item.weight || item.product?.weight || 0;
                      return sum + (weight * item.quantity);
                    }, 0)}g
                  </div>
                </div>
              )}

              {/* Notas */}
              {viewingPackage.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {viewingPackage.notes}
                  </p>
                </div>
              )}

              {/* Fechas adicionales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Creación
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {new Date(viewingPackage.shippingDate).toLocaleDateString()}
                  </p>
                </div>
                {viewingPackage.deliveredAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Entrega
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {new Date(viewingPackage.deliveredAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
              <button
                onClick={() => setViewingPackage(null)}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver imagen completa */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedProductName}
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex justify-center">
              <img
                src={selectedImage}
                alt={selectedProductName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 mt-4 border-t">
              <button
                onClick={() => setShowImageModal(false)}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shipping;
