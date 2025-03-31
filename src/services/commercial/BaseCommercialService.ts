
import { supabase } from "@/integrations/supabase/client";
import PartyService from '../PartyService';
import InventoryService from '../InventoryService';

/**
 * Base class for all commercial services providing common functionality
 */
class BaseCommercialService {
  protected supabase = supabase;
  protected partyService = PartyService.getInstance();
  protected inventoryService = InventoryService.getInstance();
  
  constructor() {
    // Initialize any common functionality here
  }
}

export default BaseCommercialService;
