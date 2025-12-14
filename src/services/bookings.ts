// Bookings Service - Continue from main services file

import { 
  Booking, BookingForm, BookingStatus, ApiResponse, PaginatedResponse
} from '@/types';
import { hasOverlap } from './index';

const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

const STORAGE_KEYS = {
  bookings: 'maycar_bookings',
  payments: 'maycar_payments'
};

const getStorageData = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setStorageData = <T>(key: string, data: T[]): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export class BookingsService {
  static async getRenterBookings(renterId: string): Promise<PaginatedResponse<Booking>> {
    await delay();
    const bookings = getStorageData<Booking>(STORAGE_KEYS.bookings)
      .filter(b => b.renterId === renterId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return {
      data: bookings,
      total: bookings.length,
      page: 1,
      limit: bookings.length
    };
  }

  static async getVehicleBookings(vehicleId: string): Promise<PaginatedResponse<Booking>> {
    await delay();
    const bookings = getStorageData<Booking>(STORAGE_KEYS.bookings)
      .filter(b => b.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return {
      data: bookings,
      total: bookings.length,
      page: 1,
      limit: bookings.length
    };
  }

  static async getAllBookings(): Promise<PaginatedResponse<Booking>> {
    await delay();
    const bookings = getStorageData<Booking>(STORAGE_KEYS.bookings)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return {
      data: bookings,
      total: bookings.length,
      page: 1,
      limit: bookings.length
    };
  }

  static async checkAvailability(vehicleId: string, startDate: string, endDate: string): Promise<ApiResponse<boolean>> {
    await delay();
    const bookings = getStorageData<Booking>(STORAGE_KEYS.bookings);
    
    // Check for overlapping bookings that are not cancelled or declined
    const conflictingBooking = bookings.find(b => 
      b.vehicleId === vehicleId &&
      ['pending', 'accepted', 'active'].includes(b.status) &&
      hasOverlap(b.startDate, b.endDate, startDate, endDate)
    );
    
    const isAvailable = !conflictingBooking;
    
    return { 
      data: isAvailable, 
      success: true, 
      message: isAvailable ? 'Véhicule disponible' : 'Véhicule non disponible pour ces dates'
    };
  }

  static async createBooking(form: BookingForm & { renterId: string }): Promise<ApiResponse<Booking>> {
    await delay();
    
    // Check availability first
    const availability = await this.checkAvailability(form.vehicleId, form.startDate, form.endDate);
    if (!availability.data) {
      return { data: null as any, success: false, message: availability.message };
    }

    const bookings = getStorageData<Booking>(STORAGE_KEYS.bookings);
    
    // Calculate total amount (days * daily price + options)
    const startMs = new Date(form.startDate).getTime();
    const endMs = new Date(form.endDate).getTime();
    const days = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24));
    
    // Use provided totalAmount if available, otherwise calculate base price
    let totalAmount = form.totalAmount;
    if (totalAmount === undefined) {
      // Fallback: calculate base price only
      const vehiclesData = getStorageData<any>('maycar_vehicles');
      const vehicle = vehiclesData.find((v: any) => v.id === form.vehicleId);
      totalAmount = days * (vehicle?.dailyPrice || 0);
    }
    
    const newBooking: Booking = {
      id: generateId('booking'),
      vehicleId: form.vehicleId,
      renterId: form.renterId,
      startDate: form.startDate,
      endDate: form.endDate,
      totalAmount,
      currency: 'EUR',
      status: 'pending',
      selectedOptions: form.selectedOptions, // Copier-coller depuis la modal
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    bookings.push(newBooking);
    setStorageData(STORAGE_KEYS.bookings, bookings);
    
    return { data: newBooking, success: true, message: 'Réservation créée avec succès' };
  }

  static async updateBookingStatus(bookingId: string, status: BookingStatus): Promise<ApiResponse<Booking>> {
    await delay();
    const bookings = getStorageData<Booking>(STORAGE_KEYS.bookings);
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);
    
    if (bookingIndex === -1) {
      return { data: null as any, success: false, message: 'Réservation non trouvée' };
    }

    bookings[bookingIndex].status = status;
    bookings[bookingIndex].updatedAt = new Date().toISOString();
    setStorageData(STORAGE_KEYS.bookings, bookings);
    
    return { data: bookings[bookingIndex], success: true, message: 'Statut de la réservation mis à jour' };
  }

  static async getBookingById(bookingId: string): Promise<ApiResponse<Booking>> {
    await delay();
    const bookings = getStorageData<Booking>(STORAGE_KEYS.bookings);
    const booking = bookings.find(b => b.id === bookingId);
    
    if (!booking) {
      return { data: null as any, success: false, message: 'Réservation non trouvée' };
    }
    
    return { data: booking, success: true };
  }
}