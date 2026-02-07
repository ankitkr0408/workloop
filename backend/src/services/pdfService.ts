import puppeteer from 'puppeteer';

interface ReportData {
    projectName: string;
    clientName: string;
    startDate: string;
    endDate: string;
    totalHours: number;
    activityCount: number;
    activities: Array<{
        date: string;
        items: Array<{
            type: string;
            title: string;
            description?: string;
            user: string;
            time?: string;
        }>;
    }>;
}

export class PdfService {
    private static generateHtml(data: ReportData): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Weekly Report - ${data.projectName}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page { margin: 40px; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact; }
        </style>
      </head>
      <body class="p-8">
        <!-- Header -->
        <div class="flex justify-between items-center border-b-2 border-gray-200 pb-6 mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">WorkLoop</h1>
            <p class="text-gray-500 mt-1">Weekly Progress Report</p>
          </div>
          <div class="text-right">
            <h2 class="text-xl font-bold text-gray-800">${data.projectName}</h2>
            <p class="text-gray-600">${data.clientName}</p>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 gap-6 mb-8">
          <div class="bg-blue-50 p-6 rounded-lg">
            <p class="text-blue-600 text-sm font-medium uppercase">Reporting Period</p>
            <p class="text-lg font-bold text-gray-900 mt-1">${data.startDate} - ${data.endDate}</p>
          </div>
          <div class="bg-green-50 p-6 rounded-lg flex justify-between">
            <div>
              <p class="text-green-600 text-sm font-medium uppercase">Total Hours</p>
              <p class="text-3xl font-bold text-gray-900 mt-1">${data.totalHours}h</p>
            </div>
            <div>
              <p class="text-green-600 text-sm font-medium uppercase">Activities</p>
              <p class="text-3xl font-bold text-gray-900 mt-1">${data.activityCount}</p>
            </div>
          </div>
        </div>

        <!-- Activities -->
        <div class="mb-8">
          <h3 class="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Activity Log</h3>
          
          ${data.activities.map(day => `
            <div class="mb-6 break-inside-avoid">
              <h4 class="text-sm font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded inline-block mb-3">
                ${day.date}
              </h4>
              <div class="space-y-4">
                ${day.items.map(item => `
                  <div class="flex items-start">
                    <div class="w-16 pt-1 text-xs text-gray-400 text-right pr-4">
                      ${item.time || ''}
                    </div>
                    <div class="flex-1 border-l-2 border-gray-100 pl-4 py-1 relative">
                      <div class="absolute -left-[5px] top-2 w-2 h-2 rounded-full ${item.type === 'check_in' ? 'bg-green-500' :
                item.type === 'commit' ? 'bg-blue-500' :
                    'bg-gray-400'
            }"></div>
                      <p class="text-sm font-medium text-gray-900">${item.title}</p>
                      ${item.description ? `<p class="text-xs text-gray-600 mt-0.5">${item.description}</p>` : ''}
                      <p class="text-xs text-gray-400 mt-1 flex items-center">
                        <span class="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600 mr-1">
                          ${item.user.charAt(0)}
                        </span>
                        ${item.user}
                      </p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Footer -->
        <div class="text-center text-xs text-gray-400 pt-8 border-t border-gray-100 mt-auto">
          Generated automatically by WorkLoop on ${new Date().toLocaleDateString()}
        </div>
      </body>
      </html>
    `;
    }

    public static async generateReport(data: ReportData): Promise<Buffer> {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for some container envs
        });

        try {
            const page = await browser.newPage();
            const html = this.generateHtml(data);

            // Set content and wait for network idle to ensure Tailwind loads
            await page.setContent(html, { waitUntil: 'networkidle0' });

            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    bottom: '20px'
                }
            });

            return Buffer.from(pdf);
        } finally {
            await browser.close();
        }
    }
}
