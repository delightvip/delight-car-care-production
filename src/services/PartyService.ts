
import { supabase } from "@/integrations/supabase/client";

class PartyService {
  private static instance: PartyService | null = null;

  private constructor() {}

  public static getInstance(): PartyService {
    if (!PartyService.instance) {
      PartyService.instance = new PartyService();
    }
    return PartyService.instance;
  }

  public async getParties() {
    try {
      const { data, error } = await supabase
        .from("parties")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching parties:", error);
      return [];
    }
  }

  public async getPartyById(id: string) {
    try {
      const { data, error } = await supabase
        .from("parties")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error fetching party with id ${id}:`, error);
      return null;
    }
  }
}

export default PartyService;
