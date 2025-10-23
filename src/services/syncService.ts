import { exitNoteService } from './exitNoteService';
import { shippingService } from './shippingService';
import { sellerService } from './sellerService';
import { ExitNote } from '../types';
import toast from 'react-hot-toast';

export const syncService = {
  // Sincronizar estado de paquetería con notas de salida
  async syncShippingWithExitNotes(packageId: string, newStatus: string) {
    try {
      // Obtener el paquete
      const pkg = await shippingService.getById(packageId);
      if (!pkg) {
        throw new Error('Paquete no encontrado');
      }

      // Buscar notas de salida relacionadas con este vendedor
      const exitNotes = await exitNoteService.getBySeller(pkg.recipient);
      
      // Si el paquete se marca como entregado, actualizar las notas de salida
      if (newStatus === 'delivered') {
        for (const note of exitNotes) {
          if (note.status === 'pending' || note.status === 'delivered') {
            await exitNoteService.update(note.id, { 
              status: 'received',
              receivedAt: new Date()
            });
          }
        }
        
        // Actualizar valores del vendedor
        await this.updateSellerDebt(pkg.recipient);
        
        toast.success('Notas de salida sincronizadas y valores actualizados');
      }
    } catch (error) {
      console.error('Error syncing shipping with exit notes:', error);
      toast.error('Error al sincronizar datos');
      throw error;
    }
  },

  // Actualizar deuda del vendedor
  async updateSellerDebt(sellerName: string) {
    try {
      // Obtener todas las notas de salida del vendedor
      const sellers = await sellerService.getAll();
      const seller = sellers.find(s => s.name === sellerName);
      
      if (!seller) {
        throw new Error('Vendedor no encontrado');
      }

      const exitNotes = await exitNoteService.getBySeller(seller.id);
      
      // Calcular total de deuda (notas entregadas pero no pagadas)
      const totalDebt = exitNotes
        .filter(note => note.status === 'received')
        .reduce((sum, note) => sum + note.totalPrice, 0);

      // Actualizar información del vendedor
      await sellerService.update(seller.id, {
        totalDebt: totalDebt,
        lastDeliveryDate: new Date()
      });

      return totalDebt;
    } catch (error) {
      console.error('Error updating seller debt:', error);
      throw error;
    }
  },

  // Obtener resumen financiero del vendedor
  async getSellerFinancialSummary(sellerId: string) {
    try {
      const exitNotes = await exitNoteService.getBySeller(sellerId);
      
      const summary = {
        totalDelivered: 0,
        totalPaid: 0,
        totalDebt: 0,
        pendingDeliveries: 0,
        receivedDeliveries: 0
      };

      exitNotes.forEach(note => {
        if (note.status === 'received') {
          summary.totalDelivered += note.totalPrice;
          summary.receivedDeliveries += 1;
        } else if (note.status === 'pending' || note.status === 'delivered') {
          summary.pendingDeliveries += 1;
        }
      });

      summary.totalDebt = summary.totalDelivered - summary.totalPaid;

      return summary;
    } catch (error) {
      console.error('Error getting seller financial summary:', error);
      throw error;
    }
  },

  // Actualizar paquetes existentes que no tienen sellerId
  async updatePackagesWithoutSellerId() {
    try {
      console.log('🔄 Actualizando paquetes sin sellerId...');
      
      // Obtener todos los paquetes
      const allPackages = await shippingService.getAll();
      console.log(`📦 Total paquetes encontrados: ${allPackages.length}`);
      
      // Obtener todos los vendedores
      const sellers = await sellerService.getAll();
      console.log(`👥 Total vendedores encontrados: ${sellers.length}`);
      
      let updatedCount = 0;
      
      for (const pkg of allPackages) {
        // Si el paquete no tiene sellerId
        if (!pkg.sellerId) {
          // Buscar el vendedor por nombre del destinatario
          const seller = sellers.find(s => s.name === pkg.recipient);
          
          if (seller) {
            // Actualizar el paquete con el sellerId
            await shippingService.update(pkg.id, { sellerId: seller.id });
            console.log(`✅ Paquete ${pkg.id} actualizado con sellerId: ${seller.id} (${seller.name})`);
            updatedCount++;
          } else {
            console.log(`⚠️ No se encontró vendedor para el paquete ${pkg.id} con destinatario: ${pkg.recipient}`);
          }
        }
      }
      
      console.log(`🎉 Actualización completada. ${updatedCount} paquetes actualizados.`);
      toast.success(`${updatedCount} paquetes actualizados con sellerId`);
      
      return updatedCount;
    } catch (error) {
      console.error('Error updating packages without sellerId:', error);
      toast.error('Error al actualizar paquetes');
      throw error;
    }
  },

  // Asociar notas de salida con sus paquetes correspondientes
  async associateExitNotesWithPackages() {
    try {
      console.log('🔄 Asociando notas de salida con paquetes...');
      
      // Obtener todas las notas de salida
      const exitNotes = await exitNoteService.getAll();
      console.log(`📋 Total notas de salida encontradas: ${exitNotes.length}`);
      
      // Obtener todos los paquetes
      const packages = await shippingService.getAll();
      console.log(`📦 Total paquetes encontrados: ${packages.length}`);
      
      let associatedCount = 0;
      
      for (const note of exitNotes) {
        // Si la nota no tiene shippingId
        if (!note.shippingId) {
          // Buscar paquete por destinatario y fecha
          const matchingPackage = packages.find(pkg => 
            pkg.recipient === note.seller && 
            Math.abs(new Date(pkg.shippingDate).getTime() - new Date(note.date).getTime()) < 24 * 60 * 60 * 1000 // Dentro de 24 horas
          );
          
          if (matchingPackage) {
            // Asociar la nota con el paquete
            await exitNoteService.update(note.id, { shippingId: matchingPackage.id });
            console.log(`✅ Nota ${note.number} asociada con paquete ${matchingPackage.id}`);
            associatedCount++;
          } else {
            console.log(`⚠️ No se encontró paquete para la nota ${note.number} (${note.seller})`);
          }
        }
      }
      
      console.log(`🎉 Asociación completada. ${associatedCount} notas asociadas con paquetes.`);
      toast.success(`${associatedCount} notas de salida asociadas con paquetes`);
      
      return associatedCount;
    } catch (error) {
      console.error('Error associating exit notes with packages:', error);
      toast.error('Error al asociar notas con paquetes');
      throw error;
    }
  },

  // Actualizar notas de salida que tienen paquetes con tracking pero siguen en pendiente
  async updateExitNotesWithTracking() {
    try {
      console.log('🔄 Actualizando notas de salida con paquetes en tránsito...');
      
      // Obtener todas las notas de salida
      const exitNotes = await exitNoteService.getAll();
      console.log(`📋 Total notas de salida encontradas: ${exitNotes.length}`);
      
      // Obtener todos los paquetes
      const packages = await shippingService.getAll();
      console.log(`📦 Total paquetes encontrados: ${packages.length}`);
      
      let updatedCount = 0;
      
      for (const note of exitNotes) {
        // Si la nota está en pendiente
        if (note.status === 'pending') {
          let packageToUpdate = null;
          
          // Buscar paquete asociado por shippingId
          if (note.shippingId) {
            packageToUpdate = packages.find(pkg => pkg.id === note.shippingId);
          }
          
          // Si no tiene shippingId, buscar por destinatario y fecha
          if (!packageToUpdate) {
            packageToUpdate = packages.find(pkg => 
              pkg.recipient === note.seller && 
              Math.abs(new Date(pkg.shippingDate).getTime() - new Date(note.date).getTime()) < 24 * 60 * 60 * 1000
            );
          }
          
          if (packageToUpdate && packageToUpdate.status === 'in-transit') {
            // Actualizar la nota de salida
            await exitNoteService.update(note.id, {
              status: 'in-transit',
              shippingId: packageToUpdate.id
            });
            console.log(`✅ Nota ${note.number} actualizada a 'in-transit' (paquete: ${packageToUpdate.id})`);
            updatedCount++;
          }
        }
      }
      
      console.log(`🎉 Actualización completada. ${updatedCount} notas actualizadas.`);
      toast.success(`${updatedCount} notas de salida actualizadas a 'En Tránsito'`);
      
      return updatedCount;
    } catch (error) {
      console.error('Error updating exit notes with tracking:', error);
      toast.error('Error al actualizar notas de salida');
      throw error;
    }
  }
};
