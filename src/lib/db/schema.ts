import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const scrapeJobs = sqliteTable('scrape_jobs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').notNull().default('pending'),
  scrapeType: text('scrape_type').notNull().default('links'),
  crawlDepth: integer('crawl_depth').notNull().default(1),
  keywords: text('keywords'), // JSON array
  totalUrls: integer('total_urls').notNull().default(0),
  completedUrls: integer('completed_urls').notNull().default(0),
  failedUrls: integer('failed_urls').notNull().default(0),
  totalResults: integer('total_results').notNull().default(0),
  errorMessage: text('error_message'),
  startedAt: text('started_at'),
  finishedAt: text('finished_at'),
  googleSheetsWebhookUrl: text('google_sheets_webhook_url'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const scrapeUrls = sqliteTable('scrape_urls', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull(),
  url: text('url').notNull(),
  status: text('status').notNull().default('pending'),
  depth: integer('depth').notNull().default(0),
  parentUrlId: text('parent_url_id'),
  httpStatus: integer('http_status'),
  errorMessage: text('error_message'),
  pageTitle: text('page_title'),
  scrapedAt: text('scraped_at'),
  createdAt: text('created_at').notNull(),
});

export const scrapeResults = sqliteTable('scrape_results', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull(),
  urlId: text('url_id').notNull(),
  sourceUrl: text('source_url'),
  resultType: text('result_type').notNull(),
  value: text('value').notNull(),
  label: text('label'),
  context: text('context'),
  metadata: text('metadata'), // JSON object
  createdAt: text('created_at').notNull(),
});
