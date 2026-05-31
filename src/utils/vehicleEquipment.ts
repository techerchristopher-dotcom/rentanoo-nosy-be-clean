import {
  Wind,
  Navigation,
  Gauge,
  Volume2,
  Bluetooth,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export interface CarEquipmentDisplay {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

export interface CarEquipmentSource {
  hasAC?: boolean;
  hasGPS?: boolean;
  hasCruiseControl?: boolean;
  hasBluetooth?: boolean;
  hasCarPlay?: boolean;
  hasAudioInput?: boolean;
}

const CAR_EQUIPMENT_DEFS: Array<CarEquipmentDisplay & { field: keyof CarEquipmentSource }> = [
  { key: "hasAC", field: "hasAC", label: "Climatisation", icon: Wind, color: "text-blue-500" },
  { key: "hasGPS", field: "hasGPS", label: "GPS", icon: Navigation, color: "text-green-500" },
  { key: "hasCruiseControl", field: "hasCruiseControl", label: "Régulateur", icon: Gauge, color: "text-purple-500" },
  { key: "hasAudioInput", field: "hasAudioInput", label: "Audio/iPod", icon: Volume2, color: "text-orange-500" },
  { key: "hasBluetooth", field: "hasBluetooth", label: "Bluetooth", icon: Bluetooth, color: "text-blue-600" },
  { key: "hasCarPlay", field: "hasCarPlay", label: "CarPlay", icon: Smartphone, color: "text-gray-600" },
];

export function mapSupabaseEquipment(source: {
  has_ac?: boolean | null;
  has_gps?: boolean | null;
  has_cruise_control?: boolean | null;
  has_bluetooth?: boolean | null;
  has_carplay?: boolean | null;
  has_audio_input?: boolean | null;
}): CarEquipmentSource {
  return {
    hasAC: source.has_ac ?? false,
    hasGPS: source.has_gps ?? false,
    hasCruiseControl: source.has_cruise_control ?? false,
    hasBluetooth: source.has_bluetooth ?? false,
    hasCarPlay: source.has_carplay ?? false,
    hasAudioInput: source.has_audio_input ?? false,
  };
}

export function getCarEquipmentItems(source: CarEquipmentSource): CarEquipmentDisplay[] {
  return CAR_EQUIPMENT_DEFS.filter((item) => source[item.field]).map(
    ({ key, label, icon, color }) => ({ key, label, icon, color })
  );
}
