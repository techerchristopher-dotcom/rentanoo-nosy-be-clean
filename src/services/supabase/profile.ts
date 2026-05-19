// Service Supabase pour la gestion des profils utilisateur
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Role, User } from '@/types';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';
import { extractProfileFieldsFromAuthUser } from '@/utils/authProfileMetadata';

type SupabaseProfile = Tables<'profiles'>;
type SupabaseProfileUpdate = TablesUpdate<'profiles'>;

function normalizeRole(raw: string | null | undefined): Role {
  if (raw === "owner" || raw === "admin" || raw === "renter") return raw;
  return "renter";
}

/** Rôle métier + admin plateforme (`is_admin` / `admin_role`, ou `role = admin` legacy). */
function rolesFromProfile(profile: SupabaseProfile): Role[] {
  const base = normalizeRole(profile.role);
  const set = new Set<Role>([base]);
  if (profile.is_admin === true || profile.admin_role === "admin" || profile.role === "admin") {
    set.add("admin");
  }
  return Array.from(set);
}

/**
 * Complète uniquement les champs vides du profil à partir des métadonnées auth (Google OIDC, email, etc.).
 * Ne remplace jamais une valeur déjà renseignée côté `profiles`.
 */
async function applyAuthMetadataBackfillIfNeeded(
  authUser: SupabaseAuthUser,
  profile: SupabaseProfile
): Promise<SupabaseProfile | null> {
  const extracted = extractProfileFieldsFromAuthUser(authUser);
  const patch: SupabaseProfileUpdate = {};
  if (!(profile.first_name || "").trim() && extracted.firstName) {
    patch.first_name = extracted.firstName;
  }
  if (!(profile.last_name || "").trim() && extracted.lastName) {
    patch.last_name = extracted.lastName;
  }
  if (!(profile.phone || "").trim() && extracted.phone) {
    patch.phone = extracted.phone;
  }
  if (Object.keys(patch).length === 0) {
    return null;
  }
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", profile.id)
    .select()
    .single();
  if (error || !data) {
    return null;
  }
  return data;
}

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  birthDate?: string;
  placeOfBirth?: string;
  bio?: string;
  addressLine1?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  driverLicenseNumber?: string;
  driverLicenseIssueDate?: string;
  driverLicenseExpirationDate?: string;
  driverLicenseCategory?: string;
  driverLicenseCountry?: string;
  driverLicenseFilePath?: string;
}

export class ProfileService {
  /**
   * Récupère le profil de l'utilisateur connecté
   */
  static async getCurrentUserProfile(): Promise<{ data: User | null; error: string | null }> {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return { data: null, error: 'Utilisateur non authentifié' };
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        // Si le profil n'existe pas, essayer de le créer
        if (error.code === 'PGRST116') {
          const extracted = extractProfileFieldsFromAuthUser(authUser);
          const createResult = await this.createUserProfile(authUser.id, {
            email: authUser.email || '',
            firstName: extracted.firstName,
            lastName: extracted.lastName,
            phone: extracted.phone,
          });
          
          if (createResult.error) {
            return { data: null, error: createResult.error };
          }
          
          return createResult;
        }
        
        return { data: null, error: error.message };
      }

      if (!profile) {
        return { data: null, error: 'Profil non trouvé' };
      }

      const row = (await applyAuthMetadataBackfillIfNeeded(authUser, profile)) ?? profile;

      const user: User = {
        id: row.id,
        email: row.email || '',
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        phone: row.phone || undefined,
        bio: row.bio || undefined,
        roles: rolesFromProfile(row),
        isAdmin: row.is_admin === true,
        adminRole: row.admin_role ?? null,
        kycStatus: row.kyc_status || 'pending',
        avatarUrl: row.avatar_url || undefined,
        birthDate: row.birthdate || undefined,
        placeOfBirth: row.place_of_birth || undefined,
        driverLicenseNumber: row.driver_license_number || undefined,
        driverLicenseIssueDate: row.driver_license_issue_date || undefined,
        driverLicenseExpirationDate: row.driver_license_expiration_date || undefined,
        driverLicenseCategory: row.driver_license_category || undefined,
        driverLicenseCountry: row.driver_license_country || undefined,
        driverLicenseFilePath: row.driver_license_file_path || undefined,
        addressLine1: row.address_line1 || undefined,
        postalCode: row.postal_code || undefined,
        city: row.city || undefined,
        country: row.country || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at
      };

      const result = {
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          bio: user.bio,
          roles: user.roles,
          isAdmin: user.isAdmin,
          adminRole: user.adminRole,
          kycStatus: user.kycStatus,
          avatarUrl: user.avatarUrl,
          birthDate: user.birthDate,
          placeOfBirth: user.placeOfBirth,
          driverLicenseNumber: user.driverLicenseNumber,
          driverLicenseIssueDate: user.driverLicenseIssueDate,
          driverLicenseExpirationDate: user.driverLicenseExpirationDate,
          driverLicenseCategory: user.driverLicenseCategory,
          driverLicenseCountry: user.driverLicenseCountry,
          driverLicenseFilePath: user.driverLicenseFilePath,
          addressLine1: user.addressLine1,
          postalCode: user.postalCode,
          city: user.city,
          country: user.country,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        error: null
      };

      return result;
    } catch {
      return { data: null, error: 'Erreur inattendue lors de la récupération du profil' };
    }
  }

  /**
   * Récupère le profil d'un utilisateur par son ID
   */
  static async getUserProfile(userId: string): Promise<{ data: User | null; error: string | null }> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      if (!profile) {
        return { data: null, error: 'Profil non trouvé' };
      }

      const user: User = {
        id: profile.id,
        email: profile.email || '',
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || undefined,
        bio: profile.bio || undefined,
        roles: rolesFromProfile(profile),
        isAdmin: profile.is_admin === true,
        adminRole: profile.admin_role ?? null,
        kycStatus: profile.kyc_status || 'pending',
        avatarUrl: profile.avatar_url || undefined,
        birthDate: profile.birthdate || undefined,
        placeOfBirth: profile.place_of_birth || undefined,
        driverLicenseNumber: profile.driver_license_number || undefined,
        driverLicenseIssueDate: profile.driver_license_issue_date || undefined,
        driverLicenseExpirationDate: profile.driver_license_expiration_date || undefined,
        driverLicenseCategory: profile.driver_license_category || undefined,
        driverLicenseCountry: profile.driver_license_country || undefined,
        driverLicenseFilePath: profile.driver_license_file_path || undefined,
        addressLine1: profile.address_line1 || undefined,
        postalCode: profile.postal_code || undefined,
        city: profile.city || undefined,
        country: profile.country || undefined,
        createdAt: profile.created_at || new Date().toISOString(),
        updatedAt: profile.updated_at || new Date().toISOString(),
      };

      return { data: user, error: null };
    } catch (error: any) {
      return { data: null, error: error.message || 'Erreur lors de la récupération du profil' };
    }
  }

  /**
   * Met à jour le profil de l'utilisateur connecté
   */
  static async updateProfile(updateData: ProfileUpdateData): Promise<{ data: User | null; error: string | null }> {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        return { data: null, error: 'Utilisateur non authentifié' };
      }

      // Préparer les données pour Supabase
      const supabaseUpdate: SupabaseProfileUpdate = {};
      
      if (updateData.firstName !== undefined) {
        supabaseUpdate.first_name = updateData.firstName;
      }
      if (updateData.lastName !== undefined) {
        supabaseUpdate.last_name = updateData.lastName;
      }
      if (updateData.phone !== undefined) {
        supabaseUpdate.phone = updateData.phone || null;
      }
      if (updateData.avatarUrl !== undefined) {
        supabaseUpdate.avatar_url = updateData.avatarUrl || null;
      }
      if (updateData.birthDate !== undefined) {
        supabaseUpdate.birthdate = updateData.birthDate || null;
      }
      if (updateData.placeOfBirth !== undefined) {
        supabaseUpdate.place_of_birth = updateData.placeOfBirth || null;
      }
      if (updateData.bio !== undefined) {
        supabaseUpdate.bio = updateData.bio || null;
      }
      if (updateData.addressLine1 !== undefined) {
        supabaseUpdate.address_line1 = updateData.addressLine1 || null;
      }
      if (updateData.postalCode !== undefined) {
        supabaseUpdate.postal_code = updateData.postalCode || null;
      }
      if (updateData.city !== undefined) {
        supabaseUpdate.city = updateData.city || null;
      }
      if (updateData.country !== undefined) {
        supabaseUpdate.country = updateData.country || null;
      }
      if (updateData.driverLicenseNumber !== undefined) {
        supabaseUpdate.driver_license_number = updateData.driverLicenseNumber || null;
      }
      if (updateData.driverLicenseIssueDate !== undefined) {
        supabaseUpdate.driver_license_issue_date = updateData.driverLicenseIssueDate || null;
      }
      if (updateData.driverLicenseExpirationDate !== undefined) {
        supabaseUpdate.driver_license_expiration_date = updateData.driverLicenseExpirationDate || null;
      }
      if (updateData.driverLicenseCategory !== undefined) {
        supabaseUpdate.driver_license_category = updateData.driverLicenseCategory || null;
      }
      if (updateData.driverLicenseCountry !== undefined) {
        supabaseUpdate.driver_license_country = updateData.driverLicenseCountry || null;
      }
      if (updateData.driverLicenseFilePath !== undefined) {
        supabaseUpdate.driver_license_file_path = updateData.driverLicenseFilePath || null;
      }

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(supabaseUpdate)
        .eq('id', authUser.id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      const user: User = {
        id: updatedProfile.id,
        email: updatedProfile.email || '',
        firstName: updatedProfile.first_name || '',
        lastName: updatedProfile.last_name || '',
        phone: updatedProfile.phone || undefined,
        bio: updatedProfile.bio || undefined,
        roles: rolesFromProfile(updatedProfile),
        isAdmin: updatedProfile.is_admin === true,
        adminRole: updatedProfile.admin_role ?? null,
        kycStatus: updatedProfile.kyc_status || 'pending',
        avatarUrl: updatedProfile.avatar_url || undefined,
        birthDate: updatedProfile.birthdate || undefined,
        placeOfBirth: updatedProfile.place_of_birth || undefined,
        driverLicenseNumber: updatedProfile.driver_license_number || undefined,
        driverLicenseIssueDate: updatedProfile.driver_license_issue_date || undefined,
        driverLicenseExpirationDate: updatedProfile.driver_license_expiration_date || undefined,
        driverLicenseCategory: updatedProfile.driver_license_category || undefined,
        driverLicenseCountry: updatedProfile.driver_license_country || undefined,
        driverLicenseFilePath: updatedProfile.driver_license_file_path || undefined,
        addressLine1: updatedProfile.address_line1 || undefined,
        postalCode: updatedProfile.postal_code || undefined,
        city: updatedProfile.city || undefined,
        country: updatedProfile.country || undefined,
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at || updatedProfile.created_at
      };

      return { data: user, error: null };
    } catch {
      return { data: null, error: 'Erreur inattendue lors de la mise à jour du profil' };
    }
  }

  /**
   * Crée un profil utilisateur lors de l'inscription
   */
  static async createUserProfile(authUserId: string, userData: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<{ data: User | null; error: string | null }> {
    try {
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          id: authUserId,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone || null,
          role: 'renter', // Rôle unique par défaut
          kyc_status: 'pending'
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      const user: User = {
        id: newProfile.id,
        email: newProfile.email || '',
        firstName: newProfile.first_name || '',
        lastName: newProfile.last_name || '',
        phone: newProfile.phone || undefined,
        bio: newProfile.bio || undefined,
        roles: rolesFromProfile(newProfile),
        isAdmin: newProfile.is_admin === true,
        adminRole: newProfile.admin_role ?? null,
        kycStatus: newProfile.kyc_status || 'pending',
        birthDate: newProfile.birthdate || undefined,
        createdAt: newProfile.created_at,
        updatedAt: newProfile.updated_at || newProfile.created_at,
      };

      return { data: user, error: null };
    } catch {
      return { data: null, error: 'Erreur inattendue lors de la création du profil' };
    }
  }

  /**
   * Upload un fichier de permis de conduire vers Supabase Storage
   */
  static async uploadDriverLicenseFile(file: File): Promise<{ data: string | null; error: string | null }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { data: null, error: 'Utilisateur non authentifié' };
      }

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-license-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`; // Pas de dossier dans le chemin

      const { data, error } = await supabase.storage
        .from('driver-licenses')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Erreur lors de l\'upload du fichier permis:', error);
        return { data: null, error: error.message };
      }

      const { data: publicUrlData } = supabase.storage
        .from('driver-licenses')
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        return { data: null, error: 'Impossible de récupérer l\'URL publique du fichier.' };
      }

      return { data: publicUrlData.publicUrl, error: null };
    } catch (error: any) {
      console.error('Erreur inattendue lors de l\'upload du fichier permis:', error);
      return { data: null, error: error.message || 'Erreur inattendue' };
    }
  }

  /**
   * Upload une image de profil vers Supabase Storage
   */
  static async uploadProfileImage(file: File): Promise<{ data: string | null; error: string | null }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { data: null, error: 'Utilisateur non authentifié' };
      }

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload le fichier
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erreur lors de l\'upload:', uploadError);
        return { data: null, error: uploadError.message };
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return { data: publicUrl, error: null };
    } catch (error) {
      console.error('Erreur inattendue:', error);
      return { data: null, error: 'Erreur inattendue lors de l\'upload de l\'image' };
    }
  }


  /**
   * Vérifie si un utilisateur a un rôle spécifique
   */
  static async hasRole(userId: string, role: string): Promise<{ hasRole: boolean; error: string | null }> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erreur lors de la vérification du rôle:', error);
        return { hasRole: false, error: error.message };
      }

      const userRole = profile.role || 'renter';
      return { hasRole: userRole === role, error: null };
    } catch (error) {
      console.error('Erreur lors de la vérification du rôle:', error);
      return { hasRole: false, error: 'Erreur lors de la vérification du rôle' };
    }
  }

  /**
   * Met à jour le rôle d'un utilisateur (remplace le rôle actuel)
   */
  static async updateUserRole(userId: string, newRole: string): Promise<{ data: User | null; error: string | null }> {
    try {
      // Mettre à jour le profil avec le nouveau rôle
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Erreur lors de la mise à jour du rôle:', updateError);
        return { data: null, error: updateError.message };
      }

      // Convertir le format Supabase vers le format de l'application
          const user: User = {
            id: updatedProfile.id,
            email: updatedProfile.email || '',
            firstName: updatedProfile.first_name || '',
            lastName: updatedProfile.last_name || '',
            phone: updatedProfile.phone || undefined,
            bio: updatedProfile.bio || undefined,
            roles: updatedProfile.role ? [updatedProfile.role] : ['renter'], // Convertir le rôle unique en tableau pour compatibilité
            kycStatus: updatedProfile.kyc_status || 'pending',
        avatarUrl: updatedProfile.avatar_url || undefined,
        birthDate: updatedProfile.birthdate || undefined,
        placeOfBirth: updatedProfile.place_of_birth || undefined,
        driverLicenseNumber: updatedProfile.driver_license_number || undefined,
        driverLicenseIssueDate: updatedProfile.driver_license_issue_date || undefined,
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at || updatedProfile.created_at
      };

      return { data: user, error: null };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rôle:', error);
      return { data: null, error: 'Erreur lors de la mise à jour du rôle' };
    }
  }
}
