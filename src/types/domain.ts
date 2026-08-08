
// Types for Cropify-specific tables — extend with DB types generated after migration

export interface MarketPrice {
  id: string;
  cropType: string;
  pricePerKg: number;
  marketName: string;
  district: string;
  recordedAt: string;
  source?: string;
  createdAt?: string;
  changePercent?: number;
}

export interface Listing {
  id: string;
  farmerId: string;
  cropType: string;
  quantityKg: number;
  askingPrice: number;
  availableFrom: string;
  district: string;
  status: 'active' | 'sold' | 'expired' | 'pending_sync';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  farmerName?: string;
  offerCount?: number;
}

export interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  offeredPrice: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  message?: string;
  createdAt: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerRating?: number;
  buyerVerified?: boolean;
}

export interface Notification {
  id: string;
  farmerId: string;
  type: 'rain' | 'price' | 'pest' | 'offer' | 'loan' | 'system';
  title: string;
  body: string;
  read: boolean;
  sentAt: string;
  createdAt?: string;
}

export interface CropCycle {
  id: string;
  farmId: string;
  cropType: string;
  plantingDate: string;
  expectedHarvest: string;
  actualHarvest?: string;
  yieldKg?: number;
  status: 'planned' | 'planted' | 'growing' | 'harvested' | 'failed';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Farmer {
  id: string;
  userId: string;
  fullName: string;
  phoneNumber?: string;
  location?: string;
  primaryCrop?: string;
  createdAt: string;
  updatedAt?: string;
}
