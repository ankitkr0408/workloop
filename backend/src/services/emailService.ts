import nodemailer from 'nodemailer';

interface EmailAttachment {
    filename: string;
    content: Buffer;
}

export class EmailService {
    private static transporter: nodemailer.Transporter | null = null;

    private static async getTransporter() {
        if (this.transporter) return this.transporter;

        if (process.env.NODE_ENV === 'production') {
            // Configure SendGrid or similar for production
            // this.transporter = nodemailer.createTransport({ ... });
            throw new Error('Production email transport not configured');
        } else {
            // Create Ethereal Test Account
            const testAccount = await nodemailer.createTestAccount();

            console.log('📨 Ethereal Email Configured:');
            console.log(`   User: ${testAccount.user}`);
            console.log(`   Pass: ${testAccount.pass}`);

            this.transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });

            return this.transporter;
        }
    }

    public static async sendWeeklyReport(
        to: string,
        projectName: string,
        pdf: Buffer | string,
        dateRange: string
    ) {
        const transporter = await this.getTransporter();
        const attachments = [];
        let htmlBody = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Weekly Report Ready 📊</h2>
          <p>Here is your progress report for <strong>${projectName}</strong> covering ${dateRange}.</p>
        `;

        if (typeof pdf === 'string') {
            htmlBody += `<p>You can download the PDF here: <a href="${pdf}">Download Report</a></p>`;
        } else {
            htmlBody += `<p>Please find the PDF attached.</p>`;
            attachments.push({
                filename: `Report-${projectName.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
                content: pdf,
            });
        }

        htmlBody += `
          <br>
          <p style="color: #666; font-size: 12px;">Powered by WorkLoop</p>
        </div>
        `;

        const info = await transporter.sendMail({
            from: '"WorkLoop Bot" <reports@workloop.dev>',
            to,
            subject: `Weekly Report: ${projectName} (${dateRange})`,
            text: `Your weekly progress report for ${projectName} is ready.`,
            html: htmlBody,
            attachments,
        });

        console.log(`✅ Email sent: ${info.messageId}`);
        console.log(`🔗 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);

        return info;
    }
}
