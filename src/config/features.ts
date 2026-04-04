/**
 * Feature flags configuration
 * Modify these values to enable/disable features
 */

export const FEATURE_FLAGS = {
  /**
   * MVP: pickup location disabled until hotel partnerships
   * Controls the display and behavior of the "Lieu de prise en charge" search block
   */
  PICKUP_LOCATION_ENABLED: false,

  /**
   * MVP: profile sections
   * Controls visibility of Address and Driving licence sections in /profile
   */
  PROFILE_ADDRESS_ENABLED: false,
  PROFILE_DRIVING_LICENSE_ENABLED: false,
} as const;

/**
 * Simplified feature flags for UI usage
 */
export const FEATURES = {
  pickupLocationEnabled: FEATURE_FLAGS.PICKUP_LOCATION_ENABLED,
  profileAddressEnabled: FEATURE_FLAGS.PROFILE_ADDRESS_ENABLED,
  profileDrivingLicenseEnabled: FEATURE_FLAGS.PROFILE_DRIVING_LICENSE_ENABLED,
} as const;
