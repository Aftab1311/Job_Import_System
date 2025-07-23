import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { logger } from '../utils/logger';

export interface JobData {
  title: string;
  company: string;
  location: string;
  description: string;
  jobType: string;
  category: string;
  salary?: string;
  publishedAt: Date;
  externalId: string;
  sourceUrl: string;
}

export class JobFetchService {
  private readonly feedUrls = [
    'https://jobicy.com/?feed=job_feed',
    'https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time',
    'https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france',
    'https://jobicy.com/?feed=job_feed&job_categories=design-multimedia',
    'https://jobicy.com/?feed=job_feed&job_categories=data-science',
    'https://jobicy.com/?feed=job_feed&job_categories=copywriting',
    'https://jobicy.com/?feed=job_feed&job_categories=business',
    'https://jobicy.com/?feed=job_feed&job_categories=management',
    'https://www.higheredjobs.com/rss/articleFeed.cfm'
  ];

  async fetchJobsFromFeed(feedUrl: string): Promise<JobData[]> {
    try {
      logger.info(`Fetching jobs from: ${feedUrl}`);
      
      const response = await axios.get(feedUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Job-Importer/1.0',
        },
      });

      const xmlData = response.data;
      const parsedData = await parseStringPromise(xmlData);
      
      return this.parseJobsFromXML(parsedData, feedUrl);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error(`Error fetching from ${feedUrl}:`, error);
      throw new Error(`Failed to fetch jobs from ${feedUrl}: ${errorMessage}`);
    }
  }

  async fetchAllJobs(): Promise<{ feedUrl: string; jobs: JobData[] }[]> {
    const results = await Promise.allSettled(
      this.feedUrls.map(async (url) => ({
        feedUrl: url,
        jobs: await this.fetchJobsFromFeed(url)
      }))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<{ feedUrl: string; jobs: JobData[] }> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  private parseJobsFromXML(xmlData: any, feedUrl: string): JobData[] {
    const jobs: JobData[] = [];
    
    try {
      const items = xmlData?.rss?.channel?.[0]?.item || [];
      
      for (const item of items) {
        const job = this.extractJobData(item, feedUrl);
        if (job) {
          jobs.push(job);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error parsing XML data:', error);
    }

    return jobs;
  }

  private extractJobData(item: any, feedUrl: string): JobData | null {
    try {
      const title = item.title?.[0] || '';
      const description = item.description?.[0] || '';
      const link = item.link?.[0] || '';
      const pubDate = item.pubDate?.[0] || '';
      const guid = item.guid?.[0]?._ || item.guid?.[0] || '';

      // Extract additional fields from description or custom namespaces
      const company = this.extractCompany(item, description);
      const location = this.extractLocation(item, description);
      const jobType = this.extractJobType(feedUrl, description);
      const category = this.extractCategory(feedUrl);
      const salary = this.extractSalary(description);

      return {
        title: title.trim(),
        company: company.trim(),
        location: location.trim(),
        description: description.trim(),
        jobType,
        category,
        salary,
        publishedAt: new Date(pubDate || Date.now()),
        externalId: guid || this.generateExternalId(title, company, link),
        sourceUrl: link,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error extracting job data:', error);
      return null;
    }
  }

  private extractCompany(item: any, description: string): string {
    // Try to extract from custom fields first
    if (item['job:company']) {
      return item['job:company'][0];
    }
    
    // Extract from description using patterns
    const companyMatch = description.match(/Company:\s*([^<\n]+)/i) ||
                        description.match(/Employer:\s*([^<\n]+)/i);
    
    return companyMatch ? companyMatch[1].trim() : 'Unknown';
  }

  private extractLocation(item: any, description: string): string {
    if (item['job:location']) {
      return item['job:location'][0];
    }
    
    const locationMatch = description.match(/Location:\s*([^<\n]+)/i) ||
                         description.match(/Based in:\s*([^<\n]+)/i);
    
    return locationMatch ? locationMatch[1].trim() : 'Remote';
  }

  private extractJobType(feedUrl: string, description: string): string {
    if (feedUrl.includes('full-time')) return 'full-time';
    if (feedUrl.includes('part-time')) return 'part-time';
    if (feedUrl.includes('contract')) return 'contract';
    
    const typeMatch = description.match(/Type:\s*([^<\n]+)/i);
    return typeMatch ? typeMatch[1].trim().toLowerCase() : 'full-time';
  }

  private extractCategory(feedUrl: string): string {
    const categoryMatch = feedUrl.match(/job_categories=([^&]+)/);
    return categoryMatch ? categoryMatch[1].replace(/-/g, ' ') : 'general';
  }

  private extractSalary(description: string): string | undefined {
    const salaryMatch = description.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?|\$[\d,]+k?/i);
    return salaryMatch ? salaryMatch[0] : undefined;
  }

  private generateExternalId(title: string, company: string, link: string): string {
    const content = `${title}-${company}-${link}`;
    return Buffer.from(content).toString('base64').substring(0, 32);
  }
}
