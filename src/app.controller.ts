import { Controller, Get, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import cheerio from 'cheerio';
import { Response } from 'express';
import { error } from 'console';
@Controller()
export class AppController {
  private readonly NotasSeguridaMedicaUrl = 'https://www.minsa.gob.pa/informacion-salud/alertas-y-comunicados';
  private readonly NotasSeguridadDomain = "https://www.minsa.gob.pa/";
  private readonly OPSURL="https://www.paho.org/es/alertas-actualizaciones-epidemiologicas";
  constructor(private readonly appService: AppService) {}

  async fetchHTML(url) {
    try {
      const response = await fetch(url);
      const responsetext = await response.text();
      return {
        html:responsetext,
        error:undefined
      };
    } catch (error) {
      console.error('Error fetching HTML:', error);
      return {
        error:error
      }
    }
  }
  @Get()
  async parse(@Res() res: Response,@Query("page") pageNumber:string) {
    try {
      let urlFetch=this.NotasSeguridaMedicaUrl;
      if(pageNumber){
        urlFetch+="?page="+pageNumber
      }
      const responseData = await this.fetchHTML(urlFetch);
      if(responseData.error){
        res.status(500).send('Error parsing HTML');
        return;
      }
      const $ = cheerio.load(responseData.html);
      const regionContent = $('#region-content');
      // Transformar los elementos con atributo href
      regionContent.find('a[href]').each((i, link) => {
        const $link = $(link);
        const href = $link.attr('href');
        if(href.indexOf("/sites/default/files/")!=-1){
          $link.attr('href', `${this.NotasSeguridadDomain}${href}`);
        }
        if(href.indexOf("?page=")!=-1){
          const pages=href.split("=")[1];
          $link.attr('href', `?page=${pages}`);
        }
      });
      const transformedHtml = regionContent.html();
      // Find the specific link element
      if (transformedHtml) {
        const linkElements = $('link[type="text/css"][rel="stylesheet"]');
        const linkHtml = linkElements.map((i, link) => $(link).prop('outerHTML')).get();
        res.status(200)
           .header('Content-Type', 'text/html')
           .send(`
              <!DOCTYPE html>
              <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Document</title>
                    ${linkHtml}
                    <style>
                      .view-filters{
                        display:none
                      }
                    </style>
                </head>
                <body style="padding:1em">${transformedHtml}</body>
              </html>
            `);
      } else {
        res.status(404).send('Element with id "region-content" not found');
      }
    } catch (error) {
      console.error('Error parsing HTML:', error);
      res.status(500).send('Error parsing HTML');
    }
  }
  @Get()
  async getOps(){
    
  }
}
