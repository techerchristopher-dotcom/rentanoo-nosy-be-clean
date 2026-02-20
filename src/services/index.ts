// Rentanoo Services - Service layer with localStorage persistence

import { 
  User, Vehicle, Photo, Booking, Payment, Notification,
  VehicleFilters, BookingForm, VehicleForm, LoginForm, RegisterForm,
  ApiResponse, PaginatedResponse, BookingStatus, VehicleStatus, KycStatus
} from '@/types';

// Mock data imports
import usersData from '@/mocks/users.json';
import vehiclesData from '@/mocks/vehicles.json'; 
import photosData from '@/mocks/photos.json';
import bookingsData from '@/mocks/bookings.json';
import paymentsData from '@/mocks/payments.json';
import notificationsData from '@/mocks/notifications.json';

// Simulated delay for realistic API behavior
const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Local storage keys
const STORAGE_KEYS = {
  users: 'maycar_users',
  vehicles: 'maycar_vehicles', 
  photos: 'maycar_photos',
  bookings: 'maycar_bookings',
  payments: 'maycar_payments',
  notifications: 'maycar_notifications',
  currentUser: 'maycar_current_user'
};

// Initialize data in localStorage if not exists
const initializeStorage = () => {
  Object.entries({
    [STORAGE_KEYS.users]: usersData,
    [STORAGE_KEYS.vehicles]: vehiclesData,
    [STORAGE_KEYS.photos]: photosData, 
    [STORAGE_KEYS.bookings]: bookingsData,
    [STORAGE_KEYS.payments]: paymentsData,
    [STORAGE_KEYS.notifications]: notificationsData
  }).forEach(([key, data]) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  });
};

// Storage utilities
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

// Utility function to check booking overlap
export const hasOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime(); 
  const e2 = new Date(end2).getTime();
  
  return s1 < e2 && s2 < e1;
};

// Initialize storage on module load
initializeStorage();

// Users Service
export class UsersService {
  static async getCurrentUser(): Promise<ApiResponse<User | null>> {
    await delay();
    const currentUserId = localStorage.getItem(STORAGE_KEYS.currentUser);
    if (!currentUserId) {
      return { data: null, success: true };
    }
    
    const users = getStorageData<User>(STORAGE_KEYS.users);
    const user = users.find(u => u.id === currentUserId);
    return { data: user || null, success: true };
  }

  static async login(form: LoginForm): Promise<ApiResponse<User>> {
    await delay();
    const users = getStorageData<User>(STORAGE_KEYS.users);
    const user = users.find(u => u.email === form.email);
    
    if (!user) {
      return { data: null as any, success: false, message: 'Email ou mot de passe incorrect' };
    }
    
    // In real app, check password hash
    localStorage.setItem(STORAGE_KEYS.currentUser, user.id);
    return { data: user, success: true, message: 'Connexion réussie' };
  }

  static async register(form: RegisterForm): Promise<ApiResponse<User>> {
    await delay();
    const users = getStorageData<User>(STORAGE_KEYS.users);
    
    if (users.find(u => u.email === form.email)) {
      return { data: null as any, success: false, message: 'Cette adresse email est déjà utilisée' };
    }

    const newUser: User = {
      id: generateId('user'),
      email: form.email,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      roles: ['renter'],
      kycStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    setStorageData(STORAGE_KEYS.users, users);
    localStorage.setItem(STORAGE_KEYS.currentUser, newUser.id);
    
    return { data: newUser, success: true, message: 'Inscription réussie' };
  }

  static async logout(): Promise<ApiResponse<null>> {
    await delay();
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    return { data: null, success: true, message: 'Déconnexion réussie' };
  }

  static async getAllUsers(): Promise<PaginatedResponse<User>> {
    await delay();
    const users = getStorageData<User>(STORAGE_KEYS.users);
    return {
      data: users,
      total: users.length,
      page: 1, 
      limit: users.length
    };
  }

  static async updateKycStatus(userId: string, status: KycStatus): Promise<ApiResponse<User>> {
    await delay();
    const users = getStorageData<User>(STORAGE_KEYS.users);
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return { data: null as any, success: false, message: 'Utilisateur non trouvé' };
    }

    users[userIndex].kycStatus = status;
    users[userIndex].updatedAt = new Date().toISOString();
    setStorageData(STORAGE_KEYS.users, users);
    
    return { data: users[userIndex], success: true, message: 'Statut KYC mis à jour' };
  }
}

// Vehicles Service  
export class VehiclesService {
  static async getPublishedVehicles(filters?: VehicleFilters): Promise<PaginatedResponse<Vehicle>> {
    await delay();
    let vehicles = getStorageData<Vehicle>(STORAGE_KEYS.vehicles).filter(v => v.status === 'published');
    
    // Apply filters
    if (filters) {
      if (filters.priceMin !== undefined) {
        vehicles = vehicles.filter(v => v.dailyPrice >= filters.priceMin!);
      }
      if (filters.priceMax !== undefined) {
        vehicles = vehicles.filter(v => v.dailyPrice <= filters.priceMax!);  
      }
      if (filters.fuel?.length) {
        vehicles = vehicles.filter(v => filters.fuel!.includes(v.fuel));
      }
      if (filters.transmission?.length) {
        vehicles = vehicles.filter(v => filters.transmission!.includes(v.transmission));
      }
      if (filters.hasAC !== undefined) {
        vehicles = vehicles.filter(v => v.hasAC === filters.hasAC);
      }
      if (filters.doors?.length) {
        vehicles = vehicles.filter(v => filters.doors!.includes(v.doors));
      }
      if (filters.searchText) {
        const text = filters.searchText.toLowerCase();
        vehicles = vehicles.filter(v => 
          v.brand.toLowerCase().includes(text) ||
          v.model.toLowerCase().includes(text) ||
          v.color.toLowerCase().includes(text) ||
          v.license.toLowerCase().includes(text)
        );
      }
    }
    
    return {
      data: vehicles,
      total: vehicles.length,
      page: 1,
      limit: vehicles.length
    };
  }

  static async getVehicleByLicense(license: string): Promise<ApiResponse<Vehicle>> {
    await delay();
    const vehicles = getStorageData<Vehicle>(STORAGE_KEYS.vehicles);
    const vehicle = vehicles.find(v => v.license === license);
    
    if (!vehicle) {
      return { data: null as any, success: false, message: 'Véhicule non trouvé' };
    }
    
    return { data: vehicle, success: true };
  }

  static async getVehicleById(vehicleId: string): Promise<ApiResponse<Vehicle>> {
    await delay();
    const vehicles = getStorageData<Vehicle>(STORAGE_KEYS.vehicles);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    if (!vehicle) {
      return { data: null as any, success: false, message: 'Véhicule non trouvé' };
    }
    
    return { data: vehicle, success: true };
  }

  static async getOwnerVehicles(ownerId: string): Promise<PaginatedResponse<Vehicle>> {
    await delay();
    const vehicles = getStorageData<Vehicle>(STORAGE_KEYS.vehicles).filter(v => v.ownerId === ownerId);
    
    return {
      data: vehicles,
      total: vehicles.length,
      page: 1,
      limit: vehicles.length  
    };
  }

  static async createVehicle(ownerId: string, form: VehicleForm): Promise<ApiResponse<Vehicle>> {
    await delay();
    const vehicles = getStorageData<Vehicle>(STORAGE_KEYS.vehicles);
    
    const newVehicle: Vehicle = {
      id: generateId('vehicle'),
      ownerId,
      license: `${Math.random().toString(36).substr(2, 2).toUpperCase()}-${Math.floor(Math.random() * 900) + 100}-YT`,
      ...form,
      currency: 'EUR',
      status: 'draft',
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString()
    };

    vehicles.push(newVehicle);
    setStorageData(STORAGE_KEYS.vehicles, vehicles);
    
    return { data: newVehicle, success: true, message: 'Véhicule créé avec succès' };
  }

  static async updateVehicleStatus(vehicleId: string, status: VehicleStatus): Promise<ApiResponse<Vehicle>> {
    await delay();
    const vehicles = getStorageData<Vehicle>(STORAGE_KEYS.vehicles);
    const vehicleIndex = vehicles.findIndex(v => v.id === vehicleId);
    
    if (vehicleIndex === -1) {
      return { data: null as any, success: false, message: 'Véhicule non trouvé' };
    }

    vehicles[vehicleIndex].status = status;
    vehicles[vehicleIndex].updatedAt = new Date().toISOString();
    setStorageData(STORAGE_KEYS.vehicles, vehicles);
    
    return { data: vehicles[vehicleIndex], success: true, message: 'Statut du véhicule mis à jour' };
  }

  static async getAllVehicles(): Promise<PaginatedResponse<Vehicle>> {
    await delay();
    const vehicles = getStorageData<Vehicle>(STORAGE_KEYS.vehicles);
    return {
      data: vehicles,
      total: vehicles.length,
      page: 1,
      limit: vehicles.length
    };
  }
}

// Photos Service
export class PhotosService {
  static async getVehiclePhotos(vehicleId: string): Promise<PaginatedResponse<Photo>> {
    await delay();
    const photos = getStorageData<Photo>(STORAGE_KEYS.photos)
      .filter(p => p.vehicleId === vehicleId)
      .sort((a, b) => a.position - b.position);
    
    return {
      data: photos,
      total: photos.length,
      page: 1,
      limit: photos.length
    };
  }

  static async getPrimaryPhoto(vehicleId: string): Promise<ApiResponse<Photo | null>> {
    await delay();
    const photos = getStorageData<Photo>(STORAGE_KEYS.photos);
    const primaryPhoto = photos.find(p => p.vehicleId === vehicleId && p.isPrimary);
    
    return { data: primaryPhoto || null, success: true };
  }

  static async addPhoto(vehicleId: string, url: string, angle: string, isPrimary: boolean = false): Promise<ApiResponse<Photo>> {
    await delay();
    const photos = getStorageData<Photo>(STORAGE_KEYS.photos);
    const vehiclePhotos = photos.filter(p => p.vehicleId === vehicleId);
    
    const newPhoto: Photo = {
      id: generateId('photo'),
      vehicleId,
      url,
      angle: angle as any,
      position: vehiclePhotos.length + 1,
      isPrimary,
      createdAt: new Date().toISOString()
    };

    // If this is primary, unset other primary photos for this vehicle
    if (isPrimary) {
      photos.forEach(p => {
        if (p.vehicleId === vehicleId && p.isPrimary) {
          p.isPrimary = false;
        }
      });
    }

    photos.push(newPhoto);
    setStorageData(STORAGE_KEYS.photos, photos);
    
    return { data: newPhoto, success: true, message: 'Photo ajoutée avec succès' };
  }
}

// Continue with more services...

// Export the BookingsService from the separate file
export { BookingsService } from './bookings';

// Export Supabase services for conversations and messages
export { ConversationsService } from './supabase/conversations';
export { MessagesService } from './supabase/messages';