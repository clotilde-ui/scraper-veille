// ============================================
// Types générés pour Supabase Database
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================
// Enums Database
// ============================================

export type DbTeamType = string;
export type DbAgencyType = 'Lets Clic' | 'Deuxio' | 'WEDIG';
export type DbSubscriptionType = 'mensuel' | 'annuel';
export type DbCurrencyType = 'EUR' | 'USD';
export type DbExpertType = 'SEO' | 'SEA' | 'WEB' | 'SMA' | 'GROWTH' | 'CTO' | 'MANAGER' | 'CHEF_DE_PROJET' | 'TEAM_LEADER' | 'REDACTEUR';
export type DbLlmProvider = 'chatgpt' | 'claude' | 'gemini' | 'grok' | 'deepseek' | 'kimi';
export type DbVisibilityStatus = 'unknown' | 'not_found' | 'partial' | 'good' | 'excellent';
export type DbPermissionAction = 'view' | 'create' | 'edit' | 'delete';
export type DbAppModule = 'dashboard' | 'outils' | 'analytics' | 'llms' | 'utilisateurs' | 'roles' | 'leads' | 'lp_ia' | 'outils_web' | 'projets' | 'roadmap_cto' | 'work_management' | 'budgets' | 'activite' | 'parametres' | 'renouvellements' | 'sonate_chat' | 'sonate_chat_actions' | 'sonate_chat_portefeuilles' | 'sonate_chat_equipes' | 'sonate_chat_canaux_clients' | 'sonate_chat_creer_space' | 'sonate_chat_sections' | 'sonate_chat_renommer';
export type DbLeadStatus = 'nouveau' | 'qualifie' | 'converti' | 'perdu';

// ============================================
// Database Schema Types
// ============================================

export interface Database {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          color?: string;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          id: string;
          role_id: string;
          module: DbAppModule;
          actions: DbPermissionAction[];
          created_at: string;
        };
        Insert: {
          id?: string;
          role_id: string;
          module: DbAppModule;
          actions?: DbPermissionAction[];
          created_at?: string;
        };
        Update: {
          id?: string;
          role_id?: string;
          module?: DbAppModule;
          actions?: DbPermissionAction[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          }
        ];
      };
      users: {
        Row: {
          id: string;
          auth_id: string | null;
          email: string;
          first_name: string;
          last_name: string;
          role_id: string | null;
          agency: DbAgencyType;
          teams: DbTeamType[];
          avatar_url: string | null;
          is_active: boolean;
          is_favorite: boolean;
          last_login: string | null;
          phone: string | null;
          job_title: string | null;
          bio: string | null;
          linkedin_url: string | null;
          slack_username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id?: string | null;
          email: string;
          first_name: string;
          last_name: string;
          role_id?: string | null;
          agency: DbAgencyType;
          teams?: DbTeamType[];
          avatar_url?: string | null;
          is_active?: boolean;
          is_favorite?: boolean;
          last_login?: string | null;
          phone?: string | null;
          job_title?: string | null;
          bio?: string | null;
          linkedin_url?: string | null;
          slack_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string | null;
          email?: string;
          first_name?: string;
          last_name?: string;
          role_id?: string | null;
          agency?: DbAgencyType;
          teams?: DbTeamType[];
          avatar_url?: string | null;
          is_active?: boolean;
          is_favorite?: boolean;
          last_login?: string | null;
          phone?: string | null;
          job_title?: string | null;
          bio?: string | null;
          linkedin_url?: string | null;
          slack_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_role_id_fkey';
            columns: ['role_id'];
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          }
        ];
      };
      tools: {
        Row: {
          id: string;
          name: string;
          price: number;
          currency: DbCurrencyType;
          teams: DbTeamType[];
          expert_type: DbExpertType | null;
          expert_name: string | null;
          subscription_type: DbSubscriptionType;
          agencies: DbAgencyType[];
          description: string | null;
          url: string | null;
          logo: string | null;
          is_agency_license: boolean;
          status: string;
          category: string | null;
          renewal_date: string | null;
          total_seats: number | null;
          used_seats: number | null;
          notes: string | null;
          is_favorite: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price?: number;
          currency?: DbCurrencyType;
          teams?: DbTeamType[];
          expert_type?: DbExpertType | null;
          expert_name?: string | null;
          subscription_type?: DbSubscriptionType;
          agencies?: DbAgencyType[];
          description?: string | null;
          url?: string | null;
          logo?: string | null;
          is_agency_license?: boolean;
          status?: string;
          category?: string | null;
          renewal_date?: string | null;
          total_seats?: number | null;
          used_seats?: number | null;
          notes?: string | null;
          is_favorite?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          currency?: DbCurrencyType;
          teams?: DbTeamType[];
          expert_type?: DbExpertType | null;
          expert_name?: string | null;
          subscription_type?: DbSubscriptionType;
          agencies?: DbAgencyType[];
          description?: string | null;
          url?: string | null;
          logo?: string | null;
          is_agency_license?: boolean;
          status?: string;
          category?: string | null;
          renewal_date?: string | null;
          total_seats?: number | null;
          used_seats?: number | null;
          notes?: string | null;
          is_favorite?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tools_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      websites: {
        Row: {
          id: string;
          url: string;
          name: string;
          agency: DbAgencyType;
          category: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          url: string;
          name: string;
          agency: DbAgencyType;
          category?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          name?: string;
          agency?: DbAgencyType;
          category?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'websites_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      llm_analyses: {
        Row: {
          id: string;
          website_id: string;
          llm: DbLlmProvider;
          status: DbVisibilityStatus;
          score: number;
          summary: string | null;
          strengths: string[] | null;
          weaknesses: string[] | null;
          recommendations: string[] | null;
          last_checked: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          website_id: string;
          llm: DbLlmProvider;
          status?: DbVisibilityStatus;
          score?: number;
          summary?: string | null;
          strengths?: string[] | null;
          weaknesses?: string[] | null;
          recommendations?: string[] | null;
          last_checked?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          website_id?: string;
          llm?: DbLlmProvider;
          status?: DbVisibilityStatus;
          score?: number;
          summary?: string | null;
          strengths?: string[] | null;
          weaknesses?: string[] | null;
          recommendations?: string[] | null;
          last_checked?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'llm_analyses_website_id_fkey';
            columns: ['website_id'];
            referencedRelation: 'websites';
            referencedColumns: ['id'];
          }
        ];
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_logs_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          agency: DbAgencyType;
          address: string | null;
          website: string | null;
          sector: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          agency: DbAgencyType;
          address?: string | null;
          website?: string | null;
          sector?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          agency?: DbAgencyType;
          address?: string | null;
          website?: string | null;
          sector?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'clients_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      lead_sources: {
        Row: {
          id: string;
          name: string;
          is_default: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_default?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_default?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_sources_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          label: string;
          color: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          label: string;
          color?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          label?: string;
          color?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_budgets: {
        Row: {
          id: string;
          team: DbTeamType;
          max_budget: number;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team: DbTeamType;
          max_budget?: number;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team?: DbTeamType;
          max_budget?: number;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'team_budgets_updated_by_fkey';
            columns: ['updated_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      leads: {
        Row: {
          id: string;
          date: string;
          source_id: string;
          client_id: string | null;
          campaign: string | null;
          agency: DbAgencyType;
          is_gmb: boolean;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          status: DbLeadStatus;
          amount: number;
          notes: string | null;
          assigned_to: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          is_favorite: boolean;
          priority: string;
        };
        Insert: {
          id?: string;
          date: string;
          source_id: string;
          client_id?: string | null;
          campaign?: string | null;
          agency: DbAgencyType;
          is_gmb?: boolean;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          status?: DbLeadStatus;
          amount?: number;
          notes?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          is_favorite?: boolean;
          priority?: string;
        };
        Update: {
          id?: string;
          date?: string;
          source_id?: string;
          client_id?: string | null;
          campaign?: string | null;
          agency?: DbAgencyType;
          is_gmb?: boolean;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          status?: DbLeadStatus;
          amount?: number;
          notes?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          is_favorite?: boolean;
          priority?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leads_source_id_fkey';
            columns: ['source_id'];
            referencedRelation: 'lead_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_client_id_fkey';
            columns: ['client_id'];
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leads_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      // ============================================
      // LP IA Tables
      // ============================================
      landing_pages: {
        Row: {
          id: string;
          name: string;
          client_name: string;
          lp_type: string;
          domain: string | null;
          deployment_server: string | null;
          status: string;
          additional_info: string | null;
          deployment_url: string | null;
          deployment_id: string | null;
          html_content: string | null;
          css_content: string | null;
          grapesjs_state: Json | null;
          meta_title: string | null;
          meta_description: string | null;
          favicon_url: string | null;
          og_image_url: string | null;
          design_tokens: Json | null;
          tracking_config: Json | null;
          custom_scripts: Json | null;
          seo_config: Json | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          client_name: string;
          lp_type?: string;
          domain?: string | null;
          deployment_server?: string | null;
          status?: string;
          additional_info?: string | null;
          deployment_url?: string | null;
          deployment_id?: string | null;
          html_content?: string | null;
          css_content?: string | null;
          grapesjs_state?: Json | null;
          meta_title?: string | null;
          meta_description?: string | null;
          favicon_url?: string | null;
          og_image_url?: string | null;
          design_tokens?: Json | null;
          tracking_config?: Json | null;
          custom_scripts?: Json | null;
          seo_config?: Json | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          client_name?: string;
          lp_type?: string;
          domain?: string | null;
          deployment_server?: string | null;
          status?: string;
          additional_info?: string | null;
          deployment_url?: string | null;
          deployment_id?: string | null;
          html_content?: string | null;
          css_content?: string | null;
          grapesjs_state?: Json | null;
          meta_title?: string | null;
          meta_description?: string | null;
          favicon_url?: string | null;
          og_image_url?: string | null;
          design_tokens?: Json | null;
          tracking_config?: Json | null;
          custom_scripts?: Json | null;
          seo_config?: Json | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'landing_pages_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      lp_files: {
        Row: {
          id: string;
          landing_page_id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          landing_page_id: string;
          file_name: string;
          file_path: string;
          file_size?: number;
          file_type?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          landing_page_id?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lp_files_landing_page_id_fkey';
            columns: ['landing_page_id'];
            referencedRelation: 'landing_pages';
            referencedColumns: ['id'];
          }
        ];
      };
      lp_conversations: {
        Row: {
          id: string;
          landing_page_id: string;
          title: string;
          status: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          landing_page_id: string;
          title?: string;
          status?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          landing_page_id?: string;
          title?: string;
          status?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lp_conversations_landing_page_id_fkey';
            columns: ['landing_page_id'];
            referencedRelation: 'landing_pages';
            referencedColumns: ['id'];
          }
        ];
      };
      lp_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role?: string;
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: string;
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lp_messages_conversation_id_fkey';
            columns: ['conversation_id'];
            referencedRelation: 'lp_conversations';
            referencedColumns: ['id'];
          }
        ];
      };
      lp_alerts: {
        Row: {
          id: string;
          landing_page_id: string;
          conversation_id: string | null;
          alert_type: string;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          landing_page_id: string;
          conversation_id?: string | null;
          alert_type?: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          landing_page_id?: string;
          conversation_id?: string | null;
          alert_type?: string;
          message?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lp_alerts_landing_page_id_fkey';
            columns: ['landing_page_id'];
            referencedRelation: 'landing_pages';
            referencedColumns: ['id'];
          }
        ];
      };
      scrape_jobs: {
        Row: {
          id: string;
          name: string;
          status: string;
          scrape_type: string;
          crawl_depth: number;
          keywords: string[] | null;
          total_urls: number;
          completed_urls: number;
          failed_urls: number;
          total_results: number;
          error_message: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          status?: string;
          scrape_type?: string;
          crawl_depth?: number;
          keywords?: string[] | null;
          total_urls?: number;
          completed_urls?: number;
          failed_urls?: number;
          total_results?: number;
          error_message?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          status?: string;
          scrape_type?: string;
          crawl_depth?: number;
          keywords?: string[] | null;
          total_urls?: number;
          completed_urls?: number;
          failed_urls?: number;
          total_results?: number;
          error_message?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scrape_jobs_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      scrape_urls: {
        Row: {
          id: string;
          job_id: string;
          url: string;
          status: string;
          depth: number;
          parent_url_id: string | null;
          http_status: number | null;
          error_message: string | null;
          page_title: string | null;
          scraped_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          url: string;
          status?: string;
          depth?: number;
          parent_url_id?: string | null;
          http_status?: number | null;
          error_message?: string | null;
          page_title?: string | null;
          scraped_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          url?: string;
          status?: string;
          depth?: number;
          parent_url_id?: string | null;
          http_status?: number | null;
          error_message?: string | null;
          page_title?: string | null;
          scraped_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scrape_urls_job_id_fkey';
            columns: ['job_id'];
            referencedRelation: 'scrape_jobs';
            referencedColumns: ['id'];
          }
        ];
      };
      scrape_results: {
        Row: {
          id: string;
          job_id: string;
          url_id: string;
          source_url: string | null;
          result_type: string;
          value: string;
          label: string | null;
          context: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          url_id: string;
          source_url?: string | null;
          result_type: string;
          value: string;
          label?: string | null;
          context?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          url_id?: string;
          source_url?: string | null;
          result_type?: string;
          value?: string;
          label?: string | null;
          context?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scrape_results_job_id_fkey';
            columns: ['job_id'];
            referencedRelation: 'scrape_jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scrape_results_url_id_fkey';
            columns: ['url_id'];
            referencedRelation: 'scrape_urls';
            referencedColumns: ['id'];
          }
        ];
      };
      // ============================================
      // Roadmap CTO
      // ============================================
      roadmap_items: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          item_type: string;
          status: string;
          priority: string;
          start_date: string | null;
          due_date: string | null;
          completed_date: string | null;
          agency: string | null;
          project_name: string | null;
          environment: string | null;
          stack: string | null;
          hebergeur: string | null;
          assigned_to: string | null;
          created_by: string | null;
          tags: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          item_type?: string;
          status?: string;
          priority?: string;
          start_date?: string | null;
          due_date?: string | null;
          completed_date?: string | null;
          agency?: string | null;
          project_name?: string | null;
          environment?: string | null;
          stack?: string | null;
          hebergeur?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          tags?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          item_type?: string;
          status?: string;
          priority?: string;
          start_date?: string | null;
          due_date?: string | null;
          completed_date?: string | null;
          agency?: string | null;
          project_name?: string | null;
          environment?: string | null;
          stack?: string | null;
          hebergeur?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          tags?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'roadmap_items_assigned_to_fkey';
            columns: ['assigned_to'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'roadmap_items_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      // ============================================
      // Projets Tables
      // ============================================
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string;
          status: string;
          owner_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          color?: string;
          status?: string;
          owner_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          status?: string;
          owner_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      project_groups: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          color: string;
          position: number;
          is_collapsed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          color?: string;
          position?: number;
          is_collapsed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          color?: string;
          position?: number;
          is_collapsed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_groups_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          }
        ];
      };
      project_columns: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          column_type: string;
          position: number;
          is_visible: boolean;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          column_type?: string;
          position?: number;
          is_visible?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          column_type?: string;
          position?: number;
          is_visible?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_columns_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          }
        ];
      };
      project_tasks: {
        Row: {
          id: string;
          project_id: string;
          group_id: string;
          parent_task_id: string | null;
          name: string;
          description: string | null;
          status: string;
          priority: string;
          assigned_to: string | null;
          due_date: string | null;
          start_date: string | null;
          position: number;
          column_values: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          group_id: string;
          parent_task_id?: string | null;
          name: string;
          description?: string | null;
          status?: string;
          priority?: string;
          assigned_to?: string | null;
          due_date?: string | null;
          start_date?: string | null;
          position?: number;
          column_values?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          group_id?: string;
          parent_task_id?: string | null;
          name?: string;
          description?: string | null;
          status?: string;
          priority?: string;
          assigned_to?: string | null;
          due_date?: string | null;
          start_date?: string | null;
          position?: number;
          column_values?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_tasks_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_tasks_group_id_fkey';
            columns: ['group_id'];
            referencedRelation: 'project_groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_tasks_parent_task_id_fkey';
            columns: ['parent_task_id'];
            referencedRelation: 'project_tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_tasks_assigned_to_fkey';
            columns: ['assigned_to'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_tasks_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      project_comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string | null;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id?: string | null;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string | null;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_comments_task_id_fkey';
            columns: ['task_id'];
            referencedRelation: 'project_tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_comments_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_current_user_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_current_user_role_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      has_permission: {
        Args: {
          module_name: DbAppModule;
          action_name: DbPermissionAction;
        };
        Returns: boolean;
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_admin_or_super: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      agency_type: DbAgencyType;
      subscription_type: DbSubscriptionType;
      currency_type: DbCurrencyType;
      expert_type: DbExpertType;
      llm_provider: DbLlmProvider;
      visibility_status: DbVisibilityStatus;
      permission_action: DbPermissionAction;
      app_module: DbAppModule;
      lead_status: DbLeadStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ============================================
// Type helpers
// ============================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

// ============================================
// Convenience types
// ============================================

export type DbRole = Tables<'roles'>;
export type DbRoleInsert = TablesInsert<'roles'>;
export type DbRoleUpdate = TablesUpdate<'roles'>;

export type DbRolePermission = Tables<'role_permissions'>;
export type DbRolePermissionInsert = TablesInsert<'role_permissions'>;
export type DbRolePermissionUpdate = TablesUpdate<'role_permissions'>;

export type DbUser = Tables<'users'>;
export type DbUserInsert = TablesInsert<'users'>;
export type DbUserUpdate = TablesUpdate<'users'>;

export type DbTool = Tables<'tools'>;
export type DbToolInsert = TablesInsert<'tools'>;
export type DbToolUpdate = TablesUpdate<'tools'>;

export type DbWebsite = Tables<'websites'>;
export type DbWebsiteInsert = TablesInsert<'websites'>;
export type DbWebsiteUpdate = TablesUpdate<'websites'>;

export type DbLlmAnalysis = Tables<'llm_analyses'>;
export type DbLlmAnalysisInsert = TablesInsert<'llm_analyses'>;
export type DbLlmAnalysisUpdate = TablesUpdate<'llm_analyses'>;

export type DbActivityLog = Tables<'activity_logs'>;
export type DbActivityLogInsert = TablesInsert<'activity_logs'>;

// ============================================
// Extended types avec relations
// ============================================

export type DbRoleWithPermissions = DbRole & {
  role_permissions: DbRolePermission[];
};

export type DbUserWithRole = DbUser & {
  roles: DbRole | null;
};

export type DbWebsiteWithAnalyses = DbWebsite & {
  llm_analyses: DbLlmAnalysis[];
};

export type DbToolWithCreator = DbTool & {
  users: Pick<DbUser, 'id' | 'first_name' | 'last_name' | 'email'> | null;
};

export type DbTeam = Tables<'teams'>;
export type DbTeamInsert = TablesInsert<'teams'>;
export type DbTeamUpdate = TablesUpdate<'teams'>;

export type DbTeamBudget = Tables<'team_budgets'>;
export type DbTeamBudgetInsert = TablesInsert<'team_budgets'>;
export type DbTeamBudgetUpdate = TablesUpdate<'team_budgets'>;

export type DbLeadSource = Tables<'lead_sources'>;
export type DbLeadSourceInsert = TablesInsert<'lead_sources'>;

export type DbLead = Tables<'leads'>;
export type DbLeadInsert = TablesInsert<'leads'>;
export type DbLeadUpdate = TablesUpdate<'leads'>;

export type DbClient = Tables<'clients'>;
export type DbClientInsert = TablesInsert<'clients'>;
export type DbClientUpdate = TablesUpdate<'clients'>;

export type DbLeadWithSource = DbLead & {
  lead_sources: DbLeadSource;
  clients: DbClient | null;
  assigned_user: Pick<DbUser, 'id' | 'first_name' | 'last_name'> | null;
};

export type DbActivityLogWithUser = DbActivityLog & {
  users: Pick<DbUser, 'id' | 'first_name' | 'last_name' | 'email'> | null;
};

// LP IA
export type DbLandingPage = Tables<'landing_pages'>;
export type DbLandingPageInsert = TablesInsert<'landing_pages'>;
export type DbLandingPageUpdate = TablesUpdate<'landing_pages'>;

export type DbLpFile = Tables<'lp_files'>;
export type DbLpFileInsert = TablesInsert<'lp_files'>;

export type DbLpConversation = Tables<'lp_conversations'>;
export type DbLpConversationInsert = TablesInsert<'lp_conversations'>;

export type DbLpMessage = Tables<'lp_messages'>;
export type DbLpMessageInsert = TablesInsert<'lp_messages'>;

export type DbLpAlert = Tables<'lp_alerts'>;
export type DbLpAlertInsert = TablesInsert<'lp_alerts'>;
export type DbLpAlertUpdate = TablesUpdate<'lp_alerts'>;

export type DbLandingPageWithCreator = DbLandingPage & {
  users: Pick<DbUser, 'id' | 'first_name' | 'last_name' | 'email'> | null;
};

export type DbLpConversationWithMessages = DbLpConversation & {
  lp_messages: DbLpMessage[];
};

// Outils Web (Scraper)
export type DbScrapeJob = Tables<'scrape_jobs'>;
export type DbScrapeJobInsert = TablesInsert<'scrape_jobs'>;
export type DbScrapeJobUpdate = TablesUpdate<'scrape_jobs'>;

export type DbScrapeUrl = Tables<'scrape_urls'>;
export type DbScrapeUrlInsert = TablesInsert<'scrape_urls'>;
export type DbScrapeUrlUpdate = TablesUpdate<'scrape_urls'>;

export type DbScrapeResult = Tables<'scrape_results'>;
export type DbScrapeResultInsert = TablesInsert<'scrape_results'>;

export type DbScrapeJobWithCreator = DbScrapeJob & {
  users: Pick<DbUser, 'id' | 'first_name' | 'last_name' | 'email'> | null;
};

// Roadmap CTO
export type DbRoadmapItem = Tables<'roadmap_items'>;
export type DbRoadmapItemInsert = TablesInsert<'roadmap_items'>;
export type DbRoadmapItemUpdate = TablesUpdate<'roadmap_items'>;

export type DbRoadmapItemWithAssignee = DbRoadmapItem & {
  assigned_user: Pick<DbUser, 'id' | 'first_name' | 'last_name' | 'email'> | null;
  creator: Pick<DbUser, 'id' | 'first_name' | 'last_name'> | null;
};

// Projets
export type DbProject = Tables<'projects'>;
export type DbProjectInsert = TablesInsert<'projects'>;
export type DbProjectUpdate = TablesUpdate<'projects'>;

export type DbProjectGroup = Tables<'project_groups'>;
export type DbProjectGroupInsert = TablesInsert<'project_groups'>;
export type DbProjectGroupUpdate = TablesUpdate<'project_groups'>;

export type DbProjectColumn = Tables<'project_columns'>;
export type DbProjectColumnInsert = TablesInsert<'project_columns'>;
export type DbProjectColumnUpdate = TablesUpdate<'project_columns'>;

export type DbProjectTask = Tables<'project_tasks'>;
export type DbProjectTaskInsert = TablesInsert<'project_tasks'>;
export type DbProjectTaskUpdate = TablesUpdate<'project_tasks'>;

export type DbProjectComment = Tables<'project_comments'>;
export type DbProjectCommentInsert = TablesInsert<'project_comments'>;
export type DbProjectCommentUpdate = TablesUpdate<'project_comments'>;

export type DbProjectWithOwner = DbProject & {
  owner: Pick<DbUser, 'id' | 'first_name' | 'last_name' | 'email'> | null;
  creator: Pick<DbUser, 'id' | 'first_name' | 'last_name'> | null;
};

export type DbProjectTaskWithAssignee = DbProjectTask & {
  assigned_user: Pick<DbUser, 'id' | 'first_name' | 'last_name' | 'email'> | null;
};

export type DbProjectCommentWithUser = DbProjectComment & {
  users: Pick<DbUser, 'id' | 'first_name' | 'last_name' | 'email'> | null;
};

// Work Management
export interface DbWmWorkspace {
  id: string;
  name: string;
  color: string;
  icon: string;
  position: number;
  client_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
export type DbWmWorkspaceInsert = Partial<DbWmWorkspace> & { name: string };
export type DbWmWorkspaceUpdate = Partial<DbWmWorkspace>;

export interface DbWmBoard {
  id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  color: string;
  default_view: string;
  board_type: string;
  position: number;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
export type DbWmBoardInsert = Partial<DbWmBoard> & { name: string };
export type DbWmBoardUpdate = Partial<DbWmBoard>;

export interface DbWmColumn {
  id: string;
  board_id: string;
  name: string;
  type: string;
  options: Record<string, unknown>;
  position: number;
  width: number;
  is_hidden: boolean;
  created_at: string;
}
export type DbWmColumnInsert = Partial<DbWmColumn> & { board_id: string; name: string; type: string };
export type DbWmColumnUpdate = Partial<DbWmColumn>;

export interface DbWmGroup {
  id: string;
  board_id: string;
  name: string;
  color: string;
  position: number;
  is_collapsed: boolean;
}
export type DbWmGroupInsert = Partial<DbWmGroup> & { board_id: string; name: string };
export type DbWmGroupUpdate = Partial<DbWmGroup>;

export interface DbWmItem {
  id: string;
  board_id: string;
  group_id: string | null;
  title: string;
  status: string;
  assignee_id: string | null;
  due_date: string | null;
  start_date: string | null;
  priority: string | null;
  custom_fields: Record<string, unknown>;
  position: number;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
export type DbWmItemInsert = Partial<DbWmItem> & { board_id: string; title: string };
export type DbWmItemUpdate = Partial<DbWmItem>;

export type DbWmBoardWithCreator = DbWmBoard & {
  creator: Pick<DbUser, 'id' | 'first_name' | 'last_name' | 'avatar_url'> | null;
};

export type DbWmItemWithAssignee = DbWmItem & {
  assignee: Pick<DbUser, 'id' | 'first_name' | 'last_name' | 'avatar_url'> | null;
};
