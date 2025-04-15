
import { NewsItem } from "@/components/ui/news-ticker";

export interface NewsTickerServiceInterface {
  getNews(): Promise<NewsItem[]>;
}

export interface NewsFilter {
  limit?: number;
  startDate?: string;
  endDate?: string;
}
