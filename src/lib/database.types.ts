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
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          phone_number?: string | null
          location?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          phone_number?: string | null
          location?: string | null
          role?: string
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
