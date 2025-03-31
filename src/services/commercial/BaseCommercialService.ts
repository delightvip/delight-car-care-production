
import { supabase } from "@/integrations/supabase/client";
import PartyService from '../PartyService';

/**
 * Base class for all commercial services providing common functionality
 */
class BaseCommercialService {
  protected supabase = supabase;
  protected partyService = PartyService.getInstance();
  
  constructor() {
    // Initialize any common functionality here
  }
}

export default BaseCommercialService;
