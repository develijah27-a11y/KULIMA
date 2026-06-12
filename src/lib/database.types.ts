export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          phone_number: string | null
          location: string | null
          district: string | null
          role: string
          roles: string[]
          latitude: number | null
          longitude: number | null
          primary_crop: string | null
          verification_level: string | null
          trust_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          phone_number?: string | null
          location?: string | null
          district?: string | null
          role?: string
          roles?: string[]
          latitude?: number | null
          longitude?: number | null
          primary_crop?: string | null
          verification_level?: string | null
          trust_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          phone_number?: string | null
          location?: string | null
          district?: string | null
          role?: string
          roles?: string[]
          latitude?: number | null
          longitude?: number | null
          primary_crop?: string | null
          verification_level?: string | null
          trust_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      farms: {
        Row: {
          id: string
          user_id: string
          name: string
          location: string
          size_hectares: number | null
          farm_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          location: string
          size_hectares?: number | null
          farm_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          location?: string
          size_hectares?: number | null
          farm_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farms_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      crops: {
        Row: {
          id: string
          farm_id: string
          crop_name: string
          variety: string | null
          planting_date: string | null
          expected_harvest_date: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          farm_id: string
          crop_name: string
          variety?: string | null
          planting_date?: string | null
          expected_harvest_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          farm_id?: string
          crop_name?: string
          variety?: string | null
          planting_date?: string | null
          expected_harvest_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crops_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          }
        ]
      }
      soil_reports: {
        Row: {
          id: string
          farm_id: string
          ph_level: number
          nitrogen: number
          phosphorus: number
          potassium: number
          organic_matter: number | null
          recommendations: string | null
          created_at: string
        }
        Insert: {
          id?: string
          farm_id: string
          ph_level: number
          nitrogen: number
          phosphorus: number
          potassium: number
          organic_matter?: number | null
          recommendations?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          farm_id?: string
          ph_level?: number
          nitrogen?: number
          phosphorus?: number
          potassium?: number
          organic_matter?: number | null
          recommendations?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "soil_reports_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          }
        ]
      }
      disease_scans: {
        Row: {
          id: string
          farm_id: string
          crop_type: string
          image_url: string
          disease_detected: string | null
          confidence_score: number | null
          treatment_recommendations: string | null
          created_at: string
        }
        Insert: {
          id?: string
          farm_id: string
          crop_type: string
          image_url: string
          disease_detected?: string | null
          confidence_score?: number | null
          treatment_recommendations?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          farm_id?: string
          crop_type?: string
          image_url?: string
          disease_detected?: string | null
          confidence_score?: number | null
          treatment_recommendations?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disease_scans_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          }
        ]
      }
      weather_logs: {
        Row: {
          id: string
          farm_id: string
          temperature: number
          humidity: number
          rainfall: number
          wind_speed: number | null
          conditions: string | null
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          farm_id: string
          temperature: number
          humidity: number
          rainfall?: number
          wind_speed?: number | null
          conditions?: string | null
          recorded_at: string
          created_at?: string
        }
        Update: {
          id?: string
          farm_id?: string
          temperature?: number
          humidity?: number
          rainfall?: number
          wind_speed?: number | null
          conditions?: string | null
          recorded_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_logs_farm_id_fkey"
            columns: ["farm_id"]
            referencedRelation: "farms"
            referencedColumns: ["id"]
          }
        ]
      }
      listings: {
        Row: {
          id: string
          farmer_id: string
          crop_type: string
          quantity_kg: number
          asking_price: number
          available_from: string
          district: string
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          farmer_id: string
          crop_type: string
          quantity_kg: number
          asking_price: number
          available_from: string
          district: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          farmer_id?: string
          crop_type?: string
          quantity_kg?: number
          asking_price?: number
          available_from?: string
          district?: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_farmer_id_fkey"
            columns: ["farmer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      offers: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          offered_price: number
          status: string
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          buyer_id: string
          offered_price: number
          status?: string
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          buyer_id?: string
          offered_price?: number
          status?: string
          message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          farmer_id: string
          type: string
          title: string
          body: string
          read: boolean
          sent_at: string
          created_at: string
        }
        Insert: {
          id?: string
          farmer_id: string
          type: string
          title: string
          body: string
          read?: boolean
          sent_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          farmer_id?: string
          type?: string
          title?: string
          body?: string
          read?: boolean
          sent_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_farmer_id_fkey"
            columns: ["farmer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      market_prices: {
        Row: {
          id: string
          crop_type: string
          price_per_kg: number
          market_name: string
          district: string
          recorded_at: string
          source: string | null
          created_at: string
          change_percent: number | null
        }
        Insert: {
          id?: string
          crop_type: string
          price_per_kg: number
          market_name: string
          district: string
          recorded_at: string
          source?: string | null
          created_at?: string
          change_percent?: number | null
        }
        Update: {
          id?: string
          crop_type?: string
          price_per_kg?: number
          market_name?: string
          district?: string
          recorded_at?: string
          source?: string | null
          created_at?: string
          change_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_market_name_fkey"
            columns: ["market_name"]
            referencedRelation: "markets"
            referencedColumns: ["name"]
          }
        ]
      }
      weather_cache: {
        Row: {
          location_key: string
          data: Json
          cached_at: string
        }
        Insert: {
          location_key: string
          data: Json
          cached_at?: string
        }
        Update: {
          location_key?: string
          data?: Json
          cached_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_cache_location_key_fkey"
            columns: ["location_key"]
            referencedRelation: "locations"
            referencedColumns: ["key"]
          }
        ]
      }
      loan_profiles: {
        Row: {
          id: string
          farmer_id: string
          score: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          farmer_id: string
          score: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          farmer_id?: string
          score?: number
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_profiles_farmer_id_fkey"
            columns: ["farmer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      diagnoses: {
        Row: {
          id: string
          farmer_id: string
          disease_name: string
          severity: string
          treatment: string[]
          created_at: string
        }
        Insert: {
          id?: string
          farmer_id: string
          disease_name: string
          severity: string
          treatment: string[]
          created_at?: string
        }
        Update: {
          id?: string
          farmer_id?: string
          disease_name?: string
          severity?: string
          treatment?: string[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_farmer_id_fkey"
            columns: ["farmer_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
