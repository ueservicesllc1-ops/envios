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
  }
};
