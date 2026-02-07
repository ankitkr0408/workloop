
import { PdfService } from '../src/services/pdfService';
import { EmailService } from '../src/services/emailService';
import fs from 'fs';
import path from 'path';

async function testPdfAndEmail() {
    console.log('🚀 Starting PDF & Email Test...');

    // 1. Mock Data
    const reportData = {
        projectName: 'WorkLoop MVP Platform',
        clientName: 'Deepmind Corp',
        startDate: 'Feb 1, 2026',
        endDate: 'Feb 7, 2026',
        totalHours: 42,
        activityCount: 15,
        activities: [
            {
                date: 'Feb 5, 2026',
                items: [
                    { type: 'commit', title: 'Implemented PDF Service', user: 'Ankit', time: '10:30 AM', description: 'Added Puppeteer support' },
                    { type: 'check_in', title: 'Daily Standup', user: 'Ankit', time: '09:00 AM' }
                ]
            },
            {
                date: 'Feb 4, 2026',
                items: [
                    { type: 'commit', title: 'Phase 4 Integrations', user: 'Ankit', time: '02:15 PM' },
                    { type: 'calendar', title: 'Client Sync', user: 'Ankit', time: '04:00 PM', description: 'Discussed timeline' }
                ]
            }
        ]
    };

    try {
        // 2. Generate PDF
        console.log('📄 Generating PDF...');
        const pdfBuffer = await PdfService.generateReport(reportData);

        // Save to disk for manual inspection
        const outputPath = path.join(__dirname, 'test-report.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log(`✅ PDF saved to ${outputPath}`);

        // 3. Send Email
        console.log('📧 Sending Email...');
        const info = await EmailService.sendWeeklyReport(
            'client@example.com',
            reportData.projectName,
            pdfBuffer,
            `${reportData.startDate} - ${reportData.endDate}`
        );

        console.log('\n🎉 Test Complete!');
        console.log('-----------------------------------');
        console.log(`Preview Email here: https://ethereal.email/message/${info.messageId}`);
        console.log('-----------------------------------');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testPdfAndEmail();
