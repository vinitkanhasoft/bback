import fs from 'fs/promises';
import path from 'path';
import logger from './logger';

export interface TemplateData {
  [key: string]: any;
}

export class TemplateEngine {
  private static templatesDir = path.join(__dirname, '../templates/emails');
  
  /**
   * Load and render an email template with data
   */
  static async renderTemplate(templateName: string, data: TemplateData): Promise<string> {
    try {
      // Load base template
      const baseTemplatePath = path.join(this.templatesDir, 'base.html');
      const baseTemplate = await fs.readFile(baseTemplatePath, 'utf-8');
      
      // Load content template
      const contentTemplatePath = path.join(this.templatesDir, `${templateName}.html`);
      const contentTemplate = await fs.readFile(contentTemplatePath, 'utf-8');
      
      // Merge template data with defaults
      const templateData = {
        // Default values
        companyName: 'CRM System',
        tagline: 'Manage Your Business Better',
        year: new Date().getFullYear(),
        companyAddress: '123 Business St, Suite 100, City, State 12345',
        supportUrl: 'https://your-crm.com/support',
        helpUrl: 'https://your-crm.com/help',
        loginUrl: 'https://your-crm.com/login',
        unsubscribeUrl: 'https://your-crm.com/unsubscribe',
        supportEmail: 'support@your-crm.com',
        supportPhone: '+1 (555) 123-4567',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        // User-provided data
        ...data
      };
      
      // Replace placeholders in content template
      let renderedContent = this.replacePlaceholders(contentTemplate, templateData);
      
      // Replace placeholders in base template
      let finalHtml = this.replacePlaceholders(baseTemplate, {
        ...templateData,
        content: renderedContent
      });
      
      logger.info(`✅ Template rendered successfully: ${templateName}`);
      return finalHtml;
      
    } catch (error) {
      logger.error(`❌ Error rendering template ${templateName}:`, error);
      throw new Error(`Failed to render email template: ${templateName}`);
    }
  }
  
  /**
   * Replace {{placeholders}} with actual values
   */
  private static replacePlaceholders(template: string, data: TemplateData): string {
    let result = template;
    
    // Replace simple placeholders like {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
    
    // Replace nested placeholders like {{object.property}}
    result = result.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, objKey, propKey) => {
      const obj = data[objKey];
      return obj && obj[propKey] !== undefined ? String(obj[propKey]) : match;
    });
    
    return result;
  }
  
  /**
   * Get list of available templates
   */
  static async getAvailableTemplates(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.templatesDir);
      return files
        .filter(file => file.endsWith('.html') && file !== 'base.html')
        .map(file => file.replace('.html', ''));
    } catch (error) {
      logger.error('❌ Error reading templates directory:', error);
      return [];
    }
  }
  
  /**
   * Check if template exists
   */
  static async templateExists(templateName: string): Promise<boolean> {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.html`);
      await fs.access(templatePath);
      return true;
    } catch {
      return false;
    }
  }
}
